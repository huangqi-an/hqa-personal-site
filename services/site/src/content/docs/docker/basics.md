---
title: 'Docker 基础操作：容器、镜像、卷与网络'
description: '查看容器状态、进容器执行命令、构建镜像，以及卷和网络的挂载与互通方式。'
publishDate: 2026-10-22
order: 1
---

## 约定

文中服务名 `site`（应用）、`nginx`（入口）、`postgres`、`redis`（数据层）均为示例，替换为实际名称。
带 `docker compose` 的命令在 `compose.yml` 所在目录执行。

## docker compose ps

列出项目内的容器及其状态。

**用法**

```bash
docker compose ps [OPTIONS] [SERVICE...]
docker compose ps -a
```

**示例**

```bash
$ docker compose ps
NAME    STATUS
nginx   Up 2 hours (healthy)
site    Up 2 hours (healthy)
```

**说明**

- `(healthy)` 来自 healthcheck，`docker ps` 的 `STATUS` 列不含该信息。
- `-a` 包含已退出容器，状态形如 `Exited (1) 3 minutes ago`。
- 与 `docker ps` 的区别是按项目过滤，并显示健康状态。

## docker stats

输出容器的 CPU、内存、网络与磁盘 I/O。

**用法**

```bash
docker stats --no-stream [SERVICE...]
docker stats --format 'table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}'
```

**示例**

```bash
$ docker stats --no-stream
NAME    MEM USAGE / LIMIT     MEM %
site    127.4MiB / 256MiB     49.77%
```

**说明**

- `MEM %` 的分母是 compose 的 `mem_limit`，不是宿主机内存。
- 不带 `--no-stream` 时进入持续刷新模式，占用一个前台终端。

## docker inspect

读取容器的完整状态，`-f` 用 Go 模板取字段。

**用法**

```bash
docker inspect -f \
  '{{.State.Status}} {{.State.ExitCode}} {{.State.OOMKilled}}' \
  site
docker inspect -f '{{json .State.Health}}' site
```

**示例**

```bash
$ docker inspect -f '{{.State.Status}} {{.State.ExitCode}} {{.State.OOMKilled}}' site
running 0 false
```

**说明**

- `ExitCode` 为 `137` 表示进程被 SIGKILL 终止，常见原因是内存超限，以 `OOMKilled` 字段确认。
- `ExitCode` 为 `1` 或 `255` 表示应用自身退出，错误信息在容器日志中。
- `Health.Status` 仅在容器定义了 healthcheck 时有值。
- 输出是 JSON 数组，即使只查一个容器；`-f` 会展开为单个对象。

## docker compose exec

在运行中的容器内执行命令。

**用法**

```bash
docker compose exec [OPTIONS] SERVICE COMMAND [ARGS...]
```

**示例**

```bash
$ docker compose exec site sh
$ docker compose exec -T site sh -c 'ls -l /app'
$ docker compose exec -T -w /app site pwd
/app
```

**说明**

- `-T` 关闭 TTY 分配；在脚本、管道或 CI 中使用时必须加，否则报 `the input device is not a TTY`。
- `-w` 指定工作目录，`-u` 指定用户（容器以非 root 运行时写文件需要 `-u root`）。
- 仅对运行中的容器有效；已退出的容器需先 `docker compose start`，启动中或重启循环中的容器会直接失败。
- 精简镜像不一定包含 `bash`、`curl`、`wget`，可用 `sh` 并借助运行时自带的网络能力。
- 容器内的文件变更在容器重建后丢失。

```bash
docker compose exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
docker compose exec redis redis-cli
```

## docker compose run

以服务配置启动一次性容器。

**用法**

```bash
docker compose run --rm --no-deps SERVICE COMMAND
```

**示例**

```bash
$ docker compose run --rm --no-deps site node -e 'console.log(process.version)'
```

**说明**

- `--rm` 退出后删除容器；不加会保留，需手工清理。
- `--no-deps` 不启动依赖服务，避免带起数据层。
- `-e KEY=VALUE` 覆盖环境变量，仅对这次运行生效；`--env-from-file` 从文件读取。
- `--name` 指定容器名，便于之后 `docker logs` 或 `docker rm`。
- `--entrypoint` 覆盖镜像的入口，常用于临时进容器排查。
- `-T` 关闭 TTY，在脚本或管道里执行时使用。
- `--service-ports` 按服务配置发布端口，默认不发布。
- 与 `exec` 的区别是不操作正在运行的实例。

