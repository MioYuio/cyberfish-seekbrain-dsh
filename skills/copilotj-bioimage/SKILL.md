---
name: copilotj-bioimage
description: Fiji/ImageJ and CopilotJ bioimage analysis methodology for DeepSeek Harness. Use to plan image processing, segmentation, measurement, batch workflows and result verification. This is guidance only; the plugin does not include CopilotJ, Fiji, a bridge, an LLM, or an execution service.
---
# CopilotJ 生物图像分析

来源：neurogeom/CopilotJ，Apache-2.0。相关论文 DOI：10.1038/s41592-026-03290-9。插件只提供方法指导，不捆绑 CopilotJ、Fiji、ImageJ、Java、Python 环境或 Bridge。

## 使用方法

1. 明确图像类型、维度、通道、位深、校准、成像条件和测量目标，保留原始图像。
2. 选择 ImageJ 原生操作、宏、社区插件或 Python 科学计算，记录每一步参数。
3. 在代表样本上验证分割、ROI、测量与视觉结果，再复用为批处理工作流。
4. 若用户自行安装 CopilotJ，可在其自己的界面与 Bridge 中执行；模型与服务配置由 CopilotJ 管理，不由本插件继承或代理。
5. 不让大模型在未看输出时声称处理成功。CopilotJ 自身也提示部分脚本输出/错误可能未被检测；用户须复核 Fiji/ImageJ 窗口、日志与导出文件。

## 边界

- 本插件不注册 CopilotJ 网络工具，不发送脚本，不开放本机端口。
- 需要真实 Fiji 操作时，使用 DSH 已批准的工具或用户自己的 CopilotJ/Fiji 环境，不虚构执行结果。
- 图像定量结论须绑定输入、参数、版本、ROI 和原始输出；AI 建议不等于测量证据。
