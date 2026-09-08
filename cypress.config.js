const { defineConfig } = require("cypress");
const createBundler = require("@bahmutov/cypress-esbuild-preprocessor");
const {
  addCucumberPreprocessorPlugin,
} = require("@badeball/cypress-cucumber-preprocessor");
const createEsbuildPlugin =
  require("@badeball/cypress-cucumber-preprocessor/esbuild").createEsbuildPlugin;

module.exports = defineConfig({
  e2e: {
    baseUrl: process.env.BASE_URL || "https://africx-dev.afric.ca",
    specPattern: ["cypress/e2e/**/*.cy.{js,ts}", "cypress/e2e/**/*.feature"],
    supportFile: "cypress/support/e2e.js",
    stepDefinitions: "cypress/support/step_definitions/**/*.{js,ts}",
    experimentalStudio: true,
    async setupNodeEvents(on, config) {
      // Cucumber Preprocessor
      await addCucumberPreprocessorPlugin(on, config, {
        omitAfterRunHandler: false,
        omitBeforeRunHandler: false,
      });

      // Bundler esbuild optimisé pour performances + debugging
      on(
        "file:preprocessor",
        createBundler({
          plugins: [createEsbuildPlugin(config)],
          sourcemap: "inline",
          legalComments: "inline",
          minify: process.env.NODE_ENV === "production",
          target: "es2020",
          define: {
            "process.env.NODE_ENV": JSON.stringify(
              process.env.NODE_ENV || "development"
            ),
            "process.env.CYPRESS": "true",
          },
          loader: {
            ".feature": "text",
            ".cy.js": "js",
            ".cy.ts": "ts",
            ".js": "jsx",
            ".ts": "tsx",
          },
          charset: "utf8",
        })
      );

      return config;
    },

    // Reporter
    reporter: "mochawesome",
    reporterOptions: {
      reportDir: "cypress/reports",
      overwrite: true,
      html: true,
      json: true,
      embeddedScreenshots: true,
      inlineAssets: true,
      reportFilename: "current-report",
      timestamp: false,
    },

    // Assets & vidéos
    trashAssetsBeforeRuns: true,
    video: true,
    videosFolder: "cypress/videos",
    screenshotsFolder: "cypress/screenshots",
    screenshotOnRunFailure: true,

    // Viewport standardisé
    viewportWidth: 1920,
    viewportHeight: 1080,

    // ⚡ Optimisation globale pour tests de sécurité
    retries: { runMode: 2, openMode: 0 }, // retry en run mode pour robustesse
    defaultCommandTimeout: 10000,
    responseTimeout: 30000,
    requestTimeout: 10000,
    pageLoadTimeout: 60000,
    experimentalMemoryManagement: true,
    numTestsKeptInMemory: 5, // limite pour éviter surcharge mémoire
    experimentalSessionAndOrigin: true, // cookies cross-origin

    // ⚡ Limitation automatique des boucles et requêtes lourdes
    experimentalNetworkStubbing: true, // stable pour SQL/XSS tests massifs
  },

  env: {
    baseUrl: process.env.BASE_URL,
    environment: process.env.ENVIRONMENT,
    TWILIO_SID: process.env.TWILIO_SID,
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
    OTP_EMAIL: process.env.OTP_EMAIL,
    OTP_EMAIL_PASSWORD: process.env.OTP_EMAIL_PASSWORD,
    OTP_PHONE: process.env.OTP_PHONE,
  },
});
