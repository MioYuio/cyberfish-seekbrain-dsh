import { readFile, stat } from 'node:fs/promises'

const LIMIT = 1_000_000
const NUMBER = /(?<![\w.])(?:\d+(?:\.\d+)?|\.\d+)(?:\s*(?:%|ms|s|min|hours?|cells?|neurons?|frames?|samples?|subjects?|n\s*=))/gi

function excerpt(text, index, length) {
  return text.slice(Math.max(0, index - 80), Math.min(text.length, index + length + 120)).replace(/\s+/g, ' ').trim()
}

/**
 * A conservative pre-audit, not a scientific reviewer and not a replacement for
 * tracing claims to real artifacts. Missing evidence is always unverified.
 */
export async function auditClaim(input) {
  if (!input || typeof input !== 'object') throw new Error('审计输入必须是对象。')
  let text = ''
  if (typeof input.text === 'string') text = input.text
  else if (typeof input.path === 'string') {
    // stat first to avoid loading a huge file into memory before the size check.
    const meta = await stat(input.path)
    if (!meta.isFile()) throw new Error('path 必须指向单个文本文件；不扫描目录。')
    if (meta.size > LIMIT) throw new Error('审计文本超过 1 MB；请指定需要审计的章节。')
    const content = await readFile(input.path, 'utf8')
    if (content.length > LIMIT) throw new Error('审计文本超过 1 MB；请指定需要审计的章节。')
    text = content
  } else throw new Error('请提供 text 或 path；不自动扫描整个研究目录。')
  if (!text.trim()) throw new Error('没有可审计的文本。')
  const findings = []
  const add = (id, status, evidence, reason) => findings.push({ id, status, evidence, reason })
  add('claim-evidence-map', 'unverified', '本次输入未附带工件清单、运行日志或可追溯引用。',
    '数字、完成度和性能主张必须逐项映射到真实文件/运行记录；文本看起来合理不等于证据存在。')
  add('empirical-validation', 'unverified', '未提供代表性真实数据、数据划分、标签与 baseline 证据。',
    '能运行、shape 正确、样例输出或单元测试不能证明科研方法有效、适用或更优。')
  add('data-integrity', 'unverified', '未提供样本标识、分组、预处理与 fold 内拟合记录。',
    'shape 相等不能证明样本对齐；泄漏检查应按被试/session/站点/时序等真实采样单元。')
  // artifacts 仅作为"用户声称存在的工件标识"——工具不打开、不校验其内容，因此无论是否为空都必须标 unverified。
  const artifacts = Array.isArray(input.artifacts) ? input.artifacts.filter(a => typeof a === 'string' && a.trim()) : []
  if (artifacts.length === 0) {
    add('artifact-reproduction', 'unverified', 'artifacts 为空或未提供。',
      '不能验证报告是否对应当前工件版本，也不能把缺失复算结果当作已通过。')
  } else {
    add('artifact-reproduction', 'unverified', `声明 artifacts: ${artifacts.slice(0, 8).join(' | ')}${artifacts.length > 8 ? ' …' : ''}`,
      '工具未打开或校验这些工件的内容、版本或与主张的对应关系；文本预审不替代真实工件审计。')
  }
  const causal = [...text.matchAll(/\b(?:causes?|proves?|demonstrates?|establishes?)\b|导致|证明|证实/gi)]
  if (causal.length && !/\b(?:randomi[sz]ed|intervention|controlled experiment|causal)\b|随机|干预|对照实验|因果设计/i.test(text)) {
    add('causal-language', 'flaw', causal.slice(0, 4).map(match => excerpt(text, match.index, match[0].length)).join(' | '),
      '发现因果或证明性措辞，但文本未指出相应设计；相关性、预测或可视化结果不应改写成因果结论。')
  }
  const numbers = [...text.matchAll(NUMBER)].slice(0, 100).map(match => excerpt(text, match.index, match[0].length))
  if (numbers.length) add('quantitative-claims', 'unverified', numbers.slice(0, 8).join(' | '),
    '这些定量主张需要对应原始输出、统计配置和生成时序；本工具不将文本中的数字视为已核验。')
  const checks = ['random', 'permutation', 'baseline', 'cross-validation', 'held-out', 'control', '置换', '基线', '交叉验证', '对照']
  const mentioned = checks.filter(word => text.toLowerCase().includes(word))
  if (mentioned.length) add('validation-language', 'unverified', mentioned.join('、'),
    '文本提及验证方法，但仍需代码、参数、随机种子和数据拆分证据证明它实际执行且未被泄漏污染。')
  return {
    verdict: findings.some(item => item.status === 'flaw') ? 'revise' : 'unverified',
    findings,
    scope: '基于所给文本的保守预审；不推断未提供的实验、数据、代码或文献内容。',
    next: ['建立主张→工件/行号/日志映射', '核对采样单元、预处理边界和时序', '区分 operational evidence 与 empirical evidence', '把缺失证据交回责任人补齐，而非由模型补写'],
  }
}
