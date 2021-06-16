import preprocess from "svelte-preprocess";
import staticAdapter from "@sveltejs/adapter-static";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://github.com/sveltejs/svelte-preprocess
  // for more information about preprocessors
  preprocess: preprocess({
    defaults: {
      script: "typescript",
      style: "scss",
    },
  }),
  kit: {
    adapter: staticAdapter(),
    // hydrate the <div id="svelte"> element in src/app.html
    target: "#svelte",
    ssr: false,
  },
};

export default config;
