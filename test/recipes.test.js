import test from 'node:test'
import assert from 'node:assert/strict'
import { readRecipe, searchRecipes } from '../lib/recipes.js'

test('bundled resources return relevant recipes without any external runtime', async () => {
  const hits = await searchRecipes('zebrafish circular', 5)
  assert.ok(hits.length > 0)
  assert.ok(hits[0].id.includes('zebrafish'))
  const recipe = await readRecipe(hits[0].id)
  assert.ok(recipe.content.length > 100)
  await assert.rejects(readRecipe('../package.json'), /相对|路径/)
  await assert.rejects(searchRecipes('', 5), /关键词/)
  await assert.rejects(searchRecipes('zebrafish', 100), /1–20/)
})
