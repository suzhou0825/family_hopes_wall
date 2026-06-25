# 项目开发交接文档（跨窗口复用版）

## 零、交接快照

| 项目 | 当前值 |
| --- | --- |
| 文档生成时间 | 2026-06-24 21:19，Asia/Shanghai |
| 项目名称 | 家庭许愿墙 / `family-wish-wall` |
| 工作区 | `/Users/donysu/Documents/Codex/家庭许愿墙` |
| 当前分支 | `main` |
| 最新提交 | `745834e7c5fdea57f7fcfaa0fb31eb0885fe1594`（`Improve pet interactions and reward management`） |
| GitHub 仓库 | `git@github.com:suzhou0825/family_hopes_wall.git` |
| 本地开发地址 | `http://localhost:3333` |
| Supabase project ref | `jqlgnsatgvwjadbzghfr` |
| Supabase URL | `https://jqlgnsatgvwjadbzghfr.supabase.co` |
| Supabase anon key | 不记录真实值，见 `.env.local` 或部署平台环境变量 |
| Vercel 项目 URL | 待确认，需要从 Vercel Dashboard 获取 |
| 自定义域名 | 待确认，当前仓库没有记录 |
| Supabase 区域 | 待确认，需要从 Supabase Dashboard 获取 |
| 交接前 Git 状态 | `main...origin/main`，工作区干净 |

本文档按 `PROJECT_HANDOVER_GENERATION_SPEC.md` 重新生成。旧版已备份到 `handover/archive/PROJECT_HANDOVER_2026-06-24_21-19.md`。

事实来源优先级：当前代码、`supabase/schema.sql`、Git 状态、`docs/` 正式文档。历史上已经废弃的 Supabase Auth、邮箱映射、GitHub OAuth 不属于当前架构。

## 一、项目概述

家庭许愿墙是面向家庭的 Web 应用。目标是让孩子提交愿望、父母发布任务、孩子完成任务后获得奖励或推动愿望兑现，同时通过成长星和电子宠物增强反馈。

角色：

- 父母：爸爸、妈妈。
- 孩子：哥哥、弟弟、姐姐、妹妹。

当前账号体系：

- 使用应用自有账号密码。
- 不使用 Supabase Auth。
- 不使用邮箱登录。
- 不使用 GitHub OAuth。
- 第一个父母主动注册会创建新家庭。
- 第二个父母账号和孩子账号只能由已登录父母在家庭管理中创建。
- 登录后右上角只展示当前账号绑定的角色，不允许前端切换角色。

核心业务流程：

1. 父母注册或登录。
2. 父母在家庭管理中创建家庭成员账号。
3. 孩子发布愿望或申报任务。
4. 父母发布任务、审批孩子申报任务、审核任务完成。
5. 孩子申领任务、打卡或提交完成。
6. 父母审核后发放成长星、推动关联愿望状态变化。
7. 孩子用成长星领养宠物、兑换奖品，父母维护奖品目录。

愿望状态机：

```text
待申领 -> 兑换中 -> 兑现中 -> 已兑换
```

- 待申领：孩子提交后默认状态。
- 兑换中：愿望已被任务关联。
- 兑现中：关联任务已经完成并通过父母审核。
- 已兑换：父母确认兑现后归档，不再展示在许愿墙主列表。

任务状态机：

```text
待审批 -> 待申领 -> 完成中 -> 已完成
```

- 待审批：孩子申报任务后等待父母审批。
- 待申领：父母发布或审批通过后，等待孩子领取。
- 完成中：孩子已领取并执行。
- 已完成：孩子提交完成，父母审核通过。已完成任务从任务看板归档，但孩子我的任务仍可查看。

奖励与成长星：

- 奖励类型：物质奖励、旅游奖励、陪玩奖励、积分奖励、其他愿望。
- 积分单位为成长星。
- 孩子积分奖励申请上限为 100 成长星。
- 父母发布任务可使用纯成长星奖励，或普通奖励加额外成长星。
- 每个孩子首次建立积分账户时系统授予 100 成长星。

电子宠物：

