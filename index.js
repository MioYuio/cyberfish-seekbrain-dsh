import { defineTool } from '@deepseek-ai/dsh-tools'
import { readdir, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { auditClaim } from './lib/audit.js'
import { readRecipe, searchRecipes } from './lib/recipes.js'

export const name = 'cyberfish-seekbrain'
export const inject = ['tools', 'skills']

/** No runtime, model, provider, credential or external-service configuration. */
export const Config = undefined

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/
function metadata(text, file) {
  const match = FRONTMATTER.exec(text)
  if (!match) throw new Error(`${file} 缺少 YAML frontmatter`)
  const name = match[1].match(/^name:\s*([a-z0-9][a-z0-9-]*)\s*$/m)?.[1]
  const description = match[1].match(/^description:\s*(.+)\s*$/m)?.[1]
  if (!name || !description) throw new Error(`${file} 需要单行 name/description`)
  return { name, description }
}

async function bundledSkills() {
  const root = fileURLToPath(new URL('./skills/', import.meta.url))
  const result = []
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const path = join(root, entry.name, 'SKILL.md')
    const text = await readFile(path, 'utf8')
    const meta = metadata(text, path)
    result.push({ ...meta, invocation: { modelInvocable: true, userInvocable: true }, source: 'bundled',
      resourceBase: { kind: 'directory', path: dirname(path) }, path, content: text.slice(FRONTMATTER.exec(text)[0].length).trim() })
  }
  return result
}

export async function apply(ctx) {
  for (const skill of await bundledSkills()) ctx.skills.register(skill)
  ctx.logger.info(`[${name}] Neuroscience bundle loaded; using DSH model, tools, MCP and approvals only.`)
  ctx.tools.register(defineTool({
    name: 'seekbrain_recipe',
    description: '检索并读取插件自带的68个SeekBrain神经科学配方；只读本地技能资源，不启动外部运行时或LLM。action=search/get。',
    parameters: {
      action: { type: 'string', required: true, enum: ['search', 'get'], description: 'search检索配方，get按检索返回的id读取单个配方。' },
      query: { type: 'string', description: 'search所需物种、模态、方法或输出关键词。' },
      id: { type: 'string', description: 'get所需配方相对SKILL.md路径。' },
      limit: { type: 'integer', description: 'search结果上限，默认8，范围1–20。' },
    },
    output: {
      schema: { type: 'json' },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value, null, 2) }],
    },
    async execute(args) {
      const result = args.action === 'search' ? { version: '0.1.4', recipes: await searchRecipes(args.query, args.limit) }
        : await readRecipe(args.id)
      return { content: [{ type: 'json', json: result }], details: result }
    },
  }))
  ctx.tools.register(defineTool({
    name: 'brainpilot_audit',
    description: '对给定文本做保守科研证据预审，标出 flaw/unverified；不替代真实数据、代码和工件审计。action=text 或 file。',
    parameters: {
      action: { type: 'string', required: true, enum: ['text', 'file'], description: '审计给定文本或单个指定文件。' },
      text: { type: 'string', description: '要审计的文本（action=text）。' },
      path: { type: 'string', description: '要读取的单个文本路径（action=file），不扫描目录。' },
      artifacts: { type: 'array', items: { type: 'string' }, description: '用户提供的工件标识；缺失时对应证据项为 unverified。' },
    },
    output: {
      schema: { type: 'json' },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value, null, 2) }],
    },
    async execute(args) {
      const result = await auditClaim({ ...args, text: args.action === 'text' ? args.text : undefined, path: args.action === 'file' ? args.path : undefined })
      return { content: [{ type: 'json', json: result }], details: result }
    },
  }))
}
