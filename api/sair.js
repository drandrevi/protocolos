import { cookieSair } from "../lib/sessao.js";

const sair = (request) =>
  new Response(null, {
    status: 303,
    headers: { location: new URL("/login", request.url).toString(), "set-cookie": cookieSair(), "cache-control": "no-store" },
  });

export const GET = sair;
export const POST = sair;
