import { $ } from 'bun'
import { nxTarget } from './nx'
import type { CheckOptions } from './types'
import { checkWranglerTypes } from './wrangler-types'

// hint = lokální repro/fix — failnutý CI krok musí říct, co spustit u sebe.
type Step = { name: string; run: () => Promise<unknown>; hint: string }

// CI sekvence (mirror sdílené platform CI), affected-aware. Pořadí: levné → drahé.
export async function runCheck(opts: CheckOptions = {}): Promise<void> {
  const nxHint = (target: string): string =>
    opts.affected ? `lokálně: \`bunx nx affected -t ${target}\`` : `lokálně: \`bunx nx run-many -t ${target}\``
  const steps: Step[] = []
  if (!opts.skipCodecheck) {
    const cmd = opts.codecheckCmd
    steps.push({
      name: `codecheck (${cmd ?? 'biome'})`,
      run: () => (cmd ? $`${{ raw: cmd }}` : $`bunx biome ci`),
      hint: `lokálně: \`${cmd ?? 'bunx biome ci'}\``,
    })
  }
  if (!opts.skipNxSync)
    steps.push({
      name: 'nx sync:check',
      run: () => $`bunx nx sync:check`,
      hint: 'fix: `bunx nx sync` a commitni změny (project.json/tsconfig references)',
    })
  if (!opts.skipWranglerTypes)
    steps.push({
      name: 'wrangler-types drift',
      run: checkWranglerTypes,
      hint: 'fix: `bunx nx run-many -t types` a commitni worker-configuration.d.ts',
    })
  if (!opts.skipTypecheck) steps.push({ name: 'typecheck', run: () => nxTarget('typecheck', opts), hint: nxHint('typecheck') })
  if (!opts.skipTests) steps.push({ name: 'test', run: () => nxTarget('test', opts), hint: nxHint('test') })

  for (const step of steps) {
    console.log(`\n▶ ci-sdk: ${step.name}`)
    try {
      await step.run()
    } catch (err) {
      // Výstup příkazu už je v logu nad tím (Bun $ streamuje) — doplň krok + repro.
      const msg = err instanceof Error ? err.message : String(err)
      throw new Error(`✗ krok '${step.name}' selhal (${msg}) — ${step.hint}; detail výše v logu`)
    }
  }
  console.log(`\n✓ ci-sdk: ${steps.length} check(s) passed`)
}
