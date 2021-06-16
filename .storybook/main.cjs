const path = require("path");
const sveltePreprocess = require("svelte-preprocess");

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
  // svelteOptions: {
  //   preprocess: require("../svelte.config.cjs").preprocess,
  // },
  svelteOptions: {
    preprocess: sveltePreprocess({
      defaults: {
        script: "typescript",
        style: "scss",
      },
    }),
  },
  webpackFinal: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = config.resolve.alias || {};
    config.resolve.alias["$lib"] = path.resolve(__dirname, "../src/lib");
    config.resolve.mainFields = config.resolve.mainFields || {};
    config.resolve.mainFields.push("exports");

    // Storybook bug: https://github.com/storybookjs/storybook/issues/12019#issuecomment-702207045
    const { options } = config.module.rules[0].use[0];
    options.plugins = options.plugins.filter(
      excludePlugins(["@babel/plugin-transform-classes"])
    );

    config.module.rules.splice(0, 0, {
      test: /\.wasm$/,
      type: "javascript/auto",
      use: [{ loader: "file-loader" }],
    });
    return config;
  },
};

function excludePlugins(excludePaths) {
  return (plugin) => {
    const name = typeof plugin === "string" ? plugin : plugin[0];
    if (typeof name !== "string") {
      throw new Error(`Not a string: ${name}`);
    }
    return !excludePaths.some((path) => name.includes(path));
  };
}
