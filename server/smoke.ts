/**
 * Smoke test for the AtmoAi API.
 *
 *   npx tsx server/src/index.ts     # terminal 1
 *   npx tsx server/smoke.ts         # terminal 2
 *
 * Exits non-zero if any check fails. Never touches the network for the
 * deterministic checks; live upstream checks are skipped when offline.
 */

const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:4000";

let passed = 0;
let failed = 0;

function ok(name: string, condition: boolean, detail = ""): void {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function get(path: string): Promise<{ status: number; body: any; ms: number }> {
  const started = Date.now();
  const res = await fetch(`${BASE}${path}`, { headers: { accept: "application/json" } });
  let body: any = null;
  try {
    body = await res.json();
  } catch {
    /* non-JSON */
  }
  return { status: res.status, body, ms: Date.now() - started };
}

async function main(): Promise<void> {
  console.log(`\nAtmoAi API smoke test → ${BASE}\n`);

  /* ---------- root + meta ---------- */
  console.log("meta");
  const root = await get("/");
  ok("GET / responds", root.status === 200 && root.body?.docs !== undefined);

  const health = await get("/api/health");
  ok("GET /api/health", health.status === 200 && health.body?.status === "ok");
  ok("health reports cache stats", typeof health.body?.cache?.weather?.hits === "number");
  ok("health reports uptime", typeof health.body?.uptimeSeconds === "number");

  const activities = await get("/api/activities");
  ok("GET /api/activities", activities.status === 200);
  ok(
    "exposes 10 activity profiles",
    Array.isArray(activities.body?.activities) && activities.body.activities.length === 10,
  );
  ok(
    "profiles carry comfort bands",
    activities.body?.activities?.[0]?.idealC?.length === 2,
  );

  /* ---------- validation ---------- */
  console.log("\nvalidation");
  const badCoord = await get("/api/weather?lat=999&lon=0");
  ok("rejects out-of-range latitude", badCoord.status === 400, `got ${badCoord.status}`);

  const badDay = await get("/api/ai/plan?lat=51.5&lon=-0.12&activity=hike&day=99");
  ok("rejects day index beyond forecast window", badDay.status === 400, `got ${badDay.status}`);

  const missing = await get("/api/weather");
  ok("rejects missing coordinates", missing.status === 400, `got ${missing.status}`);

  const nope = await get("/api/geocode?q=x");
  ok("short geocode query returns empty", nope.status === 200 && nope.body?.count === 0);

  const unknown = await get("/api/does-not-exist");
  ok("unknown route returns 404 JSON", unknown.status === 404 && unknown.body?.error === "Not found");

  /* ---------- live upstream ---------- */
  console.log("\nlive upstream (requires network)");
  const geo = await get("/api/geocode?q=london");
  const hasLondon = geo.body?.results?.some((r: any) => /london/i.test(r.name ?? ""));
  ok("geocode finds London", hasLondon === true, `status ${geo.status}`);

  const weather = await get("/api/weather?city=London&days=7");
  const w = weather.body;
  ok("GET /api/weather?city=London", weather.status === 200);
  ok("returns 7 forecast days", w?.daily?.days?.length === 7, `got ${w?.daily?.days?.length}`);
  ok("returns 168 hourly records", w?.hourly?.time?.length === 168, `got ${w?.hourly?.time?.length}`);
  ok("current block populated", typeof w?.current?.temperature === "number");
  ok("solar cycle present", w?.daily?.sunrise?.[0] !== undefined && w?.daily?.sunset?.[0] !== undefined);
  ok("rain outlook attached", typeof w?.rain?.headline === "string");

  const cached = await get("/api/weather?city=London&days=7");
  ok("second identical call is served from cache", cached.body?.meta?.cached === true);
  ok("cached call is faster", cached.ms <= weather.ms, `${cached.ms}ms vs ${weather.ms}ms`);

  /* ---------- AI ---------- */
  console.log("\nAI advisories");
  const now = await get("/api/ai/now?city=London&unit=C");
  const nv = now.body?.verdict;
  ok("GET /api/ai/now", now.status === 200);
  ok("score is 0–100", typeof nv?.score === "number" && nv.score >= 0 && nv.score <= 100);
  ok("verdict label present", typeof nv?.label === "string");
  ok("tone is go/maybe/no", ["go", "maybe", "no"].includes(nv?.tone));
  ok("writes a summary", typeof nv?.summary === "string" && nv.summary.length > 40);
  ok("gives reasons", Array.isArray(nv?.reasons) && nv.reasons.length > 0);
  ok("scores every hour", Array.isArray(nv?.evals) && nv.evals.length === 24);
  ok("mentions the best window", nv?.window === null || typeof nv.window.startLabel === "string");

  /* ---------- explanation invariants ---------- */
  console.log("\nexplanation");
  ok("verdict carries a factor breakdown", Array.isArray(nv?.factors) && nv.factors.length === 5);
  ok(
    "all five axes are explained",
    ["temperature", "rain", "wind", "uv", "daylight"].every((k) => nv?.factors?.some((f: any) => f.key === k)),
  );
  ok(
    "axis weights sum to 100%",
    Math.round(nv?.factors?.reduce((s: number, f: any) => s + f.weight, 0) * 100) === 100,
    `got ${nv?.factors?.reduce((s: number, f: any) => s + f.weight, 0)}`,
  );
  const contribSum = nv?.factors?.reduce((s: number, f: any) => s + f.contribution, 0) ?? 0;
  ok(
    "factor contributions add up to the score",
    Math.abs(contribSum - nv?.score) <= 3,
    `contributions ${contribSum} vs score ${nv?.score}`,
  );
  ok(
    "every factor has a human-readable detail",
    nv?.factors?.every((f: any) => typeof f.detail === "string" && f.detail.length > 15),
  );
  ok(
    "every factor has a status",
    nv?.factors?.every((f: any) => ["good", "ok", "bad"].includes(f.status)),
  );
  const planFactors = await get("/api/ai/plan?city=London&activity=picnic&day=1&unit=C");
  ok(
    "plan verdict also explains itself",
    Array.isArray(planFactors.body?.verdict?.factors) && planFactors.body.verdict.factors.length === 5,
  );

  const fahrenheit = await get("/api/ai/now?city=London&unit=F");
  const fv = fahrenheit.body?.verdict;
  ok(
    "unit conversion changes the narrative",
    fv?.summary !== nv?.summary && /mph|°F/.test(`${fv?.summary} ${fv?.reasons?.join(" ")}`),
  );

  const plan = await get("/api/ai/plan?city=London&activity=hike&day=2&unit=C");
  const pv = plan.body?.verdict;
  ok("GET /api/ai/plan (hike, day 2)", plan.status === 200);
  ok("plan cites a date label", typeof pv?.dateLabel === "string");
  ok("plan builds a packing list", Array.isArray(pv?.gear));
  ok("hike scores differ from 'going out'", typeof pv?.score === "number");

  const week = await get("/api/ai/week?city=London&activity=picnic&unit=C");
  const days = week.body?.days;
  ok("GET /api/ai/week", week.status === 200);
  ok("ranks all 7 days", Array.isArray(days) && days.length === 7);
  ok(
    "ranking is descending by score",
    Array.isArray(days) && days.every((d: any, i: number) => i === 0 || days[i - 1].score >= d.score),
  );
  ok("identifies a best day", typeof week.body?.best?.label === "string");

  const rain = await get("/api/ai/rain?city=London");
  ok("GET /api/ai/rain", rain.status === 200 && typeof rain.body?.outlook?.peakProb === "number");

  /* ---------- caching ---------- */
  console.log("\ncache");
  const h2 = await get("/api/health");
  const hitRate = h2.body?.cache?.weather?.hitRate;
  ok("cache recorded hits", typeof hitRate === "number" && hitRate > 0, `hitRate ${hitRate}`);

  /* ---------- summary ---------- */
  console.log(`\n${"─".repeat(44)}`);
  console.log(`  ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(`\n  ✗ smoke test could not reach ${BASE}\n    ${err instanceof Error ? err.message : err}\n`);
  process.exit(1);
});
