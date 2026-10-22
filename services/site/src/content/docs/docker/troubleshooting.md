---
title: 'Docker 排障与清理'
description: '从入口到容器的排查顺序、常见错误对照表，以及磁盘占用检查与清理命令。'
publishDate: 2026-10-22
order: 3
---

## 排查顺序

从入口层向内容器逐层确认，每步都能排掉一类原因。

```bash
# 1 入口可达性（返回状态码，不下载正文）
curl -sS -o /dev/null -w '%{http_code}\n' http://localhost/

# 2 服务状态
docker compose ps

# 3 近期日志
docker compose logs --since 5m site nginx

# 4 绕过入口层直接请求应用
docker compose exec -T site node -e "fetch('http://127.0.0.1:3000/healthz').then(r=>console.log(r.status))"

# 5 容器退出原因
docker inspect -f '{{.State.Status}} exit={{.State.ExitCode}} oom={{.State.OOMKilled}}' site
```

第 1 步访问首页而不是探针接口：若 `/healthz` 由入口层直接返回 `200`，
应用停止时该地址仍然可用，无法反映应用状态。

第 3 步之后可进一步筛选入口层的转发结果：

```bash
docker compose logs --tail=50 nginx | grep -E ' (502|504) '
```

## 常见错误

| 现象 | 检查 | 原因 |
|---|---|---|
| `502 Bad Gateway` | `docker compose ps`、`logs site` | 应用未启动；或容器重建后 IP 变化，入口层仍使用缓存地址 |
| `host not found in upstream` | `docker compose logs nginx` | `proxy_pass` 指向的服务不存在，配置未随服务下线更新 |
| 状态 `unhealthy`，服务可用 | 手工执行探针命令 | 探针端口、路径或命令有误 |
| `ExitCode 137` | `docker inspect` 的 `OOMKilled` | 内存超限被 SIGKILL 终止 |
| `ExitCode 1` 或 `255` | `docker compose logs site` | 应用自身退出，原因在日志中 |
| `port is already allocated` | `sudo ss -lnt` | 端口被其他进程或其他项目的容器占用 |
| `permission denied`（数据目录） | `ls -ln data` | 目录属主为容器内 uid，需 `sudo` 操作 |
| `no space left on device` | `docker system df` | 磁盘占满，构建缓存通常占比较大 |
| 日志时间与本地不一致 | `docker compose exec site date` | 容器使用 UTC，宿主机使用本地时区 |
| 修改配置后无变化 | `docker compose ps`、`docker compose config` | 使用了 `restart` 而非 `up -d`，见 [Compose](/docs/docker/compose) |

## docker system df

统计镜像、容器、卷与构建缓存的占用。

**用法**

```bash
docker system df
docker system df -v
```

**示例**

```bash
$ docker system df
TYPE            TOTAL   ACTIVE   SIZE      RECLAIMABLE
Images          34      9        7.568GB   1.394GB (18%)
Containers      15      2        466.9kB   368.6kB (78%)
Local Volumes   12      10       802.8MB   343.3MB (42%)
Build Cache     328     0        8.848GB   2.987GB
```

**说明**

- `SIZE` 为总占用，`RECLAIMABLE` 为可回收量。
- `Build Cache` 常大于 `Images`。
- `-v` 展开到每个镜像与卷，输出较长。

## docker prune

按类别删除未使用的资源。

**用法**

```bash
docker image prune -f
docker builder prune -f --filter until=168h
docker container prune -f
docker network prune -f
docker system prune -a --volumes
```

**说明**

| 命令 | 删除对象 | 影响 |
|---|---|---|
| `docker image prune -f` | 无 tag 的镜像 | 无 |
| `docker builder prune -f --filter until=168h` | 指定时间前的构建缓存 | 下次构建变慢 |
| `docker container prune -f` | 所有已退出容器 | 其他项目停机的容器一并删除，无法 `start` 恢复 |
| `docker network prune -f` | 无容器连接的网络 | 含手工创建的网络，删除后 `external` 网络的服务无法启动 |
| `docker system prune -a --volumes` | 上述全部，外加所有卷 | 共享主机上其他项目的数据库卷一并删除 |

- `image prune -a` 删除所有未被容器引用的镜像，包括 `node`、`python`、`nginx` 等基础镜像，
  下次构建需重新拉取。
- 判断依据是「是否被容器引用」，与是否仍需用于构建无关。

## 例行维护

| 操作 | 命令 |
|---|---|
| 回收构建缓存 | `docker builder prune -f --filter until=168h` |
| 清理本项目容器 | `docker compose down --remove-orphans` |

`docker volume prune`、`docker network prune`、`docker system prune --volumes`
在共享主机上会删除其他项目仍在使用的卷和网络。
