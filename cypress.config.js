import { defineConfig } from "cypress";
import dotenvPlugin from "cypress-dotenv";

export default defineConfig({
  component: {
    devServer: {
      framework: "react",
      bundler: "vite",
    },
  },

  e2e: {
    setupNodeEvents(on, config) {
      // implement node event listeners here
      const updatedConfig = dotenvPlugin(config, null, true);
      // continue loading other plugins
      return updatedConfig;
    },
  },
});
