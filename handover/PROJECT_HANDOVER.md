# 项目开发交接文档（跨窗口复用版）

## 零、交接快照

| 项目 | 当前值 |
| --- | --- |
| 文档生成时间 | 2026-06-20，Asia/Shanghai |
| 项目名称 | 家庭许愿墙 / `family-wish-wall` |
| 工作区 | `/Users/donysu/Documents/Codex/家庭许愿墙` |
| GitHub 仓库 | `git@github.com:suzhou0825/family_hopes_wall.git` |
| 当前分支 | `main` |
| 基准提交 | `24158fe47a9c6afcfc32ddec756fd3014cb5e544`（`Implement family account management`） |
| 本地开发地址 | `http://localhost:3333` |
| Supabase project ref | `jqlgnsatgvwjadbzghfr` |
| Supabase URL | `https://jqlgnsatgvwjadbzghfr.supabase.co` |
| Vercel 项目 URL | 待确认，需要从 Vercel Dashboard 获取 |
| 自定义域名 | 待确认，当前仓库没有记录 |
| Supabase 区域 | 待确认，需要从 Supabase Dashboard 获取 |

生成本文档前 Git 工作区为干净状态。本文档及生成规范创建后会形成新的未提交文档改动，后续提交前应重新运行 `git status`。

### 事实来源

本文档以当前代码、`supabase/schema.sql`、Git 状态和 `docs/` 为准。历史对话中已经被后续实现替代的 Supabase Auth、GitHub OAuth、邮箱映射方案不属于当前架构。

## 一、项目概述

### 1. 业务背景与核心功能

家庭许愿墙用于加强父母与子女沟通：孩子表达愿望，父母发布带奖励的任务，孩子完成任务后推动愿望进入兑现阶段。

核心角色：

- 父母：爸爸、妈妈。
- 孩子：哥哥、弟弟、姐姐、妹妹。

核心流程：

1. 第一个父母在登录页主动注册，系统创建新家庭。
2. 已登录父母在家庭管理中创建第二个父母账号或孩子账号。
3. 孩子登录后发布愿望、申领任务、执行打卡或提交完成。
4. 父母发布任务、设置奖励、可关联孩子愿望，并审核任务完成。
5. 关联任务审核通过后，愿望进入兑现中，由家庭线下兑现。

愿望状态机：

```text
待申领 -> 兑换中 -> 兑现中
```

- 待申领：愿望没有关联任务。
- 兑换中：愿望已被任务关联。
- 兑现中：关联任务已完成并通过父母审核。

任务状态机：

```text
待申领 -> 完成中 -> 已完成
```

- 待申领：任务尚未被孩子申领。
- 完成中：孩子已申领并执行。
- 已完成：孩子提交后由父母审核通过。

任务类型：

- 打卡任务：设置周一至周日频率和截止日期，孩子按天打卡。
- 一次性任务。
- 承诺任务。

愿望与奖励类型：

- 物质奖励。
- 旅游奖励。
- 陪玩奖励。
- 其他愿望。

### 2. 部署架构

```text
开发电脑
  -> GitHub: suzhou0825/family_hopes_wall
  -> Vercel 自动构建 Next.js
  -> 浏览器直接使用 Supabase publishable/anon key 调用 RPC
  -> Supabase PostgreSQL 保存账号、会话和家庭 JSON 数据
```

已确认：

- 前端代码托管于 GitHub。
- 前端部署平台为 Vercel。
- 数据库服务为 Supabase PostgreSQL。
- Vercel 与本地必须连接同一个 Supabase 项目。

待确认：

- Vercel 实际 Production URL。
- 是否绑定自定义域名。
- 自定义域名 DNS 服务商和当前记录。

### 3. 技术栈完整清单

