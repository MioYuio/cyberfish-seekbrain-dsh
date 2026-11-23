# cyberfish-SeekBrain (DSH plugin)

面向 **DeepSeek Harness (DSH)** 的轻量 Neuroscience all-in-one 能力组合包：将 SeekBrain 配方、科研证据审计和 CopilotJ/Fiji 图像分析能力接入 DSH，**完全复用 DSH 的模型、凭据、工具与审批**。

> **版本说明**：当前插件版本 `0.1.5`；内嵌 SeekBrain 配方基线 `0.1.4`。版本号 `0.1.x` 行的 patch 段随插件自身修复递增，与 SeekBrain 配方基线版本解耦——配方升级时 minor 段递增。

不是另一套 Agent，不包含 SeekBrain CLI、Pi、Node 或独立 LLM 配置，也不要求再次填写 API Key。

## 能力

- **68 个神经科学配方**：固定 SeekBrain 0.1.4 原始 MIT 配方与参考资源，按物种、模态、方法和输出检索。
- **研究工作流**：Formulate → Code → Validate → Interpret，指导 DSH 当前模型完成规划、分析和解释。
- **BrainPilot 审计**：主张—证据映射、数据完整性、工件与经验验证的预审；缺失证据标为 `unverified`，不编造科学证据。
- **CopilotJ/Fiji**：通过 DSH 原生 MCP 客户端连接用户启动的 CopilotJ MCP，不引入第二套后端或模型。
- **可选审计子 Agent**：默认关闭；开启后由 DSH spawn 创建，继承父级模型、工作目录与工具策略。

## 安装

需要 DSH `>=0.2.0-rc.2 <0.3.0`。已在 DSH `0.2.0-rc.2` 的隔离 profile 测试安装与组合配置。

### 本地目录

```bash
dsh plugin --profile <你的profile> add /绝对路径/cyberfish-seekbrain-dsh
dsh --profile <你的profile> --dump-config
```

### 从 GitHub 安装

公开仓库：<https://github.com/MioYuio/cyberfish-seekbrain-dsh>

```bash
dsh plugin --profile <你的profile> add github:MioYuio/cyberfish-seekbrain-dsh#<固定commit>
```

本包直接分发 JavaScript 与技能资源，无需构建或安装时执行 `prepare`。建议固定 commit 而不是浮动分支。也可以在 DSH「插件 → 添加插件」中选择本地目录。

### 自托管插件索引

在 DSH「插件 → 自定义插件索引 → 发现 → 添加索引源」中添加：

```text
https://mioyuio.github.io/cyberfish-seekbrain-dsh/market/index.json
```

索引固定到经过测试的 Git commit。它是社区自托管索引，不表示第三方市场已人工收录或认证。

## 使用

插件注册三项技能和两个确定性工具：

- `seekbrain_recipe(action="search", query="zebrafish circular")`：检索配方。
- `seekbrain_recipe(action="get", id="<搜索返回的id>")`：读取单个配方及其方法；按需读取 references，避免一次加载全部内容。
- `brainpilot_audit(action="text", text="...")`：对文本做保守证据预审。

完整数据读写、代码运行、图表生成、MCP 与子 Agent 调用使用 DSH 原生工具。插件不读取 DSH 密钥，也不传递给它另一套供应商。

## 控制 ImageJ：一次性 Bridge 安装

本插件不会把 Fiji 或 CopilotJ 捆绑进安装包。需要真实图像控制时，安装官方 **CopilotJ Bridge 1.1.0**，不安装 CopilotJ 多智能体后端。

### 前置要求

- **Fiji-Latest，Java 17+**。Fiji-Stable 的 Java 8 不支持 MCP；仅看到 Fiji 图标不代表满足条件。
- 推荐使用 Fiji Updater 的 **CopilotJ** 更新站点安装，这是上游首选方式。
- 先自动发现并复用已有安装：`check` 不带 `--fiji` 时查找常见 Fiji 目录；也可手动指定。匹配 Bridge 已存在时直接提示使用，不重复下载。
- 旧版或不匹配的 JAR 保留不覆盖；需要固定版本时再明确安装：

```bash
# 只读检查；不会下载或修改 Fiji
python3 scripts/copilotj-bridge.py check --fiji /Applications/Fiji.app --json

# 明确同意后下载并安装固定官方 JAR；不覆盖已有文件、不自动提权
python3 scripts/copilotj-bridge.py install --fiji /Applications/Fiji.app --yes --json
```

官方 JAR：<https://github.com/neurogeom/CopilotJ/releases/download/v1.1.0/CopilotJBridge-1.1.0.jar>  
SHA-256：`63152895fecc63db641df2c44aae8a636e5831f5910e2fefe736130a5b3de223`

Windows 将 `--fiji` 指向真实 Fiji 目录。安装器不能替代目标机 Java/Fiji 验收。

### 启动与调用

1. 启动 Fiji-Latest，打开 `Plugins → CopilotJ`。
2. 在 **MCP Server** 中使用 `Host: 127.0.0.1`、`Port: 3001`，点击 **Start MCP**。
3. DSH 通过本插件的 MCP 配置连接 `http://127.0.0.1:3001/mcp`。
4. 需要时加载 `mcp__copilotj__load_tools`，再调用 `run_macro`、`capture_fiji_screen`、`fiji_environment` 等 CopilotJ 工具。
5. 端口不一致时，在启动 DSH 前设置 `COPILOTJ_MCP_URL`；不要附加查询参数或远程地址。

**不要把无认证 MCP 端口暴露到局域网或公网。**执行宏/脚本遵守 DSH 审批。未启动 Fiji 不会阻断其余 Neuroscience 技能使用。

## 可选 BrainPilot 子 Agent

默认不创建额外模型调用。确需独立审计角色时，在启动 DSH 前设置：

```bash
export CYBERFISH_ENABLE_AUDIT_SUBAGENT=1
```

随后出现 `brainpilot_auditor` 工具。它使用 DSH spawn 后端，继承父级模型与工具策略；不是 SeekBrain/Pi 子 Agent。

## 验证边界

- 安装/加载插件不等于真实模型、数据分析或 Fiji 控制已通过。
- 68 配方是方法资源，不保证对具体数据直接适用。
- `brainpilot_audit` 是保守预审，不替代真实数据、代码和工件审查。
- 脚本返回成功不等于图像处理正确；请复核 Fiji 窗口、ROI、日志和导出文件。
- 版本和许可证详见 [NOTICE.md](NOTICE.md)，安全说明见 [SECURITY.md](SECURITY.md)。

## 与 CyberFish V6 的关系

两者独立版本、独立仓库、独立发布。V6 是 Mac/Windows 的 SeekBrain 便携产品，解决图形化模型配置；本插件服务于已有 DSH 的用户，**不共享配置或凭据**。

## 发布流程（维护者）

发布链固定为一条命令：

```bash
bash scripts/release.sh <new-version>
```

脚本会：bump `package.json` / `lib/version.js` / `scripts/copilotj-bridge.py` UA → 清 `__pycache__` → 跑 `check` + `test` → `npm pack` 到 `dist/` → commit + tag。之后按提示手动：①`npm publish --access public`；②用同一 commit 更新 `market/index.json` 的 `version/publishTimestamp/source.commit` 并推到 gh-pages；③`git push origin main && git push origin v<new-version>`。

禁止跳过脚本直接 `npm publish`：会导致 npm 包与市场索引、本地 dist 三处不一致。
