# preset/ — 上游附带素材

上游模板自带的备用素材与示例，**不参与构建**，按需取用：

- `icons/`：9 个 SVG 图标（safari、unity、tailscale、warp、zerotier 等），
  可拷进 `src/assets/tools/` 供关于页的工具 / 技能栏使用
- `components/signature/`：手写签名组件示例（`Signature.astro` + 使用演示 mdx）
- `scripts/cacheAvatars.ts`：友链头像缓存脚本，由根 `package.json` 的
  `cache:avatars` 调用；当前 `site.config.ts` 的 `links.cacheAvatar` 是
  `false`，未启用

用不到就放着；整目录删掉也不影响构建。
