const { override, addWebpackModuleRule } = require("customize-cra");

module.exports = override(
  addWebpackModuleRule({ test: /\.wasm$/, type: "javascript/auto" })
);
