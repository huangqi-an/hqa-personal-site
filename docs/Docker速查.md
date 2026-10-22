# Docker 速查

> 单机多服务环境 · Docker 29.7.2 / Compose v5.5.0 · 2026-10 实测校对

本文回答「现在该敲哪条」。「为什么是这个结构」写在《架构设计》里，遇到原因类疑问直接看那份，
这里不复述，只在必要处留 `→《架构设计》§x` 的指针。

---

## 0. 环境坐标

后面各节只引用名字，不重复数值；换端口、加服务时只改这张表。

| 项 | 值 |
|---|---|
| 执行目录 | 仓库根 `hqa-personal-site/`，**不在子目录跑 compose** |
| 服务 / 容器名 | `nginx`、`site`、`postgres`、`redis`（三者同名：服务名 = 容器名 = 内部域名） |
| 对外入口 | 宿主机 `0.0.0.0:80` → `nginx:80`；`site:4321` 不映射宿主 |
| 网络 | `web-net`（172.27.0.0/16）、`db-net`，均 `external: true` |
| 业务数据 | `data/postgres`、`data/redis`，bind mount，不是 named volume |
| 站点镜像 | `hqa-personal-site-site:latest`，`docker image ls` 显示 842MB |
| 版本 | Docker 29.7.2 / Compose 5.5.0 |

三点约定：

- 命令都可以整行复制，不带 `$` 前缀，也不写 `<service>` 这种占位符。
- `§2.4` 指本文；`→《架构设计》§7` 指另一份文档，只写书名和节号，不写路径。
- 内存一律以 compose 的 `mem_limit` 为准，不看整机容量——开发机和目标生产机不是同一规格。

---

## 1. 按「我改了什么」找命令

最常用的入口。先在这张表里定位，再跳到对应小节看细节。

| 我改了什么 | 跑哪条 | 要不要断服 |
|---|---|---|
| 页面 / 文章 / 配置 / 样式 | `docker compose up -d --build site` | 断约 10s |
| 只改 `nginx/conf.d/*.conf` 的内容 | `docker compose exec nginx nginx -t && docker compose exec nginx nginx -s reload` | 不断 |
| nginx 的 `volumes` / `ports` | `docker compose up -d nginx` | 断 |
| `.env` 里的密码 | `docker compose up -d postgres` | 断 |
| Dockerfile / 依赖 | `docker compose build --no-cache site` 再 `up -d site` | 断，且慢 |
| 只想看现在什么状态 | `docker compose ps` | — |
| 什么都没改但行为诡异 | `docker compose up -d --force-recreate site` | 断 |

三条容易漏的：

- **`build` 不等于上线**。它只产出镜像，正在跑的容器还是旧的，必须再 `up -d`。
  `up -d --build` 是这两步的合并写法。
- **`restart` 不读新配置**。改过的 `environment`、`volumes`、`ports`、`command` 都不会生效，
  详见 §2.4 的判定表。
- **不带服务名的 `up -d` 会启动所有服务**，包括当前没在跑的 `postgres` 和 `redis`。

---

## 2. 镜像与容器

### 2.1 看：现在到底跑着什么

```bash
docker compose ps                    # 带 health 状态，日常只看这个
docker compose ps -a                 # 连已退出的也列出来
docker ps --filter name=site         # 这台机上还有十几个别的项目的容器，别裸跑 ps -a
docker stats --no-stream             # 一次采样就退出，别开流式刷新
docker compose images                # 每个服务用的镜像、tag、大小
docker compose port nginx            # 看端口实际映射成了什么
docker compose top site              # 容器里的进程树，判断是不是只剩 PID 1 在撑

# 一次问清「怎么死的」，比 logs 更快定位方向
docker inspect -f '{{.State.Status}} health={{.State.Health.Status}} exit={{.State.ExitCode}} oom={{.State.OOMKilled}}' site
```

输出长这样（正常态）：

```
running health=healthy exit=0 oom=false
```

几个读法：

- **`docker ps` 不显示 health**，只有 `compose ps` 有。判断「活着」要用后者。
- **`docker stats` 的 `MEM %` 是相对 `mem_limit` 的百分比**，不是整机。
  `site` 显示 49% 只说明它用掉了 256M 配额的一半，不代表机器快满了。
