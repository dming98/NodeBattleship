const { defineConfig } = require("cypress");

module.exports = defineConfig({
  projectId: 'nzhz2a',
  e2e: {
    defaultBrowser: 'chrome',
    setupNodeEvents(on, config) {
      // implement node event listeners here
      // Add Mochawesome reporter
      require("cypress-mochawesome-reporter/plugin")(on, config, {
        reportDir: "cypress/results",
        overwrite: false,
        html: false,
        json: true
      });

      return config;
    },
  },
});
