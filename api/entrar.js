import { rpc, criarToken, cookieEntrar } from "../lib/sessao.js";
import { json, mesmaOrigem } from "../lib/resposta.js";

const MSG = {
  credenciais: ["Usuário ou senha incorretos.", 401],
  bloqueado: ["Este acesso está bloqueado. Fale com a equipe Hormones.", 403],
  travado: ["Muitas tentativas erradas. Aguarde 15 minutos e tente de novo.", 429],
};

export async function POST(request) {
  if (!mesmaOrigem(request)) return json({ erro: "Origem não permitida." }, 403);
  let corpo;
  try {
    corpo = await request.json();
  } catch {
    return json({ erro: "Pedido inválido." }, 400);
  }
  const usuario = String(corpo.usuario || "").trim().toLowerCase().slice(0, 40);
  const senha = String(corpo.senha || "").slice(0, 200);
  if (!usuario || !senha) return json({ erro: "Preencha usuário e senha." }, 400);

  try {
    const r = await rpc("app_entrar", { p_usuario: usuario, p_senha: senha });
    if (!r || r.erro) {
      const [msg, status] = MSG[r?.erro] || MSG.credenciais;
      return json({ erro: msg }, status);
    }
    return json({ ok: true, papel: r.papel, nome: r.nome }, 200, { "set-cookie": cookieEntrar(await criarToken(r)) });
  } catch (e) {
    console.error(e);
    return json({ erro: "Não foi possível entrar agora. Tente de novo em instantes." }, 503);
  }
}
