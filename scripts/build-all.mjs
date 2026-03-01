import { spawnSync } from 'node:child_process';
import process from 'node:process';

const commands = [
  ['pnpm', ['canvas:a2ui:bundle']],
  ['pnpm', ['tsdown']],
  ['node', ['--import', 'tsx', 'scripts/canvas-a2ui-copy.ts'], { SANI_A2UI_SKIP_MISSING: '1' }],
  ['node', ['--import', 'tsx', 'scripts/copy-hook-metadata.ts']],
  ['node', ['--import', 'tsx', 'scripts/write-build-info.ts']],
  ['node', ['--import', 'tsx', 'scripts/write-cli-compat.ts']]
];

for (const [cmd, args, envVars] of commands) {
  console.log(`\x1b[36m> Executing: ${cmd} ${args.join(' ')}\x1b[0m`);
  
  const result = spawnSync(cmd, args, {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, ...envVars }
  });

  if (result.status !== 0) {
    console.error(`\x1b[31m! Command failed with exit code ${result.status}\x1b[0m`);
    process.exit(result.status ?? 1);
  }
}

console.log('\x1b[32m✔ Build complete!\x1b[0m');
