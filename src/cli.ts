#!/usr/bin/env bun
// CLI bin packagu (`bunx ci-sdk <cmd>`). Tenký wrapper nad lib (src/index.ts).
// Consumer dodá Nx workspace + workflowy; CLI vlastní orchestraci + flag→opts wiring.
import { appendFileSync } from 'node:fs'
import { parseArgs } from 'node:util'
import { buildTargets } from './build-targets'
import { runCheck } from './check'
import type { AffectedOptions, CheckOptions } from './types'
import { checkWranglerTypes, generateTypes } from './wrangler-types'

function fail(msg: string): never {
  console.error(msg)
  process.exit(1)
}

function usage(): never {
  fail(`ci-sdk <command> [flags]

  check                  CI sekvence: codecheck · nx-sync · wrangler-types · typecheck · test
    --skip-codecheck --skip-nx-sync --skip-wrangler-types --skip-typecheck --skip-tests
    --affected           jen affected projekty (nx affected); jinak run-many (vše)
    --base <sha> --head <sha>   override affected base/head (jinak NX_BASE/NX_HEAD)

  build-targets          vypíše JSON pole projektů s 'build' targetem (workflow matrix)
    --affected [--base --head]   (emit i jako GH step output 'targets')

  wrangler-types         regeneruj worker-configuration.d.ts (nx run-many -t types)
    --check              místo regenerace ověř drift (exit 1 když commitnuté nejsou aktuální)

Affected base/head: nejdřív --base/--head, jinak nx čte NX_BASE/NX_HEAD (nrwl/nx-set-shas).`)
}

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    'skip-codecheck': { type: 'boolean' },
    'skip-nx-sync': { type: 'boolean' },
    'skip-wrangler-types': { type: 'boolean' },
    'skip-typecheck': { type: 'boolean' },
    'skip-tests': { type: 'boolean' },
    affected: { type: 'boolean' },
    check: { type: 'boolean' },
    base: { type: 'string' },
    head: { type: 'string' },
  },
})

function affectedOpts(): AffectedOptions {
  return { affected: values.affected, base: values.base, head: values.head }
}

const cmd = positionals[0]

try {
  if (cmd === 'check') {
    const opts: CheckOptions = {
      ...affectedOpts(),
      skipCodecheck: values['skip-codecheck'],
      skipNxSync: values['skip-nx-sync'],
      skipWranglerTypes: values['skip-wrangler-types'],
      skipTypecheck: values['skip-typecheck'],
      skipTests: values['skip-tests'],
    }
    await runCheck(opts)
  } else if (cmd === 'build-targets') {
    const targets = await buildTargets(affectedOpts())
    const json = JSON.stringify(targets)
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `targets=${json}\n`)
    process.stdout.write(`${json}\n`)
  } else if (cmd === 'wrangler-types') {
    if (values.check) await checkWranglerTypes()
    else await generateTypes()
  } else {
    usage()
  }
} catch (err) {
  fail(err instanceof Error ? err.message : String(err))
}
