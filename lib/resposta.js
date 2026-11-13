export const json = (dados, status = 200, extra = {}) =>
  new Response(JSON.stringify(dados), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extra },
  });

// Pedidos que mudam algo precisam vir do próprio site (proteção contra CSRF).
export function mesmaOrigem(request) {
  const origem = request.headers.get("origin");
  if (!origem) return true;
  try {
    return new URL(origem).host === new URL(request.url).host;
  } catch {
    return false;
  }
}
