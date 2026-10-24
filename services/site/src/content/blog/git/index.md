---
title: 'Git 常用操作'
publishDate: 2023-11-09
description: '撤销改动、合并冲突、reflog 找回、push 被拒：按场景查命令，附实际输出。'
tags:
  - git
language: '中文'
draft: false
---

## 1. 改动在哪一层

Git 里一段改动会经过四个位置，撤销命令取决于它停在哪：

```
工作区  --add-->  暂存区  --commit-->  本地库  --push-->  远程
```

| 改动在哪 | 想撤销 | 命令 |
| :--- | :--- | :--- |
| 工作区，还没 add | 丢弃修改 | `git restore a.txt` |
| 暂存区，已 add | 退出暂存，保留修改 | `git restore --staged a.txt` |
| 本地库，已 commit | 回退提交 | `git reset --soft/--mixed/--hard` |
| 远程，已 push | 反向提交 | `git revert <hash>` |

**`git status --short` 的两个字符位置**能看出改动停在哪一层：

```
 M a.txt     ← 第二列 M：工作区改了，没 add
M  a.txt     ← 第一列 M：已经 add，在暂存区
MM a.txt     ← 两列都有：add 之后又改了
```

## 2. 撤销

### 还没 add

```bash
git restore a.txt          # 丢弃工作区的修改，回到上次提交的状态
git restore .              # 丢弃所有未 add 的修改
```

`restore` 是 Git 2.23 引入的，老版本用 `git checkout -- a.txt`，效果一样。

**注意：** 被丢弃的修改没有进过 Git，`reflog` 也救不回来，只能靠编辑器历史或备份。

### 已经 add

```bash
git restore --staged a.txt   # 从暂存区撤出，工作区的修改还在
git restore a.txt            # 再丢弃修改（两步都做才算完全撤销）
```

两步分开是有意的：撤出暂存和丢弃修改是两个动作，可以只做前一个。

### 已经 commit，还没 push

`git reset` 有三种模式，区别在于改动退到哪：

| 模式 | 提交记录 | 暂存区 | 工作区 | 典型用途 |
| :--- | :--- | :--- | :--- | :--- |
| `--soft` | 撤销 | 保留（已 add） | 保留 | 想把几个提交合成一个 |
| `--mixed`（默认） | 撤销 | 清空 | 保留 | 想重新挑文件提交 |
| `--hard` | 撤销 | 清空 | **清空** | 彻底丢弃，危险 |

```bash
git reset --soft HEAD~1    # 撤销最近一次提交，改动回到暂存区
git reset HEAD~1           # 同上，但改动回到工作区（未 add）
git reset --hard HEAD~1    # 提交和改动一起丢
```

`--soft` 之后 `git status` 会看到改动仍然处于已 add 状态，可以直接重新提交。

### 已经 push

本地可以用 `reset` 改历史，远程不能。已经推上去的提交，用 `revert` 生成一个反向提交：

```bash
git revert <hash>          # 新建一个提交，抵消 <hash> 的改动
git revert HEAD            # 撤销最近一次提交
```

`revert` 不改历史，别人拉代码不会出问题。撤销合并提交要加 `-m 1`，指定保留哪个父提交。

## 3. 提交写错了

**改最近一次提交的信息：**

```bash
git commit --amend -m "fix: 改成正确的信息"
```

**漏了文件：**

```bash
git add forgotten.js
git commit --amend --no-edit    # 合进上一个提交，信息不变
```

**注意：** `amend` 会生成新的提交（hash 变了）。已经 push 的提交再 `amend`，推上去必须强推，别人拉下来会冲突。只在本地改。

## 4. 分支与合并

```bash
git switch -c feature      # 新建并切换
git switch main            # 切回
git switch -               # 切回上一个分支
git branch -d feature      # 删除已合并的分支
git branch -D feature      # 强制删除（未合并也删）
```

`switch` 和 `restore` 是 Git 2.23 从 `checkout` 拆出来的，`checkout` 还能用，只是语义混在一起。

**合并产生冲突时**，`git status` 会标出冲突文件：

```
AA b.txt
```

`AA` 表示双方都新增/修改了同一个文件。打开文件能看到冲突标记：

```
<<<<<<< HEAD
main 改动
=======
feature 改动
>>>>>>> feature
```

处理流程固定三步：

