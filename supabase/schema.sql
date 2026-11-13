-- Login da plataforma Hormones Protocolos.
-- Os usuários ficam no esquema "privado", que a API pública do Supabase não expõe.
-- O site acessa só pelas funções app_* abaixo, e cada uma exige o segredo do servidor
-- (variável APP_DB_SECRET no Vercel), guardado em privado.config. Assim, mesmo quem tiver
-- a chave pública do Supabase não consegue listar usuários nem testar senhas.

create extension if not exists pgcrypto with schema extensions;

create schema if not exists privado;
revoke all on schema privado from public;

create table if not exists privado.config (
  chave text primary key,
  valor text not null
);

create table if not exists privado.usuarios (
  id uuid primary key default gen_random_uuid(),
  usuario text not null unique check (usuario ~ '^[a-z0-9._-]{3,40}$'),
  nome text not null check (length(btrim(nome)) between 1 and 80),
  senha_hash text not null,
  papel text not null check (papel in ('admin', 'mentorado')),
  ativo boolean not null default true,
  versao integer not null default 1,      -- muda quando o acesso muda: derruba as sessões abertas
  falhas integer not null default 0,
  travado_ate timestamptz,
  criado_em timestamptz not null default now(),
  ultimo_acesso timestamptz
);
alter table privado.config enable row level security;
alter table privado.usuarios enable row level security;

