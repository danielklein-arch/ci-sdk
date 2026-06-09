import { $ } from 'bun'
import type { AffectedOptions } from './types'

// Vše voláme přes `bunx` → resolve z consumer node_modules (nx/biome/wrangler peer deps).
export function affectedArgs(opts: AffectedOptions): string[] {
  const args: string[] = []
  if (opts.base) args.push(`--base=${opts.base}`)
  if (opts.head) args.push(`--head=${opts.head}`)
  return args
}

// Spustí nx target — affected (jen dotčené projekty) nebo run-many (všechny).
export function nxTarget(target: string, opts: AffectedOptions): Promise<unknown> {
  if (opts.affected) return $`bunx nx affected -t ${target} ${affectedArgs(opts)}`
  return $`bunx nx run-many -t ${target}`
}
