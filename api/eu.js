import { usuarioAtual } from "../lib/sessao.js";
import { json } from "../lib/resposta.js";

export async function GET(request) {
  try {
    const u = await usuarioAtual(request);
    if (!u) return json({ erro: "Sessão expirada." }, 401);
    return json({ nome: u.nome, usuario: u.usuario, papel: u.papel });
  } catch (e) {
    console.error(e);
    return json({ erro: "Indisponível." }, 503);
  }
}
