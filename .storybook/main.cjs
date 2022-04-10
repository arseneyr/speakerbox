const { dirname } = require("path");
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
  ],
  framework: "@storybook/svelte",
  svelteOptions: {
    preprocess: sveltePreprocess(),
  },
  core: {
    builder: "@storybook/builder-vite",
  },
  // async viteFinal(config) {
  //   console.log(config);
  //   config.resolve ??= {};
  //   config.resolve.alias ??= {};
  //   config.resolve.alias["$lib"] = path.resolve(__dirname, "../src/lib");

  //   config.define ??= {};
  //   config.define["process.env"] = process.env;
  //   // config.define["global"] = "window";

  //   config.root = dirname(require.resolve("@storybook/builder-vite"));
  //   // config.server.fsServe = undefined;
  //   // config.optimizeDeps ??= {};
  //   // config.optimizeDeps.include ??= [];
  //   // config.optimizeDeps.include.push("global", "util-deprecate/browser");

  //   return config;
  // },
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
