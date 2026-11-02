// Petits graphiques SVG, sobres : une série en bleu Lagon foncé, un repère éventuel en gris.
// Chaque point a une zone de toucher large qui porte une bulle (data-tip).

const ACCENT = '#1f7f99';
const REPERE = '#a3aab3';
const GRILLE = '#e6eaee';
const TEXTE = '#7b8290';

const escSvg = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** Graduations rondes (1, 2, 5 × 10ⁿ). */
export function graduations(min, max, n = 4, temps = false) {
  if (min === max) { const d = Math.abs(min) * 0.1 || 1; min -= d; max += d; }
  const brut = (max - min) / n;
  const p = 10 ** Math.floor(Math.log10(brut));
  // Durées : pas ronds en secondes et minutes (15 s, 30 s, 1 min…).
  const pas = temps ? [5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600].find((x) => x >= brut) || 3600
    : [1, 2, 5, 10].map((k) => k * p).find((x) => x >= brut);
  const bas = Math.floor(min / pas) * pas;
  const haut = Math.ceil(max / pas) * pas;
  const t = [];
  for (let v = bas; v <= haut + pas / 2; v += pas) t.push(Math.round(v * 1e6) / 1e6);
  return t;
}

/**
 * Courbe d'une série dans le temps.
 * points : [{ etiquette, y, tip, creux }] ; reference : valeurs grises facultatives (même longueur).
 */
export function courbe({ points, reference = null, format = (v) => v, hauteur = 150, zero = false, temps = false }) {
  const L = 320, H = hauteur, g = 42, d = 52, h = 10, b = 22;
  const valeurs = points.map((p) => p.y).concat(reference || []);
  let min = Math.min(...valeurs), max = Math.max(...valeurs);
  if (zero) min = Math.min(0, min);
  const t = graduations(min, max, 4, temps);
  const y0 = t[0], y1 = t[t.length - 1];
  const n = points.length;
  const r = n > 12 ? 3 : 4;
  const X = (i) => (n === 1 ? g + (L - g - d) / 2 : g + (i * (L - g - d)) / (n - 1));
  const Y = (v) => h + (H - h - b) * (1 - (v - y0) / (y1 - y0 || 1));
  const grille = t.map((v) => `<line x1="${g}" x2="${L - d + 8}" y1="${Y(v)}" y2="${Y(v)}" stroke="${GRILLE}" stroke-width="1"/>
    <text x="${g - 6}" y="${Y(v) + 3.5}" text-anchor="end" font-size="10.5" fill="${TEXTE}">${escSvg(format(v))}</text>`).join('');
  const ligne = (vals, couleur) => (vals.length > 1 ? `<polyline points="${vals.map((v, i) => `${X(i)},${Y(v)}`).join(' ')}" fill="none" stroke="${couleur}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>` : '');
  const ref = reference ? ligne(reference, REPERE) : '';
  const serie = ligne(points.map((p) => p.y), ACCENT);
  const points_ = points.map((p, i) => (p.creux
    ? `<circle cx="${X(i)}" cy="${Y(p.y)}" r="${r + 0.5}" fill="#fff" stroke="${ACCENT}" stroke-width="2"/>`
    : `<circle cx="${X(i)}" cy="${Y(p.y)}" r="${r}" fill="${ACCENT}" stroke="#fff" stroke-width="${n > 12 ? 1.5 : 2}"/>`)).join('');
  const pas = n > 1 ? (L - g - d) / (n - 1) : L - g - d;
  const zones = points.map((p, i) => `<rect x="${X(i) - pas / 2}" y="${h}" width="${pas}" height="${H - h - b}" fill="transparent" data-tip="${escSvg(p.tip)}"/>`).join('');
  const der = points[n - 1];
  const fin = `<text x="${X(n - 1) + 8}" y="${Y(der.y) + 4}" font-size="11" font-weight="600" fill="#3f4652">${escSvg(format(der.y))}</text>`;
  const etiq = `<text x="${X(0)}" y="${H - 6}" font-size="10.5" fill="${TEXTE}" text-anchor="${n === 1 ? 'middle' : 'start'}">${escSvg(points[0].etiquette)}</text>
    ${n > 1 ? `<text x="${X(n - 1)}" y="${H - 6}" font-size="10.5" fill="${TEXTE}" text-anchor="end">${escSvg(der.etiquette)}</text>` : ''}`;
  return `<svg class="graphe" viewBox="0 0 ${L} ${H}" role="img">${grille}${ref}${serie}${points_}${fin}${etiq}${zones}</svg>`;
}