- 当前宠物库：2 只狗、2 只猫。
- 只有孩子可以领养，父母只读查看。
- 每个孩子最多 2 只宠物。
- 第一只免费，第二只 500 成长星。
- 弃养扣 2000 成长星。
- 宠物互动、领养、弃养都写入 Supabase。
- 宠物页支持喂养、玩耍、装扮，以及点击头、身体、爪子触发反馈。

## 二、环境部署配置

### 技术栈

| 分类 | 当前实现 |
| --- | --- |
| 前端框架 | Next.js 15 |
| React | React 19 |
| 语言 | TypeScript 5.7，strict mode |
| 样式 | 手写 CSS，`app/styles.css` |
| 数据库 SDK | `@supabase/supabase-js` 2.x |
| 数据库 | Supabase PostgreSQL |
| 密码哈希 | PostgreSQL `pgcrypto`，`crypt`/bcrypt |
| 包管理 | npm，lockfile v3 |
| 部署 | Vercel |
| 代码托管 | GitHub |

当前没有 UI 组件库、Tailwind、ORM、独立后端、CI 工作流和 Supabase CLI migration 目录。

### 本地运行

```bash
cd /Users/donysu/Documents/Codex/家庭许愿墙
npm install
cp .env.example .env.local
npm run dev
```

脚本：

```bash
npm run dev        # node server.mjs，固定 localhost:3333
npm run typecheck  # tsc --noEmit
npm run build      # next build
npm run start      # next start -p 3333
```

端口约束：

- 固定使用 `3333`。
- 不使用 `3000` 作为默认端口。
- 不使用 `6666`，浏览器会拦截该端口。

环境变量模板：

```env
NEXT_PUBLIC_SUPABASE_URL=https://jqlgnsatgvwjadbzghfr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<SUPABASE_PUBLISHABLE_OR_ANON_KEY>
```

安全边界：

- 只允许前端使用 anon/publishable key。
- 禁止把 `service_role` 放进 `NEXT_PUBLIC_*`。
- 不提交 `.env.local`。
- 文档和回复不得写入真实密钥、密码、Cookie、会话 token 或 OAuth Secret。

### Vercel 部署

已确认架构：

```text
GitHub main
  -> Vercel 构建 Next.js
  -> 浏览器使用 Supabase anon key 调用 RPC
  -> Supabase PostgreSQL 保存账号、家庭数据、积分、宠物和兑换
```

部署步骤：

1. Vercel 导入 `suzhou0825/family_hopes_wall`。
2. Framework Preset 选择 Next.js。
3. Production Branch 选择 `main`。
4. 配置环境变量：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. 重新部署。

注意：

- 本地 `.env.local` 不会被 Vercel 自动读取。
- 修改 Vercel 环境变量后必须 Redeploy。
- Vercel 实际 Production URL 和自定义域名待确认。
- DNS 记录必须以 Vercel Domains 页面为准，不能凭经验写成已确认。

### Supabase

当前项目：

```text
Project ref: jqlgnsatgvwjadbzghfr
Project URL: https://jqlgnsatgvwjadbzghfr.supabase.co
Region: 待确认
```

数据库结构以 `supabase/schema.sql` 为准。Git 推送和 Vercel 部署不会自动执行 SQL。每次 schema 改动后，需要在 Supabase SQL Editor 手动执行最新版脚本，除非后续引入 Supabase CLI migrations。

## 三、工程代码结构详解

根目录关键文件：

```text
app/
  layout.tsx          # 全局 metadata 和 CSS 引入
  page.tsx            # 单页应用主体，账号、愿望、任务、积分、宠物、奖品逻辑
  styles.css          # 全部样式与响应式布局
lib/
  supabase.ts         # Supabase client 初始化
  avatar-config.ts    # 家庭角色头像配置
  pet-config.ts       # 4 只宠物、动作图、装扮锚点、点击热区配置
public/images/
  family-login-hero.png
  avatars/*.png
  pets/*.png          # 宠物基础、问候、喂食、玩耍动作帧
supabase/
  schema.sql          # 当前唯一数据库建表与 RPC 脚本
docs/
  USER_GUIDE.md
  DEVELOPMENT_CONSTRAINTS.md
  PRODUCT_PLAN.md
  CHANGELOG_NOTES.md
  DECISIONS.md
  DEPLOYMENT.md
handover/
  PROJECT_HANDOVER.md
  archive/
server.mjs            # 本地 dev server，固定 3333
PROJECT_HANDOVER_GENERATION_SPEC.md
NEW_AGENT_HANDOFF_PROMPT.md
```

