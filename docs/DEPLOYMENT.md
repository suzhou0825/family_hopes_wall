# 外网访问部署说明

## 推荐方案：Vercel

当前项目是 Next.js 应用，推荐部署到 Vercel。

## 部署前检查

- Supabase 项目已创建。
- 最新 `supabase/schema.sql` 已执行，包含 `profiles` 和 `app_state`。
- 本地 `.env.local` 已配置：
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- 本地验证通过：
  - `npm run typecheck`
  - `npm run build`

## Vercel 部署步骤

1. 将项目推送到 GitHub 仓库。
2. 在 Vercel 创建新项目并导入该 GitHub 仓库。
3. Framework Preset 选择 Next.js。
4. 在 Vercel 项目 Environment Variables 中添加：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. 触发部署。
6. 部署完成后，记录 Vercel 生成的域名，例如：
   - `https://your-project.vercel.app`

## Supabase 外网配置

部署完成后，需要回到 Supabase Dashboard 配置 URL。

在 Authentication -> URL Configuration 中设置：

- Site URL：
  - `https://your-project.vercel.app`

- Redirect URLs 添加：
  - `http://localhost:3333`
  - `https://your-project.vercel.app`

如果使用 GitHub 登录，还需要检查 GitHub OAuth App：

- Authorization callback URL 保持为：
  - `https://jqlgnsatgvwjadbzghfr.supabase.co/auth/v1/callback`

Supabase GitHub Provider 中继续保存 GitHub Client ID 和 Client Secret。

## 本地和外网的区别

- 本地地址：`http://localhost:3333`
- 外网地址：Vercel 部署后的 `https://...vercel.app`
- 登录和数据保存都走同一个 Supabase 项目。

## 安全要求

- 不要提交 `.env.local`。
- 不要把 Supabase `service_role` key 放进前端。
- 不要把 GitHub Client Secret 写进项目文件。
- Vercel 只配置 Supabase anon/publishable key。
