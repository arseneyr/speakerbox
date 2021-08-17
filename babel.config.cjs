module.exports = {
  plugins: [
    "@babel/plugin-transform-modules-commonjs",
    // workaround for import.meta
    // https://github.com/vitejs/vite/issues/1149#issuecomment-775033930
    function () {
      return {
        visitor: {
          MetaProperty(path) {
            path.replaceWithSourceString("process");
          },
        },
      };
    },
  ],
};
