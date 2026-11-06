// @ts-nocheck
/* Вход и регистрация игроков. Вход: резерв попытки ДО проверки пароля (счётчик gate:<ник> в базе).
   Регистрация: ник начинается с буквы, цифры только в конце; пароль не короче 10 символов, буквы и цифры.
   Пароль проверяет swift-worker. Блокировка привязана к нику, а не к устройству. */
const SB = Deno.env.get("SUPABASE_URL");
const KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, apikey, authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" } });
}
async function rest(path, init = {}) {
  return fetch(SB + "/rest/v1/" + path, {
    ...init,
    headers: { apikey: KEY, Authorization: "Bearer " + KEY, "Content-Type": "application/json", ...(init.headers || {}) },
  });
}
async function readLock(lk) {
  const r = await rest("admin_bot_state?select=v&k=eq." + encodeURIComponent(lk));
  const d = r.ok ? await r.json() : [];
  return (d[0] && d[0].v) || { n: 0, until: 0 };
}
/* правила пароля игрока: 10–64 символа, обязательно буквы и цифры */
function passOk(p) {
  return typeof p === "string" && p.length >= 10 && p.length <= 64 && /[A-Za-zА-Яа-яЁё]/.test(p) && /\d/.test(p);
}
/* ник: 3–20 символов, начинается с буквы, буквы и _ в середине, цифры только в конце */
function nickOk(n) {
  return typeof n === "string" && n.length >= 3 && n.length <= 20 && /^[a-z][a-z_]*[0-9]*$/.test(n);
}
async function forward(body) {
  const fr = await fetch(SB.replace(/\/$/, "") + "/functions/v1/swift-worker", {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: KEY },
    body: JSON.stringify(body),
  });
  let data = {};
  try { data = await fr.json(); } catch (e) { data = { ok: false, error: "server" }; }
  return { data, status: fr.status };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, error: "method" }, 405);
  let body;
  try { body = await req.json(); } catch (e) { return json({ ok: false, error: "bad_json" }, 400); }
  const nick = String(body.nick || "").trim().toLowerCase();
  if (!nick || !body.pass) return json({ ok: false, error: "bad_input" }, 400);

  if (body.action === "register") {
    if (!nickOk(nick)) return json({ ok: false, error: "bad_nick" }, 400);
    if (!passOk(String(body.pass))) return json({ ok: false, error: "bad_pass" }, 400);
    const r = await forward(body);
    return json(r.data, r.status);
  }
  if (body.action !== "login") return json({ ok: false, error: "unknown_action" }, 400);

  const lk = "gate:" + nick;
  const now = Date.now();
  const cur = await readLock(lk);
  if (cur.until && cur.until > now) {
    return json({ ok: false, error: "locked", minutes: Math.ceil((cur.until - now) / 60000) }, 429);
  }

  /* резерв попытки: учитывается до проверки пароля, параллельные запросы получают разные номера */
  const w = await rest("admin_bot_state?on_conflict=k", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify([{ k: lk, v: { n: (cur.n || 0) + 1, until: 0 }, updated_at: new Date().toISOString() }]),
  });
  if (!w.ok) return json({ ok: false, error: "server" }, 500);
  const rows = await w.json();
  const after = (rows[0] && rows[0].v) || {};
  if (after.until && after.until > Date.now()) {
    return json({ ok: false, error: "locked", minutes: Math.ceil((after.until - Date.now()) / 60000) }, 429);
  }

  const r = await forward(body);

  /* сброс счётчика только после верного пароля */
  if (r.data && r.data.ok) {
    await rest("admin_bot_state?on_conflict=k", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify([{ k: lk, v: { n: 0, until: 0 }, updated_at: new Date().toISOString() }]),
    });
  }
  return json(r.data, r.status);
});
