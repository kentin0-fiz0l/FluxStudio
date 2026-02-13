import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from '@typescript-eslint/eslint-plugin'
import tseslintParser from '@typescript-eslint/parser'
import unusedImports from 'eslint-plugin-unused-imports'

export default [
  { ignores: ['dist', 'coverage', 'build'] },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        ...globals.node,
        JSX: 'readonly',
      },
      parser: tseslintParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'unused-imports': unusedImports,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...tseslint.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // Disable base rules in favor of unused-imports plugin
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }],
      '@typescript-eslint/no-explicit-any': 'error',
      'prefer-const': 'error',
      // Disable no-undef - TypeScript handles this better
      'no-undef': 'off',
      // DEBT-012: Prevent console statements in production
      'no-console': ['error', { allow: ['warn', 'error'] }],
      // Allow variable declarations in switch cases (wrap in braces if needed for clarity)
      'no-case-declarations': 'warn',
      // DEBT-013: Array index keys - add eslint-plugin-react and enable 'react/no-array-index-key'
      // rule when needed. For now, prefer unique IDs over index for dynamic lists.
      // Acceptable uses: loading skeletons, static content that never reorders.
    },
  },
]