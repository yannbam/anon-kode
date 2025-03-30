// Import package.json dynamically at runtime
let packageVersion = '0.0.0';

try {
  // For Node.js ES modules
  import('../../package.json')
    .then(pkg => {
      packageVersion = pkg.default.version;
    })
    .catch(() => {
      console.error('Failed to load package.json');
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
  PACKAGE_URL: 'https://www.npmjs.com/package/anon-kode',
  ISSUES_EXPLAINER: 'open an issue on GitHub at anon-kode/issues',
}
