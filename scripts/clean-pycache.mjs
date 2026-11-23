// Remove __pycache__ / *.pyc under scripts/ so npm 'files' whitelist does not ship bytecode.
// Runs as part of the prepack hook, AFTER py_compile in `check` may have re-created them.
import { rm, readdir } from 'node:fs/promises'
import { join } from 'node:path'

const ROOT = new URL('../scripts/', import.meta.url).pathname

async function clean(dir) {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of entries) {
    const p = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === '__pycache__') {
        await rm(p, { recursive: true, force: true })
        console.log(`[clean-pycache] removed ${p}`)
      } else {
        await clean(p)
      }
    } else if (entry.isFile() && entry.name.endsWith('.pyc')) {
      await rm(p, { force: true })
      console.log(`[clean-pycache] removed ${p}`)
    }
  }
}

await clean(ROOT)