/** Nuage de points : ressenti (1 à 10) en abscisse, performance en ordonnée, ligne de repère à 100 %. */
export function nuage({ points, format = (v) => v, hauteur = 170 }) {
  const L = 320, H = hauteur, g = 42, d = 14, h = 10, b = 28;
  const ys = points.map((p) => p.y).concat([1]);
  const t = graduations(Math.min(...ys), Math.max(...ys));
  const y0 = t[0], y1 = t[t.length - 1];
  const X = (v) => g + ((v - 1) * (L - g - d)) / 9;
  const Y = (v) => h + (H - h - b) * (1 - (v - y0) / (y1 - y0 || 1));
  const grille = t.map((v) => `<line x1="${g}" x2="${L - d}" y1="${Y(v)}" y2="${Y(v)}" stroke="${GRILLE}" stroke-width="1"/>
    <text x="${g - 6}" y="${Y(v) + 3.5}" text-anchor="end" font-size="10.5" fill="${TEXTE}">${escSvg(format(v))}</text>`).join('');
  const repere = `<line x1="${g}" x2="${L - d}" y1="${Y(1)}" y2="${Y(1)}" stroke="${REPERE}" stroke-width="1.5"/>`;
  const axe = [1, 4, 7, 10].map((v) => `<text x="${X(v)}" y="${H - 12}" font-size="10.5" fill="${TEXTE}" text-anchor="middle">${v}</text>`).join('')
    + `<text x="${(L + g) / 2}" y="${H - 1}" font-size="10.5" fill="${TEXTE}" text-anchor="middle">ressenti</text>`;
  // Léger décalage pour les points qui se superposent.
  const vus = new Map();
  const pts = points.map((p) => {
    const k = `${p.x}|${Math.round(p.y * 50)}`;
    const n = vus.get(k) || 0; vus.set(k, n + 1);
    const cx = X(p.x) + (n % 2 ? 1 : -1) * Math.ceil(n / 2) * 6;
    return `<circle cx="${cx}" cy="${Y(p.y)}" r="4.5" fill="${ACCENT}" fill-opacity=".85" stroke="#fff" stroke-width="2"/>
      <circle cx="${cx}" cy="${Y(p.y)}" r="13" fill="transparent" data-tip="${escSvg(p.tip)}"/>`;
  }).join('');
  return `<svg class="graphe" viewBox="0 0 ${L} ${H}" role="img">${grille}${repere}${axe}${pts}</svg>`;
}

/** Petite courbe sans axes pour les listes. */
export function mini(valeurs, creux = []) {
  const L = 76, H = 24, m = 4;
  if (!valeurs.length) return '';
  const min = Math.min(...valeurs), max = Math.max(...valeurs);
  const X = (i) => (valeurs.length === 1 ? L / 2 : m + (i * (L - 2 * m)) / (valeurs.length - 1));
  const Y = (v) => (max === min ? H / 2 : m + (H - 2 * m) * (1 - (v - min) / (max - min)));
  const ligne = valeurs.length > 1 ? `<polyline points="${valeurs.map((v, i) => `${X(i)},${Y(v)}`).join(' ')}" fill="none" stroke="${ACCENT}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" opacity=".85"/>` : '';
  const ronds = valeurs.map((v, i) => (creux.includes(i) ? `<circle cx="${X(i)}" cy="${Y(v)}" r="2.4" fill="#fff" stroke="${ACCENT}" stroke-width="1.3"/>` : '')).join('');
  const i = valeurs.length - 1;
  return `<svg class="mini" viewBox="0 0 ${L} ${H}" aria-hidden="true">${ligne}${ronds}<circle cx="${X(i)}" cy="${Y(valeurs[i])}" r="2.8" fill="${ACCENT}"/></svg>`;
}

/** Bulle d'information : suit le doigt sur toute zone [data-tip]. */
export function activerBulles() {
  const bulle = document.createElement('div');
  bulle.className = 'bulle';
  bulle.hidden = true;
  document.body.appendChild(bulle);
  const montrer = (ev) => {
    const cible = ev.target.closest?.('[data-tip]');
    if (!cible) { bulle.hidden = true; return; }
    bulle.replaceChildren(...cible.dataset.tip.split('\n').map((t, i) => {
      const l = document.createElement(i ? 'span' : 'strong');
      l.textContent = t;
      return l;
    }));
    bulle.hidden = false;
    const r = bulle.getBoundingClientRect();
    const x = Math.min(Math.max(8, ev.clientX - r.width / 2), window.innerWidth - r.width - 8);
    const y = ev.clientY - r.height - 18 < 8 ? ev.clientY + 22 : ev.clientY - r.height - 18;
    bulle.style.left = `${x}px`;
    bulle.style.top = `${y}px`;
  };
  document.addEventListener('pointermove', montrer, { passive: true });
  document.addEventListener('pointerdown', montrer, { passive: true });
  window.addEventListener('scroll', () => { bulle.hidden = true; }, { passive: true });
}
