# 家庭许愿墙使用说明

## 运行方式

- 本地访问地址：`http://localhost:3333`
- 启动命令：`npm run dev`
- 当前版本是 Web 原型，不提供苹果安装包。
- 外网部署说明见 `docs/DEPLOYMENT.md`。

## Supabase 配置

当前已接入 Supabase 登录和数据库保存。

配置步骤：

- 在 Supabase 创建项目。
- 在 Supabase SQL Editor 执行 `supabase/schema.sql`。
- 复制 `.env.example` 为 `.env.local`，或确认 `.env.local` 已存在。
- 填写：
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- 重启本地服务。

不要把 Supabase `service_role` key 写进前端或发给别人。
当前本地已配置 Supabase 项目 `jqlgnsatgvwjadbzghfr`。
当前 Supabase 需要执行最新的 `supabase/schema.sql`，创建 `profiles`、`app_state` 表和 RLS 策略。

## GitHub 登录配置

前端已支持 GitHub 登录按钮。还需要在 Supabase 后台启用 GitHub Provider。

配置步骤：

- 在 GitHub 创建 OAuth App。
- Authorization callback URL 填 Supabase 给出的回调地址，格式通常是：
  - `https://jqlgnsatgvwjadbzghfr.supabase.co/auth/v1/callback`
- 在 Supabase Dashboard 打开 Authentication -> Providers -> GitHub。
- 启用 GitHub Provider。
- 填入 GitHub OAuth App 的 Client ID 和 Client Secret。
- 在 Supabase Authentication URL 配置里确认 Site URL 包含本地地址：
  - `http://localhost:3333`
- 部署到外网后，还需要把外网域名加入 Supabase Site URL / Redirect URLs。

不要把 GitHub Client Secret 写进前端代码或 `.env.local`。

如果出现以下错误：

`Unsupported provider: provider is not enabled`

说明 Supabase 的 GitHub Provider 还没有启用，或 Client ID/Client Secret 没有保存成功。需要回到 Supabase Dashboard 的 Authentication -> Providers -> GitHub 检查并启用。

## 数据保存

- 登录 Supabase 后，数据保存到 Supabase 的 `app_state` 表。
- 未配置或未登录 Supabase 时，数据保存到浏览器 `localStorage`。
- 当前第一版云端数据以 JSON 形式保存，后续会拆成家庭成员、愿望、任务、打卡记录等独立数据表。

## 账号切换

打开网页后必须先登录账号密码，也可以使用 GitHub 登录。登录后页面右上角仍保留家庭成员视角切换，用于在当前家庭数据中切换父母/孩子视角。

## 账号管理

登录后页面上方显示账号管理。

支持：

- 查看当前登录邮箱
- 编辑账号昵称
- 修改密码
- 退出登录

账号昵称保存到 Supabase `profiles` 表。邮箱和密码由 Supabase Auth 管理。

- 父母账号：可以访问任务发布和家庭管理。
- 孩子账号：可以访问许愿板块、我的任务，并在许愿墙申领任务。

## 孩子使用流程

### 发布愿望

进入许愿板块后，孩子可以发布或编辑愿望。

需要填写：

- 愿望名称
- 愿望描述
- 愿望类型：物质奖励、旅游奖励、陪玩奖励、其他愿望
- 希望谁兑现：爸爸或妈妈
- 期望时间

### 申领任务

孩子可以在许愿墙上申领待申领任务，也可以进入我的任务查看可申领任务。

### 完成任务

- 打卡任务：孩子每天按任务频率进行打卡。
- 一次性任务、承诺任务：孩子完成后提交完成。
- 任务完成后需要等待父母审核。

### 查看我的任务

我的任务展示孩子自己申领的任务、状态和进展。

## 父母使用流程

### 发布任务

进入任务发布后，父母可以发布或编辑任务。

需要填写：

- 任务名称
- 任务类型：打卡任务、一次性任务、承诺任务
- 奖励类型：物质奖励、旅游奖励、陪玩奖励、其他愿望
- 奖励描述
- 可选关联孩子愿望

如果选择打卡任务，还需要设置：

- 打卡频率：周一到周日可多选
- 截止时间

### 审核任务

孩子完成任务后，父母在任务发布页审核。

- 审核通过后，任务进入已完成。
- 如果任务关联了愿望，愿望进入兑现中。

### 家庭管理

父母可以添加或编辑家庭成员。

添加或编辑父母时：

- 设置姓名
- 设置角色为父母
- 选择爸爸或妈妈

添加或编辑孩子时：

- 设置姓名
- 设置角色为孩子
- 选择性别：男孩或女孩
- 选择家庭称呼：哥哥、弟弟、姐姐、妹妹

## 状态说明

愿望状态：

- 待申领：愿望未关联任务。
- 兑换中：愿望已被任务关联。
- 兑现中：关联任务已完成，等待父母兑现。

任务状态：

- 待申领：任务还没有孩子申领。
- 完成中：孩子已申领并正在完成。
- 已完成：父母已审核通过。

## 安全提醒

当前是本地原型，不要录入孩子真实姓名、学校、地址、联系方式等敏感信息。
