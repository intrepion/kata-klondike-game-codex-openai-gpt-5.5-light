const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests/browser",
  timeout: 30000,
  use: {
    browserName: "chromium",
    headless: true,
    baseURL: "http://127.0.0.1:41732"
  },
  webServer: {
    command: "python3 -m http.server 41732 --bind 127.0.0.1",
    url: "http://127.0.0.1:41732/",
    reuseExistingServer: false
  }
});
