// Read package.json at runtime
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Get the directory name in ESM context
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packagePath = resolve(__dirname, '../../package.json');

let packageVersion = '0.0.0';

// Load package version from package.json
readFile(packagePath, 'utf8')
  .then(data => {
    try {
      const pkg = JSON.parse(data);
      packageVersion = pkg.version || '0.0.0';
    } catch (parseErr) {
      console.error('Error parsing package.json:', parseErr);
    }
  })
  .catch(err => {
    console.error('Failed to load package.json:', err);
  });

export const MACRO = {
  // Use getter to ensure we always have the latest version
  get VERSION() {
    return packageVersion;
  },
  README_URL: 'https://docs.anthropic.com/s/claude-code',
  PACKAGE_URL: 'https://www.npmjs.com/package/anon-kode',
  ISSUES_EXPLAINER: 'open an issue on GitHub at anon-kode/issues',
}
