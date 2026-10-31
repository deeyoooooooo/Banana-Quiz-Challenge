require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });

const { loadConfig } = require("./config");
const { initDb } = require("./db");
const { createApp } = require("./app");

const config = loadConfig();

if (config.nodeEnv === "production" && config.sessionSecret === "dev-only-change-me") {
  console.error("SESSION_SECRET must be set in production.");
  process.exit(1);
}

const db = initDb(config.databasePath);
const app = createApp({ config, db });

app.listen(config.port, () => {
  console.log(`Banana Quiz backend listening on http://localhost:${config.port}`);
});
