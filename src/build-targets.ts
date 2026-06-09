import { $ } from 'bun'
import { affectedArgs } from './nx'
import type { AffectedOptions } from './types'

// Názvy projektů s `build` targetem — pro GH Actions build matrix.
export async function buildTargets(opts: AffectedOptions = {}): Promise<string[]> {
  const cmd = opts.affected
    ? $`bunx nx show projects --affected --with-target build --json ${affectedArgs(opts)}`
    : $`bunx nx show projects --with-target build --json`
  const out = (await cmd.quiet().text()).trim()
  return out ? (JSON.parse(out) as string[]) : []
}
