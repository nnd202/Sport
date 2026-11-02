// Interface de Sport : accueil, séance, récap, chrono, fenêtres de saisie.
import * as S from './store.js';
import { uid, duree, dureeSeance, dateCourte, kg, texteSerie, bilan, MESURES } from './calc.js';

const app = document.getElementById('app');
const flottant = document.getElementById('flottant');
const couche = document.getElementById('couche');
const toastEl = document.getElementById('toast');

const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const I = {
  retour: '<svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  moins: '<svg viewBox="0 0 24 24"><path d="M6 12h12"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  croix: '<svg viewBox="0 0 24 24"><path d="M7 7l10 10M17 7L7 17"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5z" class="plein"/></svg>',
  stop: '<svg viewBox="0 0 24 24"><rect x="7" y="7" width="10" height="10" rx="2" class="plein"/></svg>',
  haut: '<svg viewBox="0 0 24 24"><path d="M6 15l6-6 6 6"/></svg>',
  bas: '<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>',
  menu: '<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.6" class="plein"/><circle cx="12" cy="12" r="1.6" class="plein"/><circle cx="19" cy="12" r="1.6" class="plein"/></svg>',
  ecran: '<svg viewBox="0 0 24 24"><rect x="7" y="3" width="10" height="18" rx="2.5"/><path d="M11 18h2"/></svg>',
  partage: '<svg viewBox="0 0 24 24"><path d="M12 15V4M8 8l4-4 4 4"/><path d="M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"/></svg>',
  chrono: '<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="7.5"/><path d="M12 13V9.5M10 3h4"/></svg>',
  poignee: '<svg viewBox="0 0 24 24"><circle cx="9" cy="6" r="1.5" class="plein"/><circle cx="15" cy="6" r="1.5" class="plein"/><circle cx="9" cy="12" r="1.5" class="plein"/><circle cx="15" cy="12" r="1.5" class="plein"/><circle cx="9" cy="18" r="1.5" class="plein"/><circle cx="15" cy="18" r="1.5" class="plein"/></svg>',
};

// Palettes à l'essai : toujours en nuances (dégradé), jamais en aplat.
const COULEURS = {
  C1: { nom: 'Lagon', a: '#62d2c4', b: '#2b97b3' },
  C6: { nom: 'Pétrole', a: '#5cbcb0', b: '#226b7a' },
};

let recapAOuvrir = null;
const couleur = () => 'C1';
const appliquerCouleur = () => { document.documentElement.dataset.couleur = couleur(); };

// --- Zone visible : les fenêtres suivent le clavier et les barres du navigateur ----

function suivreZoneVisible() {
  const vv = window.visualViewport;
  const maj = () => {
    const h = vv ? vv.height : window.innerHeight;
    const top = vv ? vv.offsetTop : 0;
    const r = document.documentElement.style;
    r.setProperty('--vv-h', `${h}px`);
    r.setProperty('--vv-top', `${top}px`);
    // Clavier ouvert : la zone visible est nettement plus petite que la fenêtre.
    document.body.classList.toggle('clavier', !!vv && window.innerHeight - h > 150);
  };
  maj();
  vv?.addEventListener('resize', maj);
  vv?.addEventListener('scroll', maj);
  window.addEventListener('resize', maj);
}

// --- Navigation ---------------------------------------------------------------------

