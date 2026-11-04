// @ts-nocheck
/* Присутствие («в сети», «печатает»). Записывает только сам игрок (по токену).
   Видит статус только собеседника по сделке: общая сделка в escrow обязательна. Таблица obmenka_presence закрыта для всех, кроме сервера. */
const SB = Deno.env.get("SUPABASE_URL");
const KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, apikey, authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const MAX_PEERS = 40;

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" } });
}
async function rest(path, init = {}) {
  return fetch(SB + "/rest/v1/" + path, {
    ...init,
    headers: { apikey: KEY, Authorization: "Bearer " + KEY, "Content-Type": "application/json", ...(init.headers || {}) },
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
  return new TextDecoder().decode(Uint8Array.from(atob(s), (c) => c.charCodeAt(0)));
}
async function hmac(msg) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(KEY), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(msg));
  return b64u(new Uint8Array(sig));
}
/* та же проверка токена, что в swift-worker: подпись + текущий номер сессии аккаунта */
async function readToken(tok) {
  if (typeof tok !== "string" || tok.indexOf(".") < 0) return null;
  const parts = tok.split(".");
  if (parts.length !== 2) return null;
  if ((await hmac(parts[0])) !== parts[1]) return null;
  let o = null;
  try { o = JSON.parse(unb64u(parts[0])); } catch (e) { return null; }
  if (!o || !o.acc || !o.j || !(o.exp > Date.now())) return null;
  const acc = String(o.acc);
  const r = await rest("admin_bot_state?select=v&k=eq." + encodeURIComponent("sess:" + acc));
  const d = r.ok ? await r.json() : [];
  const cur = d[0] && d[0].v ? String(d[0].v.j || "") : "";
  if (!cur || cur !== String(o.j)) return null;
  return acc;
}
function cleanKey(v) { return String(v || "").trim().toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 40); }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, error: "method" }, 405);
  let body;
  try { body = await req.json(); } catch (e) { return json({ ok: false, error: "bad_json" }, 400); }

  const acc = await readToken(body.token);
  if (!acc) return json({ ok: false, error: "bad_token" }, 401);

  /* записать свой статус: в сети, печатает (сделка), выключен */
  if (body.action === "beat") {
    const now = Date.now();
    const row = {
      acc: acc,
      hb: now,
      tn: Math.max(0, Math.floor(Number(body.tn) || 0)),
      ty: cleanKey(body.ty).slice(0, 64),
      off: !!body.off,
    };
    const w = await rest("obmenka_presence?on_conflict=acc", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify([row]),
    });
    if (!w.ok) return json({ ok: false, error: "server" }, 500);
    return json({ ok: true, now: now });
  }

  /* статус собеседников, с которыми есть сделка (в escrow) */
  if (body.action === "peers") {
    const asked = (Array.isArray(body.accs) ? body.accs : []).slice(0, MAX_PEERS).map(cleanKey).filter(Boolean);
    if (!asked.length) return json({ ok: true, now: Date.now(), rows: [] });
    const me = encodeURIComponent(acc);
    const er = await rest("escrow?select=seller,buyer&or=(seller.eq." + me + ",buyer.eq." + me + ")&limit=2000");
    if (!er.ok) return json({ ok: false, error: "server" }, 500);
    const deals = await er.json();
    const allowed = new Set();
    deals.forEach((d) => {
      if (d.seller === acc && d.buyer) allowed.add(String(d.buyer));
      if (d.buyer === acc && d.seller) allowed.add(String(d.seller));
    });
    const want = asked.filter((a) => allowed.has(a) && a !== acc);
    if (!want.length) return json({ ok: true, now: Date.now(), rows: [] });
    const pr = await rest("obmenka_presence?select=acc,hb,tn,ty,off,updated_at&acc=in.(" + want.map(encodeURIComponent).join(",") + ")");
    if (!pr.ok) return json({ ok: false, error: "server" }, 500);
    return json({ ok: true, now: Date.now(), rows: await pr.json() });
  }

  return json({ ok: false, error: "unknown_action" }, 400);
});
