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
  assert.equal(output.details.verdict, 'unverified')
  assert.ok(output.details.findings.some(item => item.id === 'empirical-validation'))
})
