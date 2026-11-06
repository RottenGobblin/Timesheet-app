// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', '.expo/*'],
  },
  {
    // The dosing engine is pure TypeScript so it can be tested in isolation
    // and reused on web or a backend later. Keep React and Expo out of it.
    files: ['src/engine/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['react', 'react-*', 'react/*'], message: 'The engine must stay framework-free.' },
            { group: ['expo', 'expo-*', '@expo/*'], message: 'The engine must stay framework-free.' },
          ],
        },
      ],
    },
  },
]);
