// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');

module.exports = defineConfig([
  expoConfig,
  eslintPluginPrettierRecommended,
  {
    ignores: ['dist/*', 'web-build/*', '.expo/*', 'coverage/*', 'node_modules/*'],
  },
  {
    files: ['scripts/**/*.js', '*.config.js'],
    languageOptions: {
      globals: {
        require: 'readonly',
        module: 'writable',
        __dirname: 'readonly',
        Buffer: 'readonly',
        process: 'readonly',
      },
    },
  },
  {
    rules: {
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
]);