| 分类 | 技术 |
| --- | --- |
| 前端框架 | Next.js 15 |
| UI | React 19、原生 JSX、手写 CSS |
| 语言 | TypeScript 5.7，strict mode |
| 数据库 SDK | `@supabase/supabase-js` 2.x |
| 数据库 | Supabase PostgreSQL |
| 密码哈希 | PostgreSQL `pgcrypto`，bcrypt/`crypt` |
| 部署 | Vercel |
| 代码托管 | GitHub，SSH remote |
| 包管理 | npm，lockfile v3 |
| 类型检查 | `tsc --noEmit` |

当前没有：

- UI 组件库。
- Tailwind CSS。
- ORM。
- 独立后端服务。
- 自动化测试框架。
- CI 工作流文件。
- Supabase CLI migration 目录。

### 4. 项目运行环境要求

已验证环境：

```text
Node.js v22.22.2
npm 10.9.7
macOS
```

建议统一使用 Node.js 22 LTS。仓库暂未在 `package.json` 中声明 `engines`，也没有 `.nvmrc`；这是待完善项。Next.js 和 Node 代码本身应可在 macOS、Linux、Windows 的 Node 环境运行，但当前只确认过 macOS。

## 二、环境部署配置

### 本地开发

首次安装：

```bash
cd /Users/donysu/Documents/Codex/家庭许愿墙
npm install
cp .env.example .env.local
```

`.env.local` 模板：

```env
NEXT_PUBLIC_SUPABASE_URL=https://jqlgnsatgvwjadbzghfr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<SUPABASE_PUBLISHABLE_OR_ANON_KEY>
```

启动、检查和构建：

```bash
npm run dev
npm run typecheck
npm run build
npm run start
```

- `npm run dev` 通过 `server.mjs` 固定监听 `localhost:3333`。
- `npm run start` 使用 `next start -p 3333`。
- 不使用端口 `3000`。
- 不使用端口 `6666`，浏览器会将其识别为不安全端口。

环境变量分层建议：

| 环境 | 配置位置 | 要求 |
| --- | --- | --- |
| 本地 | `.env.local` | 不提交 Git |
| Vercel Preview | Project Settings -> Environment Variables -> Preview | 与 Production 指向同一 Supabase，或明确使用独立测试项目 |
| Vercel Production | Project Settings -> Environment Variables -> Production | 必须配置，修改后重新部署 |

安全规范：

- 前端只允许使用 publishable/anon key。
- 禁止在任何 `NEXT_PUBLIC_*` 变量中放入 `service_role` key。
- `.env.local` 已被 `.gitignore` 忽略。
- 历史对话曾出现 publishable key；后续不要在对话、截图或文档重复粘贴密钥。

### 云端部署（Vercel）

#### 1. GitHub 与部署

1. Vercel 导入 `suzhou0825/family_hopes_wall`。
2. Framework Preset 选择 Next.js。
3. Production Branch 设为 `main`。
4. 配置环境变量：

```env
NEXT_PUBLIC_SUPABASE_URL=https://jqlgnsatgvwjadbzghfr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<SUPABASE_PUBLISHABLE_OR_ANON_KEY>
```

5. 环境变量至少应用到 Production；Preview 也需要测试时一并配置。
6. 推送 `main` 会触发自动部署。
7. 环境变量修改后，旧构建不会自动注入新值，必须 Redeploy。

已出现过的线上现象：手机打开 Vercel 页面显示“请先配置 Supabase 环境变量”。根因是 Vercel 构建环境没有读取本机 `.env.local`。修复方式是在 Vercel Dashboard 配置两个 `NEXT_PUBLIC_*` 变量并重新部署。

#### 2. 自定义域名与 DNS

当前是否绑定自定义域名未知。配置时以 Vercel Dashboard 给出的记录为唯一准确信息。

常见子域名配置形式：

```dns
Type: CNAME
Name: app
Value: cname.vercel-dns.com
TTL: Auto
```

注意：

- 上述值是常见标准值，不代表当前项目已经配置。
- 根域名、特殊 DNS 服务商或 Vercel 最新推荐值可能不同，必须以项目 Domains 页面显示的值为准。
- 如果使用 Cloudflare，首次验证建议关闭代理，使用 DNS only；证书和访问稳定后再评估代理。
- 国内网络访问 Vercel 或 Supabase 的稳定性尚未正式验证。

