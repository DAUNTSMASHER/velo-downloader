import express from 'express';
import fetch from 'node-fetch';

const app = express();
app.use(express.json());

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
  const res = await fetch(ep, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  if (!res.ok) throw new Error(`${res.status}`);
  const data = await res.json();
  if (data.status === "error") throw new Error(data.error?.code);
  return data;
}

app.post("/download", async (req, res) => {
  const { url, videoQuality = "1080" } = req.body;
  if (!url) return res.status(400).json({ error: "URL required" });

  const payload = { url, videoQuality, filenameStyle: "basic", disableMetadata: false };
  let data;
  for (const ep of ENDPOINTS) {
    try { data = await tryCobalt(ep, payload); break; } catch {}
  }
  if (!data?.url) return res.status(502).json({ error: "All endpoints failed" });

  const fileRes = await fetch(data.url);
  if (!fileRes.ok) return res.status(502).json({ error: "File fetch failed" });

  res.set({
    "Content-Type": fileRes.headers.get("content-type") || "application/octet-stream",
    "Content-Disposition": fileRes.headers.get("content-disposition") || `attachment; filename="${data.filename || "video.mp4"}"`,
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-cache"
  });
  fileRes.body.pipe(res);
});

app.get("/", (_, res) => res.send("Downloader backend is running."));

app.get("/health", (_, res) => res.send("OK"));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Downloader on port ${port}`));
