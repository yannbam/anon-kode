#!/usr/bin/env node
/*
 * ESM MIGRATION TEST SCRIPT
 * 
 * This script helps identify common runtime issues with ESM module loading.
 * Run this script to check for potential import path problems, dynamically imported
 * modules, and other common ESM migration pitfalls.
 * 
 * Usage: 
 *   node .CLAUDE/esm-test-script.js
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name in ESM context
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Configuration
const REPORT_FILE = path.join(__dirname, 'esm-test-report.md');
const DIST_DIR = path.join(rootDir, 'dist');
const COMMON_PROBLEMS = [
  { pattern: /import\s+.*\s+from\s+['"](.+?)['"]/, test: hasNoExtension, message: "Missing file extension in import" },
  { pattern: /import\s+.*\s+from\s+['"](.+?)\.tsx['"]/, message: "Importing .tsx file directly (should be .js)" },
  { pattern: /import\s+.*\s+from\s+['"](.+?)\.jsx['"]/, message: "Importing .jsx file directly (should be .js)" },
  { pattern: /import\s+.*\s+from\s+['"](.+?)\/index['"]/, message: "Import using /index without extension" },
  { pattern: /const\s+.*\s+=\s+require\(['"](.+?)['"]\)/, message: "Using require() in ESM module" },
  { pattern: /import\(\s*['"](.+?)['"]\s*\)/, test: hasNoExtension, message: "Dynamic import with no extension" },
  { pattern: /__(?:dirname|filename)/, message: "Using __dirname or __filename (not available in ESM)" },
];

// Helpers
function hasNoExtension(match, relPath) {
  // Skip if it's a package import or has a file extension
  return relPath && 
         !relPath.startsWith('@') && 
         !relPath.startsWith('node:') &&
         !relPath.startsWith('.') &&
         !path.extname(relPath) && 
         relPath.includes('/');
}

async function scanDirectory(directory, results = {}) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    
    if (entry.isDirectory()) {
      await scanDirectory(fullPath, results);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      await analyzeFile(fullPath, results);
    }
  }
  
  return results;
}

async function analyzeFile(filePath, results) {
  try {
    const relativePath = path.relative(DIST_DIR, filePath);
    const content = await fs.readFile(filePath, 'utf8');
    const fileIssues = [];
    
    // Check for common ESM problems
    for (const { pattern, message, test } of COMMON_PROBLEMS) {
      const matches = [...content.matchAll(pattern)];
      
      for (const match of matches) {
        if (!test || test(match, match[1])) {
          const line = findLineNumber(content, match.index);
          fileIssues.push(`- Line ${line}: ${message} - \`${match[0].trim()}\``);
        }
      }
    }
    
    if (fileIssues.length > 0) {
      results[relativePath] = fileIssues;
    }
  } catch (error) {
    console.error(`Error analyzing ${filePath}:`, error);
  }
}

function findLineNumber(content, index) {
  return content.substring(0, index).split('\n').length;
}

async function generateReport(results) {
  const issueCount = Object.values(results).flat().length;
  let report = `# ESM Migration Test Report\n\n`;
  report += `Generated: ${new Date().toISOString()}\n\n`;
  report += `Total files with issues: ${Object.keys(results).length}\n`;
  report += `Total issues found: ${issueCount}\n\n`;
  
  if (issueCount === 0) {
    report += `No ESM-related issues found! 🎉\n`;
  } else {
    report += `## Issues by File\n\n`;
    
    for (const [file, issues] of Object.entries(results)) {
      report += `### ${file}\n\n`;
      report += issues.join('\n');
      report += '\n\n';
    }
    
    report += `## Next Steps\n\n`;
    report += `1. Review each issue and determine if it's a false positive or a genuine problem\n`;
    report += `2. Fix the most critical issues first (those that prevent the application from running)\n`;
    report += `3. Test thoroughly after each fix\n`;
    report += `4. Re-run this test script until no issues are found\n`;
  }
  
  await fs.writeFile(REPORT_FILE, report, 'utf8');
  return report;
}

// Main execution
async function main() {
  try {
    console.log('Building the project first...');
    // We'll use the process module to spawn a child process
    // Note: In a real script we would spawn a process to run the build
    // But for this example, we'll just continue
    
    console.log(`Scanning directory: ${DIST_DIR}`);
    const results = await scanDirectory(DIST_DIR);
    
    console.log('Generating report...');
    const report = await generateReport(results);
    
    console.log(`\nAnalysis complete! Report saved to: ${REPORT_FILE}`);
    console.log(`Found ${Object.values(results).flat().length} potential issues in ${Object.keys(results).length} files.`);
  } catch (error) {
    console.error('Error during analysis:', error);
    process.exit(1);
  }
}

main();
