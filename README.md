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

## Adopce na novém projektu — krok za krokem

### 0. Předpoklady (Nx workspace na Bunu)
- root `nx.json` + per-worker/`packages` `project.json` s targety:
  - `typecheck` (`tsc --noEmit -p <projekt>/tsconfig.json`)
  - `test` (vitest; workery přes `@cloudflare/vitest-pool-workers`)
  - `types` (`wrangler types ./worker-configuration.d.ts -c ./wrangler.dev.jsonc`, `cache: false`)
  - volitelně `build` (naplní build matrix)
- root `biome.json`; commitnuté `worker-configuration.d.ts` per worker (drift check je hlídá).
- Vzor kompletního setupu: [`dbu-txs-preview-lab`](https://github.com/danielklein-arch/dbu-txs-preview-lab).

### 1. Instalace
```bash
bun add -d @danielklein/ci-sdk
```

### 2. Workflow — zkopíruj šablonu
```bash
cp node_modules/@danielklein/ci-sdk/templates/ci.yml .github/workflows/ci.yml
```
([`templates/ci.yml`](templates/ci.yml) — `pull_request` only; push do stable větví gate-uje
deploy-stable z deploy-sdk šablon, ať CI neběží 2×.) Uprav `branches` + `bun-version`.

### 3. Gotchas
- **`permissions: actions: read`** je POVINNÉ u callera — `nrwl/nx-set-shas` se ptá Actions API.
- ci-sdk repo je private → cross-repo `uses:` chce access grant (jednorázově, vlastník):
  `gh api -X PUT repos/danielklein-arch/ci-sdk/actions/permissions/access -f access_level=user`
- Projekt mimo Nx graf (root `topology.ts` apod.) ci-sdk nepokryje → vlastní „glue" job
  (`tsc --noEmit -p tsconfig.json`).

### 4. Branch protection
Vyžaduj checks `ci / check` (+ `ci / build (...)` dle potřeby) na PR větvích.

### 5. Reusable workflow inputs
`affected` (default false → run-many vše), `bun-version`, `skip-codecheck|nx-sync|wrangler-types|typecheck|tests|build`.
Jobs: `check` (sekvence checků) → `targets` → `build` (matrix projektů s `build` targetem).

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

`0.0.2` — extrahováno z `dbu-txs-preview-lab` (referenční consumer). Reusable `workflow_call`
workflow (`@v1`) + consumer šablona v `templates/` hotové. Zbývá: dbu-txs jako reálný consumer.

## Build

```bash
bun install
bun run build      # bun build → dist/{index,cli}.js + tsc → dist/*.d.ts
```

Peer deps: `nx >=20`, `wrangler >=4` (+ consumer má `@biomejs/biome`).
