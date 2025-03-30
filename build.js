#!/usr/bin/env node
/*
 * PRODUCTION BUILD TOOL
 * 
 * This script compiles TypeScript files and fixes module imports.
 * Now that all TypeScript errors are fixed, we don't need to suppress errors anymore.
 */
import { spawn } from 'child_process';

// Run tsc with proper configuration
const tsc = spawn('npx', ['tsc', '-p', 'tsconfig.build.json'], {
  stdio: 'inherit',
  shell: true
});

tsc.on('exit', (code) => {
  if (code !== 0) {
    console.error(`TypeScript compilation failed with code ${code}`);
    process.exit(code);
  }
  
  console.log('TypeScript compilation successful. Fixing module imports...');
  
  // Run fix-imports.js after successful compilation
  const fixImports = spawn('node', ['fix-imports.js'], {
    stdio: 'inherit',
    shell: true
  });
  
  fixImports.on('exit', (fixCode) => {
    if (fixCode === 0) {
      console.log('Build completed successfully!');
    } else {
      console.error('Failed to fix module imports.');
      process.exit(fixCode);
    }
  });
});
