---
title: 'Docker Compose：校验、启停与更新'
description: 'compose 各子命令的用法与差异，以及配置变更后应执行哪条命令。'
publishDate: 2026-10-22
order: 2
---

## 变更对照表

修改内容与对应命令。

| 修改内容 | 命令 | 是否断服 |
|---|---|---|
| 页面、配置、样式 | `docker compose up -d --build site` | 约 10s |
| nginx 配置内容 | `docker compose exec nginx nginx -t`<br>`docker compose exec nginx nginx -s reload` | 否 |
| nginx 的 `volumes` 或 `ports` | `docker compose up -d nginx` | 是 |
| 数据层密码 | `docker compose up -d postgres` | 是 |
| Dockerfile 或依赖 | `docker compose build --no-cache site`<br>`docker compose up -d site` | 是 |
| 查看当前状态 | `docker compose ps` | 否 |
| 状态异常但无改动 | `docker compose up -d --force-recreate site` | 是 |

`build` 仅产出镜像，不替换运行中的容器；`up -d` 才会按当前配置重建。两者合并为 `up -d --build`。
不带服务名的 `up -d` 会启动项目内全部服务。

## docker compose up

按当前配置创建并启动容器，已存在且配置未变的容器保持不动。

**用法**

```bash
docker compose up -d [OPTIONS] [SERVICE...]
```

**示例**

```bash
$ docker compose up -d site nginx
$ docker compose up -d --build site
$ docker compose up -d --force-recreate site
```

**说明**

- `-d` 后台运行；省略则占用前台并聚合日志。
- 镜像 ID 变化时重建容器，即使未加 `--build`。
- `--build` 在启动前构建，等价于先 `build` 再 `up -d`。
- `--force-recreate` 无条件重建容器，容器 IP 随之变化，适用于配置未变但运行状态异常的情况。

## docker compose stop

停止容器，保留容器与日志。

**用法**

```bash
docker compose stop [SERVICE...]
docker compose start [SERVICE...]
```

**示例**

```bash
$ docker compose stop postgres
$ docker compose start postgres
```

**说明**

- 停止后的容器仍存在，可用 `start` 恢复，配置不变。
- 排障期间优先使用 `stop`，`down` 会连同日志一并删除。

## docker compose restart

重启容器内进程。

**用法**

```bash
docker compose restart [SERVICE...]
```

**示例**

```bash
$ docker compose restart site
```

**说明**

- 不重新读取 compose 配置；`environment`、`volumes`、`ports`、`command` 的变更不生效。
- `restart:` 策略在容器创建时确定，修改后需 `up -d` 重建才会应用。
- 适用于进程异常退出、需要重新拉起，而配置未变的场景。

## docker compose down

停止并删除容器与网络连接。

**用法**

```bash
docker compose down [OPTIONS]
```

**示例**

```bash
$ docker compose down
$ docker compose down --remove-orphans
```

**说明**

- 删除容器及其日志，下次 `up` 时重新创建。
- `-v` 仅删除 compose 定义的 named volume；bind mount 的数据目录不受影响。
- `--remove-orphans` 同时删除 compose 文件中已移除的服务所对应的容器。
- 在项目根目录执行。子目录执行会以目录名作为项目名，产生独立的容器与网络。

## docker compose config

解析并输出合并后的配置。

**用法**

```bash
docker compose config [OPTIONS]
```

**示例**

```bash
$ docker compose config --quiet && echo ok
ok
$ docker compose config --services
nginx
postgres
redis
site
```

**说明**

- `--quiet` 执行完整校验，包括 `env_file` 是否存在，失败时非零退出并输出原因。
- `--services` 仅列出服务名，不解析 `env_file`，不能作为配置校验。
- 输出为变量替换与 `include` 合并后的结果，`source` 等路径已转为绝对路径。
- `env_file` 指向的文件缺失时整份配置解析失败；`environment` 中的字面值不受影响。
- compose 文件中的 `$` 参与变量替换，需传给容器的字面量写成 `$$`。

## docker compose logs

输出容器日志。

**用法**

```bash
docker compose logs [OPTIONS] [SERVICE...]
```

**示例**

```bash
$ docker compose logs --tail=100 site
$ docker compose logs --since 10m site nginx
$ docker compose logs -t site
```

**说明**

- 省略服务名时输出项目内全部容器，包含数据层。
- `--since` 按时间起点截取，`--tail` 按行数截取，排查一次近期请求时前者更合适。
- `-t` 附加时间戳，`--no-log-prefix` 去掉服务名前缀。
- 日志随容器删除，`down` 或 `up -d` 重建后不再保留上一轮记录。
- 日志驱动设有滚动上限（常见为单文件 10MB、保留 3 份），超出部分丢弃。

## docker compose pull

拉取服务所使用的镜像。

**用法**

```bash
docker compose pull [SERVICE...]
```

**示例**

```bash
$ docker compose pull nginx
```

**说明**

- 仅对使用 `image:` 的服务有效；使用 `build:` 的服务由本地构建，`pull` 不更新内容。
- 拉取后需 `up -d` 重建容器才会使用新镜像。

## 镜像更新与回滚

使用 `image:` 的服务更新后重建，使用 `build:` 的服务重新构建。

**示例**

```bash
$ docker compose pull nginx && docker compose up -d nginx
$ docker compose build site && docker compose up -d site
```

回滚依赖镜像 tag。构建后保留一个带日期的 tag：

```bash
docker tag myapp-site:latest myapp-site:2026-10-22
```

需要回滚时，将 compose 中的 `build:` 替换为 `image: myapp-site:2026-10-22`，再执行 `up -d`。

## 健康检查

compose 的 `healthcheck` 只在容器状态中记录结果，不触发重启。

**用法**

```bash
docker inspect -f '{{json .State.Health}}' site
```

**示例**

```bash
$ docker inspect -f '{{.State.Health.Status}}' site
healthy
```

**说明**

- `Status` 取值 `starting`、`healthy`、`unhealthy`；`FailingStreak` 记录连续失败次数。
- `healthy` 仅表示探针命令通过，探针通常只访问一个轻量接口，不覆盖数据库与页面渲染。
- 探针命令在容器内执行，需使用镜像自带的工具；精简镜像可能不含 `curl` 或 `wget`。
- 容器时区默认为 UTC，日志时间与宿主机本地时间可能相差数小时。
