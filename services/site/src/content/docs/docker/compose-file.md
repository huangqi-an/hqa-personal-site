---
title: 'Compose 文件参考'
description: 'compose.yml 的顶层结构与 services 常用字段，含 include、depends_on、healthcheck、资源限制的写法与边界。'
publishDate: 2026-10-22
order: 3
---

## 文件结构

```yaml
name: myapp                  # 项目名，默认取目录名
include:                     # 把其他文件的服务并入本项目
  - ./nginx/compose.yml
services:
  web:
    image: nginx:stable-alpine
networks:
  web-net:
    external: true
volumes:
  pgdata:
```

| 顶层字段 | 作用 |
|---|---|
| `name` | 项目名，决定容器、网络、卷的前缀 |
| `include` | 合并其他 compose 文件，服务进入同一项目 |
| `services` | 服务定义，唯一必填字段 |
| `networks` | 网络定义，服务通过名字引用 |
| `volumes` | named volume 定义 |
| `configs` / `secrets` | 以文件形式挂载配置与凭据 |

## include

把一个文件里的服务合并进当前项目，而不是另起一个项目。

**示例**

```yaml
include:
  - ./nginx/compose.yml
  - ./services/site/compose.yml
```

**说明**

- 路径相对当前 compose 文件所在目录。
- 合并后的服务同属一个项目，`ps`、`logs`、`down` 一次覆盖全部。
- 不保证 include 的加载顺序，服务之间不要依赖顺序。
- 被 include 的文件仍可单独执行 `docker compose -f` 起停，此时项目名取它的所在目录。

## services 常用字段

下面这些字段都写在 `services.<服务名>` 下，只列常用的。

| 字段 | 说明 |
|---|---|
| `image` | 使用的镜像，与 `build` 二选一 |
| `build` | 由 Dockerfile 构建 |
| `container_name` | 固定容器名，会失去横向扩展能力 |
| `command` / `entrypoint` | 覆盖镜像的启动命令与入口 |
| `ports` / `expose` | 端口发布 / 仅在网络内暴露 |
| `environment` / `env_file` | 运行时环境变量 |
| `volumes` | 挂载目录或文件 |
| `depends_on` | 启动顺序与就绪依赖 |
| `healthcheck` | 健康检查 |
| `restart` | 重启策略 |
| `mem_limit` / `cpus` | 资源上限 |
| `networks` | 加入的网络 |
| `logging` | 日志驱动与滚动策略 |
| `profiles` | 归入可选分组 |
| `user` / `working_dir` | 运行用户与工作目录 |
| `develop` | 配合 `docker compose watch` 的文件同步规则 |

## build

用 Dockerfile 现场构建镜像，而不是从仓库拉取现成的。自己写的服务用 `build`，直接用官方或第三方镜像的用 `image`。

**示例**

```yaml
services:
  site:
    build:
      context: .
      dockerfile: Dockerfile
      target: runtime
      args:
        NODE_ENV: production
```

**说明**

- `context` 是构建上下文，只有该目录内的文件会送进构建器，`COPY` 越不过它。
- `dockerfile` 相对 `context`，默认 `Dockerfile`。
- `target` 选多阶段构建中的一个阶段，用来产出精简的运行镜像。
- `args` 是**构建期**变量，不会留到运行时；运行时变量用 `environment`。
- 与 `image` 同时写时，构建结果会打上该名字，便于回滚。

## ports 与 expose

`ports` 把容器端口**发布到宿主机**，宿主机和外部都能访问；`expose` 只是**声明**容器监听了哪些端口，不会发布到宿主机。

| 字段 | 宿主机能否访问 | 作用 |
|---|---|---|
| `ports` | 能，按 `宿主IP:宿主端口:容器端口` 绑定 | 对外提供服务；或在本机用客户端连数据库 |
| `expose` | 不能 | 声明端口，写入容器配置供查阅，不改变网络可达性 |

**示例**

```yaml
services:
  web:
    ports:
      - "8080:80"                  # 宿主 8080 → 容器 80
      - "127.0.0.1:5432:5432"      # 只绑回环，外部连不上
    expose:
      - "9000"                     # 仅声明，不映射到宿主机
```

**说明**

- 不写宿主 IP 时绑定 `0.0.0.0`，对所有网卡开放；只给本机用就写 `127.0.0.1`。
- `expose` 不做访问控制：同一网络内的容器本来就能访问对方所有监听端口。它的实际效果是把端口写进容器配置（`Config.ExposedPorts`），便于查看。
- 既不发布、也不在同一网络的服务，外部完全不可达，这是数据库的常规做法。
- 端口在容器创建时绑定，改动后必须 `up -d` 重建，`restart` 无效。

## volumes

把容器里的数据放到容器外面：容器删了重建，宿主目录里的东西还在。反过来也成立，可以拿挂载往容器里送配置和初始化脚本。

```yaml
services:
  db:
    volumes:
      - ./data:/var/lib/postgresql/data     # bind mount，相对 compose 文件
      - pgdata:/var/lib/postgresql/data     # named volume
      - ./init:/docker-entrypoint-initdb.d:ro
volumes:
  pgdata:
```

- bind mount 的宿主路径相对 **compose 文件**，不是执行命令时的目录。
- 路径不存在时 Docker 会创建空目录并归 root 所有，容器可能因此启动失败。
- `:ro` 只读挂载，适合配置文件与初始化脚本。
- named volume 由 Docker 管理，`down -v` 会删除；bind mount 不受影响。

