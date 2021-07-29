export const parameters = {
  actions: { argTypesRegex: "^on[A-Z].*" },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
};

import Layout from "../src/Layout.svelte";

// export const decorators = [
//   () => {
//     debugger;
//     return Layout;
//   },
// ];
new Layout({
  target: document.body,
});
