import { $ } from 'bun'

const GLOB = '**/worker-configuration.d.ts'

// Regeneruj wrangler runtime typy pro všechny workery (nx `types` target → wrangler types).
export async function generateTypes(): Promise<void> {
  await $`bunx nx run-many -t types`
}

// Drift check: regeneruj a ověř, že commitnuté worker-configuration.d.ts jsou aktuální.
// Řeší to, co sdílená platform CI má zatím zakomentované (PLTFRM-89).
export async function checkWranglerTypes(): Promise<void> {
  await generateTypes()
  // `git add -N` → i nový untracked d.ts se objeví v diffu (jinak by ho `git diff` minul).
  await $`git add -N -- ${GLOB}`
  const res = await $`git diff --exit-code -- ${GLOB}`.nothrow()
  if (res.exitCode !== 0) {
    throw new Error(
      'wrangler-types drift: commitnuté worker-configuration.d.ts nejsou aktuální → spusť `nx run-many -t types` a commitni výsledek.',
    )
  }
}
