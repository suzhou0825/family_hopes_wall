# 新 Agent / Codex 窗口接手提示

复制下面整段内容发送给新的 Agent 或 Codex 窗口：

```text
项目目录是：

/Users/donysu/Documents/Codex/家庭许愿墙

请先完整读取以下文件：

1. handover/PROJECT_HANDOVER.md
2. PROJECT_HANDOVER_GENERATION_SPEC.md
3. docs/DEVELOPMENT_CONSTRAINTS.md
4. docs/PRODUCT_PLAN.md
5. docs/USER_GUIDE.md
6. supabase/schema.sql

然后检查当前 Git 状态、最新提交和实际代码。

工作要求：

- 以当前代码和 Git 状态为最终事实来源。
- 使用简体中文回复。
- 复杂任务先与我确认方案，再开始修改。
- 不要恢复已经废弃的 Supabase Auth、GitHub OAuth 或邮箱映射方案。
- 不要在代码、文档或回复中暴露真实密钥。
- 每次修改同步更新项目要求维护的 docs 文档。
- 完成代码修改后运行 npm run typecheck 和 npm run build。
- 先在本地 3333 端口调试。
- 未经我明确要求，不要提交或推送 GitHub。

读取完成后，请简要说明：

1. 当前架构；
2. 当前进度；
3. 最高优先级风险；
4. 准备如何继续开发。

暂时不要修改代码。
```

如果新 Agent 无法访问本地目录，请将 `handover/PROJECT_HANDOVER.md` 的完整内容复制到新窗口，然后再发送上面的工作要求。
