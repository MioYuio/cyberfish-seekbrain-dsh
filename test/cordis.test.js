import test from 'node:test'
import assert from 'node:assert/strict'
import { Context } from '@deepseek-ai/cordis'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import { SkillRegistry } from '@deepseek-ai/dsh-skill'
import * as plugin from '../index.js'

test('real Cordis mounts, resolves and disposes the lightweight skill bundle', async () => {
  const ctx = new Context()
  await   ctx.provide('systemPrompt', { tools() {}, section() {} })
  await ctx.plugin(ToolRuntime, { mode: 'native' })
  await ctx.plugin(SkillRegistry)
  const fiber = ctx.plugin(plugin, {})
  await fiber
  assert.ok([1, 2].includes(fiber.state))
  const skills = await ctx.skills.list()
  assert.deepEqual(skills.map(skill => skill.name).sort(), ['brainpilot-audit', 'copilotj-bioimage', 'cyberfish-seekbrain'])
  const definition = await ctx.skills.get('cyberfish-seekbrain')
  assert.match(definition.content, /Formulate → Code → Validate → Interpret/)
  assert.deepEqual(ctx.tools.schemas().map(tool => tool.name), ['seekbrain_recipe', 'brainpilot_audit'])
  await fiber.dispose()
  assert.equal(await ctx.skills.get('cyberfish-seekbrain'), undefined)
  assert.deepEqual(ctx.tools.schemas(), [])
  await ctx.fiber.dispose()
})
