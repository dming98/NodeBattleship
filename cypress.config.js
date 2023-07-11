const { defineConfig } = require("cypress");
const mochawesome = require("mochawesome");

module.exports = defineConfig({
  projectId: 'nzhz2a',
  e2e: {
    defaultBrowser: 'chrome',
    setupNodeEvents(on, config) {
      // implement node event listeners here
      // Add Mochawesome reporter
      use(require("cypress-mochawesome-reporter/plugin"), {
        reportDir: "cypress/results",
        overwrite: false,
        html: false,
        json: true
      });

      return config;
    },
  },
});
