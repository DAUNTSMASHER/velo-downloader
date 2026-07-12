const endpoints = [
  "https://api.cobalt.liubquanti.click/",
  "https://cobaltapi.kittycat.boo/",
  "https://dog.kittycat.boo/",
  "https://kityune.imput.net/",
  "https://nachos.imput.net/",
  "https://sunny.imput.net/",
  "https://blossom.imput.net/",
  "https://co.wuk.sh/"
];

async function tryEndpoint(endpoint, payload) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(8000)
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const data = await response.json();
  if (data && (data.status === "stream" || data.status === "tunnel" || data.status === "redirect" || data.status === "picker")) {
    return data;
  }
  throw new Error("Unexpected response status");
}

async function proxyDownload(downloadUrl) {
  const response = await fetch(downloadUrl, { signal: AbortSignal.timeout(25000) });
  if (!response.ok) {
    return {
      statusCode: 502,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: `Download proxy failed with HTTP ${response.status}` })
    };
  }
  const contentType = response.headers.get("content-type") || "application/octet-stream";
  const contentLength = response.headers.get("content-length");
  const disposition = response.headers.get("content-disposition");
  const filename = disposition
    ? disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)?.[1] || "download"
    : "download";

  const headers = {
    "Content-Type": contentType,
    "Content-Disposition": `attachment; filename="${filename}"`
  };
  if (contentLength) headers["Content-Length"] = contentLength;

  return {
    statusCode: 200,
    headers,
    body: await response.text()
  };
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  // If proxy mode, fetch the file from the given URL
  if (body.proxy && body.url) {
    return await proxyDownload(body.url);
  }

  // Normal mode: find a working Cobalt endpoint
  const { url, videoQuality, audioOnly } = body;
  if (!url) {
    return { statusCode: 400, body: JSON.stringify({ error: "URL is required" }) };
  }

  const payload = { url, videoQuality: videoQuality || "720" };
  if (audioOnly) payload.audioOnly = true;

  try {
    const data = await Promise.any(endpoints.map(ep => tryEndpoint(ep, payload)));
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    };
  } catch {
    return {
      statusCode: 502,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "All Cobalt API endpoints failed" })
    };
  }
};
