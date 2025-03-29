#!/usr/bin/env node
import { readdir, readFile, writeFile } from 'fs/promises';
import { join, resolve } from 'path';

// List of extensions to fix
const FILE_EXTENSIONS = ['.js'];

/**
 * Process all JS files in the directory recursively
 */
async function processDirectory(directory) {
  const files = await readdir(directory, { withFileTypes: true });
  
  for (const file of files) {
    const fullPath = join(directory, file.name);
    
    if (file.isDirectory()) {
      await processDirectory(fullPath);
    } else if (FILE_EXTENSIONS.some(ext => file.name.endsWith(ext))) {
      await processFile(fullPath);
    }
  }
}

/**
 * Fix imports in a JavaScript file
 */
async function processFile(filePath) {
  console.log(`Processing ${filePath}`);
  const content = await readFile(filePath, 'utf8');
  
  // First pass: Fix any .tsx.js extensions in imports
  let intermediateContent = content.replace(
    /from\s+['"]([^'"]*?\.tsx)\.js['"]|from\s+['"]([^'"]*?)\.tsx['"]|import\s+['"]([^'"]*?)\.tsx['"]|require\(['"]([^'"]*?)\.tsx['"]\)/g,
    (match, path1, path2, path3, path4) => {
      const path = path1 || path2 || path3 || path4;
      if (path) {
        if (match.includes('.tsx.js')) {
          return match.replace('.tsx.js', '.js');
        } else {
          return match.replace('.tsx', '.js');
        }
      }
      return match;
    }
  );
  
  // Second pass: Add .js extension to imports without extensions
  const fixedContent = intermediateContent.replace(
    /from\s+['"]([^'"]*?)['"]|import\s+['"]([^'"]*?)['"]|require\(['"]([^'"]*?)['"]\)/g,
    (match, path1, path2, path3) => {
      const importPath = path1 || path2 || path3;
      
      // Only add extension to relative imports that don't already have an extension
      if (
        importPath && 
        (importPath.startsWith('./') || importPath.startsWith('../')) && 
        !importPath.endsWith('.js') && 
        !importPath.includes('?') && 
        !importPath.includes('#') && 
        !importPath.match(/\.[a-zA-Z0-9]+$/) // No extension at all
      ) {
        return match.replace(importPath, `${importPath}.js`);
      }
      return match;
    }
  );
  
  if (content !== fixedContent) {
    console.log(`Fixed imports in ${filePath}`);
    await writeFile(filePath, fixedContent, 'utf8');
  }
}

// Main function
async function main() {
  try {
    // Process the dist directory
    const distDir = resolve(process.cwd(), 'dist');
    console.log(`Processing directory: ${distDir}`);
    await processDirectory(distDir);
    console.log('Done fixing imports!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();