import pkg from '../../package.json' with { type: 'json' }

export const MACRO = {
  VERSION: pkg.version,
  README_URL: 'https://docs.anthropic.com/s/claude-code',
}
