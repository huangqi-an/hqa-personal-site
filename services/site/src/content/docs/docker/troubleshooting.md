---
title: 'Docker 排障与清理'
description: '从入口到容器的五步排查顺序、常见症状对应的命令和原因，以及按危险级别分级的镜像、容器与构建缓存清理。'
publishDate: 2026-10-22
order: 3
---

## 五步起手式

固定从外到内，顺序不要反。先 `curl` 入口层，能立刻区分「入口挂了」和「应用挂了」；
上来就翻应用日志，很可能在入口才是病根时白看十分钟。

```bash
# 1 整条链路通不通（打首页，不要只打探针）
curl -sS -o /dev/null -w '%{http_code}\n' http://localhost/

# 2 谁不在状态
docker compose ps

# 3 最近五分钟发生了什么
docker compose logs --since 5m site nginx
```

```bash
# 4 应用自己还活着吗（绕过入口层，直接问容器）
docker compose exec -T site node -e "fetch('http://127.0.0.1:3000/healthz').then(r=>console.log(r.status))"

# 5 它是怎么死的
docker inspect -f '{{.State.Status}} exit={{.State.ExitCode}} oom={{.State.OOMKilled}}' site
```

**别用探针接口判断站点是否正常**：如果 `/healthz` 是入口层自己 `return 200` 的，
那即使应用完全挂掉它也返回 `ok`，只能证明入口活着。

入口层也会留痕，访问日志在 stdout 里：

```bash
docker compose logs --tail=50 nginx | grep -E ' (502|504) '
```

## 症状对照表

| 症状 | 先查什么 | 常见原因 |
|---|---|---|
| 502 Bad Gateway | `docker compose ps` 与 `logs site` | 应用没起；或重建后 IP 变了没 reload 入口 |
| `host not found in upstream` | `docker compose logs nginx` | 某段 location 指向的容器不存在，下线服务时忘了删配置 |
| `unhealthy` 但页面能打开 | 手工跑一遍探针命令 | 探针写错（端口、命令、路径），不是服务坏 |
| 退出码 137 | `docker inspect` 看 `OOMKilled` | 内存超限被杀，或构建把整机内存抢光 |
| 退出码 1 / 255 | `docker compose logs site` | 应用自己退出，只有日志能回答 |
| `port is already allocated` | `sudo ss -lnt` 看端口 | 端口被其他进程或其他项目的容器占用 |
| `permission denied`（数据目录） | `ls -ln data` | 属主是容器内 uid，用 `sudo`，不要 `chmod 777` |
| `no space left on device` | `docker system df` | 构建缓存通常比镜像还大 |
| 日志时间差几小时 | `docker compose exec site date` | 容器 UTC、宿主机本地时区 |
| 改完配置没反应 | 对照 [Compose](/docs/docker/compose) 的判定表 | 用了 `restart` 而不是 `up -d` |

## 日志为什么看不全

三个原因，按出现概率排：

1. **容器被重建过**。`up -d`、`down` 之后是新容器，旧日志随旧容器一起删了。
2. **日志有滚动上限**。常见配置是单文件 10MB、保留 3 份，超出就丢弃。
3. **应用没往 stdout 写**。写进容器内文件的话，`logs` 永远看不到，得进容器读文件。

容器时区默认是 UTC，日志时间比本地早几个小时。对不上时先换算，别怀疑日志缺了。

## 先看清磁盘占用

```bash
docker system df          # 四类占用与可回收量，先看这张表
docker system df -v       # 细到每个镜像、卷
sudo du -sh data/*        # 宿主侧的数据目录

# 谁最占地方（共享主机上，别只看自己的项目）
docker image ls --format '{{.Size}}\t{{.Repository}}:{{.Tag}}' | sort -h | tail -5
```

看 `docker system df` 时注意最后一行：**构建缓存常常比镜像还大**。
多数人只盯着 `Images`，清完发现磁盘没怎么变。

## 按危险级别清理

| 级别 | 命令 | 删什么 | 影响 |
|---|---|---|---|
| 安全 | `docker image prune -f` | dangling 镜像（无 tag） | 无 |
| 安全 | `docker builder prune -f --filter until=168h` | 一周前的构建缓存 | 无，下次构建会变慢 |
| 安全 | `docker compose down --remove-orphans` | 本项目的容器 | 断服，数据不动 |
| 谨慎 | `docker container prune -f` | 所有已退出容器 | 会清掉其他项目停机保留的容器，`docker start` 也找不回来 |
| 谨慎 | `docker image prune -a` | 没被容器引用的镜像 | 会删基础镜像，下次构建要重拉 |
| 危险 | `docker network prune -f` | 无容器连接的网络 | 会删掉你自己建的网络，`up` 直接失败 |
| 红线 | `docker system prune -a --volumes` | 上述全部 + 所有卷 | 波及共享主机上其他项目的数据库卷 |

`docker image prune -a` 的判断依据是「没有被任何容器引用」，不看你是不是还要拿它构建。
`node`、`python`、`nginx` 这些基础镜像在没有容器运行时同样算「未引用」，所以清完下次构建会从头拉。

## 例行节奏

- **每月一次** `docker builder prune -f --filter until=168h`，回收构建缓存。性价比最高。
- **项目内清理只用 compose 作用域**：`docker compose down --remove-orphans`。
  全局 prune 只用于跨项目的空间回收。
- **共享主机上永远不要跑**：`docker volume prune`、`docker system prune --volumes`。
  它们会删掉其他项目（包括你自己）的数据库卷。
- **`docker network prune` 也要避开**：自己用 `docker network create` 建的网络同样算「没被使用」，
  删掉之后所有 `external` 网络的服务都起不来。