#### 3. 部署失败排查

按顺序检查：

```text
GitHub 最新提交是否进入 main
-> Vercel 是否触发新 Deployment
-> Build Logs 是否通过 next build
-> Production 环境变量是否存在且拼写正确
-> 修改环境变量后是否 Redeploy
-> Supabase schema 是否已经手动执行
-> 浏览器 Network/Console 是否出现 RPC 错误
```

本地部署前检查：

```bash
npm run typecheck
npm run build
git status --short
```

### 数据库（Supabase）

#### 1. 项目信息

```text
Project ref: jqlgnsatgvwjadbzghfr
Project URL: https://jqlgnsatgvwjadbzghfr.supabase.co
Region: 待确认
```

最新 schema 文件：

```text
supabase/schema.sql
```

Git/Vercel 部署不会自动执行该 SQL。数据库结构变化后必须由有权限的人员在 Supabase SQL Editor 手动执行，除非后续接入 Supabase CLI migrations。

#### 2. 当前数据表

`app_families`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | uuid PK | 家庭 ID |
| `created_at` | timestamptz | 创建时间 |

`app_accounts`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | uuid PK | 应用账号 ID |
| `username` | text unique | 登录账号，小写字母/数字/下划线，3-32 位 |
| `display_name` | text | 显示名称 |
| `password_hash` | text | bcrypt 哈希，禁止前端读取 |
| `family_id` | uuid FK | 所属家庭 |
| `member_id` | text | 对应家庭 JSON 中成员 ID |
| `role` | text | `parent` 或 `child` |
| `parent_title` | text | 爸爸或妈妈 |
| `child_title` | text | 哥哥、弟弟、姐姐、妹妹 |
| `gender` | text | 男孩或女孩 |
| `created_at` | timestamptz | 创建时间 |
| `updated_at` | timestamptz | 更新时间 |

`app_sessions`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `token_hash` | text PK | 原始 token 的 SHA-256 哈希 |
| `account_id` | uuid FK | 账号 ID，账号删除时级联删除 |
| `created_at` | timestamptz | 创建时间 |
| `expires_at` | timestamptz | 30 天过期时间 |

`app_family_data`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `family_id` | uuid PK/FK | 家庭 ID |
| `data` | jsonb | `members`、`wishes`、`tasks` 完整家庭数据 |
| `updated_at` | timestamptz | 更新时间 |

旧表 `profiles`、`app_state`、`app_data` 会被最新 schema 删除。

#### 3. JSON 数据结构

```ts
type StoredAppData = {
  members: Member[];
  wishes: Wish[];
  tasks: Task[];
};
```

当前采用单行家庭 JSON，所有家庭成员共享 `family_id` 对应的一份数据。

#### 4. RPC 列表

公开给 anon/authenticated 的 RPC：

- `register_app_account`：注册第一个父母并创建家庭。
- `login_app_account`：校验账号密码并创建会话。
- `get_app_state`：通过应用 token 获取账号与家庭数据。
- `save_app_state`：保存完整家庭 JSON。
- `update_app_account`：修改显示名称和密码。
- `create_family_member_account`：父母创建第二个父母或孩子账号。
- `delete_family_member_account`：父母删除非当前登录成员及其账号、会话和关联数据。
- `create_child_account`：兼容旧调用的孩子账号创建包装函数。

内部 RPC：

- `validate_app_password`
- `validate_app_username`
- `account_json`
- `create_app_session`
- `ensure_account_family`
- `account_from_token`

#### 5. RLS 与权限

- 四张业务表都启用了 RLS。
- 前端不直接 select/update 表，而是通过 `security definer` RPC 访问。
- 内部函数撤销 PUBLIC/anon/authenticated 执行权。
- 必须保持 `create_app_session`、`account_from_token` 等内部函数不可被浏览器直接调用。

