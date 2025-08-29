import { Router } from "express";
import fs from "fs";
import { OUTPUT_LOG, ROUTES_LOG } from "./utils";
import { ethers } from "ethers";

const router = Router();

// Liveness probe
router.get("/healthz", (req, res) => {
  try {
    if (!fs.existsSync(OUTPUT_LOG)) {
      return res.status(503).json({ success: false, reason: "Heartbeat log not found" });
    }

    const lines = fs.readFileSync(OUTPUT_LOG, "utf-8").trim().split("\n");
    const lastLine = lines.reverse().find(line => line.includes("[heartbeat]"));
    if (!lastLine) return res.status(503).json({ success: false, reason: "No heartbeat found" });

    const match = lastLine.match(/\[heartbeat\] (.+)/);
    const lastTimestamp = match ? new Date(match[1]) : null;
    const uptimeSeconds = lastTimestamp ? Math.floor((Date.now() - lastTimestamp.getTime()) / 1000) : -1;

    res.status(uptimeSeconds < 10 ? 200 : 503).json({
      success: uptimeSeconds < 10,
      last_heartbeat: lastTimestamp?.toISOString(),
      uptime_seconds: uptimeSeconds
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Readiness probe
router.get("/readyz", async (req, res) => {
  try {
    const provider = new ethers.JsonRpcProvider(process.env.INFURA_URL);
    await provider.getBlockNumber(); // Check Ethereum connectivity

    if (!fs.existsSync(ROUTES_LOG)) {
      return res.status(503).json({ success: false, reason: "Swap routes log not ready" });
    }

    res.json({ success: true });
  } catch {
    res.status(503).json({ success: false, reason: "Ethereum provider not ready" });
  }
});

// Prometheus metrics
router.get("/metrics", (req, res) => {
  try {
    const lines = fs.existsSync(OUTPUT_LOG)
      ? fs.readFileSync(OUTPUT_LOG, "utf-8").trim().split("\n").filter(line => line.includes("[heartbeat]"))
      : [];
    const heartbeatCount = lines.length;
    const lastTimestamp = heartbeatCount > 0 ? new Date(lines[heartbeatCount - 1].match(/\[heartbeat\] (.+)/)![1]) : null;
    const secondsSinceLast = lastTimestamp ? Math.floor((Date.now() - lastTimestamp.getTime()) / 1000) : -1;

    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    res.set("Content-Type", "text/plain");
    res.send(
`# HELP swap_optimizer_heartbeat_count Total number of heartbeats
# TYPE swap_optimizer_heartbeat_count counter
swap_optimizer_heartbeat_count ${heartbeatCount}

# HELP swap_optimizer_last_heartbeat_seconds Seconds since last heartbeat
# TYPE swap_optimizer_last_heartbeat_seconds gauge
swap_optimizer_last_heartbeat_seconds ${secondsSinceLast}

# HELP swap_optimizer_memory_rss_bytes Resident Set Size
# TYPE swap_optimizer_memory_rss_bytes gauge
swap_optimizer_memory_rss_bytes ${memoryUsage.rss}

# HELP swap_optimizer_memory_heap_used_bytes Heap memory used
# TYPE swap_optimizer_memory_heap_used_bytes gauge
swap_optimizer_memory_heap_used_bytes ${memoryUsage.heapUsed}

# HELP swap_optimizer_cpu_user_usec User CPU time
# TYPE swap_optimizer_cpu_user_usec counter
swap_optimizer_cpu_user_usec ${cpuUsage.user}

# HELP swap_optimizer_cpu_system_usec System CPU time
# TYPE swap_optimizer_cpu_system_usec counter
swap_optimizer_cpu_system_usec ${cpuUsage.system}`
    );
  } catch (err: any) {
    res.status(500).send(`# ERROR reading logs: ${err.message}`);
  }
});

export default router;