- **退出码 137 = SIGKILL**，最常见是 OOM；`1` / `255` 才是应用自己退出。
  区分方法就是上面的 `OOMKilled` 字段，别猜。
- `--no-stream` 不是可选项：流式 `stats` 会持续采样，在小机器上有可感知开销。

### 2.2 进容器执行

```bash
docker compose exec site sh                        # 运行镜像是 node:22-slim，有 bash 也有 sh
docker compose exec -u root site sh                # 容器以 USER node 运行，要写文件才需要 root
docker compose exec -T site sh -c 'ls -l /app'     # 脚本或管道里必须加 -T
docker compose exec -T -w /app site pwd           # -w 指定工作目录，省掉 cd
docker compose exec nginx nginx -t                 # 改完 nginx 配置先自检
docker compose exec nginx nginx -s reload          # 自检通过再热加载
docker compose exec postgres psql -U app -d app    # 数据层没在跑时会直接报错，属正常
docker compose exec redis redis-cli
docker compose run --rm --no-deps site node -e 'console.log(process.version)'   # 一次性容器，不碰正在跑的那个
```

- **容器里没有 `curl` 和 `wget`**，探活只能用 `node -e fetch(...)`。这一点在写 healthcheck
  和手工验证时都会撞上（`bash` 是有的，`node:22-slim` 基于 Debian）。
- **`-T` 不是可选的**：不加会在脚本里报 `the input device is not a TTY`，因为默认要分配终端。
- **`exec` 只对运行中的容器有效**。`Exited` 的要先 `docker compose start site`；
  容器在重启循环里时 `exec` 会直接失败——这本身就是一种诊断信号。
- **在容器里改的东西随容器消失**，`/app` 下的修改在下次重建后归零。定位问题可以，别当修复手段。
- `docker compose exec` 依赖项目上下文，必须在仓库根执行；`docker exec nginx sh` 在任何目录都行。

### 2.3 构建

```bash
docker compose build site                  # 只构建，不上线
docker compose build --progress=plain site # 看每一层的完整输出，排查卡在哪一步
docker compose build --no-cache site       # 最后手段，见下面的代价
docker image history hqa-personal-site-site --format '{{.Size}}\t{{.CreatedBy}}' | head -8
```

构建慢或占空间时，先看层：

```
379MB   COPY --chown=node:node /web/node_modules ./node_modules
5.87MB  COPY --chown=node:node /web/dist ./dist
```

几条实测出来的注意事项：

- **`--no-cache` 的代价**：本次实测全量重建约 1~2 分钟（基础镜像已在本地）；
  换机器或清过镜像，还要加上拉取 `node`、`bun`、`nginx` 的时间。
  只在「依赖明明变了却装不上」或「怀疑缓存坏了」时用。
- **依赖层缓存的前提是顺序**：`COPY package.json bun.lock ./` 必须在 `COPY . .` 之前。
  改了 Dockerfile 里这两行的顺序，等于永久放弃依赖缓存。
- **构建不受 `mem_limit` 管束**（它是一次性 build，不是服务），峰值可达 1.5~2G
  （→《架构设计》§7）。在 2G 生产机上构建前先 `docker compose stop postgres redis` 腾出内存，
  构建完再 `up -d` 恢复。
- **`--frozen-lockfile` 失败通常不是网络**：改了 `package.json` 却没更新 `bun.lock` 就会直接失败。
  先去核对 lock 文件，别急着换镜像源。
- **`daemon.json` 里的 `registry-mirrors` 只加速拉镜像**，不影响 `bun install` 的 npm 源。
  `services/site/Dockerfile` 里没有任何 npm 源参数，构建慢在依赖安装阶段时，改 mirror 是无效动作。
- **镜像大小看 `docker image ls`（842MB）**，不要看 `docker compose images` 报的 210MB——
  两者统计口径不同，后者会明显偏小，容易误判瘦身效果。

### 2.4 启停与重建

这一节是全文最容易踩错的地方。先记住一句：**`restart` 只管进程，`up -d` 才管配置**。