#### 6. CORS 与 URL 白名单

当前应用不使用 Supabase Auth OAuth/Redirect，因此 Supabase Auth Redirect URLs 不是当前登录链路必需配置。

当前架构为浏览器直接访问 Supabase 项目 URL。仓库中没有自定义 CORS 白名单配置。若后续遇到跨域或国内网络问题，不要在前端加入 `service_role`；应优先考虑：

1. 核实请求 URL、publishable key、浏览器 Network 错误。
2. 使用 Vercel Route Handler 作为服务端代理。
3. 服务端代理中把管理员密钥限制在服务器环境变量，绝不使用 `NEXT_PUBLIC_` 前缀。

## 三、工程代码结构详解

### 1. 根目录结构

```text
.
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── styles.css
├── docs/
│   ├── CHANGELOG_NOTES.md
│   ├── DECISIONS.md
│   ├── DEPLOYMENT.md
│   ├── DEVELOPMENT_CONSTRAINTS.md
│   ├── PRODUCT_PLAN.md
│   └── USER_GUIDE.md
├── handover/
│   ├── PROJECT_HANDOVER.md
│   └── archive/
├── lib/
│   └── supabase.ts
├── supabase/
│   └── schema.sql
├── .env.example
├── package.json
├── package-lock.json
├── server.mjs
├── next.config.ts
└── tsconfig.json
```

### 2. 核心文件职责

`app/page.tsx`

- 当前主要业务集中在一个客户端组件中。
- 包含数据类型、模拟数据、登录注册、会话恢复、数据保存、愿望、任务、打卡、审核和家庭管理。
- 页面视图：`wall`、`wishes`、`myTasks`、`tasks`、`family`。
- 直接调用 Supabase RPC。

`app/styles.css`

- 全局视觉样式、响应式布局、表单、卡片、状态、进度条和密码可见控件。
- 没有 CSS Module 或第三方设计系统。

`app/layout.tsx`

- 中文页面元数据。
- 移动端 viewport 设置。
- 引入全局 CSS。

`lib/supabase.ts`

- 读取两个 `NEXT_PUBLIC_*` 环境变量。
- 判断 Supabase 是否配置。
- 创建浏览器 Supabase client。

```ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string)
  : null;
```

`supabase/schema.sql`

- 当前数据库唯一结构脚本。
- 创建表、RLS 和自定义账号 RPC。
- 会删除旧版冗余表和旧函数签名。
- 执行具有破坏性，运行前需要备份重要数据。

`server.mjs`

- 自定义 Next.js 开发服务器。
- 固定监听 `localhost:3333`。

`docs/*`

- 产品计划、开发约束、使用说明、部署说明、决策和历史记录。
- 每次产品或代码更新必须同步维护。

### 3. 关键前端约定

会话 token 浏览器键：

```ts
const sessionStorageKey = "family-wish-wall-app-session-v1";
```

本地演示数据键：

```ts
const storageKey = "family-wish-wall-data-v1";
```

密码规则：

```ts
password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password)
```

账号规则：

```ts
/^[a-z0-9_]{3,32}$/
```

## 四、当前项目进度

### 1. 已开发完成

- 响应式 Web MVP，可本地运行并构建。
- 登录门禁、应用自有账号注册和登录。
- 密码确认、规则校验、显示/隐藏。
- 主动注册第一个父母并创建家庭。
- 父母创建第二个父母账号和孩子账号。
- 父母/孩子账号共享家庭数据。
- 家庭成员展示具体角色：爸爸、妈妈、哥哥、弟弟、姐姐、妹妹。
- 家庭成员编辑和删除；删除同步清理账号与会话。
- 孩子愿望新增、编辑、删除。
- 愿望描述、类型、期望时间、兑现人。
- 父母任务新增、编辑、删除。
- 任务奖励类型、奖励描述、关联愿望。
- 打卡频率、截止时间、每日打卡和进度展示。
- 孩子申领任务、我的任务、提交完成。
- 父母审核完成，关联愿望进入兑现中。
- Supabase 数据表、RLS 和 RPC 脚本。
- GitHub main 已推送基准提交 `24158fe`。
- Vercel 已有关联部署，但实际 Production URL 和当前部署状态待确认。