function route() {
  fermer();
  const h = location.hash || '#/';
  if (h.startsWith('#/seance') && S.seanceEnCours()) return vueSeance();
  const m = h.match(/^#\/recap\/(.+)$/);
  if (m && S.seance(m[1])) return vueRecap(S.seance(m[1]));
  return vueAccueil();
}

function aller(h) {
  if (location.hash === h) route(); else location.hash = h;
}

// --- Accueil ------------------------------------------------------------------------

function joursDepuis(iso) {
  return Math.round((new Date().setHours(12, 0, 0, 0) - new Date(`${iso}T12:00:00`)) / 864e5);
}

function vueAccueil() {
  gererVeille();
  flottant.innerHTML = '';
  const p = S.programmeEnCours();
  const faites = S.seancesDe(p.id);
  const enCours = S.seanceEnCours();

  app.innerHTML = `
    <header class="bandeau-tete">
      <div class="bandeau-ligne">
        <div class="bandeau-titre"><small>Programme en cours</small><h1>${esc(p.nom)}</h1></div>
        <button class="btn-icone sur-couleur" data-action="sauvegarder" aria-label="Sauvegarder">${I.partage}</button>
      </div>
      <div class="bandeau-chiffres">
        <span><b>${faites.length}</b> séance${faites.length > 1 ? 's' : ''}</span>
        <span>${p.debut ? `depuis le ${dateCourte(p.debut)}` : 'pas encore commencé'}</span>
      </div>
    </header>

    ${enCours ? `
      <h3 class="titre-section">Séance en cours</h3>
      <button class="split encours" data-action="reprendre" style="--c:${enCours.couleur}">
        <span class="split-texte"><strong>${esc(enCours.nom)}</strong><small>${enCours.debut ? `${bilan(enCours).faites}/${bilan(enCours).series} séries · ${kg(Math.round(bilan(enCours).tonnage))} kg` : 'Ouverte, pas commencée'}</small></span>
        <span class="encours-temps" data-temps-seance>${enCours.debut ? duree((Date.now() - new Date(enCours.debut)) / 1000) : 'Reprendre'}</span>
      </button>` : ''}

    <h3 class="titre-section">Splits</h3>
    <ul class="pool" data-liste="splits">
      ${p.splits.map((sp) => {
        const der = S.derniereDuSplit(p.id, sp.id);
        const j = der ? joursDepuis(der.date) : null;
        return `
        <li class="split" data-id="${sp.id}" style="--c:${sp.couleur}">
          <span class="poignee" data-glisser aria-label="Déplacer">${I.poignee}</span>
          <span class="split-texte">
            <strong>${esc(sp.nom)}</strong>
            <small>${der ? `${dateCourte(der.date)} · ${j === 0 ? "aujourd'hui" : `il y a ${j} j`}` : 'Pas encore fait'}</small>
          </span>
          <button class="btn btn-petit" data-action="ouvrir" data-split="${sp.id}">Ouvrir</button>
        </li>`;
      }).join('')}
    </ul>

    <h3 class="titre-section">Séances terminées</h3>
    ${faites.length ? `<ul class="historique">
      ${faites.slice().reverse().map((s) => {
        const b = bilan(s);
        return `<li><button class="ligne-histo" data-action="recap" data-id="${s.id}" style="--c:${s.couleur}">
          <span class="histo-texte"><strong>${esc(s.nom)}</strong><small>${dateCourte(s.date)} · ${dureeSeance(b.dureeSec)}${s.ressenti ? ` · ressenti ${s.ressenti}/10` : ''}</small></span>
          <span class="histo-tonnage">${kg(Math.round(b.tonnage))} kg</span>
        </button></li>`;
      }).join('')}
    </ul>` : '<p class="vide">Tes séances terminées apparaîtront ici.</p>'}

    <div class="pied">
      <button class="lien discret" data-action="reinitialiser">Réinitialiser la démo</button>
    </div>`;

  if (recapAOuvrir) {
    const id = recapAOuvrir;
    recapAOuvrir = null;
    setTimeout(() => aller(`#/recap/${id}`), 0);
  }
}

// Glisser-déposer aimanté (splits de l'accueil et blocs de la séance).
// Les écouteurs sont sur la fenêtre : déplacer l'élément dans la page ne coupe pas le geste.
function activerGlisser(ev) {
  const poignee = ev.target.closest('[data-glisser]');
  if (!poignee) return;
  const item = poignee.closest('[data-id]');
  const liste = item?.parentElement;
  if (!liste?.dataset.liste) return;
  ev.preventDefault();
  item.classList.add('glisse');
  document.body.classList.add('en-glisse');
  let ty = 0;
  const centre = () => { const r = item.getBoundingClientRect(); return r.top - ty + r.height / 2; };
  const ecart = ev.clientY - centre();
  let derniereY = ev.clientY;
  let defile = 0;

  const placer = (y) => {
    const doigt = y - ecart;
    const voisins = [...liste.children];
    const i = voisins.indexOf(item);
    const prec = voisins[i - 1], suiv = voisins[i + 1];
    const animer = (fn) => {
      const avant = new Map(voisins.filter((x) => x !== item).map((x) => [x, x.getBoundingClientRect().top]));
      fn();
      for (const [x, t] of avant) {
        const d = t - x.getBoundingClientRect().top;
        if (!d) continue;
        x.style.transition = 'none';
        x.style.transform = `translateY(${d}px)`;
        x.getBoundingClientRect();
        x.style.transition = 'transform .18s ease';
        x.style.transform = '';
      }
    };
    if (prec && doigt < prec.getBoundingClientRect().top + prec.offsetHeight / 2) animer(() => liste.insertBefore(item, prec));
    else if (suiv && doigt > suiv.getBoundingClientRect().top + suiv.offsetHeight / 2) animer(() => liste.insertBefore(item, suiv.nextSibling));
    item.style.transition = 'none';
    item.style.transform = '';
    ty = 0;
    ty = doigt - centre();
    item.style.transform = `translateY(${ty}px)`;
  };
  // Défilement automatique près des bords de l'écran.
  const boucle = () => {
    if (!defile) return;
    window.scrollBy(0, defile);
    placer(derniereY);
    requestAnimationFrame(boucle);
  };
  const suivre = (e) => {
    derniereY = e.clientY;
    placer(e.clientY);
    const h = window.innerHeight;
    const avant = defile;
    defile = e.clientY < 70 ? -8 : e.clientY > h - 110 ? 8 : 0;
    if (defile && !avant) requestAnimationFrame(boucle);
  };
  const lacher = () => {
    defile = 0;
    window.removeEventListener('pointermove', suivre);
    window.removeEventListener('pointerup', lacher);
    window.removeEventListener('pointercancel', lacher);
    item.style.transition = 'transform .16s ease';
    item.style.transform = '';
    setTimeout(() => {
      item.classList.remove('glisse');
      item.style.transition = '';
      document.body.classList.remove('en-glisse');
    }, 170);
    const ids = [...liste.children].map((x) => x.dataset.id);
    if (liste.dataset.liste === 'splits') S.ordonnerSplits(S.programmeEnCours().id, ids);
    else {
      const s = S.seanceEnCours();
      s.blocs.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
      S.enregistrer();
    }
  };
  window.addEventListener('pointermove', suivre, { passive: true });
  window.addEventListener('pointerup', lacher);
  window.addEventListener('pointercancel', lacher);
}

// --- Séance -------------------------------------------------------------------------

const actifs = (b) => b.exos.filter((e) => !e.remplacePar);
function nbTours(b) { return Math.max(0, ...actifs(b).map((e) => e.series.length)); }
function blocFini(b) { return actifs(b).every((e) => e.series.length && e.series.every((x) => x.fait)); }

function valeurs(e, s) {
  const u = e.uni ? '<i>/côté</i>' : '';
  if (e.mesure === 'temps') return `<span class="v"><b>${s.sec ?? 0}</b> s${u}</span>`;
  if (e.mesure === 'pdc') return `<span class="v"><b>${s.reps ?? 0}</b> reps${u}</span>`;
  return `<span class="v v-kg"><b>${kg(s.kg ?? 0)}</b> kg</span><span class="v"><b>${s.reps ?? 0}</b> reps${u}</span>`;
}

function ligneSerie(b, e, si, numero) {
  const s = e.series[si];
  if (!s) return '';
  const change = s.prevu && texteSerie(e, s) !== texteSerie(e, s.prevu);
  return `
    <div class="serie ${s.fait ? 'faite' : ''}">
      <span class="serie-num">${numero}</span>
      <button class="serie-valeur" data-action="editer-serie" data-bloc="${b.id}" data-exo="${e.id}" data-i="${si}">
        ${valeurs(e, s)}${change ? '<span class="modifie" title="Différent du prévu"></span>' : ''}
      </button>
      ${pastilleRepos(b, e, si)}
      <button class="coche" data-action="cocher" data-bloc="${b.id}" data-exo="${e.id}" data-i="${si}" aria-label="Valider la série">${I.check}</button>
    </div>`;
}

// Le chrono se rattache à la dernière série validée d'un bloc déplié.
function ancreCourante(s) {
  let meilleure = null;
  for (const b of s.blocs) {
    if (b.replie) continue;
    for (const e of actifs(b)) e.series.forEach((x, i) => {
      if (x.fait && x.faitA && (!meilleure || x.faitA > meilleure.t)) meilleure = { bloc: b.id, exo: e.id, i, t: x.faitA };
    });
  }
  return meilleure;
}

const memeAncre = (a, b, e, si) => a && a.bloc === b.id && a.exo === e.id && a.i === si;

function pastilleRepos(b, e, si) {
  const s = S.seanceEnCours();
  if (!s) return '';
  if (s.chrono && memeAncre(s.chrono.ancre, b, e, si)) return '<span class="repos-pastille en-cours">repos…</span>';
  const k = s.repos.findIndex((r) => memeAncre(r.ancre, b, e, si));
  if (k < 0) return '';
  const r = s.repos[k];
  return `<button class="repos-pastille ${r.reel > r.prevu ? 'long' : ''}" data-action="repos" data-k="${k}">${duree(r.reel)}</button>`;
}

function etiquettes(e, s) {
  const t = [];
  if (e.uni) t.push('Unilatéral');
  if (e.remplace) {
    const r = s.blocs.flatMap((b) => b.exos).find((x) => x.id === e.remplace);
    t.push(`Remplace ${r ? r.nom : ''}`);
  }
  if (e.ponctuel) t.push('En plus');
  return t.map((x) => `<span class="etiquette">${esc(x)}</span>`).join('');
}

function resumeBloc(b) {
  let faites = 0, total = 0, ton = 0;
  for (const e of actifs(b)) for (const x of e.series) {
    total++;
    if (x.fait) { faites++; if (e.mesure === 'charge') ton += (x.kg || 0) * (x.reps || 0) * (e.uni ? 2 : 1); }
  }
  return `${faites}/${total}${ton ? ` · ${kg(Math.round(ton))} kg` : ''}`;
}

function carteBloc(s, b) {
  const tous = s.blocs.flatMap((x) => x.exos);
  const poignee = `<span class="poignee" data-glisser aria-label="Déplacer">${I.poignee}</span>`;
  if (!actifs(b).length) {
    return `
    <article class="bloc remplace" data-id="${b.id}">
      ${poignee}
      <p>${b.exos.map((e) => `<s>${esc(e.nom)}</s> → ${esc(tous.find((x) => x.id === e.remplacePar)?.nom || '')}`).join('<br>')}</p>
    </article>`;
  }
  const exos = actifs(b);
  const multi = exos.length > 1;
  const fini = blocFini(b);
  const titres = exos.map((e) => `
    <div class="exo-titre">
      <button class="exo-nom" data-action="editer-exo" data-bloc="${b.id}" data-exo="${e.id}">${esc(e.nom)}</button>
      ${b.replie ? '' : etiquettes(e, s)}
    </div>
    ${e.note && !b.replie ? `<p class="exo-note">${esc(e.note)}</p>` : ''}`).join('');

  const tete = `
    <div class="bloc-tete">
      ${poignee}
      <div class="bloc-titres">${titres}</div>
      <button class="bloc-plier" data-action="plier" data-bloc="${b.id}" aria-label="${b.replie ? 'Déplier' : 'Replier'}" aria-expanded="${!b.replie}">
        ${b.replie ? `<span class="bloc-resume ${fini ? 'fini' : ''}">${fini ? I.check : ''}${resumeBloc(b)}</span>` : `<span class="bloc-repos">${I.chrono}${duree(b.repos)}</span>`}
        <span class="chevron">${b.replie ? I.bas : I.haut}</span>
      </button>
    </div>`;

  if (b.replie) return `<article class="bloc replie ${fini ? 'fini' : ''}" data-id="${b.id}">${tete}</article>`;

  const series = multi
    ? Array.from({ length: nbTours(b) }, (_, t) => `<div class="tour">${exos.map((e, i) => ligneSerie(b, e, t, i === 0 ? t + 1 : '')).join('')}</div>`).join('')
    : `<div class="tour">${exos[0].series.map((_, i) => ligneSerie(b, exos[0], i, i + 1)).join('')}</div>`;

  return `
    <article class="bloc ${multi ? 'multi' : ''}" data-id="${b.id}">
      ${tete}
      <div class="series">${series}</div>
      <div class="bloc-pied">
        <button data-action="retirer-serie" data-bloc="${b.id}">${I.moins} série</button>
        <button data-action="ajouter-serie" data-bloc="${b.id}">${I.plus} série</button>
      </div>
    </article>`;
}

function vueSeance() {
  const s = S.seanceEnCours();
  if (!s) return aller('#/');
  gererVeille();
  const b = bilan(s);
  const r = S.get().reglages;
  app.innerHTML = `
    <header class="bandeau-tete seance" style="--c:${s.couleur}">
      <div class="bandeau-ligne">
        <button class="btn-icone sur-couleur" data-action="accueil" aria-label="Accueil">${I.retour}</button>
        <div class="bandeau-titre"><h1>${esc(s.nom)}</h1>
          <small>${s.debut ? `${dateCourte(s.date)} · <span data-temps-seance>${duree(b.dureeSec)}</span>` : 'Pas commencée'}</small></div>
        <button class="btn-icone sur-couleur ${r.antiVeille ? 'actif' : ''}" data-action="veille" aria-label="Garder l'écran allumé" aria-pressed="${r.antiVeille}">${I.ecran}</button>
        <button class="btn-icone sur-couleur" data-action="menu-seance" aria-label="Plus d'actions">${I.menu}</button>
      </div>
      ${s.debut ? `
        <div class="progression"><span style="width:${b.series ? (b.faites / b.series) * 100 : 0}%"></span></div>
        <div class="bandeau-chiffres"><span><b>${b.faites}</b>/${b.series} séries</span><span><b>${kg(Math.round(b.tonnage))}</b> kg</span></div>`
      : `<button class="btn-demarrer" data-action="lancer">${I.play} Démarrer la séance</button>`}
    </header>
    ${s.debut ? '' : '<p class="aide centre">Ajuste ce que tu veux avant : le temps ne part qu\'au démarrage.</p>'}

    <div class="blocs" data-liste="blocs">${s.blocs.map((bl) => carteBloc(s, bl)).join('')}</div>

    <button class="ajout" data-action="ajouter-exo">${I.plus} Ajouter un exercice</button>
    ${s.debut ? '<button class="btn btn-principal btn-large" data-action="terminer">Terminer la séance</button>' : ''}
    <div class="espace-chrono"></div>`;
  dessinerChrono();
}

function trouver(s, blocId, exoId) {
  const b = s.blocs.find((x) => x.id === blocId);
  return { b, e: b?.exos.find((x) => x.id === exoId) };
}

// --- Récap d'une séance terminée ---------------------------------------------------

function vueRecap(s) {
  flottant.innerHTML = '';
  const b = bilan(s);
  const tous = s.blocs.flatMap((x) => x.exos);
  app.innerHTML = `
    <header class="bandeau-tete seance" style="--c:${s.couleur}">
      <div class="bandeau-ligne">
        <button class="btn-icone sur-couleur" data-action="accueil" aria-label="Accueil">${I.retour}</button>
        <div class="bandeau-titre"><h1>${esc(s.nom)}</h1><small>${dateCourte(s.date)} · terminée</small></div>
      </div>
    </header>
    <div class="tuiles">
      <div class="tuile"><small>Durée</small><strong>${dureeSeance(b.dureeSec)}</strong></div>
      <div class="tuile"><small>Tonnage</small><strong>${kg(Math.round(b.tonnage))} kg</strong></div>
      <div class="tuile"><small>Séries</small><strong>${b.faites}/${b.series}</strong></div>
      <div class="tuile"><small>Ressenti</small><strong>${s.ressenti ? `${s.ressenti}/10` : '–'}</strong></div>
      <div class="tuile large"><small>Repos moyen</small><strong>${b.nbRepos ? `${duree(b.reposMoyen)} <em>prévu ${duree(b.reposPrevuMoyen)} · ${b.nbRepos} repos</em>` : '<em>Chrono non utilisé</em>'}</strong></div>
    </div>
    ${s.note ? `<p class="note-seance">${esc(s.note)}</p>` : ''}
    <div class="recap">
      ${s.blocs.map((bl) => bl.exos.map((e) => {
        if (e.remplacePar) return `<div class="recap-exo remplace"><s>${esc(e.nom)}</s> → ${esc(tous.find((x) => x.id === e.remplacePar)?.nom || '')}</div>`;
        const ton = e.mesure === 'charge' ? e.series.reduce((a, x) => a + (x.fait ? (x.kg || 0) * (x.reps || 0) * (e.uni ? 2 : 1) : 0), 0) : 0;
        return `
        <div class="recap-exo">
          <div class="recap-tete"><strong>${esc(e.nom)}</strong>${etiquettes(e, s)}${ton ? `<span class="recap-ton">${kg(Math.round(ton))} kg</span>` : ''}</div>
          ${e.note ? `<p class="exo-note">${esc(e.note)}</p>` : ''}
          <div class="recap-series">${e.series.map((x, i) => `<span class="${x.fait ? '' : 'non-faite'}">${i + 1}. ${texteSerie(e, x)}</span>`).join('')}</div>
        </div>`;
      }).join('')).join('')}
    </div>
    <div class="pied"><button class="lien danger" data-action="supprimer-seance" data-id="${s.id}">Supprimer cette séance</button></div>`;
  window.scrollTo(0, 0);
}

// --- Chrono -------------------------------------------------------------------------

function blocCourant(s) {
  if (s.chrono?.blocId) return s.blocs.find((b) => b.id === s.chrono.blocId);
  if (s.dernierBloc) return s.blocs.find((b) => b.id === s.dernierBloc) || s.blocs.find((b) => !blocFini(b));
  return s.blocs.find((b) => !blocFini(b) && actifs(b).length) || s.blocs[0];
}

function dessinerChrono() {
  const s = S.seanceEnCours();
  if (!s || !location.hash.startsWith('#/seance')) { flottant.innerHTML = ''; return; }
  const a = ancreCourante(s);
  const b = s.chrono ? s.blocs.find((x) => x.id === s.chrono.blocId) : (a ? s.blocs.find((x) => x.id === a.bloc) : blocCourant(s));
  const marche = !!s.chrono;
  flottant.innerHTML = `
    <div class="chrono ${marche ? 'marche' : ''}">
      <div class="chrono-info"><small>Repos</small><span>prévu ${duree(b?.repos || 0)}</span></div>
      <div class="chrono-temps" data-chrono>${chronoTexte(marche ? Date.now() - s.chrono.depart : 0)}</div>
      <button class="chrono-btn" data-action="chrono" aria-label="${marche ? 'Arrêter' : 'Démarrer'} le chrono">${marche ? I.stop : I.play}</button>
    </div>`;
  if (marche) requestAnimationFrame(boucleChrono);
}

// Garde-fous : un arrêt sous 5 s est ignoré (double toucher) ; relancer moins de 10 s
// après un arrêt reprend le même repos (arrêt par erreur). Chaque repos est rattaché à la
// série validée juste avant et s'affiche sous elle : une erreur se voit et se corrige.
const MIN_REPOS = 5, REPRISE = 10;

function basculerChrono() {
  const s = S.seanceEnCours();
  if (!s) return;
  if (!s.debut) { S.lancer(s); vueSeance(); }
  if (!s.chrono) {
    const der = s.repos[s.repos.length - 1];
    if (der && s.dernierArret && Date.now() - s.dernierArret < REPRISE * 1000 && der.depart) {
      s.repos.pop();
      s.chrono = { depart: der.depart, blocId: der.blocId, ancre: der.ancre };
      toast('Repos repris');
    } else {
      const b = blocCourant(s);
      const ancre = ancreCourante(s);
      s.chrono = { depart: Date.now(), blocId: ancre?.bloc || b?.id || null, ancre };
    }
  } else {
    const reel = Math.round((Date.now() - s.chrono.depart) / 1000);
    const b = s.blocs.find((x) => x.id === s.chrono.blocId);
    if (reel < MIN_REPOS) {
      toast('Moins de 5 s : pas enregistré');
    } else {
      s.repos.push({ blocId: s.chrono.blocId, ancre: s.chrono.ancre, depart: s.chrono.depart, prevu: b?.repos || 0, reel, a: new Date().toISOString() });
      s.dernierArret = Date.now();
    }
    s.chrono = null;
  }
  S.enregistrer();
  vueSeance();
}

function fenetreRepos(s, index) {
  const r = s.repos[index];
  const ecart = r.reel - r.prevu;
  ouvrirFenetre(`
    <h2>Repos ${duree(r.reel)} <small>prévu ${duree(r.prevu)}</small></h2>
    <p class="aide">${ecart > 0 ? `${duree(ecart)} de plus que prévu.` : ecart < 0 ? `${duree(-ecart)} de moins que prévu.` : 'Pile le temps prévu.'} Supprime-le s'il vient d'une erreur de chrono : il ne comptera pas dans les stats.</p>
    <button class="btn btn-large" data-f="ok">Garder</button>
    <div class="actions-sec"><button class="lien danger" data-f="suppr">Supprimer ce repos</button></div>`);
  couche.querySelector('[data-f="ok"]').onclick = fermer;
  couche.querySelector('[data-f="suppr"]').onclick = () => { s.repos.splice(index, 1); s.dernierArret = null; S.enregistrer(); fermer(); vueSeance(); };
}

const chronoTexte = (ms) => {
  const cs = Math.floor(ms / 10) % 100;
  return `${duree(Math.floor(ms / 1000))}<span class="centiemes">,${String(cs).padStart(2, '0')}</span>`;
};

function boucleChrono() {
  const s = S.seanceEnCours();
  const c = document.querySelector('[data-chrono]');
  if (!s?.chrono || !c) return;
  const ms = Date.now() - s.chrono.depart;
  c.innerHTML = chronoTexte(ms);
  const b = s.blocs.find((x) => x.id === s.chrono.blocId);
  c.classList.toggle('depasse', !!b && ms / 1000 > b.repos);
  requestAnimationFrame(boucleChrono);
}

function tic() {
  const s = S.seanceEnCours();
  if (!s || !s.debut) return;
  const t = duree((Date.now() - new Date(s.debut)) / 1000);
  document.querySelectorAll('[data-temps-seance]').forEach((el) => { el.textContent = t; });
}

// --- Écran allumé (option) ----------------------------------------------------------

let verrou = null;
async function gererVeille() {
  const voulu = S.get().reglages.antiVeille && !!S.seanceEnCours() && location.hash.startsWith('#/seance');
  try {
    if (voulu && !verrou && 'wakeLock' in navigator && document.visibilityState === 'visible') {
      verrou = await navigator.wakeLock.request('screen');
      verrou.addEventListener('release', () => { verrou = null; });
    } else if (!voulu && verrou) {
      await verrou.release();
      verrou = null;
    }
  } catch { verrou = null; }
}

// --- Fenêtres -----------------------------------------------------------------------

function ouvrirFenetre(html, onSubmit) {
  couche.innerHTML = `<div class="fenetre" role="dialog" aria-modal="true"><div class="poignee-fenetre"></div>${html}</div>`;
  couche.hidden = false;
  document.body.classList.add('fige');
  couche.onclick = (ev) => { if (ev.target === couche) fermer(); };
  const f = couche.querySelector('form');
  if (f && onSubmit) f.onsubmit = (ev) => { ev.preventDefault(); onSubmit(new FormData(f), f); };
}

function fermer() {
  couche.hidden = true;
  couche.innerHTML = '';
  document.body.classList.remove('fige');
}

let toastMinuteur;
function toast(t) {
  toastEl.textContent = t;
  toastEl.hidden = false;
  clearTimeout(toastMinuteur);
  toastMinuteur = setTimeout(() => { toastEl.hidden = true; }, 2600);
}

const num = (v) => {
  const n = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

function stepper(nom, libelle, valeur, pas, unite) {
  return `
    <div class="stepper">
      <span class="stepper-lib">${libelle}</span>
      <div class="stepper-ligne">
        <button type="button" class="btn-icone" data-pas="-${pas}" data-champ="${nom}" aria-label="Moins">${I.moins}</button>
        <label class="stepper-champ"><input name="${nom}" inputmode="decimal" value="${String(valeur ?? 0).replace('.', ',')}" autocomplete="off"><span>${unite}</span></label>
        <button type="button" class="btn-icone" data-pas="${pas}" data-champ="${nom}" aria-label="Plus">${I.plus}</button>
      </div>
    </div>`;
}

function champsMesure(mesure, v) {
  if (mesure === 'temps') return stepper('sec', 'Durée', v.sec, 5, 's');
  if (mesure === 'pdc') return stepper('reps', 'Répétitions', v.reps, 1, 'reps');
  return `<div class="deux">${stepper('kg', 'Charge', v.kg, 2.5, 'kg')}${stepper('reps', 'Répétitions', v.reps, 1, 'reps')}</div>`;
}

function lireMesure(fd, mesure) {
  if (mesure === 'temps') return { sec: Math.max(0, Math.round(num(fd.get('sec')))) };
  if (mesure === 'pdc') return { reps: Math.max(0, Math.round(num(fd.get('reps')))) };
  return { kg: Math.max(0, num(fd.get('kg'))), reps: Math.max(0, Math.round(num(fd.get('reps')))) };
}

couche.addEventListener('click', (ev) => {
  const p = ev.target.closest('[data-pas]');
  if (p) {
    const input = couche.querySelector(`[name="${p.dataset.champ}"]`);
    const v = Math.max(0, Math.round((num(input.value) + num(p.dataset.pas)) * 100) / 100);
    input.value = String(v).replace('.', ',');
    return;
  }
  const choix = ev.target.closest('[data-choix]');
  if (choix) {
    const groupe = choix.closest('[data-groupe]');
    groupe.querySelectorAll('[data-choix]').forEach((x) => x.classList.toggle('choisi', x === choix));
    const cache = groupe.querySelector('input[type=hidden]');
    if (cache) { cache.value = choix.dataset.choix; cache.dispatchEvent(new Event('change', { bubbles: true })); }
  }
});

function fenetreSerie(s, blocId, exoId, i) {
  const { e } = trouver(s, blocId, exoId);
  const v = e.series[i];
  ouvrirFenetre(`
    <form>
      <h2>${esc(e.nom)} <small>série ${i + 1}</small></h2>
      ${v.prevu ? `<p class="aide">Prévu : ${texteSerie(e, v.prevu)}${e.uni ? ' par côté' : ''}</p>` : ''}
      ${champsMesure(e.mesure, v)}
      <button class="btn btn-principal btn-large">${v.fait ? 'Enregistrer' : 'Valider la série'}</button>
      <div class="actions-sec">
        ${v.fait ? '<button type="button" class="lien" data-f="defaire">Marquer non faite</button>' : ''}
        <button type="button" class="lien danger" data-f="supprimer">Retirer cette série</button>
      </div>
    </form>`, (fd) => {
    if (!v.fait) v.faitA = Date.now();
    Object.assign(v, lireMesure(fd, e.mesure), { fait: true });
    s.dernierBloc = blocId;
    if (!s.debut) S.lancer(s);
    S.enregistrer(); fermer(); vueSeance();
  });
  couche.querySelector('[data-f="supprimer"]').onclick = () => {
    e.series.splice(i, 1);
    S.enregistrer(); fermer(); vueSeance();
    toast('Série retirée');
  };
  const d = couche.querySelector('[data-f="defaire"]');
  if (d) d.onclick = () => { v.fait = false; delete v.faitA; S.enregistrer(); fermer(); vueSeance(); };
}

function choixMesure(actuelle) {
  return `
    <div class="choix" data-groupe>
      <input type="hidden" name="mesure" value="${actuelle}">
      ${Object.entries(MESURES).map(([k, l]) => `<button type="button" class="puce ${k === actuelle ? 'choisi' : ''}" data-choix="${k}">${l}</button>`).join('')}
    </div>`;
}

function fenetreExo(s, blocId, exoId) {
  const { b, e } = trouver(s, blocId, exoId);
  ouvrirFenetre(`
    <form>
      <h2>Modifier l'exercice</h2>
      <p class="aide">Pour cette séance seulement : le modèle du split ne change pas.</p>
      <label class="champ"><span>Nom</span><input name="nom" value="${esc(e.nom)}" required></label>
      ${choixMesure(e.mesure)}
      <label class="interrupteur"><input type="checkbox" name="uni" ${e.uni ? 'checked' : ''}><span></span>Unilatéral (valeurs par côté)</label>
      <label class="champ"><span>Note</span><textarea name="note" rows="2" placeholder="Bras opposé en tension, demi-reps en fin de série…">${esc(e.note)}</textarea></label>
      <button class="btn btn-principal btn-large">Enregistrer</button>
      ${e.remplace || e.ponctuel ? '<div class="actions-sec"><button type="button" class="lien danger" data-f="retirer">Retirer cet exercice</button></div>' : ''}
    </form>`, (fd) => {
    const mesure = fd.get('mesure');
    if (mesure !== e.mesure) e.series.forEach((x) => { if (mesure === 'temps' && x.sec == null) x.sec = 30; if (mesure !== 'temps' && x.reps == null) x.reps = 10; if (mesure === 'charge' && x.kg == null) x.kg = 0; });
    Object.assign(e, { nom: fd.get('nom').trim() || e.nom, mesure, uni: fd.get('uni') === 'on', note: fd.get('note').trim() });
    S.enregistrer(); fermer(); vueSeance();
  });
  const r = couche.querySelector('[data-f="retirer"]');
  if (r) r.onclick = () => {
    s.blocs.flatMap((x) => x.exos).forEach((x) => { if (x.remplacePar === e.id) delete x.remplacePar; });
    b.exos = b.exos.filter((x) => x.id !== e.id);
    if (!b.exos.length) s.blocs = s.blocs.filter((x) => x.id !== b.id);
    S.enregistrer(); fermer(); vueSeance();
  };
}

function fenetreAjout(s) {
  const candidats = s.blocs.flatMap((b) => b.exos.filter((e) => !e.remplace && !e.ponctuel && !e.remplacePar && !e.series.every((x) => x.fait)));
  ouvrirFenetre(`
    <form>
      <h2>Ajouter un exercice</h2>
      <label class="champ"><span>Exercice</span><input name="nom" required placeholder="Fentes marchées" autocomplete="off"></label>
      ${choixMesure('charge')}
      <div data-mesure-champs>${champsMesure('charge', { kg: 20, reps: 10 })}</div>
      <div class="deux">${stepper('nb', 'Séries faites', 3, 1, '')}
        <label class="interrupteur bas"><input type="checkbox" name="uni"><span></span>Unilatéral</label></div>
      <input type="hidden" name="mode" value="">
      <p class="titre-choix">Cet exercice…</p>
      <button class="btn btn-large" data-mode="plus">vient en plus</button>
      ${candidats.length ? `<p class="titre-choix">…ou remplace :</p>
        <div class="choix">${candidats.map((e) => `<button class="puce remplace" data-mode="r:${e.id}">${esc(e.nom)}</button>`).join('')}</div>` : ''}
    </form>`, (fd) => {
    const mode = fd.get('mode');
    const mesure = fd.get('mesure');
    const val = lireMesure(fd, mesure);
    const nb = Math.max(1, Math.round(num(fd.get('nb'))));
    const exo = {
      id: uid('e'), src: null, nom: fd.get('nom').trim(), mesure, uni: fd.get('uni') === 'on', note: '',
      series: Array.from({ length: nb }, () => ({ prevu: null, ...val, fait: true, faitA: Date.now() })),
    };
    const bloc = { id: uid('b'), src: null, repos: 60, exos: [exo] };
    if (mode.startsWith('r:')) {
      exo.remplace = mode.slice(2);
      const cible = s.blocs.flatMap((b) => b.exos).find((x) => x.id === exo.remplace);
      if (cible) cible.remplacePar = exo.id;
      bloc.repos = s.blocs.find((b) => b.exos.some((x) => x.id === exo.remplace))?.repos || 60;
    } else {
      exo.ponctuel = true;
    }
    s.blocs.push(bloc);
    s.dernierBloc = bloc.id;
    if (!s.debut) S.lancer(s);
    S.enregistrer(); fermer(); vueSeance();
    toast(exo.remplace ? 'Ajouté en remplacement' : 'Ajouté en plus');
  });
  const f = couche.querySelector('form');
  f.querySelectorAll('[data-mode]').forEach((btn) => btn.addEventListener('click', () => { f.elements.mode.value = btn.dataset.mode; }));
  f.elements.mesure.addEventListener('change', () => {
    f.querySelector('[data-mesure-champs]').innerHTML = champsMesure(f.elements.mesure.value, { kg: 20, reps: 10, sec: 30 });
  });
  setTimeout(() => f.elements.nom.focus(), 60);
}

function fenetreFin(s) {
  const b = bilan(s);
  const restantes = b.series - b.faites;
  ouvrirFenetre(`
    <form>
      <h2>Terminer la séance</h2>
      ${restantes ? `<p class="aide">${restantes} série${restantes > 1 ? 's' : ''} non validée${restantes > 1 ? 's' : ''} : elle${restantes > 1 ? 's' : ''} ne compte${restantes > 1 ? 'nt' : ''} pas.</p>` : ''}
      <p class="titre-choix">Ressenti</p>
      <div class="choix ressenti" data-groupe>
        <input type="hidden" name="ressenti" value="">
        ${Array.from({ length: 10 }, (_, i) => `<button type="button" class="puce" data-choix="${i + 1}">${i + 1}</button>`).join('')}
      </div>
      <div class="ressenti-legende"><span>KO</span><span>En forme</span></div>
      <label class="champ"><span>Note</span><textarea name="note" rows="2" placeholder="Fatigué, machine prise…"></textarea></label>
      <button class="btn btn-principal btn-large">Enregistrer la séance</button>
    </form>`, (fd) => {
    if (s.chrono) basculerChrono();
    S.terminer(s, { ressenti: parseInt(fd.get('ressenti'), 10) || null, note: fd.get('note').trim() });
    recapAOuvrir = s.id;
    aller('#/');
  });
}

// Confirmation sans boîte de dialogue du navigateur : un second toucher confirme.
function confirmerDeux(btn) {
  if (btn.dataset.arme) return true;
  btn.dataset.arme = '1';
  const t = btn.textContent;
  btn.textContent = 'Toucher encore pour confirmer';
  setTimeout(() => { delete btn.dataset.arme; btn.textContent = t; }, 3000);
  return false;
}

function fenetreMenuSeance(s) {
  ouvrirFenetre(`
    <h2>${esc(s.nom)}</h2>
    <div class="deux">
      <button class="btn" data-f="replier">Tout replier</button>
      <button class="btn" data-f="deplier">Tout déplier</button>
    </div>
    <p class="aide">Pour changer l'ordre des blocs, attrape la poignée ⠿ à gauche d'un bloc.</p>
    <div class="actions-sec"><button class="lien danger" data-f="abandon">${s.debut ? 'Abandonner la séance' : 'Fermer sans démarrer'}</button></div>`);
  const tous = (v) => () => { s.blocs.forEach((b) => { b.replie = v; }); S.enregistrer(); fermer(); vueSeance(); };
  couche.querySelector('[data-f="replier"]').onclick = tous(true);
  couche.querySelector('[data-f="deplier"]').onclick = tous(false);
  couche.querySelector('[data-f="abandon"]').onclick = (ev) => {
    if (!s.debut || confirmerDeux(ev.currentTarget)) { S.abandonner(s); fermer(); aller('#/'); }
  };
}

// --- Sauvegarde par le menu de partage ----------------------------------------------

async function sauvegarder() {
  const nom = S.nomSauvegarde();
  const fichier = new File([S.contenuSauvegarde()], nom, { type: 'text/plain' });
  try {
    if (navigator.canShare?.({ files: [fichier] })) {
      await navigator.share({ files: [fichier], title: nom });
      toast('Sauvegarde partagée');
      return;
    }
  } catch (e) {
    if (e?.name === 'AbortError') return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(fichier);
  a.download = nom;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast('Sauvegarde téléchargée');
}

// --- Actions ------------------------------------------------------------------------

app.addEventListener('pointerdown', activerGlisser);

app.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-action]');
  if (!el) return;
  const s = S.seanceEnCours();
  const d = el.dataset;
  switch (d.action) {
    case 'accueil': return aller('#/');
    case 'reprendre': return aller('#/seance');
    case 'sauvegarder': return sauvegarder();
    case 'couleur':
      S.get().reglages.couleur = d.couleur;
      S.enregistrer();
      appliquerCouleur();
      return vueAccueil();
    case 'reinitialiser':
      if (confirmerDeux(el)) { const c = couleur(); S.reinitialiser(); S.get().reglages.couleur = c; S.enregistrer(); vueAccueil(); toast('Démo réinitialisée'); }
      return;
    case 'recap': return aller(`#/recap/${d.id}`);
    case 'supprimer-seance':
      if (confirmerDeux(el)) { S.supprimerSeance(d.id); aller('#/'); toast('Séance supprimée'); }
      return;
    case 'ouvrir':
      if (s) {
        if (s.splitId === d.split) return aller('#/seance');
        return toast(s.debut ? "Termine d'abord la séance en cours" : `${s.nom} est déjà ouverte : ferme-la d'abord`);
      }
      S.ouvrir(S.programmeEnCours().id, d.split);
      return aller('#/seance');
    case 'lancer': S.lancer(s); return vueSeance();
    case 'veille': {
      const r = S.get().reglages;
      r.antiVeille = !r.antiVeille;
      S.enregistrer();
      if (r.antiVeille && !('wakeLock' in navigator)) toast("Ce navigateur ne peut pas garder l'écran allumé");
      else toast(r.antiVeille ? 'Écran gardé allumé' : 'Mise en veille normale');
      return vueSeance();
    }
    case 'menu-seance': return fenetreMenuSeance(s);
    case 'plier': {
      const b = s.blocs.find((x) => x.id === d.bloc);
      b.replie = !b.replie;
      S.enregistrer();
      return vueSeance();
    }
    case 'cocher': {
      const { e } = trouver(s, d.bloc, d.exo);
      const v = e.series[+d.i];
      v.fait = !v.fait;
      if (v.fait) { v.faitA = Date.now(); s.dernierBloc = d.bloc; if (!s.debut) S.lancer(s); } else delete v.faitA;
      S.enregistrer();
      return vueSeance();
    }
    case 'repos': return fenetreRepos(s, +d.k);
    case 'editer-serie': return fenetreSerie(s, d.bloc, d.exo, +d.i);
    case 'editer-exo': return fenetreExo(s, d.bloc, d.exo);
    case 'ajouter-serie': {
      const b = s.blocs.find((x) => x.id === d.bloc);
      actifs(b).forEach((e) => {
        const der = e.series[e.series.length - 1] || {};
        e.series.push({ prevu: null, kg: der.kg, reps: der.reps, sec: der.sec, fait: false });
      });
      S.enregistrer();
      return vueSeance();
    }
    case 'retirer-serie': {
      // Retire la dernière série non faite ; sinon la dernière tout court.
      const b = s.blocs.find((x) => x.id === d.bloc);
      let retire = false;
      actifs(b).forEach((e) => {
        if (!e.series.length) return;
        const i = e.series.map((x) => x.fait).lastIndexOf(false);
        e.series.splice(i >= 0 ? i : e.series.length - 1, 1);
        retire = true;
      });
      if (retire) { S.enregistrer(); vueSeance(); toast('Série retirée'); }
      return;
    }
    case 'ajouter-exo': return fenetreAjout(s);
    case 'terminer': return fenetreFin(s);
  }
});

flottant.addEventListener('click', (ev) => {
  if (ev.target.closest('[data-action="chrono"]')) basculerChrono();
});

document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { gererVeille(); tic(); } });
window.addEventListener('hashchange', route);
document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && !couche.hidden) fermer(); });

appliquerCouleur();
suivreZoneVisible();
route();
setInterval(tic, 250);

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
