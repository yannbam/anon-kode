#!/usr/bin/env node
/*
 * TypeScript Analysis Script
 * 
 * This script analyzes specific TypeScript files to find errors
 * using the project's actual tsconfig settings.
 */
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const projectRoot = process.cwd();

// Files to check (add more as needed) - paths relative to project root
const filesToCheck = [
  'src/components/Link.tsx',
  'src/components/AsciiLogo.tsx',
  'src/components/FallbackToolUseRejectedMessage.tsx',
  'src/components/CustomSelect/select-option.tsx',
  'src/components/binary-feedback/BinaryFeedbackView.tsx',
  'src/components/binary-feedback/BinaryFeedback.tsx',
  'src/constants/macros.ts',
  'src/utils/log.ts',
  'src/types/logs/index.ts',
  'src/services/statsig.ts'
];

// Convert to absolute paths for checking existence
const absoluteFilePaths = filesToCheck.map(file => path.resolve(projectRoot, file));

// Verify files exist
for (const filePath of absoluteFilePaths) {
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }
}

console.log("Analyzing specific TypeScript files with project settings...");
console.log("Files to check:", filesToCheck.join(", "));

// Run tsc directly against the files using the project's tsconfig
const tsc = spawn('npx', ['tsc', '--noEmit', '--project', 'tsconfig.json', ...filesToCheck], {
  stdio: 'pipe',
  shell: true
});

tsc.stdout.on('data', (data) => {
  console.log(data.toString());
});

let errorOutput = '';
tsc.stderr.on('data', (data) => {
  const output = data.toString();
  errorOutput += output;
  console.error(output);
});

tsc.on('exit', (code) => {
  console.log(`Analysis completed with exit code: ${code}`);
  if (code === 0) {
    console.log("✅ Great news! No TypeScript errors found in the specified files.");
  } else {
    console.log("❌ TypeScript errors found. See output above for details.");
    
    // Count errors by file
    const errorsByFile = {};
    const errorLines = errorOutput.split('\n');
    
    for (const line of errorLines) {
      const match = line.match(/^(.+\.tsx?)\(\d+,\d+\):/);
      if (match) {
        const file = match[1];
        errorsByFile[file] = (errorsByFile[file] || 0) + 1;
      }
    }
    
    if (Object.keys(errorsByFile).length > 0) {
      console.log("\nError counts by file:");
      for (const [file, count] of Object.entries(errorsByFile)) {
        console.log(`${file}: ${count} errors`);
      }
    }
  }
});
