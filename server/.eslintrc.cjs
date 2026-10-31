/* eslint-env node */
module.exports = {
  root: true,
  env: { node: true, es2022: true },
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  ignorePatterns: ['dist/', 'node_modules/', 'prisma/migrations/'],
  rules: {
    // The API relies on Express's dynamic `any`-shaped helpers in a few spots.
    '@typescript-eslint/no-explicit-any': 'off',
    // Underscore-prefixed bindings are intentionally unused (destructuring to omit).
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
    ],
    // Prisma delegates + JSON bodies are dynamically typed by design.
    '@typescript-eslint/no-non-null-assertion': 'off',
    'no-empty': ['error', { allowEmptyCatch: true }],
    'no-console': 'off',
  },
};