### 2. 半成品和中断点

- 最新 `supabase/schema.sql` 是否已经在当前 Supabase 项目执行无法从仓库确认。后续 RPC 变更必须再次手动执行。
- Vercel Production 环境变量是否已经正确配置待确认；手机端曾出现未配置提示。
- 数据仍以单个 `app_family_data.data` JSON 保存，尚未拆表。
- 家庭成员“编辑”主要修改家庭 JSON，账号表中的角色相关字段同步不完整。
- 当前退出登录只删除浏览器 token，没有在数据库删除对应 session。
- 没有找回密码、管理员重置成员密码、会话列表和强制下线功能。
- 没有测试框架和自动化端到端测试。
- 没有 CI、数据库 migration 自动部署和环境隔离流程。
- 自定义域名、DNS、Supabase 区域未记录。

### 3. 待开发需求与建议排期

#### 高优先级 P0：上线安全与一致性，建议 1-3 个开发日

1. 修复角色授权：孩子登录后不能通过右上角切换到爸爸/妈妈获得父母功能。
2. 执行并核验最新 schema，建立数据库版本记录。
3. 核验 Vercel Production/Preview 环境变量并完成手机端验收。
4. 增加服务端 logout/revoke session RPC。
5. 删除成员前增加确认对话框。
6. 给登录和注册增加基础限流或迁移至服务端 Route Handler。

#### 中优先级 P1：数据模型和可维护性，建议 3-6 个开发日

1. 将 members、wishes、tasks、check-ins 从 JSON 拆成独立表。
2. 建立家庭级 RLS/服务端授权模型，减少 `security definer` RPC 面积。
3. 拆分 `app/page.tsx`：认证、许愿墙、任务、家庭管理、公共组件和 hooks。
4. 增加账号资料和家庭成员资料的双向一致性更新。
5. 增加单元测试和关键流程 Playwright 测试。
6. 增加 Supabase CLI migration 和 CI 检查。

#### 低优先级 P2：产品完善，建议 3-8 个开发日

1. 找回密码、父母重置孩子密码。
2. 愿望兑现完成状态和兑现记录。
3. 通知、提醒、操作日志。
4. PWA 安装体验；苹果安装包仍不在当前 MVP 范围。
5. 自定义域名和国内访问优化评估。

## 五、已知问题 & 历史踩坑库

### 1. 端口 6666 无法正常使用

- 现象：浏览器或 Next.js 拒绝访问/启动。
- 根因：6666 属于浏览器限制的不安全端口。
- 修复：统一使用 `3333`，由 `server.mjs` 固定监听。

### 2. 修改数据后刷新恢复旧数据

- 现象：家庭成员等改动被初始模拟数据覆盖。
- 根因：早期版本只使用组件内模拟数据。
- 修复：先加入 localStorage，后接入 Supabase `app_family_data` 云端保存。

### 3. 页面停在“正在检查登录状态”

- 现象：登录检查页面长时间不结束。
- 根因：Supabase 环境变量缺失、网络请求无响应或旧 Auth 会话逻辑阻塞。
- 修复：增加 8 秒兜底；当前改为应用 token 调用 `get_app_state`。

### 4. GitHub 登录报 `Unsupported provider`

- 现象：Supabase 返回 provider 未启用。
- 根因：GitHub Provider 未启用或配置不完整。
- 最终决策：当前产品已移除 GitHub OAuth 和 Supabase Auth 登录，改用应用自有账号 RPC。

### 5. 普通账号映射成邮箱仍报 invalid email

- 现象：`.local`、自造域名和项目域名邮箱均被 Supabase Auth 判定无效。
- 根因：将普通账号强行映射到 Supabase Auth email 不符合最终需求。
- 最终决策：完全移除邮箱映射，使用 `app_accounts.username`。

