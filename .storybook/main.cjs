const path = require("path");

module.exports = {
  stories: [
    "../src/**/*.stories.mdx",
    "../src/**/*.stories.@(js|jsx|ts|tsx|svelte)",
  ],
  addons: [
    "@storybook/addon-links",
    "@storybook/addon-essentials",
    "@storybook/addon-svelte-csf",
    "@storybook/preset-scss",
  ],
  svelteOptions: {
    preprocess: require("../svelte.config.cjs").preprocess,
  },
  webpackFinal: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = config.resolve.alias || {};
    config.resolve.alias["$lib"] = path.resolve(__dirname, "../src/lib");
    return config;
  },
};
