const { defineConfig } = require("cypress");
require("cypress-mochawesome-reporter/plugin");

module.exports = defineConfig({
  projectId: 'nzhz2a',
  e2e: {
    defaultBrowser: 'chrome',
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
  reporter: 'mochawesome',
  reporterOptions: {
    reportDir: 'cypress/results',
    overwrite: false,
    html: true,
    json: true
  }
});
