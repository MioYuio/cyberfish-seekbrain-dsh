---
name: cyberfish-seekbrain
description: Neuroscience all-in-one research workflow for DeepSeek Harness. Use for neural data analysis, SeekBrain recipe discovery, research planning, multimodal method selection and evidence-aware interpretation. Uses only DSH's current model, tools, file access and approval policies; no separate runtime or LLM configuration.
---
# CyberFish SeekBrain — Neuroscience All-in-One

固定参考 SeekBrain `0.1.4`，来源提交 `887bbd2d86b44ba8a077b3c44e860aa8e10e8b37`。本插件**只提供技能与方法资源**，不携带 SeekBrain CLI、Node、Pi、独立会话或另一套 Agent。

## 统一原则

- 模型与 API Key 完全由 DSH 管理；插件不读取、不复制、不转存。
- 文件读写、代码执行、网络访问与安装依赖均使用 DSH 自带工具和审批策略。
- 不启动 SeekBrain CLI、另一套 Agent、另一套供应商配置或独立研究运行时。
- 安装包本身即可用于方法规划和研究指导；实际数据分析仍需 DSH 当前环境中可用的解释器与科学依赖。

## 工作流

1. 明确科学问题、数据模态、采样率、trial 结构、ROI 对齐、分组与输出。缺失则先问，不编造。
2. **优先调用 `seekbrain_recipe` 工具**检索配方：`action=search, query=<物种/模态/方法>`（支持中文关键词如"斑马鱼 环状"、"钙成像"）拿到候选 id，再 `action=get, id=<返回的 id>` 读取单个 SKILL.md 及所需 reference。不要一次加载全部配方，也不要直接读 `references/recipes.json`（裸数组效率低，工具检索更准）。
3. 由 DSH 当前模型制定 Formulate → Code → Validate → Interpret 计划。优先最小可验证分析，不默认开展大规模批处理。
4. 需要运行代码时，使用 DSH 的终端/文件工具，遵守用户批准。保留输入、参数、版本、日志和输出；不把生成脚本视为已验证。
5. 使用 `brainpilot-audit` 技能及 `brainpilot_audit` 工具做证据预审，再人工追溯决策相关数据、代码和工件。
6. 结论绑定具体运行、统计量和图。可运行不等于有效；缺真实数据上的适用证据时标 `unverified`。

## 可选外部桌面软件

CopilotJ/Fiji 的用法见 `copilotj-bioimage` 技能。它不属于本插件运行时；本插件不启动服务、不发送脚本、不配置其模型。用户在自己的 CopilotJ 中执行时，须复核图像、ROI、日志与导出结果。

参考：[研究方法与证据边界](references/research-workflow.md)、[68 配方索引](references/recipes.json)。
