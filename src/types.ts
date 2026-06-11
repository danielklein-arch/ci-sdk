// Affected base/head: pokud nejsou předané, nx čte NX_BASE/NX_HEAD env (nrwl/nx-set-shas).
export type AffectedOptions = {
  affected?: boolean
  base?: string
  head?: string
}

export type CheckOptions = AffectedOptions & {
  // Override codecheck příkazu (default `bunx biome ci`) — např. `bun run lint` pro eslint consumery.
  codecheckCmd?: string
  skipCodecheck?: boolean
  skipNxSync?: boolean
  skipWranglerTypes?: boolean
  skipTypecheck?: boolean
  skipTests?: boolean
}
