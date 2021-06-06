export default {
  preset: "ts-jest/presets/js-with-babel",
  testEnvironment: "jsdom",
  setupFiles: ["web-audio-test-api"],
  setupFilesAfterEnv: ["<rootDir>/src/testSetup.ts"],
  moduleNameMapper: {
    "^\\$lib/(.*)$": "<rootDir>/src/lib/$1",
  },
  transformIgnorePatterns: ["node_modules/(?!(p-cancelable)/)"],
};
