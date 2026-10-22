---
title: 'Docker 基础操作：容器、镜像、卷与网络'
description: '查看容器状态、进容器执行命令、构建镜像，以及卷和网络的挂载与互通方式。附常用命令和容易踩空的地方。'
publishDate: 2026-10-22
order: 1
---

## 怎么用这份速查

- 文中出现的 `site` 是应用服务、`nginx` 是入口、`postgres` 和 `redis` 是数据层，换成你自己的服务名即可。
- 命令可以整行复制，不带 `$` 前缀。
- 带 `docker compose` 的命令都在项目根执行，也就是放着 `compose.yml` 的那个目录。
- 这份是基础操作；编排相关看 [Compose](/docs/docker/compose)，出事之后看 [排障与清理](/docs/docker/troubleshooting)。

## 看清现在跑着什么

```bash
docker compose ps                    # 带 health 状态，日常只看这个
docker compose ps -a                 # 连已退出的也列出来
docker ps --filter name=site         # 共享主机上容器多时，按名字过滤
docker stats --no-stream             # 一次采样就退出，别开流式刷新
docker compose images                # 每个服务用的镜像、tag、大小
docker compose top site              # 容器里的进程树
```

要判断「怎么死的」，比看日志更快的是问容器自己：

```bash
docker inspect -f '{{.State.Status}} health={{.State.Health.Status}} exit={{.State.ExitCode}} oom={{.State.OOMKilled}}' site
```

正常时输出 `running health=healthy exit=0 oom=false`。四个字段分别回答：还在跑吗、健康检查过没过、退出码是多少、是不是被 OOM 杀的。

几个容易读错的地方：

- **`docker ps` 不显示 health**，只有 `docker compose ps` 有。判断「活着」要用后者。
- **`docker stats` 的 `MEM %` 分母是 `mem_limit`**，不是整机内存。显示 60% 只说明用掉了配额的六成，不代表机器快满了。
- **退出码 137 是 SIGKILL**，最常见的原因是内存超限。用上面的 `OOMKilled` 字段确认，别猜。
- **`--no-stream` 不是可选项**：流式 `stats` 会持续采样，在小机器上有可感知开销。

## 进容器执行

```bash
docker compose exec site sh                        # 大多数基础镜像都有 sh
docker compose exec -u root site sh                # 容器以普通用户运行时，写文件才需要 root
docker compose exec -T site sh -c 'ls -l /app'     # 脚本或管道里必须加 -T
docker compose exec -T -w /app site pwd            # -w 指定工作目录，省掉 cd
docker compose exec nginx nginx -t                 # 改完配置先自检
docker compose exec nginx nginx -s reload          # 自检通过再热加载
```

数据层同理，凭据从容器内的环境变量取，不要写死在命令里：

```bash
docker compose exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
docker compose exec redis redis-cli
docker compose run --rm --no-deps site node -e 'console.log(process.version)'   # 一次性容器
```

- **不是所有镜像都有 `curl` / `wget`**。精简镜像通常只留了运行时和 `sh`，探活要用运行时自带的工具
  （Node 用 `node -e fetch(...)`，Python 用 `python -c urllib...`）。
- **`-T` 不加会报 `the input device is not a TTY`**，因为默认要分配终端。
- **`exec` 只对运行中的容器有效**。已退出的要先 `docker compose start site`；
  容器在重启循环里时 `exec` 会直接失败——这本身就是个诊断信号。
- **在容器里改的东西随容器消失**，下次重建就归零。用来定位问题可以，别当修复手段。
- `docker compose exec` 依赖项目上下文，必须在项目根执行；`docker exec nginx sh` 在任何目录都行。

## 构建镜像

```bash
docker compose build site                    # 只构建，不上线
docker compose build --progress=plain site   # 看每一层的完整输出，排查卡在哪
docker compose build --no-cache site         # 最后手段，代价见下
docker image history myapp-site --format '{{.Size}}\t{{.CreatedBy}}' | head -8
```

