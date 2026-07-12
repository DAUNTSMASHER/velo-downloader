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

async function tryCobalt(endpoint, payload) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Accept": "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  if (!data || !data.status) throw new Error("Invalid response");
  if (data.status === "error") throw new Error(data.error?.code || "Unknown error");
  return data;
}

export async function onRequest(context) {
  const { request } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Accept" } });
  }
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
  }

  const { url, videoQuality } = body;
  if (!url) {
    return new Response(JSON.stringify({ error: "URL is required" }), { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
  }

  const payload = {
    url,
    videoQuality: videoQuality || "1080",
    filenameStyle: "basic",
    disableMetadata: false
  };

  try {
    const data = await Promise.any(ENDPOINTS.map(ep => tryCobalt(ep, payload)));

    // Cobalt returned a tunnel/redirect URL — fetch the file and proxy it back
    if (data.url) {
      try {
        const fileResp = await fetch(data.url, { signal: AbortSignal.timeout(180000) });
        if (fileResp.ok) {
          const contentType = fileResp.headers.get("content-type") || "application/octet-stream";
          const cd = fileResp.headers.get("content-disposition") || "";
          const filename = data.filename || "download";
          return new Response(fileResp.body, {
            status: 200,
            headers: {
              "Content-Type": contentType,
              "Content-Disposition": cd || `attachment; filename="${filename}"`,
              "Access-Control-Allow-Origin": "*",
              "Cache-Control": "no-cache"
            }
          });
        }
      } catch { /* fall through to return URL */ }

      // File fetch failed — return URL for client to handle
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Cache-Control": "no-cache" }
      });
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "All Cobalt endpoints failed", detail: err.message }), {
      status: 502,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
}
