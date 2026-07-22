import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'android']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  {
    // Tracker modules intentionally export a plugin object alongside their
    // components; they aren't fast-refresh route boundaries.
    files: ['src/sports/**/*.jsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  {
    files: ['tst/**/*.js', 'playwright.config.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
])
