// @ts-nocheck
/* Чтение аккаунтов без публичного доступа: роль админа по пропуску игрока (my_role) и список аккаунтов для админ-панели по паролю админа (admin_accounts). Только чтение. Пароли: PBKDF2 (старые SHA-256 записи переводятся при входе). */
const SB = Deno.env.get("SUPABASE_URL");
const KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, apikey, authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const REVIEW_ROLES = ["owner", "moderator", "junior", "admin", "senior"];
const PB_ITER = 100000;
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" } });
}
async function rest(path, init = {}) {
  return fetch(SB + "/rest/v1/" + path, {
    ...init,
    headers: { apikey: KEY, Authorization: "Bearer " + KEY, "Content-Type": "application/json", ...(init.headers || {}) },
  });
}
async function sha(s) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
function pwHashOld(pass, salt) { return sha("dp1|" + (salt || "") + "|" + pass); }
function b64(bytes) { let s = ""; for (const b of bytes) s += String.fromCharCode(b); return btoa(s); }
function unb64bytes(s) { return Uint8Array.from(atob(String(s)), (c) => c.charCodeAt(0)); }
async function pbkdf2(pass, saltBytes, iter) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(String(pass)), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: saltBytes, iterations: iter }, key, 256);
  return b64(new Uint8Array(bits));
}
async function makePassRec(pass) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { algo: "pbkdf2", iter: PB_ITER, salt: b64(salt), passHash: await pbkdf2(pass, salt, PB_ITER) };
}
/* запись с паролем: новая (pbkdf2) или старая (sha256 с солью) */
async function checkPassRec(pass, rec) {
  if (!rec || !rec.passHash) return false;
  if (rec.algo === "pbkdf2") return (await pbkdf2(pass, unb64bytes(rec.salt), Number(rec.iter) || PB_ITER)) === rec.passHash;
  return (await pwHashOld(pass, rec.salt || "")) === rec.passHash;
}
function isLegacy(rec) { return !!rec && !!rec.passHash && rec.algo !== "pbkdf2"; }
async function putPassRec(key, pass) {
  return rest("obmenka_kv?on_conflict=key", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify([{ key: key, value: await makePassRec(pass), updated_at: new Date().toISOString() }]) });
}
async function getLock(k) {
  const r = await rest("admin_bot_state?select=v&k=eq." + encodeURIComponent(k));
  const d = r.ok ? await r.json() : [];
  return (d[0] && d[0].v) || { n: 0, until: 0 };
}
async function setLock(k, v) {
  await rest("admin_bot_state?on_conflict=k", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify([{ k: k, v: v, updated_at: new Date().toISOString() }]) });
}
async function adminAuth(nick, pass, allowed) {
  const k = String(nick || "").trim().toLowerCase();
  const p = String(pass || "");
  if (!k || !p) return { ok: false, error: "bad_input", code: 400 };
  const lk = "sus:" + k;
  const lock = await getLock(lk);
  if (lock.until && lock.until > Date.now()) return { ok: false, error: "locked", minutes: Math.ceil((lock.until - Date.now()) / 60000), code: 429 };
  const ar = await rest("obmenka_kv?select=value&key=eq." + encodeURIComponent("apw:" + k));
  const ad = ar.ok ? await ar.json() : [];
  const arec = ad[0] && ad[0].value;
  const okPass = await checkPassRec(p, arec);
  if (!okPass) {
    const n = (lock.n || 0) + 1;
    await setLock(lk, n >= 5 ? { n: 0, until: Date.now() + 10 * 60000 } : { n: n, until: 0 });
    return { ok: false, error: "bad_admin", code: 403 };
  }
  if (isLegacy(arec)) await putPassRec("apw:" + k, p);
  const rl = await rest("admin_links?select=role&acc=eq." + encodeURIComponent(k));
  const dl = rl.ok ? await rl.json() : [];
  const role = dl[0] && dl[0].role;
  if (!role || (allowed || []).indexOf(role) < 0) return { ok: false, error: "not_allowed", code: 403 };
  await setLock(lk, { n: 0, until: 0 });
  return { ok: true, role: role, nick: k };
}
async function hmac(msg) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(KEY), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(msg));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function unb64u(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return new TextDecoder().decode(Uint8Array.from(atob(s), (c) => c.charCodeAt(0)));
}
/* пропуск действителен, только если его номер совпадает с сохранённым для аккаунта (как в swift-worker и account-state) */
async function readToken(tok) {
  if (typeof tok !== "string" || tok.split(".").length !== 2) return null;
  const [p, sig] = tok.split(".");
  if ((await hmac(p)) !== sig) return null;
  let o = null;
  try { o = JSON.parse(unb64u(p)); } catch (e) { return null; }
  if (!o || !o.acc || !o.j || !(o.exp > Date.now())) return null;
  const acc = String(o.acc);
  const r = await rest("admin_bot_state?select=v&k=eq." + encodeURIComponent("sess:" + acc));
  const d = r.ok ? await r.json() : [];
  const cur = d[0] && d[0].v ? String(d[0].v.j || "") : "";
  if (!cur || cur !== String(o.j)) return null;
  return acc;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, error: "method" }, 405);
  let body;
  try { body = await req.json(); } catch (e) { return json({ ok: false, error: "bad_json" }, 400); }
  const action = body.action;

  if (action === "my_role") {
    const acc = await readToken(body.token);
    if (!acc) return json({ ok: false, error: "bad_token" }, 401);
    const r = await rest("admin_links?select=role&acc=eq." + encodeURIComponent(acc));
    if (!r.ok) return json({ ok: false, error: "server" }, 500);
    const d = await r.json();
    return json({ ok: true, role: (d[0] && d[0].role) || null });
  }

  if (action === "admin_accounts") {
    const a = await adminAuth(body.admin_nick, body.admin_pass, REVIEW_ROLES);
    if (!a.ok) return json({ ok: false, error: a.error, minutes: a.minutes }, a.code);
    const r = await rest("obmenka_kv?select=key,value&key=like." + encodeURIComponent("acc:%") + "&limit=5000");
    if (!r.ok) return json({ ok: false, error: "server" }, 500);
    const rows = await r.json();
    const accounts = rows.filter((x) => x && x.value && typeof x.value === "object").map((x) => {
      const v = x.value;
      return {
        nick: String(x.key).slice(4),
        nickname: v.nickname || String(x.key).slice(4),
        display: v.display || "",
        uid: v.uid || "",
        status: v.status || "active",
        createdAt: v.createdAt || 0,
        lastLogin: v.lastLogin || 0,
        restrictions: Array.isArray(v.restrictions) ? v.restrictions.slice(-50) : [],
      };
    });
    return json({ ok: true, accounts: accounts });
  }

  return json({ ok: false, error: "unknown_action" }, 400);
});