## environment 与 env_file

把配置从镜像里拿出来。同一个镜像配不同的变量就能跑不同环境，不必为每套配置单独构建。

```yaml
services:
  web:
    env_file: .env
    environment:
      TZ: Asia/Shanghai
      NODE_ENV: production
```

- `environment` 中的同名变量覆盖 `env_file`。
- `env_file` 指向的文件不存在时整份配置解析失败；`environment` 里写死的是字面量。
- 值里的 `$` 会被 compose 当作变量插值，需要字面量时写成 `$$`，健康检查命令里最常见。
- 布尔与数字会按类型解析，需要字符串时加引号。

## depends_on

声明服务之间的启动顺序，以及是否等对方就绪。

```yaml
services:
  api:
    depends_on:
      postgres:
        condition: service_healthy
        restart: true
```

| 写法 | 语义 |
|---|---|
| `depends_on: [postgres]` | 只保证先启动，不等待就绪 |
| `condition: service_started` | 等对方进程启动 |
| `condition: service_healthy` | 等对方通过 healthcheck，需要对方定义了 `healthcheck` |
| `condition: service_completed_successfully` | 等对方正常退出，适合一次性初始化任务 |
| `restart: true` | 对方被重建时，本服务一并重启 |

短语法在数据库还在初始化时就会放行，应用可能因连不上库而退出，长语法才是「等就绪」。

## healthcheck

定义「这个容器算不算正常」。`docker compose ps` 的健康状态和 `depends_on` 的 `service_healthy` 都读它。

```yaml
services:
  db:
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U \"$$POSTGRES_USER\" -d \"$$POSTGRES_DB\""]
      interval: 30s
      timeout: 5s
      retries: 5
      start_period: 20s
```

- `test` 有三种形式：`CMD` 直接执行、`CMD-SHELL` 交给 shell、`NONE` 禁用。
- `start_period` 内的失败不计入 `retries`，用于容忍较慢的启动。
- 健康状态只记录，不触发重启；`unhealthy` 需要外部机制处理。
- 探针在容器内执行，精简镜像可能没有 `curl` 或 `wget`，需要用运行时自带的工具。

## restart

容器里的进程退出后，是否自动重新拉起。

| 取值 | 行为 |
|---|---|
| `no` | 不自动重启（默认） |
| `always` | 退出就重启，包括手动停止后重新拉起 Docker |
| `on-failure` | 非零退出码时重启 |
| `unless-stopped` | 除手动停止外都重启，常规服务用这个 |

策略在容器创建时确定，修改后需要 `up -d` 重建。

## 资源限制

给单个容器设内存和 CPU 上限，避免一个服务把整机吃满。

```yaml
services:
  web:
    mem_limit: 256m
    cpus: 0.5
```

- `mem_limit` / `cpus` 在 compose（非 Swarm）下直接生效。
- 达到内存上限时进程会被内核终止，容器退出码为 `137`，`inspect` 里 `OOMKilled` 为 `true`。
- `cpus` 是核数，`0.5` 表示半个核，不是百分比。
- 构建过程不受这两个值约束，构建峰值内存另计。

## networks

决定容器之间能不能互通、能不能访问外网。

```yaml
services:
  db:
    networks:
      - db-net

networks:
  db-net:
    external: true
```

- `external: true` 表示网络由外部创建，compose 只使用，不创建也不删除。
- 不写 `external` 时由 compose 创建，名字带项目前缀，`down` 时随之删除。
- `internal: true` 可创建无外网出口的网络，适合数据层。
- 同一网络内用服务名互访，不用记 IP。

## logging

控制日志写到哪里、最多占多少磁盘。

```yaml
services:
  web:
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
```

- 不限制时日志会持续增长，直到占满磁盘。
- `json-file` 是默认驱动，`max-size` 与 `max-file` 共同决定上限。
- 日志随容器删除，`down` 或重建后不保留。

## profiles

把非必需的服务从默认启动里摘出去，需要时再启用。

```yaml
services:
  debug:
    image: nicolaka/netshoot
    profiles: ["tools"]
```

- 声明了 `profiles` 的服务默认不启动，需 `--profile tools` 启用。
- 一个服务可以属于多个 profile。
- 启用方式与优先级见 [Compose](/docs/docker/compose) 的 profiles 一节。

## develop

配合 `docker compose watch`，把宿主文件同步进容器或触发重新构建，省掉反复 build。

```yaml
services:
  web:
    develop:
      watch:
        - action: sync
          path: ./src
          target: /app/src
        - action: rebuild
          path: package.json
```

- 只在 `docker compose watch` 下生效，普通 `up` 不会读取。
- `sync` 把宿主文件同步进容器，`rebuild` 在指定文件变化时重新构建镜像。
- 与 bind mount 的区别是：`sync` 不改变容器的文件系统布局，适合依赖目录被镜像托管的场景。

## 校验

```bash
docker compose config --quiet          # 完整校验，含 env_file 是否存在
docker compose config | head -40       # 查看合并与变量替换后的结果
docker compose config --services       # 只列服务名，不做校验
```

改完 compose 文件先跑一次 `config --quiet`，能在启动前发现字段拼写、缩进与环境文件缺失。