`app/page.tsx` 主要职责：

- 自有账号登录、注册、会话恢复。
- 首页三栏入口。
- 许愿墙、任务公示、孩子我的任务、父母任务管理。
- 家庭管理和账号管理。
- 成长星账户、积分明细、奖品兑换。
- 电子宠物陈列和宠物交互页。
- 调用 Supabase RPC 保存和读取数据。

`lib/pet-config.ts` 重点：

- 宠物 ID：`corgi_star`、`poodle_cloud`、`ragdoll_moon`、`orange_star`。
- 每只宠物配置基础图、自然动作图、喂食图、玩耍图。
- 每只宠物配置 `outfitAnchors`，用于星星帽、蝴蝶结、连帽衫贴合定位。
- 每只宠物配置 `hitZones`，用于头、身体、爪子点击。

`supabase/schema.sql` 当前对象：

表：

- `app_families`
- `app_accounts`
- `app_sessions`
- `app_family_data`
- `app_point_accounts`
- `app_point_transactions`
- `app_pet_adoptions`
- `app_pet_interactions`
- `app_reward_items`
- `app_reward_redemptions`

已清理旧表：

- `profiles`
- `app_state`
- `app_data`

关键 RPC：

- `register_app_account`
- `login_app_account`
- `get_app_state`
- `save_app_state`
- `create_family_member_account`
- `delete_family_member_account`
- `update_app_account`
- `get_family_economy`
- `award_task_points`
- `adopt_app_pet`
- `abandon_app_pet`
- `interact_app_pet`
- `save_reward_item`
- `set_reward_item_status`
- `redeem_reward_item`

RLS 和权限：

- 业务表启用 RLS。
- 前端不直接读写敏感表。
- 主要写操作通过 `security definer` RPC 完成。
- 明文密码不保存，`app_accounts.password_hash` 不应被前端读取。

当前仍为 JSON 保存的业务数据：

- 家庭成员。
- 愿望。
- 任务。
- 打卡记录。

已经拆成独立表的数据：

- 账号、会话。
- 成长星账户与流水。
- 宠物领养与互动。
- 奖品目录与兑换。

## 四、当前项目进度

### 已完成

- Next.js 单页 Web MVP。
- 本地固定 3333 端口。
- 应用自有账号体系。
- 父母主动注册创建家庭。
- 父母创建父母账号和孩子账号。
- 登录后只读展示当前账号角色。
- 账号管理：昵称、密码、头像编号。
- 家庭管理：创建、编辑、删除家庭成员。
- 登录页粉紫风格和原创家庭插画。
- 首页三栏布局：许愿墙、任务公示、积分区。
- 许愿墙和任务公示固定高度滚动，一次约 4 条。
- 愿望提交、编辑、归档和重名校验。
- 任务发布、编辑、复制、申领、打卡、完成审核。
- 孩子申报任务，父母审批后进入公示。
- 我的任务展示提交时间、完成提交时间和完成时间。
- 成长星账户、流水和任务奖励入账。
- 孩子积分奖励上限控制。
- 父母组合奖励。
- 实物和虚拟奖品上架、下架、编辑。
- 孩子真实兑换奖品，扣减积分和库存。
- 4 只电子宠物配置库。
- 宠物领养、弃养、互动数据入库。
- 宠物自然动作、喂食动作、玩耍动作。
- 宠物页左侧互动、中间展示、右侧装扮。
- 点击头、身体、爪子触发不同反馈。
- 装扮按宠物配置锚点贴合。
- 文档体系：使用说明、开发约束、产品方案、部署说明、决策记录、交接文档。

### 半成品或第一阶段实现

- 愿望、任务和成员仍存储在 `app_family_data.data` JSON 中。
- 虚拟社区目前偏静态展示。
- 宠物拍照分享和串门未开发。
- 宠物动作采用多张姿态图切换，不是骨骼动画或 canvas 动画。
- 奖品封面当前用内置图标或表情，不支持上传图片。
- 父母兑换奖品履约状态已有表字段，但前端管理流程较轻。

