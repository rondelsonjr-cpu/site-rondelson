// ============================================================================
// Rondelson Car — Edge Function de pré-visualização por carro (Open Graph)
// ============================================================================

const SB_URL = 'https://uyelqatatrgtjcvceoah.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5ZWxxYXRhdHJndGpjdmNlb2FoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5Njk1NzUsImV4cCI6MjA5NDU0NTU3NX0.YRJpDrMx4R2U6YTHhwcz-6PyEy8qb8_3XICmSHCwxow';

const FALLBACK_IMG = 'https://rondelsoncar.com.br/og-cover.jpg';

function escAttr(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function setMeta(html, attr, key, val) {
  const re = new RegExp(
    '(<meta\\s+' + attr + '=["\']' + key + '["\']\\s+content=["\'])[^"\']*(["\'])',
    'i'
  );
  return html.replace(re, '$1' + escAttr(val) + '$2');
}

function setTitle(html, val) {
  return html.replace(/<title>[^<]*<\/title>/i, '<title>' + escAttr(val) + '</title>');
}

export default async (request, context) => {
  const url = new URL(request.url);
  const m = url.pathname.match(/^\/carro\/(.+)$/);
  if (!m) return context.next();

  const id = decodeURIComponent(m[1]).trim();

  let data = {};
  try {
    const r = await fetch(
      SB_URL + '/rest/v1/carros?id=eq.' + encodeURIComponent(id) + '&select=data',
      { headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY } }
    );
    if (r.ok) {
      const rows = await r.json();
      if (rows && rows[0] && rows[0].data) data = rows[0].data;
    }
  } catch (_) {}

  const fotos = Array.isArray(data.swFotosSite) ? data.swFotosSite.filter(Boolean) : [];
  const img = fotos[0] || FALLBACK_IMG;

  const nome = (data.nome || 'Veículo seminovo').toString().trim();
  const ano = data.ano ? ' ' + data.ano : '';
  const precoNum = parseInt(String(data.swPrecoVenda || '').replace(/\D/g, ''), 10) || 0;
  const preco = precoNum > 0 ? 'R$ ' + precoNum.toLocaleString('pt-BR') : 'Sob consulta';

  const partes = [];
  if (data.ano) partes.push(data.ano);
  const kmN = parseInt(String(data.kmEntrada || '').replace(/\D/g, ''), 10) || 0;
  if (kmN > 0) partes.push(kmN.toLocaleString('pt-BR') + ' km');
  if (data.cambio) partes.push(data.cambio);
  const specs = partes.join(' · ');

  const title = nome + ano + ' — ' + preco + ' · Rondelson Car';
  const desc = (specs ? specs + '. ' : '') +
    'Seminovo com procedência em Vitória/ES. Fale direto no WhatsApp.';
  const canonical = url.origin + '/carro/' + encodeURIComponent(id);

  let html;
  try {
    const base = await fetch(url.origin + '/index.html');
    html = await base.text();
  } catch (_) {
    return context.next();
  }

  html = setTitle(html, title);
  html = setMeta(html, 'property', 'og:title', title);
  html = setMeta(html, 'property', 'og:description', desc);
  html = setMeta(html, 'property', 'og:image', img);
  html = setMeta(html, 'property', 'og:url', canonical);
  html = setMeta(html, 'name', 'twitter:title', title);
  html = setMeta(html, 'name', 'twitter:description', desc);
  html = setMeta(html, 'name', 'twitter:image', img);

  const redirect =
    '<script>location.replace("/#/estoque/carro/"+' +
    'location.pathname.split("/carro/")[1]);</script>';
  html = html.replace(/<head>/i, '<head>\n' + redirect);

  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=300',
    },
  });
};