| 改的东西 | `restart` | `up -d` | `up -d --force-recreate` |
|---|---|---|---|
| 容器内进程挂了 | 够 | 够 | 过 |
| `conf.d` 里挂进去的文件内容 | 够 | 够 | 过 |
| `environment` / `env_file` | 不够 | 够 | 够 |
| `volumes` / `ports` / `command` | 不够 | 够 | 够 |
| 重新 build 过镜像 | 不够 | 够 | 够 |
| `restart:` 策略本身 | 不够 | 够 | 够 |
| 什么都没改但状态诡异 | 不够 | 可能不重建 | 够 |

常用命令：

```bash
docker compose up -d site nginx            # 最常用：按当前配置重建并启动
docker compose up -d --build site          # 构建 + 重建，一条完成
docker compose up -d --force-recreate site # 强制删了重建，容器 IP 会变
docker compose stop site                   # 只停，保留容器和日志
docker compose start site                  # 再起来，配置不变
docker compose restart site                # 只重启进程，配置不变
docker compose down                        # 删容器 + 删网络连接，日志一并消失
docker compose down --remove-orphans       # 项目内清理的标准动作
```

坑：

- **`restart` 不读新的 compose 配置**。`environment`、`volumes`、`ports`、`command` 改了都不生效。
- **`restart:` 策略是创建容器时写死的**。把 `unless-stopped` 改成 `always` 之后，`restart` 命令
  不会让它生效，必须 `up -d` 重建。
- **`up -d` 不带 `--build` 不会构建**；但如果你刚手工 `build` 过，镜像 ID 变了，它仍会重建容器。
  所以 `build` + `up -d` 与 `up -d --build` 等价，只是前者能单独看构建日志。
- **`--force-recreate` 不是「重启」**，是删了重建。它解决的是 compose 认为「配置没变」但实际
  状态脏了的情况：挂载的文件被删、镜像被 retag 成同名、容器内被手工改过。
- **`down -v` 在本项目删不掉数据库**。业务数据全是 bind mount（`data/postgres`），
  `-v` 只能删掉 named volume，本项目里只有 dev 编排产生的 `site_node_modules`。
  真要重置数据库：`stop` → `sudo rm -rf data/postgres` → `up -d`（initdb 只在目录为空时执行）。
- **`down` 会连日志一起删**。排障过程中先别 down，`stop` 就够；只有确认要重来才 down。
- **只在仓库根跑 compose**。在 `services/site/` 里跑会生成一个新项目（目录名 `site`），
  容器名 `site` 直接撞名报错；就算不撞名，也会多出一个 `site_default` 网络——
  这台机器的网络列表里已经躺着一个了。

---

## 3. 卷与网络

### 3.1 卷：数据其实不在 Docker 卷里

先纠正一个直觉：本项目的业务数据**不走 Docker 卷**，全是 bind mount 到宿主目录。

```bash
docker compose config | grep -E 'source:|target:|type: bind' | head -8
```

解析结果（路径是绝对路径，由 compose 自己算）：

```
- type: bind
  source: /home/huangqian/project4/hqa-personal-site/nginx/conf.d
  target: /etc/nginx/conf.d
- type: bind
  source: /home/huangqian/project4/hqa-personal-site/data/postgres
  target: /var/lib/postgresql/data
```

```bash
docker volume ls                       # 一堆别的项目的卷，本项目的只有 site_node_modules
docker volume inspect site_node_modules
ls -ln data                            # -n 显示数字 uid，才看得出属主是谁
sudo du -sh data/*                     # 数据目录普通用户读不了，要 sudo
```

要点：

- **挂载路径相对 compose 文件所在目录，不是当前工作目录**。`../../data/postgres` 写在
  `services/postgres/compose.yml` 里，不管你在哪个目录敲命令，解析结果都一样。
- **宿主路径不存在时 Docker 不报错**，会建一个 root 属主的空目录，然后容器起不来或者
  「数据消失」。改数据目录前先 `ls` 一眼。
- **数据属主是容器内 uid**（postgres 是 `70`，redis 是 `999`），`ls -ln` 看到的是数字。
  普通用户删不掉是正常现象，用 `sudo`，**不要 `chmod 777`**。