### 未实施

- Supabase CLI migrations。
- 自动化测试。
- CI。
- 家庭成员、愿望、任务、打卡记录的独立关系表。
- 邮件找回密码。
- 支付、物流、商城。
- 移动端原生 App。
- 多家庭切换。
- 邀请码加入家庭。

### 建议排期

1. 数据模型拆分：成员、愿望、任务、打卡独立表。
2. 奖品兑换履约：父母确认发放、孩子确认收到、兑换历史筛选。
3. 宠物交互增强：更多动作、饥饿/快乐/精力随时间衰减、装扮库存。
4. 虚拟社区：宠物房间、虚拟装修、店面布置。
5. 自动化测试和 CI。
6. Supabase migrations，替代手动 SQL Editor。

## 五、已知问题 & 历史踩坑库

### 已修复问题

- 页面停在“正在检查登录状态”：已增加未配置 Supabase 和会话检查兜底。
- Supabase Auth、GitHub OAuth、邮箱映射方案不适合家庭成员账号：已废弃，改为应用自有账号体系。
- `gen_salt(unknown) does not exist`：schema 改为显式使用 `extensions` schema。
- 创建第二个父母账号触发孩子性别校验：已修正父母账号创建逻辑。
- 登录后角色切换不适合当前账号模型：已移除切换，只展示登录账号角色。
- 已完成任务仍在任务看板展示：已归档，孩子我的任务保留。
- 愿望完成后缺少已兑换状态：已新增已兑换并归档。
- 登录页显示密码规则提醒：已移除，密码框统一眼睛图标。
- 提交愿望、任务缺少时间：已补充提交时间展示。
- 我的任务缺少提交与完成时间：已补充 `completionSubmittedAt` 和 `completedAt` 展示。
- 首页愿望和任务列表撑高页面：已改固定滚动窗口。
- 宠物陈列太小：已改为较大的宠物陈列区。
- 父母不能领取宠物：已限制，父母只读查看。
- 宠物装扮漂浮不贴合：已改按宠物配置锚点渲染。
- 喂食、玩耍没有对应动作：已新增动作帧和受控动作。

### 当前风险

- 数据库脚本需要手动执行，容易出现代码已部署但 RPC 或表不存在。
- `app_family_data` JSON 持续变大后会增加并发覆盖风险。
- 当前没有自动化测试，复杂状态机主要靠手工验证。
- 宠物和头像图片是仓库内静态资源，体积会随素材增长。
- Vercel、Supabase 区域、域名和 DNS 状态需要后台确认。
- 如果用户在对话或截图中暴露密钥，应立即提醒轮换或妥善保管，不要写入文档。

## 六、开发规范与约束

- 使用简体中文沟通。
- 复杂任务先确认方案，再修改。
- 不恢复 Supabase Auth、邮箱登录、GitHub OAuth。
- 不暴露真实密钥、密码、Cookie、会话 token。
- 每次功能或产品修改同步更新：
  - `docs/USER_GUIDE.md`
  - `docs/DEVELOPMENT_CONSTRAINTS.md`
  - `docs/PRODUCT_PLAN.md`
  - `docs/CHANGELOG_NOTES.md`
  - 涉及部署时更新 `docs/DEPLOYMENT.md`
- 完成代码修改后运行：
  - `npm run typecheck`
  - `npm run build`
- 本地调试使用 `http://localhost:3333`。
- 未经明确要求，不提交或推送 GitHub。
- 推送前确认 `git status`、分支、远端和最新提交。
- 修改数据库对象后提醒执行 `supabase/schema.sql`。
- 重要界面变更应本地浏览器验证。
- 不得使用真实受版权保护角色作为宠物、头像或插画素材。

## 七、新对话窗口接手使用说明

新 Agent 或 Codex 窗口接手时，先让其读取：

1. `handover/PROJECT_HANDOVER.md`
2. `PROJECT_HANDOVER_GENERATION_SPEC.md`
3. `docs/DEVELOPMENT_CONSTRAINTS.md`
4. `docs/PRODUCT_PLAN.md`
5. `docs/USER_GUIDE.md`
6. `supabase/schema.sql`