## docker compose build

构建服务镜像。

**用法**

```bash
docker compose build [OPTIONS] [SERVICE...]
```

**示例**

```bash
$ docker compose build site
$ docker compose build --progress=plain site
$ docker compose build --no-cache site
```

**说明**

- 只构建镜像，不替换运行中的容器，需再执行 `docker compose up -d`。
- `--progress=plain` 输出每层日志，便于定位卡住的步骤。
- `--no-cache` 跳过所有缓存层，基础镜像需重新拉取、依赖全量重装。
- 依赖层缓存依赖 Dockerfile 顺序：清单文件（`package.json` 等）的 `COPY` 必须在 `COPY . .` 之前。
- 构建是一次性进程，不受服务 `mem_limit` 约束，峰值内存高于运行期。

## docker image history

列出镜像的分层及每层大小。

**用法**

```bash
docker image history IMAGE --format '{{.Size}}\t{{.CreatedBy}}'
```

**示例**

```bash
$ docker image history myapp-site --format '{{.Size}}\t{{.CreatedBy}}' | head -3
379MB   COPY /web/node_modules ./node_modules
5.87MB  COPY /web/dist ./dist
0B      CMD ["node" "./dist/server/entry.mjs"]
```

**说明**

- 镜像名默认为 `<项目目录名>-<服务名>`，可由 `docker compose images` 查得。
- `docker compose images` 的 `SIZE` 与 `docker image ls` 口径不同，判断镜像体积以 `docker image ls` 为准。

## 数据卷与 bind mount

查看数据在宿主机的实际位置。

**用法**

```bash
docker compose config | grep -E 'source:|target:|type: bind'
docker volume ls
docker volume inspect VOLUME
```

**示例**

```bash
$ docker compose config | grep -E 'source:|target:|type: bind'
- type: bind
  source: /srv/myapp/data/postgres
  target: /var/lib/postgresql/data
```

**说明**

- `source` 是 compose 按自身文件位置解析出的绝对路径，与执行命令时的目录无关。
- bind mount 的数据不在 `docker volume` 中，`down -v` 不会删除。
- 宿主机路径不存在时 Docker 会创建空目录，属主为 root，容器可能因此启动失败。
- 数据目录属主为容器内运行用户的 uid，`ls -ln` 显示数字属主；普通用户需 `sudo` 操作。

**备份**

```bash
docker compose stop postgres
sudo tar -C data -czf ~/pg-$(date +%F).tar.gz postgres
docker compose start postgres
```

运行中的数据库直接打包可能得到不一致的快照，停库后再执行。

**重置**

```bash
docker compose stop postgres
sudo rm -rf data/postgres
docker compose up -d postgres
```

目录为空时初始化脚本会重新执行，原有数据不可恢复。

## docker network

管理与容器的网络互通。

**用法**

```bash
docker network create NETWORK
docker network ls
docker network inspect NETWORK \
  --format '{{range .Containers}}{{.Name}} {{.IPv4Address}}{{"\n"}}{{end}}'
```

**示例**

```bash
$ docker network inspect web-net --format '{{range .Containers}}{{.Name}} {{.IPv4Address}}{{"\n"}}{{end}}'
nginx 172.18.0.2/16
site  172.18.0.3/16
```

**说明**

- 容器名即 DNS 名，容器间用服务名互访，IP 随重建变化。
- `external: true` 的网络由外部创建，compose 不负责创建或删除，新机器首次启动前需存在。
- 网络已存在时 `docker network create` 报错，脚本中可追加 `|| true`。
- 手工 `docker network connect` 添加的网络在容器重建后丢失。

```bash
docker compose exec nginx getent hosts site
sudo ss -lnt | grep ':80 '
```

`getent hosts` 验证 DNS 解析，`ss -lnt` 查看宿主机端口占用。入口层在启动时解析上游地址并缓存，
上游容器重建后需重载配置，见 [Compose](/docs/docker/compose) 的 `nginx -s reload`。