镜像名默认是 `<项目目录名>-<服务名>`，所以要先知道自己的项目叫什么，`docker compose images` 里能看到。

- **`--no-cache` 是全量重来**：基础镜像要重拉（如果也被清了）+ 依赖全量重装。只在
  「依赖明明变了却装不上」或「怀疑缓存坏了」时用。
- **依赖层缓存的前提是 Dockerfile 里的顺序**：`COPY package.json`（或 lock 文件）必须在
  `COPY . .` 之前。改了这两行顺序，等于永久放弃依赖缓存。
- **构建不受 `mem_limit` 约束**，它是一次性进程而不是服务，峰值内存常是运行时的数倍。
  小内存机器上构建前先 `docker compose stop postgres redis`，构建完再 `up -d` 恢复。
- **lock 文件没更新会让构建失败**，报错长得像网络问题。先核对 lock 是否与 `package.json` 同步，
  再去怀疑镜像源。
- **镜像大小以 `docker image ls` 为准**。`docker compose images` 报的 SIZE 口径不同，会明显偏小，
  拿它判断瘦身效果会得出错误结论。

## 卷与数据目录

先确认数据到底挂在哪：

```bash
docker compose config | grep -E 'source:|target:|type: bind' | head -8
```

输出里的 `source` 是 compose 按**自己所在位置**换算出的绝对路径，形如：

```
- type: bind
  source: /srv/myapp/nginx/conf.d
  target: /etc/nginx/conf.d
```

```bash
docker volume ls                    # named volume 在这里
docker volume inspect <卷名>
ls -ln data                         # -n 显示数字 uid，才看得出属主是谁
sudo du -sh data/*                  # 数据目录普通用户读不了
```

- **挂载路径相对 compose 文件，不是当前目录**。`../data/postgres` 写在哪一层 compose 里，
  就相对哪一层解析，换目录执行结果一样。
- **宿主路径不存在时 Docker 不报错**，会建一个 root 属主的空目录，然后容器起不来或者
  「数据消失」。改数据目录前先 `ls` 一眼。
- **数据目录属主是容器内运行用户的 uid**，不同镜像不一样，`ls -ln` 看到的是数字。
  普通用户删不掉是正常现象，用 `sudo`，不要 `chmod 777`。

备份前先停库，运行中直接打包可能拿到不一致的快照：

```bash
docker compose stop postgres
sudo tar -C data -czf ~/pg-$(date +%F).tar.gz postgres
docker compose start postgres
```

要彻底重置数据（**会清空所有数据**）：

```bash
docker compose stop postgres
sudo rm -rf data/postgres
docker compose up -d postgres        # 目录为空，初始化脚本会重新执行
```

## 网络与容器发现

```bash
docker network create web-net        # 已存在会报错，脚本里可以加 || true
docker network create db-net
docker network ls --filter name=net
docker network inspect web-net --format '{{range .Containers}}{{.Name}} {{.IPv4Address}}{{"\n"}}{{end}}'
```

输出形如（地址每次重建都可能变）：

```
nginx 172.18.0.2/16
site  172.18.0.3/16
```

```bash
docker compose exec nginx getent hosts site    # 验证容器名就是 DNS 名
sudo ss -lnt | grep ':80 '                     # 宿主机谁在监听 80
```

- **`external: true` 的网络由你事先创建**，compose 既不建也不删。新机器第一次 `up` 之前要先建好。
- **容器之间用服务名互访**，不用记 IP；IP 会随重建变化。
- **nginx 只在加载配置时解析一次上游域名并缓存**。上游容器重建换了 IP 之后必须
  `nginx -s reload`，否则会一直 502。排查方法见 [排障与清理](/docs/docker/troubleshooting)。
- **不要用 `docker network connect` 手工挂网络**，容器重建后失效，等于埋一个只在重启后才暴露的坑。
- **端口映射是 Docker 直接写 iptables**，`ports` 写了 `80:80` 就是对全网监听，
  真正的边界是安全组或防火墙。
