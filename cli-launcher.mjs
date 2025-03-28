#!/usr/bin/env node
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcEntrypoint = join(__dirname, 'src/entrypoints/cli.tsx');

// Try to find the tsx binary on the system
let tsxCommand = 'tsx';
const possibleTsxPaths = [
  '/usr/local/bin/tsx',
  '/usr/bin/tsx',
  join(process.env.HOME || '', '.nvm/versions/node/v22.14.0/bin/tsx'),
  'npx'
];

let command = '';
let args = [];

for (const path of possibleTsxPaths) {
  if (path === 'npx' || existsSync(path)) {
    if (path === 'npx') {
      command = 'npx';
      args = ['--yes', 'tsx', srcEntrypoint, ...process.argv.slice(2)];
    } else {
      command = path; 
      args = [srcEntrypoint, ...process.argv.slice(2)];
    }
    break;
  }
}

if (!command) {
  console.error('Could not find tsx. Please install it with: npm install -g tsx');
  process.exit(1);
}

// Run the command
const child = spawn(command, args, {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    // Ensure experimental warnings are suppressed
    NODE_NO_WARNINGS: '1'
  }
});

child.on('exit', (code) => {
  process.exit(code || 0);
});