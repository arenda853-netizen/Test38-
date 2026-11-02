// @ts-nocheck
/* Журнал принятия соглашения и согласия на обработку персональных данных.
   Пишется только для аккаунта, владельца токена. Хранится в admin_bot_state (RLS включён, политик нет: читает только сервер). */
const SB = Deno.env.get("SUPABASE_URL");
const KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, apikey, authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const MAX_EVENTS = 100;

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" },
  });
}
async function rest(path, init = {}) {
  return fetch(SB + "/rest/v1/" + path, {
    ...init,
    headers: {
      apikey: KEY,
      Authorization: "Bearer " + KEY,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
}
function b64u(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function unb64u(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}
async function hmac(msg) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(KEY), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(msg));
  return b64u(new Uint8Array(sig));
}
/* та же проверка токена, что в swift-worker: подпись + текущий номер сессии аккаунта */
async function getSess(acc) {
  const r = await rest("admin_bot_state?select=v&k=eq." + encodeURIComponent("sess:" + acc));
  const d = r.ok ? await r.json() : [];
  return d[0] && d[0].v ? String(d[0].v.j || "") : "";
}
async function readToken(tok) {
  if (typeof tok !== "string" || tok.indexOf(".") < 0) return null;
  const parts = tok.split(".");
  if (parts.length !== 2) return null;
  if ((await hmac(parts[0])) !== parts[1]) return null;
  let o = null;
  try { o = JSON.parse(unb64u(parts[0])); } catch (e) { return null; }
  if (!o || !o.acc || !o.j || !(o.exp > Date.now())) return null;
  const acc = String(o.acc);
  const cur = await getSess(acc);
  if (!cur || cur !== String(o.j)) return null;
  return acc;
}
async function loadEvents(k) {
  const cur = await rest("admin_bot_state?select=v&k=eq." + encodeURIComponent(k));
  const rows = cur.ok ? await cur.json() : [];
  return rows[0] && rows[0].v && Array.isArray(rows[0].v.events) ? rows[0].v.events : [];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, error: "method" }, 405);
  let body;
  try { body = await req.json(); } catch (e) { return json({ ok: false, error: "bad_json" }, 400); }

  const acc = await readToken(body.token);
  if (!acc) return json({ ok: false, error: "bad_token" }, 401);
  const k = "consent:" + acc;

  if (body.action === "set") {
    const agree = String(body.agree_ver || "").slice(0, 10);
    const pd = String(body.pd_ver || "").slice(0, 10);
    if (!agree || !pd) return json({ ok: false, error: "bad_input" }, 400);
    const events = await loadEvents(k);
    const xf = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "";
    events.unshift({
      agree_ver: agree,
      pd_ver: pd,
      at: new Date().toISOString(),
      ip: xf.split(",")[0].trim().slice(0, 64),
      ua: (req.headers.get("user-agent") || "").slice(0, 200),
    });
    const trimmed = events.slice(0, MAX_EVENTS);
    const w = await rest("admin_bot_state?on_conflict=k", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify([{ k: k, v: { events: trimmed }, updated_at: new Date().toISOString() }]),
    });
    if (!w.ok) return json({ ok: false, error: "server" }, 500);
    return json({ ok: true, at: trimmed[0].at });
  }

  if (body.action === "get") {
    const events = await loadEvents(k);
    return json({ ok: true, count: events.length, last: events[0] || null });
  }

  return json({ ok: false, error: "unknown_action" }, 400);
});