### 6. SQL 报 `unterminated dollar-quoted string`

- 现象：Supabase SQL Editor 指向 `as $$` 报未闭合。
- 根因：只执行了函数体的一部分，结束的 `$$;` 没有一起提交。
- 修复：全选并执行完整 `supabase/schema.sql`；函数必须从 `create function` 到 `$$;` 一起执行。

### 7. 注册报 `function gen_salt(unknown) does not exist`

- 现象：创建密码哈希时找不到 `gen_salt`。
- 根因：Supabase 的 `pgcrypto` 位于 `extensions` schema，而函数 `search_path` 仅为 public。
- 修复：显式使用 `extensions.gen_salt`、`extensions.crypt`、`extensions.digest`、`extensions.gen_random_bytes`、`extensions.gen_random_uuid`。

### 8. 妈妈单独注册后看不到爸爸和孩子

- 现象：妈妈登录后家庭为空或属于另一套数据。
- 根因：主动注册会创建新的 `family_id`。
- 修复：只主动注册第一个父母；第二个父母必须由已登录父母在家庭管理中创建。

### 9. 创建妈妈账号触发孩子性别校验

- 现象：报错“孩子性别只能选择男孩或女孩”。
- 根因：父母表单没有 gender，前端曾把空值转成字符串 `null`，SQL 又无条件校验。
- 修复：前端传安全默认值；SQL 仅在 `role = child` 时校验 gender/child title。

### 10. 删除成员只删页面、不删账号

- 现象：成员卡片消失，但账号仍可能登录。
- 根因：旧逻辑只修改前端数组。
- 修复：增加 `delete_family_member_account` RPC，删除账号、级联会话并更新家庭 JSON。

### 11. 手机访问 Vercel 提示配置 Supabase 环境变量

- 现象：线上显示“请先配置 Supabase 环境变量”。
- 根因：`.env.local` 只存在本地，Vercel 构建环境没有变量。
- 修复：在 Vercel Production 配置两个 `NEXT_PUBLIC_*` 变量，并 Redeploy。

### 12. 打卡字段对非打卡任务错误显示

- 现象：一次性/承诺任务也显示打卡频率。
- 根因：表单条件渲染没有绑定任务类型。
- 修复：只有 `taskFormType === "打卡任务"` 时显示频率和截止时间。

### 未确认、不能写成历史故障的项目

- Vercel `DNS Change Recommended`：未确认发生。
- 国内网络无法访问自定义域名：未确认发生。
- Supabase CORS 报错：未确认发生。
- 数据库请求超时：未确认发生。

## 六、开发规范与约束

### 1. 代码规范

- 使用简体中文 UI 和文档。
- TypeScript strict mode，不使用无必要的 `any`。
- 保持 ASCII 代码字符，中文只用于界面、错误信息和文档。
- 复用现有 React/Next.js 模式，不随意引入新框架。
- 复杂逻辑拆成明确函数；下一阶段优先拆分过大的 `app/page.tsx`。
- 新增交互后必须运行：

```bash
npm run typecheck
npm run build
```

- 重要界面改动应使用浏览器检查手机、iPad、桌面尺寸。
- 不覆盖或回滚不属于当前任务的用户改动。

### 2. 文档同步规范

每次产品或代码更新同步维护：

- `docs/USER_GUIDE.md`
- `docs/DEVELOPMENT_CONSTRAINTS.md`
- `docs/PRODUCT_PLAN.md`
- `docs/CHANGELOG_NOTES.md`
- 部署变化同步 `docs/DEPLOYMENT.md`

交接文档更新遵循根目录 `PROJECT_HANDOVER_GENERATION_SPEC.md`。

### 3. 数据库安全规范

