// ESLint flat config (ESLint 10) — tuned for a byte-golfed js13k codebase.
// Goal: catch REAL bugs + dead code (unused/undef/unreachable/dupe-keys) WITHOUT
// fighting the intentional golf style (dense one-liners, bitwise, comma ops, ||=,
// assignments-in-conditions, while(1)). Stylistic opinions are OFF by design.
import js from '@eslint/js';
import globals from 'globals';

const golfRules = {
  // dead-code / bug catchers — the whole point of adding ESLint here:
  'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none', varsIgnorePattern: '^_' }],
  'no-undef': 'error',
  'no-unreachable': 'warn',
  'no-dupe-keys': 'error',
  'no-dupe-args': 'error',
  'no-self-assign': 'warn',
  'no-self-compare': 'warn',
  'no-unsafe-negation': 'error',
  'no-unused-labels': 'warn',
  'no-constant-binary-expression': 'warn',
  // intentional golf patterns — silenced so signal stays high:
  'no-constant-condition': ['error', { checkLoops: false }], // while(1) loops OK
  'no-cond-assign': 'off', // `if (x = f())` is used deliberately
  'no-empty': ['warn', { allowEmptyCatch: true }],
  'no-fallthrough': 'off',
  'no-sparse-arrays': 'off', // `[,,fv,fb]` destructuring skips
};

export default [
  { ignores: ['dist/**', 'node_modules/**'] },
  js.configs.recommended,
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.browser },
    },
    rules: golfRules,
  },
  {
    // build + tooling + research scripts run under Node
    files: ['*.mjs', 'tools/**/*.mjs', 'research/**/*.mjs', 'eslint.config.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: golfRules,
  },
];
