# 外网访问部署说明

## 推荐方案：Vercel

当前项目是 Next.js 应用，推荐部署到 Vercel。

## 部署前检查

- Supabase 项目已创建。
- 最新 `supabase/schema.sql` 已执行，包含 `app_families`、`app_accounts`、`app_sessions`、`app_family_data` 和登录 RPC。
- `app_accounts` 已包含 `avatar_id` 字段，`update_app_account` 已更新为四参数版本。
- `avatar_id` 允许值已更新为六类家人头像编号，部署前必须重新执行最新 SQL。
- Supabase 中不再保留旧版本 `profiles`、`app_state`、`app_data` 表。
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

如果线上页面停在“正在检查登录状态”，通常是 Vercel 没有配置 Supabase 环境变量，或配置后没有重新部署。

## Supabase 外网配置

当前登录不使用 Supabase Auth 和 OAuth。外网访问主要确认两点：

- Vercel 环境变量指向同一个 Supabase 项目。
- Supabase SQL Editor 已执行最新 `supabase/schema.sql`。

## 本地和外网的区别

- 本地地址：`http://localhost:3333`
- 外网地址：Vercel 部署后的 `https://...vercel.app`
- 应用账号校验和数据保存都走同一个 Supabase 项目。
- 本地 `.env.local` 和 Vercel Environment Variables 必须配置同一组 Supabase URL 和 anon/publishable key。

## 安全要求

- 不要提交 `.env.local`。
- 不要把 Supabase `service_role` key 放进前端。
- Vercel 只配置 Supabase anon/publishable key。
