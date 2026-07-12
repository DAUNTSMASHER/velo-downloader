import express from 'express';

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  const origin = req.headers.origin || '*';
  res.set('Access-Control-Allow-Origin', origin);
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Accept');
  res.set('Access-Control-Max-Age', '86400');
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

const ENDPOINTS = [
  "https://cobaltapi.kittycat.boo/",
  "https://cobaltapi.squair.xyz/",
  "https://melon.clxxped.lol/",
  "https://api.cobalt.liubquanti.click/",
  "https://grapefruit.clxxped.lol/",
  "https://nuko-c.meowing.de/",
  "https://api.qwkuns.me/",
  "https://cobalt.omega.wolfy.love/",
  "https://api-cobalt.eversiege.network/",
  "https://subito-c.meowing.de/"
];

async function tryCobalt(ep, payload) {
  const res = await fetch(ep, { method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" }, body: JSON.stringify(payload) });
  if (!res.ok) throw new Error(`${res.status}`);
  const data = await res.json();
  if (data.status === "error") throw new Error(data.error?.code);
  return data;
}

// POST endpoint for Cobalt API call only (returns JSON with tunnel URL)
app.post("/download", async (req, res) => {
  const { url, videoQuality = "1080", audioOnly, disableMetadata } = req.body;
  if (!url) return res.status(400).json({ error: "URL required" });
  const payload = { url, videoQuality, filenameStyle: "basic", disableMetadata: !!disableMetadata };
  if (audioOnly) payload.audioOnly = true;
  let data;
  for (const ep of ENDPOINTS) {
    try { data = await tryCobalt(ep, payload); break; } catch {}
  }
  if (!data?.url) return res.status(502).json({ error: "All endpoints failed" });
  res.json(data);
});

// GET endpoint: proxies a tunnel URL (fast, no Cobalt API call)
app.get("/dl", async (req, res) => {
  const tunnelUrl = req.query.tunnel;
  const filename = req.query.filename || "video.mp4";
  if (!tunnelUrl) return res.status(400).send("Missing ?tunnel=");

  const fileRes = await fetch(tunnelUrl);
  if (!fileRes.ok) return res.status(502).send("File unavailable");

  res.set({
    "Content-Type": fileRes.headers.get("content-type") || "application/octet-stream",
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "no-cache"
  });

  const reader = fileRes.body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) { res.end(); break; }
      res.write(value);
    }
  } catch { res.end(); }
});

app.get("/", (_, res) => res.send("Downloader backend is running."));
app.get("/health", (_, res) => res.send("OK"));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Downloader on port ${port}`));