- **备份数据库前必须停库**：运行中直接 `tar` 数据目录，恢复时可能 WAL 不一致。

```bash
docker compose stop postgres
sudo tar -C data -czf ~/pg-$(date +%F).tar.gz postgres
docker compose start postgres

# 重置数据库（会清空所有数据，先确认备份）
docker compose stop postgres
sudo rm -rf data/postgres
docker compose up -d postgres          # 目录为空，initdb 重新执行
```

> 密码只在数据目录为空时生效，改 `.env` 对已有库无影响 →《架构设计》§9.7

### 3.2 网络：两个 external 网络

```bash
docker network ls --filter name=net
docker network inspect web-net --format '{{range .Containers}}{{.Name}} {{.IPv4Address}}{{"\n"}}{{end}}'
```

输出（实测）：

```
nginx 172.27.0.2/16
site  172.27.0.3/16
```

```bash
docker compose exec nginx getent hosts site    # 验证容器名就是 DNS 名
sudo ss -lnt | grep ':80 '                     # 宿主机谁在监听 80
./scripts/init-networks.sh                     # 幂等，网络丢了就跑它
```

坑：

- **`external: true` 意味着 compose 既不创建也不删除**这两张网络。所以要有一个初始化脚本，
  新机器上第一次 `up` 之前必须先跑。
- **`docker network prune` 是本项目最危险的清理命令**：`down` 之后容器都没了，网络处于
  「没被使用」状态，prune 会照删不误。删完再 `up` 会报
  `network web-net declared as external, but could not be found`。
- **重建 `site` 之后 nginx 会 502**。nginx 只在加载配置时解析一次上游域名并缓存 IP，
  容器换了 IP 就必须 `docker compose exec nginx nginx -s reload`。
- **不要用 `docker network connect` 手工挂网络**：容器重建后失效，等于埋一个只在重启后
  才暴露的坑。
- **端口映射是 Docker 直接写 iptables**，`ports` 里写了 `80:80` 就是对全网监听；
  真正的边界是云厂商安全组，不是「没写 ports」这种错觉。

---

## 4. Compose

### 4.1 解析与校验

```bash
docker compose config --quiet            # 唯一能真正校验整份编排的命令，含 env_file
docker compose config --services         # 只列服务名，不解析 env_file，别拿它当校验
docker compose config | head -40         # 看最终合并结果，排查 include 与变量替换
docker compose ls                        # 这台机器上还有别的项目在跑
```

- **`--services` 只输出名字**，用它「验证配置」会漏掉 `env_file` 缺失这类错误；
  校验一律用 `--quiet`（有问题时非零退出并打印原因）。
- **`env_file` 指向不存在的文件会让整份编排解析失败**，`environment` 才有默认值兜底。
  这是本项目给 `postgres` 建 `.env` 的原因。
- **`include` 进来的服务属于同一个项目**，不是子项目；`docker compose ps` 一次能看到全部。
- **项目名默认取目录名** `hqa-personal-site`，所以镜像名是 `hqa-personal-site-site`。
  在子目录里跑出来的项目叫 `site`，完全是另一套命名空间。
- **compose 文件里的 `$` 会被当变量插值**，健康检查里要写 `$$POSTGRES_USER` 才会传给容器。

### 4.2 日志与健康

```bash
docker compose logs -f --tail=100 site        # 跟实时日志，只看最后 100 行
docker compose logs --since 10m site nginx    # 更适合「刚发了一次请求」
docker compose logs -t site                   # 带时间戳
docker compose logs --no-log-prefix site      # 复制日志内容时去掉前缀

docker inspect -f '{{json .State.Health}}' site | head -c 500   # FailingStreak 与最后一次输出
```

- **重建容器后日志归零**。`down` 或 `up -d` 建了新容器，上一轮的日志就没了——
  这也是排障时先 `stop` 而不是 `down` 的原因（§2.4）。
- **日志有上限**：json-file 驱动配了 `max-size: 10m`、`max-file: 3`，超过就滚掉。
  别指望靠 `logs` 复盘几天前的事故。
