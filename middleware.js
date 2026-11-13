// Bloqueia o site inteiro para quem não fez login. Roda no servidor do Vercel antes de
// entregar qualquer arquivo, então o conteúdo não chega ao navegador sem sessão válida.
import { usuarioAtual, cookieSair } from "./lib/sessao.js";

export const config = { matcher: ["/((?!api/).*)"] };

// arquivos liberados: a tela de login e o que ela e as prévias de link usam
const LIVRE = new Set([
  "/login", "/login.html", "/logo-hormones.webp", "/og.jpg", "/robots.txt",
  "/favicon.ico", "/favicon-48.png", "/apple-touch-icon.png", "/icon-512.png",
]);

export default async function middleware(request) {
  const url = new URL(request.url);
  const caminho = url.pathname;
  if (LIVRE.has(caminho)) return;

  let u = null;
  try {
    u = await usuarioAtual(request);
  } catch (e) {
    console.error(e);
    return new Response("Plataforma indisponível no momento. Tente de novo em instantes.", {
      status: 503, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
    });
  }

  if (!u) {
    const pagina = !/\.[a-z0-9]+$/i.test(caminho) || caminho.endsWith(".html");
    if (!pagina) return new Response("Faça login para acessar.", { status: 401, headers: { "cache-control": "no-store" } });
    const destino = new URL("/login", url);
    if (caminho !== "/") destino.searchParams.set("volta", caminho + url.search);
    return new Response(null, {
      status: 302,
      headers: { location: destino.toString(), "set-cookie": cookieSair(), "cache-control": "no-store" },
    });
  }

  if ((caminho === "/admin" || caminho === "/admin.html") && u.papel !== "admin") {
    return new Response(null, { status: 302, headers: { location: new URL("/", url).toString(), "cache-control": "no-store" } });
  }
}
