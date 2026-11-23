import test from 'node:test'
import assert from 'node:assert/strict'
import { apply, Config, inject, name } from '../index.js'

function context() {
  const tools = [], skills = [], logs = []
  return { tools, skills, logs, ctx: {
    logger: { info: message => logs.push(message) },
    tools: { register: tool => tools.push(tool) },
    skills: { register: skill => skills.push(skill) },
  } }
}

test('lightweight DSH bundle has recipe and audit tools plus three skills, no LLM config', async () => {
  const { ctx, tools, skills, logs } = context()
  await apply(ctx)
  assert.equal(name, 'cyberfish-seekbrain')
  assert.deepEqual(inject, ['tools', 'skills'])
  assert.equal(Config, undefined)
  assert.deepEqual(tools.map(tool => tool.name), ['seekbrain_recipe', 'brainpilot_audit'])
  assert.deepEqual(skills.map(skill => skill.name).sort(), ['brainpilot-audit', 'copilotj-bioimage', 'cyberfish-seekbrain'])
  assert.ok(skills.every(skill => skill.content.length > 50 && skill.resourceBase.kind === 'directory'))
  assert.ok(logs.every(line => !line.includes('API Key')))
  assert.equal(Object.hasOwn(ctx, 'config'), false)
})

test('audit never manufactures scientific evidence', async () => {
  const { ctx, tools } = context()
  await apply(ctx)
  const output = await tools[1].execute({ action: 'text', text: 'The results may suggest a difference.' })
  // Canonical value contract (DSH 0.2.x): execute returns the result itself, not a {content,details} wrapper.
  assert.equal(output.verdict, 'unverified')
  assert.ok(output.findings.some(item => item.id === 'empirical-validation'))
  assert.ok(Array.isArray(output.next))
  assert.equal(typeof output.scope, 'string')
})

test('recipe tool returns canonical value, no double-wrapping', async () => {
  const { ctx, tools } = context()
  await apply(ctx)
  const out = await tools[0].execute({ action: 'search', query: 'zebrafish circular', limit: 3 })
  // Must NOT have the legacy {content, details} shape.
  assert.equal(Object.hasOwn(out, 'details'), false)
  assert.equal(Object.hasOwn(out, 'content') && Array.isArray(out.content), false)
  assert.equal(typeof out.version, 'string')
  assert.ok(Array.isArray(out.recipes) && out.recipes.length > 0)
  // render projects canonical value to text content block.
  const blocks = tools[0].output.render({}, out)
  assert.equal(blocks.length, 1)
  assert.equal(blocks[0].type, 'text')
  const parsed = JSON.parse(blocks[0].text)
  assert.equal(parsed.version, out.version)
  assert.equal(parsed.recipes.length, out.recipes.length)
})
