import { readdir, readFile, realpath } from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../skills/cyberfish-seekbrain/recipes/', import.meta.url))
const MAX_CONTENT = 60_000

async function catalog() {
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
  if (entries.length !== 68) throw new Error(`固定配方清单应为68个，实际${entries.length}个；拒绝把缺失或重复版本当作完整包发布。`)
  return entries
}

export async function searchRecipes(query, limit = 8) {
  const terms = String(query || '').trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (!terms.length) throw new Error('请提供物种、模态、分析方法或输出关键词。')
  if (!Number.isInteger(limit) || limit < 1 || limit > 20) throw new Error('limit 须为1–20的整数。')
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
  const [realRoot, realTarget] = await Promise.all([realpath(root), realpath(target)])
  if (!realTarget.startsWith(realRoot + sep)) throw new Error('配方链接越过技能资源根目录。')
  const text = await readFile(realTarget, 'utf8')
  return { id: rel.split(sep).join('/'), content: text.slice(0, MAX_CONTENT), truncated: text.length > MAX_CONTENT,
    resourceBase: dirname(realTarget), note: '仅加载本配方；按需再读取其 references，避免一次引入全部68个配方。' }
}
