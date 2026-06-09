import { $ } from 'bun'
import { nxTarget } from './nx'
import type { CheckOptions } from './types'
import { checkWranglerTypes } from './wrangler-types'

type Step = { name: string; run: () => Promise<unknown> }

// CI sekvence (mirror sdílené platform CI), affected-aware. Pořadí: levné → drahé.
export async function runCheck(opts: CheckOptions = {}): Promise<void> {
  const steps: Step[] = []
  if (!opts.skipCodecheck) steps.push({ name: 'codecheck (biome)', run: () => $`bunx biome ci` })
  if (!opts.skipNxSync) steps.push({ name: 'nx sync:check', run: () => $`bunx nx sync:check` })
  if (!opts.skipWranglerTypes) steps.push({ name: 'wrangler-types drift', run: checkWranglerTypes })
  if (!opts.skipTypecheck) steps.push({ name: 'typecheck', run: () => nxTarget('typecheck', opts) })
  if (!opts.skipTests) steps.push({ name: 'test', run: () => nxTarget('test', opts) })

  for (const step of steps) {
    console.log(`\n▶ ci-sdk: ${step.name}`)
    await step.run()
  }
  console.log(`\n✓ ci-sdk: ${steps.length} check(s) passed`)
}