- 禁止前端使用 `service_role`。
- 只允许 publishable/anon key 出现在 `NEXT_PUBLIC_*`。
- 密码只存 bcrypt 哈希。
- 原始 session token 只在浏览器保存，数据库只存 SHA-256 token hash。
- 所有客户端可调用 RPC 必须验证 token、家庭归属和角色。
- 内部 `security definer` 函数必须撤销 PUBLIC/anon/authenticated 执行权。
- 修改 schema 前备份数据；`schema.sql` 包含 drop 语句。
- 不在日志或错误提示中输出密码、hash 或 token。

### 4. 当前安全风险

#### P0：角色切换越权

当前 UI 权限依赖 `currentUser`，右上角可切换所有家庭成员。孩子账号理论上可切换到父母成员后看到父母页面。必须改为：

- 登录账号权限以 `account.role/member_id` 为准。
- 普通用户不能通过 UI 切换成其他成员。
- 如保留家庭视角预览，只能父母使用，并且服务端 RPC 仍按真实账号角色授权。

#### P0：自定义认证暴露在浏览器 RPC

- 登录/注册 RPC 可被匿名调用。
- 当前没有速率限制、验证码或锁定策略。
- 建议迁移到 Next.js Route Handler 或 Supabase Edge Function，并增加限流。

#### P1：localStorage token

- token 可被同源 XSS 读取。
- 建议服务端登录后使用 HttpOnly、Secure、SameSite Cookie。

#### P1：退出未吊销数据库会话

- 当前退出只清除浏览器 token。
- 应新增 revoke/logout RPC。

### 5. 数据一致性约束

- 当前 `app_family_data` 是完整 JSON，全量覆盖保存。
- 多设备/多成员同时编辑采用最后写入覆盖，可能丢失数据。
- 保存没有版本号、乐观锁或冲突合并。
- 拆表前至少应增加 `updated_at/version` 冲突检测和保存防抖。

### 6. 域名与访问优化

当前未实施 Cloudflare 或 Vercel 服务端代理。

可选路线：

1. Vercel 自定义域名 + 标准 DNS，最简单。
2. Cloudflare 仅作为 DNS；是否代理需测试 Vercel 验证、TLS 和国内网络。
3. Next.js Route Handler 代理 Supabase 请求，隐藏数据库调用细节并集中限流。
4. 服务端代理使用服务器环境变量，绝不能把 `service_role` 暴露到浏览器。

## 七、新对话窗口接手使用说明

### 使用方式

将本文档完整复制粘贴到全新空白对话窗口，并附上项目工作区路径：

```text
/Users/donysu/Documents/Codex/家庭许愿墙
```

然后发送：

```text
请先读取这份项目交接文档和当前工作区代码，以当前代码与 Git 状态为最终事实来源。确认实际状态后继续开发，不要恢复已经废弃的 Supabase Auth、GitHub OAuth 或邮箱映射方案。修改代码时同步更新项目文档，完成后运行 typecheck 和 build。未经我明确要求，不要推送 GitHub。
```

新窗口接手后第一批命令：

```bash
cd /Users/donysu/Documents/Codex/家庭许愿墙
git status --short
git branch --show-current
git log -1 --oneline
npm install
npm run typecheck
npm run build
```

必须先阅读：

```text
handover/PROJECT_HANDOVER.md
PROJECT_HANDOVER_GENERATION_SPEC.md
docs/DEVELOPMENT_CONSTRAINTS.md
docs/PRODUCT_PLAN.md
docs/USER_GUIDE.md
supabase/schema.sql
app/page.tsx
```

## 八、数据库迁移与重置

### 1. 应用最新 schema

1. 备份 Supabase 当前数据。
2. 打开 Supabase Dashboard -> SQL Editor。
3. 打开本地 `supabase/schema.sql`。
4. 全选完整文件内容粘贴执行，不要只运行函数片段。
5. 执行后检查四张业务表和 RPC。

警告：当前 schema 会删除旧版 `profiles`、`app_state`、`app_data`，并重建函数。不要在有未备份数据时直接执行。

### 2. 清空业务数据但保留结构

以下操作不可恢复，执行前必须确认：

