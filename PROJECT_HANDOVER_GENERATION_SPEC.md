# 项目交接文档生成规范

## 目的

用于在当前项目中生成可被其他 Agent、Codex 新窗口或新开发人员直接读取的项目交接文档。交接文档只保留正式开发、配置、代码、部署、数据库、进度、风险和排期信息，不包含闲聊、重复确认、临时测试输出或无关尝试。

## 文件位置与备份规则

```text
项目根目录/
├── NEW_AGENT_HANDOFF_PROMPT.md
├── PROJECT_HANDOVER_GENERATION_SPEC.md
└── handover/
    ├── PROJECT_HANDOVER.md
    └── archive/
        └── PROJECT_HANDOVER_YYYY-MM-DD_HH-mm.md
```

执行规则：

1. 当前交接文档固定保存为 `handover/PROJECT_HANDOVER.md`。
2. 如果当前交接文档已经存在，先原样备份到 `handover/archive/PROJECT_HANDOVER_YYYY-MM-DD_HH-mm.md`。
3. 备份成功后再覆盖生成新的 `handover/PROJECT_HANDOVER.md`。
4. 第一次生成时没有旧文档，不创建空备份。
5. 新文档必须记录生成时间、Git 分支、最新提交、远端仓库和未提交改动。
6. 生成后同步更新：
   - `docs/USER_GUIDE.md`
   - `docs/DEVELOPMENT_CONSTRAINTS.md`
   - `docs/PRODUCT_PLAN.md`
   - `docs/CHANGELOG_NOTES.md`
   - 涉及部署变化时更新 `docs/DEPLOYMENT.md`
7. 新窗口接手时优先复制根目录 `NEW_AGENT_HANDOFF_PROMPT.md`。

## 信息来源优先级

从高到低：

1. 当前工作区代码与配置文件。
2. 当前 `supabase/schema.sql`。
3. 当前 Git 状态、提交历史和远端配置。
4. `docs/` 下现有正式文档。
5. 对话中的正式需求和已确认决策。

如果来源冲突，以高优先级来源为准，并在交接文档中记录冲突和待确认事项。

## 安全要求

- 禁止写入真实密码、验证码、Cookie、会话 token、Supabase `service_role` key、OAuth Client Secret。
- `.env` 只提供变量名、用途和占位符。
- Supabase 项目 URL 和 project ref 可以记录，但 publishable/anon key 使用占位符。
- 不复制真实家庭成员密码、孩子隐私、学校、地址和联系方式。
- 发现历史对话包含密钥时，只记录“需要轮换或妥善保管”，不在交接文档重复展示。

## 事实标记规则

- `已确认`：能从当前代码、Git 或正式配置文件直接核实。
- `待确认`：需要登录 Vercel、Supabase、DNS 服务商后台才能核实。
- `未实施`：方案存在，但当前代码或配置中没有实现。
- 不允许把示例域名、示例 CNAME、推测区域写成已部署事实。

## 必须包含的文档结构

```markdown
# 项目开发交接文档（跨窗口复用版）
## 零、交接快照
## 一、项目概述
## 二、环境部署配置
## 三、工程代码结构详解
## 四、当前项目进度
## 五、已知问题 & 历史踩坑库
## 六、开发规范与约束
## 七、新对话窗口接手使用说明
## 八、数据库迁移与重置
## 九、验收检查清单
## 十、待确认信息
```

正文至少覆盖：

- 业务背景、角色、核心流程、愿望和任务状态机。
- GitHub、Vercel、Supabase 部署架构。
- 技术栈、Node/npm 版本、运行命令。
- 本地、Preview、Production 环境变量模板。
- 自定义域名和 DNS 配置原则；实际值未知时标记待确认。
- Supabase 表、字段、外键、RLS、RPC、密钥边界。
- 根目录结构、核心文件职责、关键代码片段。
- 已完成、半成品、待开发事项和建议排期。
- 所有已确认问题的现象、根因和修复方式。
- 当前安全风险、数据一致性风险和测试缺口。
- 数据库脚本执行与重置步骤，必须标注破坏性操作。
- 本地、数据库、Vercel、手机端验收清单。

## 可直接复制执行的请求

将下面内容发送给 Agent 或 Codex：

```text
请按照项目根目录 PROJECT_HANDOVER_GENERATION_SPEC.md 的规则更新项目交接文档。

执行要求：
1. 先读取当前代码、supabase/schema.sql、Git 状态、package.json 和 docs 目录。
2. 如果 handover/PROJECT_HANDOVER.md 已存在，先备份到 handover/archive/PROJECT_HANDOVER_YYYY-MM-DD_HH-mm.md。
3. 生成新的 handover/PROJECT_HANDOVER.md。
4. 只记录可核实的正式开发、配置、代码、部署、数据库、进度、风险和排期信息。
5. 不写入任何真实密码、service_role、OAuth Secret、Cookie 或会话 token。
6. 未确认的域名、DNS、Vercel 地址、Supabase 区域必须标为待确认，不得猜测。
7. 同步更新项目要求维护的 docs 文档。
8. 完成后运行必要检查，并汇报生成文件、备份文件和验证结果。
```

## 生成质量检查

生成完成后必须确认：

- 所有路径与当前仓库一致。
- Git 分支、提交号、远端地址准确。
- 命令可以直接复制执行。
- 环境变量没有真实敏感值。
- 数据库对象名称与最新 `schema.sql` 一致。
- 当前未完成事项没有被写成已完成。
- 历史问题没有加入未经确认的案例。
- 文档可以脱离原对话单独理解。
