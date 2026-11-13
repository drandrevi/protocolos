# Hormones Protocolos

Segundo cérebro médico da Hormones Mentoring Elite. O médico escolhe a demanda do paciente, vê o protocolo completo (estrutura, ativos, doses, vias e orientações) e baixa em PDF.

Site estático: `index.html` traz o conteúdo, as imagens e o gerador de PDF (html2pdf.js via cdnjs). Publicado no Vercel sem etapa de build.

## Login e usuários

O site inteiro exige login. `middleware.js` roda no Vercel antes de entregar qualquer arquivo e só libera a tela `/login` (e os ícones) para quem não tem sessão. A sessão é um cookie assinado e é conferida no banco a cada página, então bloquear alguém ou trocar a senha tira a pessoa na hora.

- Dois tipos de acesso: **administrador** (consulta e gerencia usuários em `/admin`) e **mentorado** (só consulta).
- Usuários ficam no Supabase (projeto `hormones-protocolos`, esquema `privado`, fora da API pública). O site só fala com o banco pelas funções `app_*` de `supabase/schema.sql`, que exigem o segredo do servidor.
- Senhas guardadas com bcrypt. Cinco senhas erradas travam o usuário por 15 minutos.
- Variáveis no Vercel: `SUPABASE_URL`, `SUPABASE_KEY`, `APP_DB_SECRET` (o mesmo valor de `privado.config.segredo_api`) e `SESSION_SECRET`.
- `conta.js` coloca o menu da conta (nome, Administrar usuários, Sair) na barra do topo de qualquer página que tenha `.top .wrap`.
