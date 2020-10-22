const {
  override,
  addWebpackModuleRule,
  removeModuleScopePlugin,
} = require("customize-cra");

module.exports = override(
  addWebpackModuleRule({ test: /\.wasm$/, type: "javascript/auto" }),
  removeModuleScopePlugin()
);