```sql
truncate table public.app_sessions restart identity cascade;
truncate table public.app_family_data restart identity cascade;
truncate table public.app_accounts restart identity cascade;
truncate table public.app_families restart identity cascade;
```

由于存在外键和 cascade，也可以从家庭表开始清理，但建议按上面顺序保持意图清晰。

### 3. 删除指定错误账号

优先使用父母账号登录后，在家庭管理中删除成员，系统会调用 `delete_family_member_account`。

如果错误账号属于另一个独立家庭、当前家庭页面看不到，只能由数据库管理员在 SQL Editor 精确删除。执行前先查询确认：

```sql
select id, username, display_name, family_id, role, parent_title
from public.app_accounts
where username = '<ACCOUNT_USERNAME>';
```

确认后删除：

```sql
delete from public.app_accounts
where username = '<ACCOUNT_USERNAME>';
```

清理没有账号的空家庭：

```sql
delete from public.app_families f
where not exists (
  select 1
  from public.app_accounts a
  where a.family_id = f.id
);
```

## 九、验收检查清单

### 本地

- [ ] `.env.local` 两个变量存在且指向正确项目。
- [ ] `npm run dev` 可访问 `http://localhost:3333`。
- [ ] `npm run typecheck` 通过。
- [ ] `npm run build` 通过。
- [ ] 页面在手机、iPad、桌面宽度无明显重叠和横向溢出。

### 账号与家庭

- [ ] 主动注册第一个父母，选择爸爸或妈妈。
- [ ] 父母在家庭管理创建第二个父母账号。
- [ ] 父母创建孩子账号及具体称呼。
- [ ] 第二个父母登录后看到同一个家庭。
- [ ] 孩子登录后看到同一个家庭数据。
- [ ] 删除非当前成员后，该账号无法再次登录。
- [ ] 当前登录账号不可删除。
- [ ] 检查孩子不能越权进入父母功能；当前版本此项预计存在风险，修复前不能视为通过。

### 愿望与任务

- [ ] 孩子新增、编辑、删除愿望。
- [ ] 愿望描述、期望时间、兑现人保存正确。
- [ ] 父母新增、编辑、删除三类任务。
- [ ] 非打卡任务不显示打卡频率。
- [ ] 打卡任务按星期和截止日期计算进度。
- [ ] 孩子申领、打卡或提交完成。
- [ ] 父母审核后任务变为已完成。
- [ ] 关联愿望变为兑现中。

### Supabase

- [ ] 四张业务表存在。
- [ ] 旧 `profiles`、`app_state`、`app_data` 不存在。
- [ ] 公开 RPC 可被 anon key 调用。
- [ ] 内部 RPC 不能被 anon 直接调用。
- [ ] 密码只存 hash，没有明文。
- [ ] 会话 token 只存 hash。

### Vercel 与手机端

- [ ] Production 环境变量已配置。
- [ ] 修改环境变量后已 Redeploy。
- [ ] 最新 `main` 提交已部署。
- [ ] 手机访问不再提示配置 Supabase 环境变量。
- [ ] 手机可完成登录和关键流程。
- [ ] 自定义域名和 HTTPS 状态正常（如果已配置）。

## 十、待确认信息

需要由有后台权限的人员确认：

1. Vercel 项目实际 Production URL。
2. Vercel 当前最新部署是否对应 `24158fe` 或更高提交。
3. Vercel Production/Preview 环境变量是否已经配置。
4. 是否已经绑定自定义域名；域名、DNS 服务商和记录值是什么。
5. Supabase 项目区域。
6. 当前 Supabase 是否已执行仓库最新 `schema.sql`。
7. 当前线上四张表和 RPC 是否与本地脚本一致。
8. 历史泄露过的 publishable key 是否需要轮换。
9. 手机端 Vercel 环境变量问题是否已经通过 Redeploy 解决。
10. 是否允许孩子切换家庭角色；从安全角度建议禁止。
11. 是否需要保留家庭角色预览功能，还是登录账号只能进入自己的角色。
