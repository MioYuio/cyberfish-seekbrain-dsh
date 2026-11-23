import { readdir, readFile, realpath } from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../skills/cyberfish-seekbrain/recipes/', import.meta.url))
const MAX_CONTENT = 60_000
const EXPECTED_COUNT = 68

// Minimal Chinese→English alias map for common query terms. The recipe corpus is English;
// without this, Chinese queries would return zero hits and mislead the model.
const ZH_ALIASES = {
  '斑马鱼': 'zebrafish',
  '小鼠': 'mouse',
  '大鼠': 'rat',
  '猕猴': 'macaque',
  '猴子': 'macaque',
  '线虫': 'c_elegans',
  '秀丽隐杆线虫': 'c_elegans',
  '钙成像': 'calcium imaging ca',
  '钙信号': 'calcium ca',
  '电生理': 'ephys electrophysiology spike',
  '峰电位': 'spike',
  '行为': 'behavior',
  '环状': 'circular',
  '调谐': 'tuning',
  '连接组': 'connectome',
  '结构连接': 'structural connectivity sc',
  '功能连接': 'functional connectivity fc',
  '图论': 'graph',
  '网络': 'network',
  '解码': 'decoding svm',
  '支持向量机': 'svm',
  '隐马尔可夫': 'hmm markov',
  '马尔可夫': 'markov',
  '张量分解': 'tensor decomposition',
  '主成分': 'pca',
  '广义线性模型': 'glm',
  '贝叶斯': 'bayesian',
  '调谐曲线': 'tuning curve',
  '光遗传': 'opto optogenetic',
  '视觉': 'visual',
  '刺激': 'stimulus',
  ' trials': 'trial',
}

let catalogCache = null
let catalogWarned = false

async function catalog() {
  if (catalogCache) return catalogCache
  const entries = []
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name)
      if (entry.isDirectory()) await walk(path)
      else if (entry.isFile() && entry.name === 'SKILL.md') {
        const text = await readFile(path, 'utf8')
        const id = relative(root, path).split(sep).join('/')
        entries.push({ id, path, title: text.split(/\r?\n/).find(line => /^#\s+\S/.test(line))?.replace(/^#\s+/, '') || id,
          preview: text.replace(/\s+/g, ' ').slice(0, 700) })
      }
    }
  }
  await walk(root)
  if (entries.length !== EXPECTED_COUNT) {
    // Degrade to a one-time warning instead of breaking every search.
    if (!catalogWarned) {
      catalogWarned = true
      console.warn(`[cyberfish-seekbrain] recipe count mismatch: expected ${EXPECTED_COUNT}, found ${entries.length}. Search will proceed; the bundled index may be out of date.`)
    }
  }
  catalogCache = entries
  return entries
}

/** For tests / hot-reload. */
export function _resetCatalogCache() { catalogCache = null; catalogWarned = false }

function expandQuery(raw) {
  const lower = String(raw || '').toLowerCase()
  const expanded = []
  for (const [zh, en] of Object.entries(ZH_ALIASES)) {
    if (lower.includes(zh)) expanded.push(en)
  }
  return `${lower} ${expanded.join(' ')}`.trim()
}

export async function searchRecipes(query, limit = 8) {
  const raw = String(query || '').trim()
  if (!raw) throw new Error('请提供物种、模态、分析方法或输出关键词。')
  if (!Number.isInteger(limit) || limit < 1 || limit > 20) throw new Error('limit 须为1–20的整数。')
  const expanded = expandQuery(raw)
  const terms = expanded.split(/\s+/).filter(Boolean)
  return (await catalog()).map(recipe => ({ ...recipe, score: terms.reduce((total, term) => total
    + (recipe.id.toLowerCase().includes(term) ? 3 : 0) + (recipe.title.toLowerCase().includes(term) ? 2 : 0)
    + (recipe.preview.toLowerCase().includes(term) ? 1 : 0), 0) })).filter(recipe => recipe.score > 0)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)).slice(0, limit)
}

export async function readRecipe(id) {
  const target = resolve(root, String(id || ''))
  const rel = relative(root, target)
  if (!rel || rel.startsWith('..') || isAbsolute(rel) || !target.endsWith(`${sep}SKILL.md`)) {
    throw new Error('id 必须是 recipes 内某个配方的相对 SKILL.md 路径。')
  }
  let realRoot, realTarget
  try {
    ;[realRoot, realTarget] = await Promise.all([realpath(root), realpath(target)])
  } catch {
    // Do not leak host absolute paths via ENOENT.
    throw new Error(`配方不存在: ${rel.split(sep).join('/')}。请先用 search 检索有效 id。`)
  }
  if (!realTarget.startsWith(realRoot + sep)) throw new Error('配方链接越过技能资源根目录。')
  const text = await readFile(realTarget, 'utf8')
  return { id: rel.split(sep).join('/'), content: text.slice(0, MAX_CONTENT), truncated: text.length > MAX_CONTENT,
    resourceBase: dirname(realTarget), note: '仅加载本配方；按需再读取其 references，避免一次引入全部68个配方。' }
}