- **`--since` 比 `--tail` 更适合事后定位**：`--tail` 只取最后 N 行，
  而「刚才那次请求」可能夹在大量启动日志中间。
- **healthcheck 不会触发重启**，它只是一个状态标记。`healthy` 只说明探针通过，
  不代表服务真的可用（探针打的是 `/healthz`，覆盖不到数据库和渲染路径）。
- 探针报错时，先手工跑一遍探针命令，区分「探针写错了」和「服务真的坏了」：

```bash
docker compose exec -T site node -e "fetch('http://127.0.0.1:4321/healthz').then(r=>console.log(r.status))"
```

- **`site` 容器是 UTC，宿主机是 CST**，日志时间比本地早 8 小时。看到时间对不上先想这个。

### 4.3 更新与回滚

```bash
docker compose pull nginx         # 只有用官方镜像的服务能 pull
docker compose up -d nginx        # 拉到新镜像后重建

docker compose build site
docker compose up -d site         # site 是本地构建，没有 pull 这一步
```

- **`site` 没有「更新镜像」的概念**：它由本地 Dockerfile 构建，`pull` 对它无效。
- **回滚要自己打 tag**：compose 用 `build:` 时没有历史版本，想回滚就在构建后
  `docker tag hqa-personal-site-site:latest hqa-personal-site-site:2026-10-22`，
  出事时改 compose 用 `image:` 指向旧 tag 再 `up -d`。
- **`build` + `up -d` 是两个动作**，前者失败不影响正在跑的容器；`up -d --build`
  是一条命令，失败点没那么清楚。排查阶段建议分开敲。

---

## 5. 排障

### 5.1 五步起手式

固定从外到内，顺序不要反。先 `curl` 入口层，能立刻区分「nginx 挂了」和「应用挂了」；
上来就 `logs site`，很可能在 nginx 才是病根时白看十分钟。

```bash
# 1 整条链路通不通（打首页，不要打 /healthz）
curl -sS -o /dev/null -w '%{http_code}\n' http://localhost/

# 2 谁不在状态
docker compose ps

# 3 最近五分钟发生了什么
docker compose logs --since 5m site nginx

# 4 应用自己还活着吗（绕过 nginx 直接问容器）
docker compose exec -T site node -e "fetch('http://127.0.0.1:4321/healthz').then(r=>console.log(r.status))"

# 5 它是怎么死的
docker inspect -f '{{.State.Status}} exit={{.State.ExitCode}} oom={{.State.OOMKilled}}' site
```

入口层自己也会留痕：nginx 的访问日志在 stdout 里，能看出请求到底有没有被转出去。

```bash
docker compose logs --tail=50 nginx | grep -E ' (502|504) '
```

日期的时区是 `+0000`（UTC），和容器时区一致，见 §5.3。

**别用 `/healthz` 判断站点是否正常**：那个路径是 nginx 自己 `return 200` 的精确匹配，
即使 `site` 完全挂掉它也返回 `ok`。它只能证明「nginx 活着」。

### 5.2 症状 → 命令 → 原因

| 症状 | 先查什么 | 常见原因 |
|---|---|---|
| 502 Bad Gateway | `docker compose ps` + `docker compose logs site` | `site` 没起；或重建后 IP 变了没 reload nginx（§3.2） |
| `host not found in upstream` | `docker compose logs nginx` | 某段 `location` 指向的容器不存在；下线服务时忘了删配置 |
| `unhealthy` 但页面能打开 | 手工跑一遍探针命令 | 探针写错（端口、命令、路径），不是服务坏 |
| 退出码 137 | `docker inspect ... {{.OOMKilled}}` | 内存超限被杀，看 `mem_limit` 或构建抢占 |
| 退出码 1 / 255 | `docker compose logs site` | 应用自己退出，只有日志能回答，别查 Docker |
| `port is already allocated` | `sudo ss -lnt \| grep ':80 '` | 80 被占，这台机上还跑着别的项目 |
| `permission denied`（`data/`） | `ls -ln data` | 属主是容器内 uid，用 `sudo`，不要 `chmod 777` |
| `no space left on device` | `docker system df` | 构建缓存通常比镜像还大，见 §6 |
| 日志时间差 8 小时 | `docker compose exec site date` | 容器 UTC、宿主 CST，不是日志丢了 |
| 改完配置没反应 | 对照 §2.4 判定表 | 用了 `restart` 而不是 `up -d` |

