// Administração de usuários: só para quem está logado como administrador.
import { usuarioAtual, rpc } from "../lib/sessao.js";
import { json, mesmaOrigem } from "../lib/resposta.js";

const ERROS = {
  senha_curta: "A senha precisa ter pelo menos 8 caracteres.",
  usuario_existe: "Já existe alguém com esse usuário.",
  ultimo_admin: "Precisa sobrar pelo menos um administrador ativo.",
  nao_encontrado: "Usuário não encontrado.",
};
const PAPEIS = new Set(["admin", "mentorado"]);
const RE_USUARIO = /^[a-z0-9._-]{3,40}$/;

async function admin(request) {
  const u = await usuarioAtual(request);
  if (!u) return [null, json({ erro: "Sessão expirada. Entre de novo." }, 401)];
  if (u.papel !== "admin") return [null, json({ erro: "Só administradores." }, 403)];
  if (request.method !== "GET" && !mesmaOrigem(request)) return [null, json({ erro: "Origem não permitida." }, 403)];
  return [u, null];
}

const resultado = (r) => (r && r.erro ? json({ erro: ERROS[r.erro] || "Não foi possível salvar." }, 400) : json(r));

async function rodar(request, fn) {
  try {
    const [eu, negado] = await admin(request);
    if (negado) return negado;
    let corpo = {};
    if (request.method !== "GET" && request.method !== "DELETE") {
      try {
        corpo = await request.json();
      } catch {
        return json({ erro: "Pedido inválido." }, 400);
      }
    }
    return await fn(eu, corpo, new URL(request.url));
  } catch (e) {
    console.error(e);
    return json({ erro: "Algo deu errado. Tente de novo." }, 500);
  }
}

export const GET = (request) =>
  rodar(request, async (eu) => json({ eu: { id: eu.id }, usuarios: await rpc("app_usuarios") }));

export const POST = (request) =>
  rodar(request, async (_eu, c) => {
    const usuario = String(c.usuario || "").trim().toLowerCase();
    const nome = String(c.nome || "").trim();
    const senha = String(c.senha || "");
    const papel = String(c.papel || "mentorado");
    if (!nome || nome.length > 80) return json({ erro: "Informe o nome (até 80 caracteres)." }, 400);
    if (!RE_USUARIO.test(usuario)) return json({ erro: "Usuário: 3 a 40 caracteres, só letras minúsculas, números, ponto, hífen ou sublinhado." }, 400);
    if (!PAPEIS.has(papel)) return json({ erro: "Tipo de acesso inválido." }, 400);
    if (senha.length < 8 || senha.length > 200) return json({ erro: ERROS.senha_curta }, 400);
    return resultado(await rpc("app_usuario_criar", { p_usuario: usuario, p_nome: nome, p_senha: senha, p_papel: papel }));
  });

export const PATCH = (request) =>
  rodar(request, async (eu, c) => {
    const id = String(c.id || "");
    if (!/^[0-9a-f-]{36}$/.test(id)) return json({ erro: "Usuário inválido." }, 400);
    const nome = c.nome == null ? null : String(c.nome).trim().slice(0, 80);
    const papel = c.papel == null ? null : String(c.papel);
    const ativo = c.ativo == null ? null : Boolean(c.ativo);
    const senha = c.senha == null ? null : String(c.senha);
    if (papel !== null && !PAPEIS.has(papel)) return json({ erro: "Tipo de acesso inválido." }, 400);
    if (senha !== null && (senha.length < 8 || senha.length > 200)) return json({ erro: ERROS.senha_curta }, 400);
    if (id === eu.id && (ativo === false || papel === "mentorado"))
      return json({ erro: "Você não pode bloquear nem rebaixar o seu próprio acesso." }, 400);
    return resultado(await rpc("app_usuario_editar", { p_id: id, p_nome: nome, p_papel: papel, p_ativo: ativo, p_senha: senha }));
  });

export const DELETE = (request) =>
  rodar(request, async (eu, _c, url) => {
    const id = url.searchParams.get("id") || "";
    if (!/^[0-9a-f-]{36}$/.test(id)) return json({ erro: "Usuário inválido." }, 400);
    if (id === eu.id) return json({ erro: "Você não pode excluir o seu próprio acesso." }, 400);
    return resultado(await rpc("app_usuario_excluir", { p_id: id }));
  });
