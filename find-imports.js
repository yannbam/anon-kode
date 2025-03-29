#!/usr/bin/env node
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import * as path from 'path';

// Define patterns to find import statements
const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+[^,]+|[^,{}]+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+[^,]+|[^,{}]+))*\s+from\s+['"]([^'"]+)['"])|import\s+['"]([^'"]+)['"]/g;
const dynamicImportRegex = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

// Run grep to find all TypeScript files
const findTsFiles = () => {
  try {
    const output = execSync('find src -type f -name "*.ts" -o -name "*.tsx"', { encoding: 'utf8' });
    return output.split('\n').filter(Boolean);
  } catch (error) {
    console.error('Error finding TypeScript files:', error);
    return [];
  }
};

// Process a file to find import statements that need .js extensions
const processFile = (filePath) => {
  try {
    const content = readFileSync(filePath, 'utf8');
    const imports = [];
    
    // Find static imports
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1] || match[2];
      if (importPath && !importPath.startsWith('@') && !importPath.includes('node_modules') && 
          !importPath.startsWith('http') && !importPath.endsWith('.js') && 
          !importPath.endsWith('.json') && !importPath.includes('*')) {
        imports.push({ 
          type: 'static',
          path: importPath, 
          line: content.substring(0, match.index).split('\n').length,
          full: match[0]
        });
      }
    }
    
    // Find dynamic imports
    dynamicImportRegex.lastIndex = 0;
    while ((match = dynamicImportRegex.exec(content)) !== null) {
      const importPath = match[1];
      if (importPath && !importPath.startsWith('@') && !importPath.includes('node_modules') &&
          !importPath.startsWith('http') && !importPath.endsWith('.js') &&
          !importPath.endsWith('.json') && !importPath.includes('*')) {
        imports.push({ 
          type: 'dynamic',
          path: importPath, 
          line: content.substring(0, match.index).split('\n').length,
          full: match[0]
        });
      }
    }
    
    if (imports.length > 0) {
      return { file: filePath, imports };
    }
    return null;
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
    return null;
  }
};

// Main function
const main = () => {
  const files = findTsFiles();
  console.log(`Found ${files.length} TypeScript files`);
  
  const results = files.map(processFile).filter(Boolean);
  
  // Count total imports that need to be updated
  const totalImports = results.reduce((sum, r) => sum + r.imports.length, 0);
  console.log(`Found ${totalImports} imports that need .js extensions in ${results.length} files\n`);
  
  // Print detailed results
  results.forEach(result => {
    console.log(`File: ${result.file} (${result.imports.length} imports)`);
    result.imports.forEach(imp => {
      console.log(`  Line ${imp.line}: ${imp.type} import of '${imp.path}'`);
    });
    console.log('');
  });
};

main();