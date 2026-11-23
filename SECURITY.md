# 安全说明

- 插件不接收、不读取、不保存任何 LLM API Key；模型与凭据完全由 DSH 管理。
- 不启动 SeekBrain/Pi/Node 子 Agent，不创建独立会话或供应商配置。
- 配方工具只读取随包资源；`brainpilot_audit` 只读取用户指定的单个文本，不自动扫描目录。
- 文件写入、代码执行、MCP 调用与工具审批由 DSH 管理。插件不绕过系统防护、不自动提权、不关闭沙箱。
- CopilotJ 安装器仅在明确 `install --yes` 后下载固定官方 JAR；校验 SHA-256，拒绝覆盖已有安装。未授权不会下载或修改。
- CopilotJ MCP 服务由用户在 Fiji-Latest（Java 17+）中开启，默认 `127.0.0.1:3001/mcp`。不要将无认证 MCP 端口暴露到局域网或公网。
- 可选 BrainPilot 子 Agent 默认关闭；设置 `CYBERFISH_ENABLE_AUDIT_SUBAGENT=1` 后才注册 `brainpilot_auditor`，由 DSH spawn 继承父级模型与工具策略。
- 研究报告、图像处理与数据执行结果必须人工复核。不要把插件加载、脚本完成或文本审计视为科学结论验证。

安全反馈请通过 GitHub 仓库的私有漏洞报告渠道提交，不要在公开 issue 中附密钥、隐私数据或未公开研究数据。
