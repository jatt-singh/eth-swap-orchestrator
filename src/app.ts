import dotenv from "dotenv";
import express from "express";
import fs from "fs";
import { ethers } from "ethers";
import { ensureLogsDir, formatDuration, OUTPUT_LOG, ROUTES_LOG } from "./utils";
import apiRouter from "./api";
import * as routerModule from "./routes"; // healthz, readyz, metrics
import { logAllPaths } from "./graph";

dotenv.config();
ensureLogsDir();

const router = routerModule.default || routerModule;
const app = express();

app.use(express.json());
app.use("/api", apiRouter); // your API endpoints
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

// Uptime logger in console
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

// Automatically log all swap routes every 60 seconds
async function scheduleSwapRoutesLogging() {
  try {
    await logAllPaths(provider);
  } catch (err: any) {
    console.error("[ERROR] Failed to log swap routes:", err.message);
  }
  setTimeout(scheduleSwapRoutesLogging, 60 * 1000);
}

// Start the server
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  uptimeLogger();
  heartbeatLogger();
  testEthereumConnection();
  scheduleSwapRoutesLogging();
});

export default app;
