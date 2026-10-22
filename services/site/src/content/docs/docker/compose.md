---
title: 'Docker Compose：校验、启停与更新'
description: '按「改了什么」查表决定用 restart 还是 up -d，并说明配置校验、日志与健康检查、更新和回滚的做法。'
publishDate: 2026-10-22
order: 2
---

## 按「我改了什么」找命令

先在这张表里定位，再往下看细节。表里的 `site` 是应用服务、`nginx` 是入口、`postgres` 是数据层。

| 我改了什么 | 跑哪条 | 要不要断服 |
|---|---|---|
| 页面、文章、配置、样式 | `docker compose up -d --build site` | 断约 10s |
| 只改挂进 nginx 的配置文件内容 | `docker compose exec nginx nginx -t` 后 `nginx -s reload` | 不断 |
| nginx 的 `volumes` / `ports` | `docker compose up -d nginx` | 断 |
| 数据层 `.env` 里的密码 | `docker compose up -d postgres` | 断 |
| Dockerfile 或依赖 | `docker compose build --no-cache site` 再 `up -d site` | 断，且慢 |
| 只想看现在什么状态 | `docker compose ps` | — |
| 什么都没改但行为诡异 | `docker compose up -d --force-recreate site` | 断 |

三条容易漏的：

- **`build` 不等于上线**。它只产出镜像，正在跑的容器还是旧的，必须再 `up -d`。
  `up -d --build` 是这两步的合并写法。
- **`restart` 不读新配置**。改过的 `environment`、`volumes`、`ports`、`command` 都不会生效。
- **不带服务名的 `up -d` 会启动所有服务**，包括当前没在跑的数据层。

## 启停与重建

这一节是最容易踩错的地方。先记住一句：**`restart` 只管进程，`up -d` 才管配置**。

| 改的东西 | `restart` | `up -d` | `up -d --force-recreate` |
|---|---|---|---|
| 容器内进程挂了 | 够 | 够 | 过 |
| 挂进去的配置文件内容 | 够 | 够 | 过 |
| `environment` / `env_file` | 不够 | 够 | 够 |
| `volumes` / `ports` / `command` | 不够 | 够 | 够 |
| 重新 build 过镜像 | 不够 | 够 | 够 |
| `restart:` 策略本身 | 不够 | 够 | 够 |
| 什么都没改但状态诡异 | 不够 | 可能不重建 | 够 |

```bash
docker compose up -d site nginx            # 最常用：按当前配置重建并启动
docker compose up -d --build site          # 构建 + 重建，一条完成
docker compose up -d --force-recreate site # 强制删了重建，容器 IP 会变
docker compose stop site                   # 只停，保留容器和日志
docker compose start site                  # 再起来，配置不变
docker compose restart site                # 只重启进程，配置不变
docker compose down                        # 删容器，日志一并消失
docker compose down --remove-orphans       # 项目内清理的标准动作
```

- **`restart:` 策略是创建容器时写死的**。把 `unless-stopped` 改成 `always` 之后，`restart` 命令
  不会让它生效，必须 `up -d` 重建。
- **`up -d` 不带 `--build` 不会构建**；但如果你刚手工 `build` 过，镜像 ID 变了，它仍会重建容器。
  所以 `build` + `up -d` 与 `up -d --build` 等价，只是前者能单独看构建日志。
- **`--force-recreate` 不是「重启」**，是删了重建。它解决的是 compose 认为「配置没变」
  但实际状态脏了的情况：挂载的文件被删、镜像被 retag 成同名、容器内被手工改过。
- **`down` 会连日志一起删**。排障过程中先别 down，`stop` 就够。
- **`down -v` 只删 named volume**，bind mount 的数据目录不受影响。想清空数据要直接删宿主目录，
  见 [基础操作](/docs/docker/basics) 的「卷与数据目录」。
- **只在项目根跑 compose**。在子目录里跑会生成一个新项目（目录名成了项目名），
  容器名撞车会直接报错，不撞车也会多出一个没人管的网络。

## 解析与校验

```bash
docker compose config --quiet            # 唯一能真正校验整份编排的命令，含 env_file
docker compose config --services         # 只列服务名，不解析 env_file，别拿它当校验
docker compose config | head -40         # 看最终合并结果，排查 include 与变量替换
docker compose ls                        # 这台机器上还有哪些项目在跑
```

- **`--services` 只输出名字**，用它「验证配置」会漏掉 `env_file` 缺失这类错误。
  校验一律用 `--quiet`，有问题时非零退出并打印原因。
- **`env_file` 指向不存在的文件会让整份编排解析失败**，而 `environment` 里的字面值有默认值兜底。
  这就是为什么数据层通常要单独准备 `.env`。
- **`include` 进来的服务属于同一个项目**，不是子项目；`docker compose ps` 一次能看到全部。
- **项目名默认取目录名**，镜像名随后变成 `<目录名>-<服务名>`。在子目录里跑出来的项目是另一套命名空间。
- **compose 文件里的 `$` 会被当变量插值**，要传给容器的字面量得写成 `$$`，
  健康检查命令里最容易撞到。

## 日志与健康检查

```bash
docker compose logs -f --tail=100 site        # 跟实时日志，只看最后 100 行
docker compose logs --since 10m site nginx    # 更适合「刚发了一次请求」
docker compose logs -t site                   # 带时间戳
docker compose logs --no-log-prefix site      # 复制日志内容时去掉前缀

docker inspect -f '{{json .State.Health}}' site | head -c 500   # FailingStreak 与最后一次输出
```

- **重建容器后日志归零**。`down` 或 `up -d` 建了新容器，上一轮的日志就没了。
- **日志有滚动上限**（常见配置是单文件 10MB、保留 3 份），超了就丢。别指望用 `logs` 复盘几天前的事故。
- **`--since` 比 `--tail` 更适合事后定位**：`--tail` 只取最后 N 行，而你要找的那次请求
  可能夹在大量启动日志中间。
- **健康检查不会触发重启**，它只是一个状态标记。`healthy` 说明探针通过，不代表服务真的可用——
  探针通常只打一个轻量接口，覆盖不到数据库和渲染路径。
- 探针报错时，先手工跑一遍探针命令，区分「探针写错了」和「服务真的坏了」：

```bash
docker compose exec -T site node -e "fetch('http://127.0.0.1:3000/healthz').then(r=>console.log(r.status))"
```

- **容器时区默认是 UTC**，日志时间可能比本地早几个小时。对不上时先换算，别怀疑日志缺了。

## 更新与回滚

```bash
docker compose pull nginx         # 只有用官方镜像的服务能 pull
docker compose up -d nginx        # 拉到新镜像后重建

docker compose build site
docker compose up -d site         # 本地构建的服务没有 pull 这一步
```

- **本地构建的服务没有「更新镜像」的概念**，`pull` 对它无效，只能重新 `build`。
- **回滚要自己打 tag**。compose 用 `build:` 时没有历史版本，想能回滚就在构建后加一步：

```bash
docker tag myapp-site:latest myapp-site:2026-10-22
```

  出事时把 compose 里的 `build:` 换成 `image: myapp-site:2026-10-22`，再 `up -d`。
- **`build` 和 `up -d` 是两个动作**：前者失败不影响正在跑的容器；`up -d --build` 是一行，
  失败点没那么清楚。排查阶段建议分开敲。