```bash
# 1. 编辑文件，删掉标记，留下想要的内容
# 2. 标记为已解决
git add b.txt
# 3. 提交合并
git commit
```

不想合并了，回到合并前：

```bash
git merge --abort
```

## 5. 变基

`rebase` 把当前分支的提交「搬」到目标分支最新提交之后，历史是一条直线。

```bash
git switch feature
git rebase main
```

冲突处理和 merge 类似，但命令不同：

```bash
# 解决冲突后
git add b.txt
git rebase --continue

# 放弃变基，回到开始前
git rebase --abort
```

**merge 与 rebase 的区别：**

| | merge | rebase |
| :--- | :--- | :--- |
| 历史 | 保留分叉，多一个合并提交 | 一条直线 |
| 提交 hash | 不变 | 全部重写，hash 变 |
| 适合 | 公共分支、已推送的分支 | 本地分支、提交还没推 |

**已经推送的分支不要 rebase。** 别人基于旧提交写的代码，rebase 之后会对不上。真要改，用 `git push --force-with-lease`，并且提前通知协作者。

## 6. 搞砸了：reflog

`reflog` 记录 HEAD 的每一次移动，包括 reset、checkout、commit、rebase。误操作之后先看它：

```bash
git reflog
```

输出大概是这样，每行左边是当时的提交 hash，右边是动作：

```
9fbb18c HEAD@{0}: commit (merge): Merge branch 'feature'
24f17de HEAD@{1}: commit: feat: main 加 b.txt
355a03d HEAD@{2}: checkout: moving from feature to main
4732eb3 HEAD@{7}: commit: feat: 追加第二行
```

**误执行了 `reset --hard`：**

```bash
git reset --hard HEAD@{1}    # 回到上一个位置
```

**误删了分支：**

```bash
git reflog                     # 找到分支最后一个提交的 hash
git switch -c feature <hash>   # 用它重建分支
```

**能救什么：** 只要提交过（commit、stash、rebase 中间态），都能通过 reflog 找回来。默认保留 90 天。

**救不回什么：** 从没被 Git 记录过的改动，比如 `reset --hard` 之前没 add 的修改。`restore` 丢掉的修改同样救不回。

## 7. 暂存与远程

### 临时保存：stash

改到一半要切分支，不想提交半成品：

```bash
git stash              # 收进暂存栈，工作区变干净
git stash list         # 查看，stash@{0} 是最近一次
git stash pop          # 取出并删除记录
git stash apply        # 取出但保留记录
```

`stash` 默认不收未跟踪的新文件，要收加 `-u`。

### fetch 与 pull

```bash
git fetch origin       # 只下载远程的提交，不动工作区
git pull               # fetch + merge，等于两步合一
git pull --rebase      # fetch + rebase，历史更干净
```

不确定远程改了什么，先 `fetch` 再 `git log origin/main`，看清楚再决定合并方式。

### push 被拒

```
! [rejected]        main -> main (fetch first)
error: failed to push some refs
```

远程有你本地没有的提交。先拉再推：

```bash
git pull --rebase origin main
git push
```

直接 `--force` 会把别人的提交冲掉。确实需要覆盖时用：

```bash
git push --force-with-lease
```

它会在远程分支与你上次拉取的不一致时拒绝推送，比 `--force` 安全一档，但仍然会改写历史。

## 8. 常见报错对照

| 报错 | 原因 | 处理 |
| :--- | :--- | :--- |
| `Your local changes would be overwritten by merge` | 工作区有未提交的改动，和目标分支冲突 | `git stash` 后再合并，或先提交 |
| `Updates were rejected because the remote contains work` | 远程有本地没有的提交 | `git pull --rebase` 后重新 push |
| `refusing to merge unrelated histories` | 两个仓库没有共同祖先 | 确认要合并后加 `--allow-unrelated-histories` |
| `detached HEAD` | 切到了某个提交而不是分支 | `git switch -c new-branch` 保存当前工作 |
| `fatal: not a git repository` | 不在仓库目录里 | `cd` 到仓库根目录，或检查 `.git` 是否被删 |
| `Please commit your changes or stash them` | 切分支时工作区有改动会被覆盖 | 同上，先 stash 或提交 |

**detached HEAD 值得单独说。** 直接 `git checkout <hash>` 会进入游离状态，此时提交的代码不属于任何分支，切走就可能丢。要保留就立刻建分支：

```bash
git switch -c fix-from-old
```
