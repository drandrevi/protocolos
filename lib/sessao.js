// Sessão da plataforma: cookie assinado (HMAC) + conferência no Supabase a cada acesso.
// Usado pelo middleware e pelas funções em /api. Nada aqui vai para o navegador.

export const COOKIE = "hs_sessao";
const DIAS = 30;
const enc = new TextEncoder();

const b64u = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const deB64u = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

function env(nome) {
  const v = process.env[nome];
  if (!v) throw new Error(`Variável ${nome} não configurada`);
  return v;
}

async function chave() {
  return crypto.subtle.importKey("raw", enc.encode(env("SESSION_SECRET")), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function criarToken(u) {
  const corpo = b64u(enc.encode(JSON.stringify({ id: u.id, v: u.versao, exp: Date.now() + DIAS * 864e5 })));
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", await chave(), enc.encode(corpo)));
  return `${corpo}.${b64u(sig)}`;
}

async function lerToken(token) {
  if (!token || token.length > 600) return null;
  const [corpo, sig] = token.split(".");
  if (!corpo || !sig) return null;
  try {
    const ok = await crypto.subtle.verify("HMAC", await chave(), deB64u(sig), enc.encode(corpo));
    if (!ok) return null;
    const d = JSON.parse(new TextDecoder().decode(deB64u(corpo)));
    return d.exp > Date.now() ? d : null;
  } catch {
    return null;
  }
}

export function lerCookie(request, nome = COOKIE) {
  const h = request.headers.get("cookie") || "";
  for (const parte of h.split(";")) {
    const i = parte.indexOf("=");
    if (i > 0 && parte.slice(0, i).trim() === nome) return decodeURIComponent(parte.slice(i + 1).trim());
  }
  return null;
}

export const cookieEntrar = (token) => `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${DIAS * 86400}`;
export const cookieSair = () => `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;

// Chama uma função app_* do banco. O segredo do servidor vai junto; sem ele o banco recusa.
export async function rpc(fn, args = {}) {
  const r = await fetch(`${env("SUPABASE_URL").replace(/\/$/, "")}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: env("SUPABASE_KEY"), "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ p_segredo: env("APP_DB_SECRET"), ...args }),
  });
  if (!r.ok) throw new Error(`Supabase ${fn}: ${r.status} ${await r.text()}`);
  return r.json();
}

// Usuário da sessão atual, ou null. Bloquear, trocar senha ou papel invalida na hora.
export async function usuarioAtual(request) {
  const d = await lerToken(lerCookie(request));
  if (!d) return null;
  return rpc("app_sessao", { p_id: d.id, p_versao: d.v });
}
