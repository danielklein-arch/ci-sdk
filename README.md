# @danielklein/ci-sdk

**Nx-native CI engine + CLI** pro Bun monorepa — orchestruje standardní quality checks
(codecheck / nx-sync / wrangler-types drift / typecheck / test) čistě přes `nx` + `biome` +
`wrangler`. Affected-aware. Sourozenec [`@danielklein/deploy-sdk`](https://www.npmjs.com/package/@danielklein/deploy-sdk) (CD).

**Bun-only**: engine používá `$` z `bun` (každý nx/biome/wrangler call přes `bunx`).

## Koncept

Konzument je **Nx workspace na Bunu** (per-worker `project.json` s targety `typecheck` / `test` /
`types`) + `biome.json` + commitnuté `worker-configuration.d.ts`. ci-sdk dodá orchestraci + CLI;
consumer dodá tenký GH workflow (`workflow_call`) a `nrwl/nx-set-shas` pro affected base/head.

Nahrazuje sdílený reusable CI workflow — checky jdou spustit i **lokálně** (`bunx ci-sdk check`).

## CLI

```bash
bunx ci-sdk check                 # codecheck · nx-sync · wrangler-types · typecheck · test
  --skip-codecheck --skip-nx-sync --skip-wrangler-types --skip-typecheck --skip-tests
  --affected [--base <sha> --head <sha>]   # jen dotčené projekty (jinak run-many = vše)

bunx ci-sdk build-targets [--affected]     # JSON pole projektů s 'build' targetem (matrix)
bunx ci-sdk wrangler-types [--check]       # regeneruj typy; --check = drift check (exit 1)
```

`--affected` bez `--base/--head` čte `NX_BASE`/`NX_HEAD` (nastaví `nrwl/nx-set-shas@v4`).

**wrangler-types drift check** (`--check`): regeneruje `worker-configuration.d.ts` (`nx run-many
-t types`) a ověří přes `git diff` (+ `git add -N` → chytí i nové untracked), že commitnuté verze
jsou aktuální. Řeší to, co sdílená platform CI má zatím zakomentované.

## Veřejné API

```ts
import {
  runCheck, checkWranglerTypes, generateTypes, buildTargets,
  type CheckOptions, type AffectedOptions,
} from '@danielklein/ci-sdk'

await runCheck({ affected: true, skipTests: true })   // CI sekvence honoring skips
await checkWranglerTypes()                            // drift check (throw on drift)
const targets = await buildTargets({ affected: true }) // string[] pro matrix
```

## Stav

`0.0.1` — extrahováno z `dbu-txs-preview-lab` (referenční consumer). Zbývá: reusable
`workflow_call` workflow + tenký consumer workflow (Phase 2); dbu-txs jako reálný consumer (Phase 3).

## Build

```bash
bun install
bun run build      # bun build → dist/{index,cli}.js + tsc → dist/*.d.ts
```

Peer deps: `nx >=20`, `wrangler >=4` (+ consumer má `@biomejs/biome`).
