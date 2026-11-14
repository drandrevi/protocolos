/* Entrega do PDF gerado pelo site.
   Funciona no computador, no celular, no app da tela inicial (iPhone/Android)
   e nos navegadores de dentro de outros apps (WhatsApp, Instagram, Facebook).
   No computador e no Android o download começa sozinho. No iPhone e dentro de
   outros apps aparecem botões: o toque novo do médico é o que o sistema exige
   para salvar ou compartilhar um arquivo. */
(function () {
  const ua = navigator.userAgent || "";
  const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const android = /Android/i.test(ua);
  const dentroDeApp = /Instagram|FBAN|FBAV|FB_IAB|FBIOS|WhatsApp|Line\/|LinkedInApp|Snapchat|TikTok|musical_ly|BytedanceWebview|MicroMessenger|; wv\)/i.test(ua);
  let urlAtual = null;

  /* html2pdf vem do cdnjs; se a rede bloquear, usa a cópia do próprio site */
  let carregando = null;
  window.garantirHtml2pdf = function () {
    if (typeof html2pdf !== "undefined") return Promise.resolve(true);
    if (!carregando) carregando = new Promise(res => {
      const s = document.createElement("script");
      s.src = "/vendor/html2pdf.bundle.min.js";
      s.onload = () => res(typeof html2pdf !== "undefined");
      s.onerror = () => { carregando = null; res(false); };
      document.head.appendChild(s);
    });
    return carregando;
  };

  function el(tag, attrs, txt) {
    const e = document.createElement(tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (txt) e.textContent = txt;
    return e;
  }
  function baixar(url, nome) {
    const a = el("a", { href: url, download: nome, rel: "noopener" });
    a.style.display = "none"; document.body.appendChild(a); a.click(); a.remove();
  }

  window.entregarPdf = function (blob, nome, note) {
    if (urlAtual) URL.revokeObjectURL(urlAtual);
    const pdfBlob = blob.type === "application/pdf" ? blob : new Blob([blob], { type: "application/pdf" });
    const url = urlAtual = URL.createObjectURL(pdfBlob);
    let arquivo = null;
    try { arquivo = new File([pdfBlob], nome, { type: "application/pdf" }); } catch (e) {}
    let podeCompartilhar = false;
    try { podeCompartilhar = !!(arquivo && navigator.share && navigator.canShare && navigator.canShare({ files: [arquivo] })); } catch (e) {}

    note.textContent = "";
    const automatico = !ios && !dentroDeApp;
    if (automatico) baixar(url, nome);
    note.appendChild(document.createTextNode(automatico ? "PDF gerado. Se o download não começou: " : "PDF pronto. "));

    const acoes = el("span", { class: "pdf-acoes" });
    if (podeCompartilhar) {
      const b = el("button", { type: "button", class: "pdf-acao" }, "Salvar ou enviar PDF");
      b.addEventListener("click", () => {
        navigator.share({ files: [arquivo], title: nome.replace(/\.pdf$/, "") }).catch(err => {
          if (err && err.name === "AbortError") return;
          window.open(url, "_blank") || (location.href = url);
        });
      });
      acoes.appendChild(b);
    }
    const abrir = el("a", { href: url, target: "_blank", rel: "noopener", class: "pdf-acao" }, "Abrir PDF");
    if (!ios) abrir.setAttribute("download", nome);
    if (!ios && !dentroDeApp) abrir.textContent = "Baixar de novo";
    acoes.appendChild(abrir);
    if (dentroDeApp && android) {
      const u = location.href.replace(/^https?:\/\//, "");
      acoes.appendChild(el("a", { href: "intent://" + u + "#Intent;scheme=https;package=com.android.chrome;end", class: "pdf-acao" }, "Abrir no Chrome"));
    }
    note.appendChild(acoes);
    if (dentroDeApp) note.appendChild(el("span", { class: "pdf-dica" }, "Se nada abrir, toque nos três pontinhos do app e escolha \"Abrir no navegador\"."));
  };
})();
