// @ts-nocheck
/* Журнал вызовов админа. Все админские запросы с паролем идут через эту функцию.
   Каждый вызов записывается на сервере (admin_audit + журнал админов), даже если клиент ничего не отправил.
   Пароль проверяет целевая функция (swift-worker, admin-data, acc-lookup); пароль в журнал не попадает. */
const SB = Deno.env.get("SUPABASE_URL");
const KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, apikey, authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const TARGETS = { "swift-worker": 1, "admin-data": 1, "acc-lookup": 1 };
const LOG_MAX = 1000;

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" } });
}
async function rest(path, init = {}) {
  return fetch(SB + "/rest/v1/" + path, {
    ...init,
    headers: { apikey: KEY, Authorization: "Bearer " + KEY, "Content-Type": "application/json", ...(init.headers || {}) },
  });
}
async function audit(row) {
  try {
    await rest("admin_audit", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify([row]) });
  } catch (e) { /* запись журнала не должна ломать запрос */ }
}
/* запись в общий журнал админов (тот же формат, что читает панель) */
async function appendLog(entry) {
  try {
    const r = await rest("obmenka_kv?select=value&key=eq." + encodeURIComponent("g:logs"));
    const d = r.ok ? await r.json() : [];
    const arr = d[0] && Array.isArray(d[0].value) ? d[0].value : [];
    arr.unshift(entry);
    await rest("obmenka_kv?on_conflict=key", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify([{ key: "g:logs", value: arr.slice(0, LOG_MAX), updated_at: new Date().toISOString() }]),
    });
  } catch (e) { /* журнал не должен ломать запрос */ }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, error: "method" }, 405);
  let body;
  try { body = await req.json(); } catch (e) { return json({ ok: false, error: "bad_json" }, 400); }

  const target = String(body.target || "");
  if (!TARGETS[target]) return json({ ok: false, error: "bad_target" }, 400);
  const nick = String(body.admin_nick || "").trim().toLowerCase().slice(0, 40);
  if (!nick) return json({ ok: false, error: "bad_input" }, 400);
  const action = String(body.action || "").slice(0, 60);

  const forward = Object.assign({}, body);
  delete forward.target;
  const fr = await fetch(SB.replace(/\/$/, "") + "/functions/v1/" + target, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: KEY },
    body: JSON.stringify(forward),
  });
  const text = await fr.text();
  let data = {};
  try { data = JSON.parse(text); } catch (e) { data = {}; }
  const ok = fr.ok && data && data.ok === true;

  const ip = (req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "").split(",")[0].trim().slice(0, 64);
  const ua = (req.headers.get("user-agent") || "").slice(0, 200);
  await audit({ nick: nick, target: target, action: action, ok: ok, status: fr.status, ip: ip, ua: ua });

  /* в видимый журнал попадают только подтверждённые вызовы: иначе любой может подписать запись чужим ником */
  if (!ok) return new Response(text, { status: fr.status, headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" } });

  let role = "";
  try {
    const rr = await rest("admin_links?select=role&acc=eq." + encodeURIComponent(nick));
    const rd = rr.ok ? await rr.json() : [];
    role = (rd[0] && rd[0].role) || "";
  } catch (e) { role = ""; }
  await appendLog({
    ts: Date.now(),
    role: role,
    actor: nick,
    action: "Запрос: " + (action || "—"),
    details: "успешно" + (ip ? " · IP " + ip : ""),
  });

  return new Response(text, { status: fr.status, headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" } });
});
