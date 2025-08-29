import dotenv from "dotenv";
import express from "express";
import fs from "fs";
import { ethers } from "ethers";
import { ensureLogsDir, formatDuration, OUTPUT_LOG, ROUTES_LOG } from "./utils";
import apiRouter from "./api";
import * as routerModule from "./routes"; // Safe import for ESModule/CommonJS

dotenv.config();
ensureLogsDir();

const router = routerModule.default || routerModule;

const app = express();
app.use(express.json());
app.use("/api", apiRouter); // API endpoints
app.use("/", router);        // healthz, readyz, metrics

const port = process.env.PORT || 3000;

// Ethereum provider
const provider = new ethers.JsonRpcProvider(process.env.INFURA_URL);

// Heartbeat logger
function heartbeatLogger() {
  const stream = fs.createWriteStream(OUTPUT_LOG, { flags: "a" });
  setInterval(() => {
    stream.write(`[heartbeat] ${new Date().toISOString()}\n`);
  }, 5000);
}

// Print uptime in console
function uptimeLogger() {
  let uptime = 0;
  setInterval(() => {
    uptime++;
    process.stdout.write(`\r[status] Server running... ${formatDuration(uptime)} uptime`);
  }, 1000);
}

// Test Ethereum connection once at startup
async function testEthereumConnection() {
  try {
    const blockNumber = await provider.getBlockNumber();
    console.log(`Connected to Ethereum. Latest block: ${blockNumber}`);
  } catch (err: any) {
    console.error("[ERROR] Cannot connect to Ethereum provider:", err.message);
  }
}

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  uptimeLogger();
  heartbeatLogger();
  testEthereumConnection();
});

export default app; // optional, for testing or imports
