#!/usr/bin/env node
import { spawn } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const tsxPath = resolve(__dirname, '../node_modules/.bin/tsx');
const mainPath = resolve(__dirname, '../src/cli/main.ts');

const child = spawn(tsxPath, [mainPath, ...process.argv.slice(2)], {
  stdio: 'inherit',
  shell: true
});

child.on('exit', (code) => {
  process.exit(code || 0);
});