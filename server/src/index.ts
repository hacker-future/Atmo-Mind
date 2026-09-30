import fs from "node:fs";
import path from "node:path";
import express from "express";
import cors from "cors";
import { config, isProd } from "./config.js";
import { api } from "./routes.js";
import { errorHandler, logRequests, notFound } from "./middleware.js";

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.set("etag", "strong");

/* ---------------- middleware ---------------- */
app.use(logRequests);
app.use(express.json({ limit: "64kb" }));
app.use(express.urlencoded({ extended: false, limit: "16kb" }));

const allowAll = config.corsOrigins.includes("*");
app.use(
  cors({
    origin: allowAll ? true : config.corsOrigins,
    methods: ["GET", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Accept"],
    maxAge: 86_400,
  }),
);

/* ---------------- basic security headers ---------------- */
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  next();
});

/* ---------------- API ---------------- */
app.get("/", (_req, res) => {
  res.json({
    name: "AtmoAi API",
    version: "1.0.0",
    description: "Cached weather proxy + on-server AI advisories for outings, trips and travel planning.",
    docs: {
      health: "GET /api/health",
      activities: "GET /api/activities",
      geocode: "GET /api/geocode?q=london",
      reverse: "GET /api/reverse?lat=51.5&lon=-0.12",
      weather: "GET /api/weather?lat=51.5&lon=-0.12&days=7  (or ?city=London)",
      ai_now: "GET /api/ai/now?lat=51.5&lon=-0.12&unit=C",
      ai_plan: "GET /api/ai/plan?lat=51.5&lon=-0.12&activity=hike&day=2&unit=C",
      ai_week: "GET /api/ai/week?lat=51.5&lon=-0.12&activity=picnic&unit=C",
      ai_rain: "GET /api/ai/rain?lat=51.5&lon=-0.12",
    },
  });
});

app.use("/api", api);

/* ---------------- static frontend (optional) ---------------- */
const staticDir = config.staticDir;
const hasSpa = fs.existsSync(path.join(staticDir, "index.html"));
if (hasSpa) {
  app.use(express.static(staticDir, { maxAge: isProd ? "1h" : 0, index: "index.html" }));

  // SPA history fallback: any non-API GET that fell through serves the shell.
  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api")) return next();
    res.sendFile(path.join(staticDir, "index.html"));
  });
}

/* ---------------- 404 + errors ---------------- */
app.use(notFound);
app.use(errorHandler);

/* ---------------- boot ---------------- */
const server = app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`
  ╭──────────────────────────────────────────────╮
  │   AtmoAi API                                 │
  │   http://localhost:${String(config.port).padEnd(24, " ")}│
  │   env: ${config.env.padEnd(38, " ")}│
  │   weather cache: ${`${config.weatherTtlMs / 60000} min`.padEnd(30, " ")}│
  │   static: ${(hasSpa ? "dist/" : "not built").padEnd(30, " ")}│
  ╰──────────────────────────────────────────────╯
  `);
});

const shutdown = (signal: string) => {
  // eslint-disable-next-line no-console
  console.log(`\n${signal} received — closing server.`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 5000).unref();
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("unhandledRejection", (reason) => {
  // eslint-disable-next-line no-console
  console.error("[unhandledRejection]", reason);
});

export default app;
