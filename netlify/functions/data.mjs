import { getStore } from "@netlify/blobs";

// One shared document that both devices read and write.
const STORE_NAME = "find-my-stuff";
const KEY = "state";

export default async (req) => {
  // Optional shared passphrase. If APP_KEY is set in the site's
  // environment variables, every request must send it. If it isn't
  // set, the endpoint is open (no gate).
  const required = process.env.APP_KEY || "";
  if (required) {
    const provided = req.headers.get("x-app-key") || "";
    if (provided !== required) {
      return json({ error: "unauthorized" }, 401);
    }
  }

  const store = getStore({ name: STORE_NAME, consistency: "strong" });

  try {
    if (req.method === "GET") {
      const data = await store.get(KEY, { type: "text" }); // null if nothing saved yet
      return new Response(data ?? "", {
        status: 200,
        headers: { "content-type": "application/json", "cache-control": "no-store" },
      });
    }

    if (req.method === "POST" || req.method === "PUT") {
      const body = await req.text();
      if (!body) return json({ error: "empty body" }, 400);
      await store.set(KEY, body);
      return json({ ok: true, rev: Date.now() }, 200);
    }

    return json({ error: "method not allowed" }, 405);
  } catch (err) {
    return json({ error: "store error", detail: String(err && err.message || err) }, 500);
  }
};

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

export const config = { path: "/api/data" };
