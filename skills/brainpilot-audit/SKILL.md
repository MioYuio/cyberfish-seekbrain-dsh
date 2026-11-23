---
name: brainpilot-audit
description: Scientific claim and evidence auditing for research reports, analysis pipelines and multi-agent outputs. Use to map claims to artifacts, detect leakage or overstated causal language, and distinguish operational from empirical evidence. Independently written methodology informed by BrainPilot; no BrainPilot source code is bundled.
---
# BrainPilot 科研主张审计

**Plausibility is not evidence. Missing evidence is `unverified`, not `pass`.**

本技能为独立编写的审计工作流，思想参照 NeuroAIHub/BrainPilot（AGPL-3.0）；不包含其源代码或原文技能文件，也不把本项目标成 BrainPilot 的 MIT 发行版。

## 五个维度

1. **主张—证据**：每个定量、完成度或性能主张映射到工件路径、行号、运行记录和生成时序。引文必须存在并支撑确切命题。
2. **数据完整性**：追踪 reshape、transpose、缓存和重载对样本标识的影响；按被试、session、站点、家族和时序等真实采样单元检查泄漏。预处理、特征选择和模型选择须在训练 fold 内拟合。
3. **代码与工件**：追踪加载→预处理→拟合→导出→推理；核对机器可读配置、版本、容差、依赖和干净目录复现。
4. **模型/方法验证**：区分 operational evidence（可运行、shape、有限输出）和 empirical evidence（代表性真实数据上的适用表现）。前者不能替代后者。
5. **反馈回路**：起草 → 风险定向审计 → `pass/revise/block` → 修订 → 仅复审改动面。记录证据指针，不用模型推理补造证据。

## 工具使用

`brainpilot_audit(action="text", text=...)` 或 `action="file", path=...` 只做保守文本预审，自动指出无法核验的部分和可能过强的因果措辞。它不会扫描目录、执行研究代码或读取原始文献，因此其结果不是完整科学审查。

对决策相关结果，仍需人工完成上述五个维度；`unverified` 项目列出缺失证据及责任人，不能改成乐观结论。
