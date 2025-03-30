// Import package.json using ESM dynamic import
// This approach works with both ES2022/bundler and fallbacks
let packageVersion = '0.0.0'; // Default fallback version

// Use a try/catch in case the dynamic import fails
try {
  const getPackageInfo = async () => {
    try {
      // Using dynamic import for compatibility
      const pkgModule = await import('../../package.json', {
        assert: { type: 'json' }
      });
      return pkgModule.default;
    } catch (e) {
      // Fallback for older TypeScript/Node.js versions
      const fs = await import('fs');
      const path = await import('path');
      const pkgPath = path.resolve(__dirname, '../../package.json');
      const pkgContent = fs.readFileSync(pkgPath, 'utf8');
      return JSON.parse(pkgContent);
    }
  };

  // Set packageVersion asynchronously
  getPackageInfo().then(pkg => {
    packageVersion = pkg.version;
  }).catch(e => {
    console.error('Failed to load package.json:', e);
  });
} catch (e) {
  console.error('Error setting up package info:', e);
}

export const MACRO = {
  // Use getter to ensure we always have the latest version
  get VERSION() {
    return packageVersion;
  },
  README_URL: 'https://docs.anthropic.com/s/claude-code',
}