### 5.3 日志为什么看不全

三个原因，按概率排：

1. **容器被重建过**。`up -d`、`down` 之后是新容器，旧日志随旧容器一起删了。
2. **日志有上限**。json-file 驱动配了 10MB × 3 份，超出滚动丢弃。
3. **应用没往 stdout 写**。写进容器内文件的话，`logs` 永远看不到——本项目没这问题，
   但换成别的服务时要留意。

容器时区是 UTC，所以日志里的时间戳比本地早 8 小时。对不上时先换算，别怀疑日志缺了。

---

## 6. 清理与磁盘

### 6.1 先看清楚再动手

```bash
docker system df          # 四类占用与可回收量，先看这张表
docker system df -v       # 细到每个镜像 / 卷
sudo du -sh data/*        # 宿主侧数据目录

# 谁最占地方（这台机器上还有别的项目，别只看本项目）
docker image ls --format '{{.Size}}\t{{.Repository}}:{{.Tag}}' | sort -h | tail -5
```

实测输出（2026-10-22）：

```
TYPE            TOTAL     ACTIVE    SIZE      RECLAIMABLE
Images          34        9         7.568GB   1.394GB (18%)
Containers      15        2         466.9kB   368.6kB (78%)
Local Volumes   12        10        802.8MB   343.3MB (42%)
Build Cache     328       0         8.848GB   2.987GB
```

注意最后一行：**构建缓存比镜像还大**。多数人只盯着 `Images`，清完发现磁盘没变多少。

### 6.2 分危险级别的清理

| 级别 | 命令 | 删什么 | 在本机的实际影响 |
|---|---|---|---|
| 安全 | `docker image prune -f` | dangling 镜像（无 tag） | 无影响 |
| 安全 | `docker builder prune -f --filter until=168h` | 一周前的构建缓存 | 无影响，下次构建变慢 |
| 安全 | `docker compose down --remove-orphans` | 本项目的容器 | 断服，数据不动 |
| 谨慎 | `docker container prune -f` | 所有已退出容器 | **会清掉其他项目停机保留的 13 个容器**，`docker start` 找不回来 |
| 谨慎 | `docker image prune -a` | 没被容器引用的镜像 | **会删基础镜像**，下次构建要重拉数百 MB |
| 危险 | `docker network prune -f` | 无容器连接的网络 | **会删 web-net / db-net**，`up` 直接失败（§3.2） |
| 红线 | `docker system prune -a --volumes` | 上述全部 + 所有卷 | 波及这台机器上其他项目的数据库卷，**永久禁用** |

关于 `docker image prune -a` 的判断依据：它删的是「没有被任何容器引用」的镜像，
不看你是不是还要用它构建。`oven/bun`、`node:22-slim` 这些基础镜像在没有容器运行时
同样算「未引用」，所以清完下次构建会从头拉。

### 6.3 例行节奏

- **每月一次** `docker builder prune -f --filter until=168h`，回收构建缓存。这是性价比最高的清理。
- **项目内清理只用 compose 作用域**：`docker compose down --remove-orphans`。
  全局 prune 只用于跨项目的磁盘回收，别拿它当日常清理。
- **这台机器上永远不要跑**：`docker volume prune`、`docker system prune --volumes`、
  `docker network prune`。前两个会删别的项目的数据库卷，第三个会删本项目的外部网络。

---

## 附：本文的维护方式

- 分三层：**稳定层**（§3 概念、§5 症状表、§6 清理分级）几乎不变；
  **漂移层**（§4 里与 Docker 版本相关的行为）随大版本变；
  **项目耦合层**（容器名、端口、路径、镜像名）已全部收敛到 §0 那张表。
- 换机器、升 Docker 大版本、加服务时重扫一遍 §0 与 §4，其余不用动。
- 本文不写：Docker 安装、Dockerfile 指令教学、`swarm` / `buildx` / `compose watch`、
  registry 与 TLS、应用层排障（那些在《架构设计》§9.5）。
