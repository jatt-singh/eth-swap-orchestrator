import { Router } from "express";
import fs from "fs";
import path from "path";
import type { LogItemType } from "./graph";

const apiRouter = Router();
const LOG_PATH = path.join(__dirname, "../logs/swap_routes.json");

function readRoutes(): LogItemType[] {
  try {
    const content = fs.readFileSync(LOG_PATH, "utf-8");
    const allEntries: LogItemType[] = JSON.parse(content);

    // Only return entries from the latest timestamp
    const latestTimestamp = allEntries.reduce((acc, cur) =>
      acc > cur.timestamp ? acc : cur.timestamp
    , "");
    return allEntries.filter(e => e.timestamp === latestTimestamp);
  } catch (err) {
    console.error("[ERROR] Failed to read or parse swap_routes.json");
    return [];
  }
}

// GET /api/routes
apiRouter.get("/routes", (req, res) => {
    const latestRoutes = readRoutes();
    res.json(latestRoutes);
});

// GET /api/routes/:from/:to
apiRouter.get("/routes/:from/:to", (req, res) => {
    const { from, to } = req.params;
    const latestRoutes = readRoutes();
    const match = latestRoutes.find(r =>
        r.from.toUpperCase() === from.toUpperCase() &&
        r.to.toUpperCase() === to.toUpperCase()
    );
    if (match) {
        res.json(match);
    } else {
        res.status(404).json({ error: "No route found for this token pair" });
    }
});

export default apiRouter;