create or replace function privado.checar(p_segredo text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_segredo is null or p_segredo is distinct from
     (select valor from privado.config where chave = 'segredo_api') then
    raise exception 'acesso negado' using errcode = '42501';
  end if;
end $$;

create or replace function privado.publico(u privado.usuarios) returns jsonb
language sql immutable set search_path = '' as $$
  select jsonb_build_object('id', u.id, 'usuario', u.usuario, 'nome', u.nome, 'papel', u.papel,
    'ativo', u.ativo, 'versao', u.versao, 'criado_em', u.criado_em, 'ultimo_acesso', u.ultimo_acesso,
    'travado', coalesce(u.travado_ate > now(), false))
$$;

-- garante que sempre reste ao menos um administrador ativo
create or replace function privado.restam_admins(p_ignorar uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from privado.usuarios where papel = 'admin' and ativo and id <> p_ignorar)
$$;

-- login: 5 senhas erradas travam o usuário por 15 minutos
create or replace function public.app_entrar(p_segredo text, p_usuario text, p_senha text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u privado.usuarios;
begin
  perform privado.checar(p_segredo);
  select * into u from privado.usuarios where usuario = lower(btrim(p_usuario));
  if not found then
    perform extensions.crypt(coalesce(p_senha, ''), extensions.gen_salt('bf', 10));
    return jsonb_build_object('erro', 'credenciais');
  end if;
  if u.travado_ate is not null and u.travado_ate > now() then
    return jsonb_build_object('erro', 'travado');
  end if;
  if u.senha_hash is distinct from extensions.crypt(coalesce(p_senha, ''), u.senha_hash) then
    update privado.usuarios
       set falhas = case when falhas + 1 >= 5 then 0 else falhas + 1 end,
           travado_ate = case when falhas + 1 >= 5 then now() + interval '15 minutes' else travado_ate end
     where id = u.id;
    return jsonb_build_object('erro', 'credenciais');
  end if;
  if not u.ativo then
    return jsonb_build_object('erro', 'bloqueado');
  end if;
  update privado.usuarios set falhas = 0, travado_ate = null, ultimo_acesso = now()
   where id = u.id returning * into u;
  return privado.publico(u);
end $$;

-- confere a sessão a cada página: usuário ativo e versão igual à do cookie
create or replace function public.app_sessao(p_segredo text, p_id uuid, p_versao integer) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare u privado.usuarios;
begin
  perform privado.checar(p_segredo);
  select * into u from privado.usuarios where id = p_id and versao = p_versao and ativo;
  if not found then return null; end if;
  return privado.publico(u);
end $$;

create or replace function public.app_usuarios(p_segredo text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform privado.checar(p_segredo);
  return coalesce((select jsonb_agg(privado.publico(u) order by u.papel, lower(u.nome))
                     from privado.usuarios u), '[]'::jsonb);
end $$;

create or replace function public.app_usuario_criar(p_segredo text, p_usuario text, p_nome text, p_senha text, p_papel text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u privado.usuarios;
begin
  perform privado.checar(p_segredo);
  if length(coalesce(p_senha, '')) < 8 then
    return jsonb_build_object('erro', 'senha_curta');
  end if;
  if exists (select 1 from privado.usuarios where usuario = lower(btrim(p_usuario))) then
    return jsonb_build_object('erro', 'usuario_existe');
  end if;
  insert into privado.usuarios (usuario, nome, senha_hash, papel)
  values (lower(btrim(p_usuario)), btrim(p_nome), extensions.crypt(p_senha, extensions.gen_salt('bf', 10)), p_papel)
  returning * into u;
  return privado.publico(u);
end $$;

-- campos nulos ficam como estão; trocar papel, status ou senha derruba as sessões abertas
create or replace function public.app_usuario_editar(p_segredo text, p_id uuid, p_nome text, p_papel text, p_ativo boolean, p_senha text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u privado.usuarios; muda boolean;
begin
  perform privado.checar(p_segredo);
  select * into u from privado.usuarios where id = p_id for update;
  if not found then return jsonb_build_object('erro', 'nao_encontrado'); end if;
  if p_senha is not null and length(p_senha) < 8 then
    return jsonb_build_object('erro', 'senha_curta');
  end if;
  if u.papel = 'admin' and u.ativo
     and ((p_papel is not null and p_papel <> 'admin') or p_ativo is false)
     and not privado.restam_admins(u.id) then
    return jsonb_build_object('erro', 'ultimo_admin');
  end if;
  muda := (p_papel is not null and p_papel <> u.papel) or (p_ativo is not null and p_ativo <> u.ativo) or p_senha is not null;
  update privado.usuarios set
    nome = coalesce(nullif(btrim(p_nome), ''), nome),
    papel = coalesce(p_papel, papel),
    ativo = coalesce(p_ativo, ativo),
    senha_hash = case when p_senha is null then senha_hash else extensions.crypt(p_senha, extensions.gen_salt('bf', 10)) end,
    falhas = case when p_senha is null then falhas else 0 end,
    travado_ate = case when p_senha is null then travado_ate else null end,
    versao = versao + case when muda then 1 else 0 end
  where id = p_id returning * into u;
  return privado.publico(u);
end $$;

create or replace function public.app_usuario_excluir(p_segredo text, p_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u privado.usuarios;
begin
  perform privado.checar(p_segredo);
  select * into u from privado.usuarios where id = p_id for update;
  if not found then return jsonb_build_object('erro', 'nao_encontrado'); end if;
  if u.papel = 'admin' and u.ativo and not privado.restam_admins(u.id) then
    return jsonb_build_object('erro', 'ultimo_admin');
  end if;
  delete from privado.usuarios where id = p_id;
  return jsonb_build_object('ok', true);
end $$;

revoke all on all functions in schema privado from public, anon, authenticated;
revoke all on function public.app_entrar(text, text, text), public.app_sessao(text, uuid, integer),
  public.app_usuarios(text), public.app_usuario_criar(text, text, text, text, text),
  public.app_usuario_editar(text, uuid, text, text, boolean, text), public.app_usuario_excluir(text, uuid)
  from public, anon, authenticated;
grant execute on function public.app_entrar(text, text, text), public.app_sessao(text, uuid, integer),
  public.app_usuarios(text), public.app_usuario_criar(text, text, text, text, text),
  public.app_usuario_editar(text, uuid, text, text, boolean, text), public.app_usuario_excluir(text, uuid)
  to anon;
