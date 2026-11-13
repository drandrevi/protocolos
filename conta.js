/* Menu da conta na barra do topo: nome de quem está logado, atalho para o painel de usuários (admins) e Sair. */
(() => {
  const css = `
.conta{position:relative;flex:none}
.conta-b{display:flex;align-items:center;gap:8px;height:42px;padding:0 12px 0 6px;border-radius:12px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);color:#fff;cursor:pointer;font-family:var(--f-head,Montserrat,sans-serif);font-weight:600;font-size:12.5px}
.conta-b:hover{background:rgba(255,255,255,.14)}
.conta-av{display:grid;place-items:center;width:30px;height:30px;border-radius:9px;background:linear-gradient(140deg,#0c6a42,#2fd086);font-weight:800;font-size:13px;color:#fff}
.conta-m{position:absolute;right:0;top:calc(100% + 8px);min-width:230px;padding:8px;border-radius:16px;background:rgba(6,24,15,.97);border:1px solid rgba(255,255,255,.12);box-shadow:0 24px 50px -20px rgba(0,0,0,.9);z-index:60;color:#eaf6ef}
.conta-m[hidden]{display:none}
.conta-quem{padding:8px 10px 10px;border-bottom:1px solid rgba(255,255,255,.08);margin-bottom:6px}
.conta-quem b{display:block;font-family:var(--f-head,Montserrat,sans-serif);font-size:14px}
.conta-quem small{color:#8fb3a0;font-size:12px}
.conta-m a,.conta-m button{display:flex;align-items:center;gap:10px;width:100%;padding:10px;border:0;border-radius:10px;background:none;color:inherit;text-decoration:none;font:600 13.5px var(--f-body,"Open Sans",sans-serif);cursor:pointer;text-align:left}
.conta-m a:hover,.conta-m button:hover{background:rgba(62,224,143,.1)}
.conta-m svg{width:18px;height:18px;fill:none;stroke:#3ee08f;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;flex:none}
@media (max-width:640px){.conta-nome{display:none}.conta-b{padding:0 6px}}`;
  const ic = {
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    sair: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  fetch("/api/eu", { credentials: "same-origin" })
    .then((r) => (r.status === 401 ? (location.href = "/login", null) : r.ok ? r.json() : null))
    .then((eu) => {
      if (!eu) return;
      const barra = document.querySelector(".top .wrap");
      if (!barra) return;
      const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
      const el = document.createElement("div");
      el.className = "conta";
      const primeiro = eu.nome.trim().split(/\s+/)[0];
      el.innerHTML = `<button type="button" class="conta-b" aria-haspopup="true" aria-expanded="false"><span class="conta-av">${esc(primeiro[0].toUpperCase())}</span><span class="conta-nome">${esc(primeiro)}</span></button>
<div class="conta-m" hidden role="menu"><div class="conta-quem"><b>${esc(eu.nome)}</b><small>${eu.papel === "admin" ? "Administrador" : "Mentorado"} · ${esc(eu.usuario)}</small></div>
${eu.papel === "admin" ? `<a href="/admin" role="menuitem"><svg viewBox="0 0 24 24">${ic.users}</svg>Administrar usuários</a>` : ""}
<form method="post" action="/api/sair"><button type="submit" role="menuitem"><svg viewBox="0 0 24 24">${ic.sair}</svg>Sair</button></form></div>`;
      const modo = barra.querySelector("#mode");
      modo ? barra.insertBefore(el, modo) : barra.appendChild(el);
      const b = el.querySelector(".conta-b"), m = el.querySelector(".conta-m");
      const abrir = (on) => { m.hidden = !on; b.setAttribute("aria-expanded", String(on)); };
      b.addEventListener("click", (e) => { e.stopPropagation(); abrir(m.hidden); });
      document.addEventListener("click", (e) => { if (!el.contains(e.target)) abrir(false); });
      document.addEventListener("keydown", (e) => { if (e.key === "Escape") abrir(false); });
    })
    .catch(() => {});
})();
