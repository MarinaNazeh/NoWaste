// ESLint flat config for the server (TypeScript, strict type-aware rules). Prettier handles formatting.
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default defineConfig(
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**'] },
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      globals: { ...globals.node, ...globals.jest },
      parserOptions: {
        projectService: { allowDefaultProject: ['*.mjs', '*.cjs'] },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      // Express recognises error handlers by their four parameters, so unused "_next" must stay.
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['**/*.mjs', '**/*.cjs'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: { globals: globals.node, sourceType: 'commonjs' },
  },
  {
    files: ['**/*.mjs'],
    languageOptions: { sourceType: 'module' },
  },
  prettier,
);
