export default {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  setupFiles: ["web-audio-test-api"],
  setupFilesAfterEnv: ["<rootDir>/src/testSetup.ts"],
  moduleNameMapper: {
    "^\\$lib/(.*)$": "<rootDir>/src/lib/$1",
    "^p-queue$": "<rootDir>/node_modules/p-queue/dist",
  },
  transformIgnorePatterns: [
    "node_modules/(?!(p-cancelable|p-queue|p-timeout)/)",
  ],
  globals: {
    "ts-jest": {
      babelConfig: {
        presets: ["babel-preset-vite"],
      },
      diagnostics: {
        ignoreCodes: [1343],
      },
    },
  },
};