推荐直接复制根目录 `NEW_AGENT_HANDOFF_PROMPT.md` 的内容。

接手后先执行：

```bash
cd /Users/donysu/Documents/Codex/家庭许愿墙
git status -sb
git log -5 --oneline
npm run typecheck
```

如要启动本地：

```bash
npm run dev
```

如要构建：

```bash
npm run build
```

注意：如果本地 3333 已被占用，先查明进程来源，不要随意杀掉非本项目服务。

## 八、数据库迁移与重置

当前没有 migration 目录，`supabase/schema.sql` 是事实来源。

执行方式：

1. 打开 Supabase Dashboard。
2. 进入项目 `jqlgnsatgvwjadbzghfr`。
3. 打开 SQL Editor。
4. 粘贴并执行最新版 `supabase/schema.sql`。
5. 回到应用验证注册、登录、积分、宠物和奖品流程。

破坏性提醒：

- 当前脚本会删除旧表 `profiles`、`app_state`、`app_data`。
- 不要在没有备份的情况下对生产库执行未知 SQL。
- 脚本不会删除当前 `app_*` 核心业务表，但会调整函数、约束和权限。
- 执行前应确认是否需要导出现有生产数据。

生产环境建议：

- 引入 Supabase CLI migrations。
- 将 destructive SQL 拆分成可审查迁移。
- 给 JSON 数据拆表前设计数据迁移脚本。

## 九、验收检查清单

### 本地代码

- `npm run typecheck` 通过。
- `npm run build` 通过。
- `npm run dev` 可在 `http://localhost:3333` 打开。
- 登录页不显示密码规则提醒。
- 密码框使用眼睛图标。
- 登录后默认进入首页。

### 账号与权限

- 父母主动注册创建新家庭。
- 父母可以创建第二个父母和孩子账号。
- 孩子账号不能进入任务发布和家庭管理。
- 父母账号不能发布愿望、不能领取宠物。
- 顶部只展示当前登录账号角色，不可切换角色。

### 愿望与任务

- 孩子可发布愿望，愿望显示提交时间。
- 未归档愿望重名会阻止提交。
- 父母可发布任务，任务显示提交时间。
- 未完成任务重名会阻止提交。
- 孩子可申报任务，父母审批后进入公示。
- 孩子我的任务显示提交时间、完成提交时间和完成时间。
- 已完成任务不再展示在任务看板，仍保留在历史视图。
- 已兑换愿望归档。

### 积分、奖品、宠物

- 首次孩子账户有 100 成长星系统流水。
- 父母审核成长星任务后入账。
- 父母可上架、编辑、下架实物或虚拟奖品。
- 孩子兑换奖品会扣减成长星，实物奖品会扣库存。
- 孩子第一只宠物免费，第二只 500 成长星。
- 弃养宠物扣 2000 成长星。
- 宠物喂食、玩耍、点击头/身体/爪子都有反馈并写入互动记录。
- 装扮贴合宠物，不明显漂浮。

### 数据库

- `get_app_state` 正常返回。
- `save_app_state` 正常保存家庭 JSON。
- `get_family_economy` 正常返回积分、流水、宠物、奖品。
- `award_task_points` 防重复发放。
- `redeem_reward_item` 原子扣余额和库存。
- `interact_app_pet` 支持 `feed`、`play`、`dress`、`pet_head`、`pet_body`、`pet_paw`。

### Vercel 和手机端

- Vercel Production 环境变量已配置。
- 重新部署后线上不再显示“请先配置 Supabase 环境变量”。
- 手机端没有横向滚动。
- 首页三卡片、表单和宠物页在窄屏可用。

## 十、待确认信息

- Vercel Production URL。
- Vercel Preview URL。
- 是否已绑定自定义域名。
- 自定义域名 DNS 服务商和记录。
- Supabase 项目区域。
- 生产库是否已执行最新 `supabase/schema.sql`。
- 是否需要为当前生产数据做备份或导出。
- 是否需要建立 Supabase CLI migration 流程。
- 是否需要将宠物和头像素材迁移到对象存储或 CDN。
