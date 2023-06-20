const { defineConfig } = require("cypress");

module.exports = defineConfig({
  projectId: 'nzhz2a',
  e2e: {
    defaultBrowser: 'chrome',
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
});
