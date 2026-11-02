// Interface de Sport : accueil, séance, récap, chrono, fenêtres de saisie.
import * as S from './store.js';
import { uid, duree, dureeSeance, dateCourte, kg, texteSerie, bilan, MESURES, aujourdhui } from './calc.js';
import { COULEURS_SPLITS } from './demo.js';
import * as X from './export.js';
import * as ST from './stats.js';
import * as G from './graph.js';

const majuscule = (t) => { t = String(t || '').trim(); return t.charAt(0).toUpperCase() + t.slice(1); };

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
  droite: '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
  crayon: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>',
  liste: '<svg viewBox="0 0 24 24"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1.2" class="plein"/><circle cx="4.5" cy="12" r="1.2" class="plein"/><circle cx="4.5" cy="18" r="1.2" class="plein"/></svg>',
  reglages: '<svg viewBox="0 0 24 24"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>',
  calendrier: '<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="2.5"/><path d="M4 10h16M9 3v4M15 3v4"/></svg>',
  stats: '<svg viewBox="0 0 24 24"><path d="M5 20V11M12 20V5M19 20v-6"/></svg>',
  regle: '<svg viewBox="0 0 24 24"><rect x="3" y="8" width="18" height="8" rx="2"/><path d="M7 8v3M11 8v4M15 8v3M19 8v2"/></svg>',
  poignee: '<svg viewBox="0 0 24 24"><circle cx="9" cy="6" r="1.5" class="plein"/><circle cx="15" cy="6" r="1.5" class="plein"/><circle cx="9" cy="12" r="1.5" class="plein"/><circle cx="15" cy="12" r="1.5" class="plein"/><circle cx="9" cy="18" r="1.5" class="plein"/><circle cx="15" cy="18" r="1.5" class="plein"/></svg>',
};

// Palettes à l'essai : toujours en nuances (dégradé), jamais en aplat.
const COULEURS = {
  C1: { nom: 'Lagon', a: '#62d2c4', b: '#2b97b3' },
  C6: { nom: 'Pétrole', a: '#5cbcb0', b: '#226b7a' },
};

let recapAOuvrir = null;
// Séance affichée : la modification d'une séance passée (#/edition) ou la séance en cours.
const active = () => (location.hash.startsWith('#/edition') ? S.seanceEdition() : S.seanceEnCours());
let retourConfig = 'programme';
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
  if (h.startsWith('#/edition') && S.seanceEdition()) return vueSeance();
  const m = h.match(/^#\/recap\/(.+)$/);
  if (m && S.seance(m[1])) return vueRecap(S.seance(m[1]));
  if (h === '#/programmes') return vueProgrammes();
  if (h === '#/corps') return vueCorps();
  const mq = h.match(/^#\/p\/([^/]+)$/);
  if (mq && S.programme(mq[1])) return vuePrincipale(S.programme(mq[1]));
  const mc = h.match(/^#\/calendrier\/([^/]+)$/);
  if (mc && S.programme(mc[1])) return vueCalendrier(S.programme(mc[1]));
  const mt = h.match(/^#\/stats\/([^/]+)$/);
  if (mt && S.programme(mt[1])) return vueStats(S.programme(mt[1]));
  const mp = h.match(/^#\/programme\/([^/]+)$/);
  if (mp && S.programme(mp[1])) return vueProgramme(S.programme(mp[1]));
  const ms = h.match(/^#\/split\/([^/]+)\/([^/]+)$/);
  if (ms && S.programme(ms[1])) {
    const sp = S.programme(ms[1]).splits.find((x) => x.id === ms[2]);
    if (sp) return vueSplit(S.programme(ms[1]), sp);
  }
  return vueAccueil();
}

function aller(h) {
  if (location.hash === h) route(); else location.hash = h;
}

// --- Accueil ------------------------------------------------------------------------

function joursDepuis(iso) {
  return Math.round((new Date().setHours(12, 0, 0, 0) - new Date(`${iso}T12:00:00`)) / 864e5);
}

function ligneChronologie({ type, item }) {
  if (type === 'seance') {
    const b = bilan(item);
    return `<li><button class="ligne-histo" data-action="recap" data-id="${item.id}" style="--c:${item.couleur}">
      <span class="histo-texte"><strong>${esc(item.nom)}</strong><small>${dateCourte(item.date)} · ${dureeSeance(b.dureeSec)}${item.ressenti ? ` · ressenti ${item.ressenti}/10` : ''}</small></span>
      <span class="histo-tonnage">${kg(Math.round(b.tonnage))} kg</span>
    </button></li>`;
  }
  const a = item;
  const infos = [a.distance && `${kg(a.distance)} km`, a.deplus && `${kg(a.deplus)} m D+`].filter(Boolean).join(' · ');
  return `<li><button class="ligne-histo activite" data-action="activite" data-id="${a.id}">
    <span class="histo-texte"><strong>${esc(a.nom)}</strong><small>${dateCourte(a.date)}${a.heureDebut && a.heureFin ? ` · ${dureeHeures(a.heureDebut, a.heureFin)}` : ''}${a.lieu ? ` · ${esc(a.lieu)}` : ''}${a.ressenti ? ` · ressenti ${a.ressenti}/10` : ''}</small></span>
    <span class="histo-tonnage activite-infos">${infos || 'activité'}</span>
  </button></li>`;
}

function dureeHeures(h1, h2) {
  const [a, b] = [h1, h2].map((h) => { const [x, y] = h.split(':').map(Number); return x * 60 + y; });
  return dureeSeance(Math.max(0, b - a) * 60);
}

// Boutons d'action nommés, posés dans le bandeau.
function actions(liste) {
  return `<nav class="actions-tete" style="grid-template-columns: repeat(${liste.length}, minmax(0, 1fr))">${liste.map(([action, icone, libelle, extra = '']) =>
    `<button class="action-tete" data-action="${action}" ${extra}>${I[icone]}<span>${libelle}</span></button>`).join('')}</nav>`;
}

function carteProgramme(p, enAvant = false) {
  const b = S.bilanProgramme(p);
  const se = S.seanceEnCours();
  const seIci = se && se.programmeId === p.id;
  const dates = p.debut ? `${dateCourte(p.debut)}${p.fin ? ` → ${dateCourte(p.fin)}` : ''}` : 'Pas encore commencé';
  return `<li><button class="carte-programme ${enAvant ? 'en-avant' : ''}" data-action="ouvrir-programme" data-id="${p.id}">
    <span class="cp-texte">
      <strong>${esc(p.nom)}</strong>
      <small>${dates}${b.seances ? ` · ${b.seances} séance${b.seances > 1 ? 's' : ''}` : ''}${!b.seances && p.splits.length ? ` · ${p.splits.length} split${p.splits.length > 1 ? 's' : ''}` : ''}</small>
      ${seIci ? `<span class="cp-encours"><i style="--c:${se.couleur}"></i>${esc(se.nom)} en cours${se.debut && !se.passee ? ` · <span data-temps-seance>${duree((Date.now() - new Date(se.debut)) / 1000)}</span>` : ''}</span>` : ''}
    </span>
    <span class="chevron-droit">${I.droite}</span>
  </button></li>`;
}

function vueAccueil() {
  gererVeille();
  flottant.innerHTML = '';
  const tous = S.get().programmes;
  const enCours = tous.filter((p) => p.statut === 'en-cours');
  const prep = tous.filter((p) => p.statut === 'preparation');
  const finis = tous.filter((p) => p.statut === 'termine').sort((a, b) => (b.fin || '').localeCompare(a.fin || ''));
  const jour = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  app.innerHTML = `
    <header class="bandeau-tete">
      <div class="bandeau-ligne"><div class="bandeau-titre"><small>${jour}</small><h1>Mes programmes</h1></div></div>
      ${actions([['programmes', 'reglages', 'Gérer'], ['mensurations', 'regle', 'Mensurations'], ['sauvegarder', 'partage', 'Exporter']])}
    </header>

    ${enCours.length ? `<h3 class="titre-section">En cours</h3><ul class="liste-programmes">${enCours.map((p) => carteProgramme(p, true)).join('')}</ul>`
      : `<p class="vide">Aucun programme en cours.</p>`}
    ${prep.length ? `<h3 class="titre-section">En préparation</h3><ul class="liste-programmes">${prep.map((p) => carteProgramme(p)).join('')}</ul>` : ''}
    ${finis.length ? `<h3 class="titre-section">Terminés</h3><ul class="liste-programmes">${finis.map((p) => carteProgramme(p)).join('')}</ul>` : ''}
    ${tous.length ? '' : '<button class="btn btn-principal btn-large" data-action="programmes">Créer un programme</button>'}

    <div class="pied">
      <button class="lien discret" data-action="reinitialiser">Réinitialiser la démo</button>
    </div>`;
}

// Écran d'un programme : sa vie au quotidien (séance en cours, splits, chronologie).
function vuePrincipale(p) {
  gererVeille();
  flottant.innerHTML = '';
  const enCours = S.seanceEnCours();
  const seIci = enCours && enCours.programmeId === p.id;
  const actif = p.statut === 'en-cours';
  const faites = S.seancesDe(p.id);
  const chrono = S.chronologie(p);

  app.innerHTML = `
    <header class="bandeau-tete">
      <div class="bandeau-ligne">
        <button class="btn-icone sur-couleur" data-action="accueil" aria-label="Mes programmes">${I.retour}</button>
        <div class="bandeau-titre"><small>${STATUTS[p.statut]}</small><h1>${esc(p.nom)}</h1></div>
      </div>
      <div class="bandeau-chiffres">
        <span><b>${faites.length}</b> séance${faites.length > 1 ? 's' : ''}</span>
        <span>${p.debut ? `${p.fin ? `du ${dateCourte(p.debut)} au ${dateCourte(p.fin)}` : `depuis le ${dateCourte(p.debut)}`}` : 'pas encore commencé'}</span>
      </div>
      ${actions([['configurer', 'reglages', 'Configurer', `data-id="${p.id}"`], ['calendrier', 'calendrier', 'Calendrier', `data-id="${p.id}"`], ['stats', 'stats', 'Stats', `data-id="${p.id}"`]])}
    </header>

    ${p.statut === 'preparation' ? `
      <p class="aide centre">Ce programme est en préparation : construis ses splits, puis démarre-le le jour J.</p>
      <button class="btn btn-principal btn-large" data-action="basculer" data-id="${p.id}">${I.play} Démarrer ce programme</button>` : ''}

    ${seIci ? `
      <h3 class="titre-section">Séance en cours</h3>
      <button class="split encours" data-action="reprendre" style="--c:${enCours.couleur}">
        <span class="split-texte"><strong>${esc(enCours.nom)}</strong><small>${enCours.debut ? `${bilan(enCours).faites}/${bilan(enCours).series} séries · ${kg(Math.round(bilan(enCours).tonnage))} kg` : 'Ouverte, pas commencée'}</small></span>
        <span class="encours-temps" ${enCours.passee ? '' : 'data-temps-seance'}>${enCours.passee ? dateCourte(enCours.date) : enCours.debut ? duree((Date.now() - new Date(enCours.debut)) / 1000) : 'Reprendre'}</span>
      </button>` : ''}

    ${p.statut !== 'termine' ? `
      <h3 class="titre-section">Splits</h3>
      ${p.splits.length ? '' : `<p class="vide">Ce programme n'a pas encore de split.</p><button class="btn btn-large" data-action="configurer" data-id="${p.id}">Configurer le programme</button>`}
      <ul class="pool" data-liste="splits" data-programme="${p.id}">
        ${p.splits.map((sp) => {
          const der = S.derniereDuSplit(p.id, sp.id);
          const j = der ? joursDepuis(der.date) : null;
          return `
          <li class="split" data-id="${sp.id}" style="--c:${sp.couleur}">
            <span class="poignee" data-glisser aria-label="Déplacer">${I.poignee}</span>
            <span class="split-texte">
              <strong>${esc(sp.nom)}</strong>
              <small>${der ? `${dateCourte(der.date)} · ${j === 0 ? "aujourd'hui" : `il y a ${j} j`}` : 'Pas encore fait'}</small>
              ${sp.prevu ? `<small class="prevu-split">${I.calendrier}prévu ${dateCourte(sp.prevu)}${(() => { const e = -joursDepuis(sp.prevu); return e === 0 ? ", aujourd'hui" : e === 1 ? ', demain' : e > 1 ? `, dans ${e} j` : `, il y a ${-e} j`; })()}</small>` : ''}
            </span>
            ${actif ? `<button class="btn btn-petit" data-action="ouvrir" data-split="${sp.id}">Ouvrir</button>` : ''}
          </li>`;
        }).join('')}
      </ul>` : ''}

    ${p.debut ? `
      <div class="titre-ligne"><h3 class="titre-section">Séances et activités</h3>
        ${actif ? `<button class="lien petit" data-action="activite">${I.plus} Activité libre</button>` : ''}</div>
      ${chrono.length ? `<ul class="historique">${chrono.slice().reverse().map(ligneChronologie).join('')}</ul>`
        : '<p class="vide">Tes séances terminées et tes activités libres (rando, vélo…) apparaîtront ici, par date.</p>'}` : ''}`;

  if (recapAOuvrir) {
    const id = recapAOuvrir;
    recapAOuvrir = null;
    setTimeout(() => aller(`#/recap/${id}`), 0);
  }
}

function fmtVolume(v, mesure) {
  if (mesure === 'temps') return duree(v);
  if (mesure === 'pdc') return `${Math.round(v)} reps`;
  return `${kg(Math.round(v))} kg`;
}
const fmtCourt = (v) => kg(Math.round(v));
const pctTexte = (x) => `${x > 0 ? '+' : ''}${Math.round(x * 100)} %`;

function vueStats(p) {
  flottant.innerHTML = '';
  const b = S.bilanProgramme(p);
  const seances = S.seancesDe(p.id);
  if (!p.debut || !seances.length) {
    app.innerHTML = `${teteStats(p)}<p class="vide">Les stats apparaîtront dès la première séance terminée.</p>`;
    return;
  }
  const { couloirs, ponctuels } = ST.couloirs(p, seances);
  const tonnages = ST.tonnageParSplit(p, seances).filter((x) => x.points.length);
  const repos = ST.reposParSeance(seances);
  const rp = ST.ressentiPerformance(seances);
  derniersCouloirs = couloirs;

  const carteTonnage = ({ split, points }) => `
    <div class="carte-graphe">
      <p class="graphe-titre"><i style="--c:${split.couleur}"></i>${esc(split.nom)} <small>tonnage par séance</small></p>
      ${G.courbe({ points: points.map((x) => ({ etiquette: dateCourte(x.date), y: x.valeur, tip: `${kg(Math.round(x.valeur))} kg\n${dateCourte(x.date)}` })), format: fmtCourt })}
    </div>`;

  const ligneCouloir = (c) => {
    const pts = c.points;
    const evo = c.evolution;
    return `<li><button class="ligne-couloir" data-action="couloir" data-id="${c.id}">
      <span class="lc-nom"><strong>${esc(c.nom)}</strong><small>${pts.length ? `${pts.length} séance${pts.length > 1 ? 's' : ''}` : 'pas encore fait'}${c.retire ? ' · retiré du modèle' : ''}</small></span>
      ${pts.length ? G.mini(pts.map((x) => x.volume), pts.map((x, i) => (x.remplace ? i : -1)).filter((i) => i >= 0)) : ''}
      <span class="lc-val">${pts.length ? `<b>${fmtVolume(pts[pts.length - 1].volume, pts[pts.length - 1].mesure)}</b><small class="${evo > 0 ? 'hausse' : evo < 0 ? 'baisse' : ''}">${evo != null ? pctTexte(evo) : '–'}</small>` : ''}</span>
    </button></li>`;
  };

  const ecartRepos = repos.length ? repos.reduce((a, r) => a + r.reel - r.prevu, 0) / repos.length : 0;

  app.innerHTML = `
    ${teteStats(p)}
    <h3 class="titre-section">Bilan${p.statut === 'en-cours' ? ' à ce jour' : ''}</h3>
    ${blocBilan(b)}
    <button class="btn btn-large" data-action="export-donnees" data-id="${p.id}">${I.partage} Exporter les données</button>

    <h3 class="titre-section">Tonnage des séances</h3>
    ${tonnages.map(carteTonnage).join('')}

    <h3 class="titre-section">Exercices</h3>
    <p class="aide stats-aide">Volume de chaque exercice par séance : tonnage, ou reps et durée selon la mesure. Un rond vide marque une séance où il a été remplacé. Touche un exercice pour le détail.</p>
    ${p.splits.map((sp) => {
      const l = couloirs.filter((c) => c.splitId === sp.id);
      return l.length ? `<p class="sous-titre"><i style="--c:${sp.couleur}"></i>${esc(sp.nom)}</p><ul class="couloirs">${l.map(ligneCouloir).join('')}</ul>` : '';
    }).join('')}
    ${couloirs.some((c) => !p.splits.some((sp) => sp.id === c.splitId)) ? `<ul class="couloirs">${couloirs.filter((c) => !p.splits.some((sp) => sp.id === c.splitId)).map(ligneCouloir).join('')}</ul>` : ''}
    ${ponctuels.length ? `<p class="sous-titre">Ponctuels <small>ajoutés « en plus » en séance</small></p>
      <ul class="couloirs">${ponctuels.map((x) => `<li class="ligne-couloir statique"><span class="lc-nom"><strong>${esc(x.nom)}</strong><small>${dateCourte(x.date)} · ${esc(x.texte)}</small></span><span class="lc-val"><b>${fmtVolume(x.volume, x.mesure)}</b></span></li>`).join('')}</ul>` : ''}

    <h3 class="titre-section">Repos</h3>
    ${repos.length ? `
      <div class="carte-graphe">
        <p class="graphe-titre">Repos moyen par séance</p>
        <div class="legende"><span><i class="cle accent"></i>réel</span><span><i class="cle gris"></i>prévu</span></div>
        ${G.courbe({ points: repos.map((r) => ({ etiquette: dateCourte(r.date), y: r.reel, tip: `${duree(r.reel)} de repos moyen\nprévu ${duree(r.prevu)} · ${r.nom}, ${dateCourte(r.date)}` })), reference: repos.map((r) => r.prevu), format: (v) => duree(v), zero: true, temps: true })}
        <p class="phrase">${Math.abs(ecartRepos) < 5 ? 'Tu tiens tes repos prévus.' : ecartRepos > 0 ? `En moyenne, tes repos dépassent le prévu de <b>${duree(ecartRepos)}</b>.` : `En moyenne, tes repos sont plus courts que prévu de <b>${duree(-ecartRepos)}</b>.`}</p>
      </div>` : '<p class="vide">Utilise le chrono (ou saisis les repos dans une séance) pour voir tes temps de repos.</p>'}

    <h3 class="titre-section">Ressenti et performance</h3>
    ${rp.points.length >= 3 ? `
      <div class="carte-graphe">
        <p class="graphe-titre">Chaque séance <small>tonnage comparé à la moyenne de son split</small></p>
        ${G.nuage({ points: rp.points.map((x) => ({ x: x.ressenti, y: x.perf, tip: `${pctTexte(x.perf - 1)} vs moyenne du split\n${x.nom}, ${dateCourte(x.date)} · ressenti ${x.ressenti}/10` })), format: (v) => `${Math.round(v * 100)} %` })}
        <p class="phrase">${phraseRessenti(rp)}</p>
      </div>` : '<p class="vide">Il faut au moins 3 séances avec un ressenti pour croiser ressenti et performance.</p>'}`;
  window.scrollTo(0, 0);
}

function teteStats(p) {
  return `<header class="bandeau-tete">
      <div class="bandeau-ligne">
        <button class="btn-icone sur-couleur" data-action="ouvrir-programme" data-id="${p.id}" aria-label="Retour au programme">${I.retour}</button>
        <div class="bandeau-titre"><small>${esc(p.nom)}</small><h1>Stats</h1></div>
      </div>
    </header>`;
}

function phraseRessenti(rp) {
  const f = (x) => x.toLocaleString('fr-FR', { maximumFractionDigits: 1 });
  const morceaux = [];
  if (rp.nbBonnes && rp.nbMoins) {
    const ecart = rp.ressentiBonnes - rp.ressentiMoins;
    morceaux.push(Math.abs(ecart) < 0.5
      ? `Ton ressenti ne prédit pas ta performance : ${f(rp.ressentiBonnes)}/10 en moyenne sur tes meilleures séances, ${f(rp.ressentiMoins)}/10 sur les moins bonnes.`
      : ecart < 0
        ? `Tes meilleures séances ont un ressenti <b>plus bas</b> (${f(rp.ressentiBonnes)}/10) que les moins bonnes (${f(rp.ressentiMoins)}/10).`
        : `Tes meilleures séances ont un ressenti plus haut (${f(rp.ressentiBonnes)}/10) que les moins bonnes (${f(rp.ressentiMoins)}/10).`);
  }
  if (rp.reposBas != null && rp.reposHauts != null) {
    morceaux.push(`Les jours de ressenti bas (4 ou moins), ton repos moyen est de ${duree(rp.reposBas)}, contre ${duree(rp.reposHauts)} les bons jours (7 ou plus).`);
  }
  return morceaux.join(' ') || 'Pas encore assez de séances contrastées pour en tirer une tendance.';
}

let derniersCouloirs = [];

function fenetreCouloir(c) {
  const pts = c.points;
  ouvrirFenetre(`
    <h2>${esc(c.nom)}</h2>
    <p class="aide">${ST.UNITES[c.mesure] === 'kg' ? 'Tonnage' : c.mesure === 'pdc' ? 'Répétitions totales' : 'Durée totale'} par séance${c.evolution != null ? ` · <b>${pctTexte(c.evolution)}</b> entre la première et la dernière` : ''}.</p>
    ${pts.length ? G.courbe({ points: pts.map((x) => ({ etiquette: dateCourte(x.date), y: x.volume, creux: !!x.remplace, tip: `${fmtVolume(x.volume, x.mesure)}\n${dateCourte(x.date)}${x.remplace ? ` · remplacé par ${x.remplace}` : ''}` })), format: c.mesure === 'temps' ? (v) => duree(v) : fmtCourt, temps: c.mesure === 'temps' }) : ''}
    <table class="table-couloir">
      <thead><tr><th>Date</th><th>Séries faites</th><th>Volume</th></tr></thead>
      <tbody>${pts.slice().reverse().map((x) => `<tr>
        <td>${dateCourte(x.date)}</td>
        <td>${esc(x.texte)}${x.nbSeries < x.nbPrevues ? ` <em>(${x.nbSeries}/${x.nbPrevues})</em>` : ''}${x.remplace ? `<br><em>remplacé par ${esc(x.remplace)}</em>` : ''}${x.changement ? `<br><em>forme modifiée${x.uni ? ' : unilatéral' : ''}</em>` : ''}</td>
        <td>${fmtVolume(x.volume, x.mesure)}${x.chargeMax ? `<br><em>max ${kg(x.chargeMax)} kg</em>` : ''}</td></tr>`).join('')}</tbody>
    </table>
    <button class="btn btn-large" data-f="ok">Fermer</button>`);
  couche.querySelector('[data-f="ok"]').onclick = fermer;
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
    const trier = (arr) => arr.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
    if (liste.dataset.liste === 'splits') S.ordonnerSplits(liste.dataset.programme, ids);
    else if (liste.dataset.liste === 'modele') {
      trier(S.programme(liste.dataset.programme).splits.find((x) => x.id === liste.dataset.split).blocs);
      S.enregistrer();
    } else {
      const s = active();
      s.blocs.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
      S.enregistrer();
    }
  };
  window.addEventListener('pointermove', suivre, { passive: true });
  window.addEventListener('pointerup', lacher);
  window.addEventListener('pointercancel', lacher);
}

// --- Activités libres et dates --------------------------------------------------------

const SUGGESTIONS = ['Rando', 'Vélo', 'Course', 'Balade', 'Natation', 'Cardio'];

function choixRessenti(valeur) {
  return `<div class="choix ressenti" data-groupe>
    <input type="hidden" name="ressenti" value="${valeur || ''}">
    ${Array.from({ length: 10 }, (_, i) => `<button type="button" class="puce ${valeur === i + 1 ? 'choisi' : ''}" data-choix="${i + 1}">${i + 1}</button>`).join('')}
  </div>
  <div class="ressenti-legende"><span>KO</span><span>En forme</span></div>`;
}

function fenetreActivite(a) {
  const nouvelle = !a;
  a = a || { nom: '', date: aujourdhui() };
  ouvrirFenetre(`
    <form>
      <h2>${nouvelle ? 'Activité libre' : esc(a.nom)}</h2>
      <label class="champ"><span>Activité</span><input name="nom" value="${esc(a.nom)}" required autocomplete="off" autocapitalize="sentences" placeholder="Rando"></label>
      <div class="choix suggestions">${SUGGESTIONS.map((x) => `<button type="button" class="puce" data-suggestion="${x}">${x}</button>`).join('')}</div>
      <label class="champ"><span>Date</span><input type="date" name="date" value="${a.date}" required></label>
      <div class="deux">
        <label class="champ"><span>Départ</span><input type="time" name="heureDebut" value="${a.heureDebut || ''}"></label>
        <label class="champ"><span>Arrivée</span><input type="time" name="heureFin" value="${a.heureFin || ''}"></label>
      </div>
      <div class="deux">
        <label class="champ"><span>Distance (km)</span><input name="distance" inputmode="decimal" value="${a.distance != null ? String(a.distance).replace('.', ',') : ''}"></label>
        <label class="champ"><span>Dénivelé + (m)</span><input name="deplus" inputmode="numeric" value="${a.deplus ?? ''}"></label>
      </div>
      <label class="champ"><span>Lieu</span><input name="lieu" value="${esc(a.lieu || '')}" autocapitalize="sentences"></label>
      <label class="champ"><span>Lien vers la trace</span><input type="url" name="lien" value="${esc(a.lien || '')}" placeholder="https://"></label>
      ${a.lien ? `<a class="lien petit" href="${esc(a.lien)}" target="_blank" rel="noopener">Ouvrir la trace</a>` : ''}
      <p class="titre-choix">Ressenti</p>
      ${choixRessenti(a.ressenti)}
      <label class="champ"><span>Note</span><textarea name="note" rows="2">${esc(a.note || '')}</textarea></label>
      <button class="btn btn-principal btn-large">Enregistrer</button>
      ${nouvelle ? '' : '<div class="actions-sec"><button type="button" class="lien danger" data-f="supprimer">Supprimer cette activité</button></div>'}
    </form>`, (fd) => {
    const n = (k) => { const v = String(fd.get(k) || '').trim(); return v ? num(v) : null; };
    Object.assign(a, {
      nom: majuscule(fd.get('nom')), date: fd.get('date'),
      heureDebut: fd.get('heureDebut') || null, heureFin: fd.get('heureFin') || null,
      distance: n('distance'), deplus: n('deplus') != null ? Math.round(n('deplus')) : null,
      lieu: fd.get('lieu').trim(), lien: fd.get('lien').trim(),
      ressenti: parseInt(fd.get('ressenti'), 10) || null, note: fd.get('note').trim(),
    });
    S.enregistrerActivite(a);
    fermer(); route();
    const pc = S.programmeEnCours();
    toast(pc?.debut && a.date < pc.debut ? `Enregistrée, avant le début de ${pc.nom} : visible dans le programme précédent` : nouvelle ? 'Activité ajoutée' : 'Activité enregistrée');
  });
  const form = couche.querySelector('form');
  form.querySelectorAll('[data-suggestion]').forEach((b) => { b.onclick = () => { form.elements.nom.value = b.dataset.suggestion; }; });
  const sup = form.querySelector('[data-f="supprimer"]');
  if (sup) sup.onclick = () => { if (confirmerDeux(sup)) { S.supprimerActivite(a.id); fermer(); route(); toast('Activité supprimée'); } };
}

function fenetreDate(s, apres) {
  const terminee = !!s.fin && S.get().encours !== s.id;
  ouvrirFenetre(`
    <form>
      <h2>Date de la séance</h2>
      <p class="aide">${terminee ? 'La séance se range à cette date dans la chronologie.' : 'Pour saisir une séance faite un autre jour : choisis sa date, et ses heures si tu les connais.'}</p>
      <label class="champ"><span>Date</span><input type="date" name="date" value="${s.date}" max="${aujourdhui()}" required></label>
      <div class="deux">
        <label class="champ"><span>Début</span><input type="time" name="debut" value="${s.passee || terminee ? S.heure(s.debut) : ''}"></label>
        <label class="champ"><span>Fin</span><input type="time" name="fin" value="${(s.passee || terminee) && s.fin ? S.heure(s.fin) : ''}"></label>
      </div>
      <button class="btn btn-principal btn-large">Enregistrer</button>
    </form>`, (fd) => {
    S.dater(s, fd.get('date'), fd.get('debut') || null, fd.get('fin') || null);
    fermer(); apres();
  });
}

// --- Calendrier de planification -------------------------------------------------------

let calMois = null;   // « AAAA-MM » affiché
let calMode = null;   // id de split, 'libre', 'bloquer' ou null

const ajouterJours = (iso, n) => { const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate() + n); return aujourdhui(d); };
const ecartJours = (a, b) => Math.round((new Date(`${b}T12:00:00`) - new Date(`${a}T12:00:00`)) / 864e5);

function vueCalendrier(p) {
  flottant.innerHTML = '';
  const pl = S.plan(p);
  const auj = aujourdhui();
  calMois ||= auj.slice(0, 7);
  const [an, mo] = calMois.split('-').map(Number);
  const premier = `${calMois}-01`;
  const decalage = (new Date(`${premier}T12:00:00`).getDay() + 6) % 7; // lundi = 0
  const nbJours = new Date(an, mo, 0).getDate();
  const debutGrille = ajouterJours(premier, -decalage);
  const nbCases = Math.ceil((decalage + nbJours) / 7) * 7;

  // Contenu par jour
  const parJour = {};
  const ajouter = (date, html) => { (parJour[date] ||= []).push(html); };
  for (const s of S.seancesDe(p.id)) ajouter(s.date, `<span class="cal-item fait" style="--c:${s.couleur}">${esc(s.nom)}</span>`);
  for (const a of S.activitesDe(p)) ajouter(a.date, `<span class="cal-item activite">${esc(a.nom)}</span>`);
  for (const sp of p.splits) {
    const date = pl.splits[sp.id];
    if (!date) continue;
    const der = S.derniereDuSplit(p.id, sp.id);
    const j = der ? ecartJours(der.date, date) : null;
    ajouter(date, `<span class="cal-item prevu" style="--c:${sp.couleur}">${esc(sp.nom)}${j != null ? `<em>${j} j</em>` : ''}</span>`);
  }
  for (const l of pl.libres) ajouter(l.date, `<span class="cal-item prevu libre">${esc(l.nom)}</span>`);

  const cases = Array.from({ length: nbCases }, (_, i) => {
    const date = ajouterJours(debutGrille, i);
    const horsMois = date.slice(0, 7) !== calMois;
    const cls = [horsMois && 'hors', date === auj && 'auj', date < auj && 'passe', pl.bloques.includes(date) && 'bloque'].filter(Boolean).join(' ');
    return `<button class="cal-jour ${cls}" data-action="cal-jour" data-date="${date}">
      <span class="cal-num">${Number(date.slice(8))}</span>${(parJour[date] || []).join('')}</button>`;
  }).join('');

  const nomMois = new Date(an, mo - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const modeNom = calMode === 'libre' ? 'une séance libre' : calMode === 'bloquer' ? 'un jour bloqué' : esc(p.splits.find((x) => x.id === calMode)?.nom || '');
  const modifie = p.splits.some((sp) => (pl.splits[sp.id] || null) !== (sp.prevu || null));

  app.innerHTML = `
    <header class="bandeau-tete">
      <div class="bandeau-ligne">
        <button class="btn-icone sur-couleur" data-action="ouvrir-programme" data-id="${p.id}" aria-label="Retour au programme">${I.retour}</button>
        <div class="bandeau-titre"><small>${esc(p.nom)}</small><h1>Calendrier</h1></div>
      </div>
    </header>

    <p class="titre-choix">Placer</p>
    <div class="cal-outils">
      ${p.splits.map((sp) => `<button class="cal-outil ${calMode === sp.id ? 'actif' : ''}" data-action="cal-mode" data-mode="${sp.id}" style="--c:${sp.couleur}">
        <i class="${pl.splits[sp.id] ? 'place' : ''}"></i>${esc(sp.nom)}</button>`).join('')}
      <button class="cal-outil autre ${calMode === 'libre' ? 'actif' : ''}" data-action="cal-mode" data-mode="libre"><i class="pointille"></i>Séance libre</button>
      <button class="cal-outil autre ${calMode === 'bloquer' ? 'actif' : ''}" data-action="cal-mode" data-mode="bloquer"><i class="hachure"></i>Bloquer un jour</button>
    </div>
    <p class="aide cal-aide">${calMode ? `Touche un jour pour placer ${modeNom}. Retouche-le pour l'enlever.` : 'Choisis ce que tu veux placer, puis touche un jour. Carré plein : split déjà placé.'}</p>

    <div class="cal">
      <div class="cal-tete">
        <button class="btn-icone" data-action="cal-mois" data-pas="-1" aria-label="Mois précédent">${I.retour}</button>
        <strong>${nomMois}</strong>
        <button class="btn-icone" data-action="cal-mois" data-pas="1" aria-label="Mois suivant">${I.droite}</button>
      </div>
      <div class="cal-semaine">${['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'].map((j) => `<span>${j}</span>`).join('')}</div>
      <div class="cal-grille">${cases}</div>
    </div>

    <button class="btn btn-principal btn-large" data-action="cal-appliquer" data-id="${p.id}">Appliquer les dates aux splits à venir</button>
    <p class="aide centre">${modifie ? 'Des changements ne sont pas encore appliqués. ' : ''}Un split sans date placée perd sa date prévue. Les dates restent indicatives : tu ouvres le split que tu veux, quand tu veux.</p>`;
}

function calToucherJour(p, date) {
  const pl = S.plan(p);
  const auj = aujourdhui();
  if (!calMode) {
    const libre = pl.libres.find((l) => l.date === date);
    if (libre) return fenetreLibre(p, libre);
    return toast('Choisis d\'abord quoi placer');
  }
  if (date < auj) return toast('On ne planifie que les jours à venir');
  if (calMode === 'bloquer') {
    if (pl.bloques.includes(date)) pl.bloques = pl.bloques.filter((d) => d !== date);
    else {
      pl.bloques = [...pl.bloques, date];
      // Un jour bloqué libère ce qui y était placé.
      const retires = p.splits.filter((sp) => pl.splits[sp.id] === date);
      retires.forEach((sp) => { delete pl.splits[sp.id]; });
      const libres = pl.libres.filter((l) => l.date === date);
      pl.libres = pl.libres.filter((l) => l.date !== date);
      const noms = [...retires.map((sp) => sp.nom), ...libres.map((l) => l.nom)];
      if (noms.length) toast(`Retiré : ${noms.join(', ')}`);
    }
  } else if (calMode === 'libre') {
    const deja = pl.libres.find((l) => l.date === date);
    if (deja) pl.libres = pl.libres.filter((l) => l !== deja);
    else pl.libres.push({ id: uid('l'), date, nom: 'Séance libre' });
  } else {
    if (pl.bloques.includes(date)) return toast('Ce jour est bloqué');
    pl.splits[calMode] = pl.splits[calMode] === date ? null : date;
    if (!pl.splits[calMode]) delete pl.splits[calMode];
  }
  S.enregistrer();
  vueCalendrier(p);
}

function fenetreLibre(p, libre) {
  fenetreNom('Séance libre', libre.nom, `Prévue le ${dateCourte(libre.date)}. Donne-lui son vrai nom (Rando, Vélo…).`, (n) => {
    libre.nom = majuscule(n); S.enregistrer(); fermer(); vueCalendrier(p);
  });
  const f = couche.querySelector('form');
  f.insertAdjacentHTML('beforeend', '<div class="actions-sec"><button type="button" class="lien danger" data-f="retirer">Retirer du calendrier</button></div>');
  f.querySelector('[data-f="retirer"]').onclick = () => {
    const pl = S.plan(p);
    pl.libres = pl.libres.filter((l) => l !== libre);
    S.enregistrer(); fermer(); vueCalendrier(p);
  };
}

// --- Corps : poids et mensurations -----------------------------------------------------

const signe = (x, unite) => `${x > 0 ? '+' : x < 0 ? '−' : '±'}${kg(Math.abs(Math.round(x * 10) / 10))} ${unite}`;

function corpsPendant(p) {
  return S.corps().points.map((pt) => ({ pt, ev: S.evolutionPendant(p, pt.id) })).filter((x) => x.ev)
    .map(({ pt, ev }) => `${pt.nom} : ${kg(ev.depart.valeur)} → ${kg(ev.arrivee.valeur)} ${pt.unite} (${signe(ev.ecart, pt.unite)}) · ${dateCourte(ev.depart.date)} → ${dateCourte(ev.arrivee.date)}`);
}

function vueCorps() {
  flottant.innerHTML = '';
  const c = S.corps();
  const actifs = c.points.filter((pt) => pt.actif);
  const groupes = [...new Set(actifs.map((pt) => pt.groupe || 'Autres'))];
  const programmes = S.get().programmes.filter((p) => p.debut).sort((a, b) => b.debut.localeCompare(a.debut));

  const lignePoint = (pt) => {
    const serie = S.serieCorps(pt.id);
    const der = serie[serie.length - 1];
    const ecart = serie.length > 1 ? der.valeur - serie[0].valeur : null;
    return `<li><button class="ligne-couloir" data-action="point-corps" data-id="${pt.id}">
      <span class="lc-nom"><strong>${esc(pt.nom)}</strong><small>${der ? (serie.length > 1 ? `depuis le ${dateCourte(serie[0].date).slice(-5)}` : dateCourte(der.date)) : 'pas encore mesuré'}</small></span>
      ${serie.length > 1 ? G.mini(serie.map((x) => x.valeur)) : ''}
      <span class="lc-val">${der ? `<b>${kg(der.valeur)} ${pt.unite}</b><small>${ecart != null ? signe(ecart, pt.unite) : ''}</small>` : ''}</span>
    </button></li>`;
  };

  const carteProgramme = (p) => {
    const lignes = actifs.map((pt) => ({ pt, ev: S.evolutionPendant(p, pt.id) })).filter((x) => x.ev);
    return `<div class="carte-graphe">
      <p class="graphe-titre">${esc(p.nom)} <small>${dateCourte(p.debut)}${p.fin ? ` → ${dateCourte(p.fin)}` : ' → aujourd\'hui'}</small></p>
      ${lignes.length ? `<ul class="evolutions">${lignes.map(({ pt, ev }) => `<li><span>${esc(pt.nom)}</span><span class="ev-val">${kg(ev.depart.valeur)} → ${kg(ev.arrivee.valeur)} ${pt.unite}</span><b>${signe(ev.ecart, pt.unite)}</b></li>`).join('')}</ul>`
        : '<p class="phrase">Pas assez de mesures : il en faut une au début (ou juste avant) et une autre pendant le programme.</p>'}
    </div>`;
  };

  app.innerHTML = `
    <header class="bandeau-tete">
      <div class="bandeau-ligne">
        <button class="btn-icone sur-couleur" data-action="accueil" aria-label="Mes programmes">${I.retour}</button>
        <div class="bandeau-titre"><small>Suivi physique</small><h1>Corps</h1></div>
      </div>
      ${actions([['nouvelle-mesure', 'plus', 'Nouvelle mesure'], ['points-corps', 'regle', 'Points de mesure']])}
    </header>

    ${c.mesures.length ? `
      ${groupes.map((g) => {
        const l = actifs.filter((pt) => (pt.groupe || 'Autres') === g);
        return `<p class="sous-titre">${esc(g)}</p><ul class="couloirs">${l.map(lignePoint).join('')}</ul>`;
      }).join('')}

      ${programmes.length ? `<h3 class="titre-section">Pendant les programmes</h3>${programmes.map(carteProgramme).join('')}` : ''}

      <h3 class="titre-section">Mesures</h3>
      <ul class="historique">${c.mesures.slice().reverse().map((m) => {
        const n = Object.keys(m.valeurs).length;
        return `<li><button class="ligne-histo mesure" data-action="mesure" data-id="${m.id}">
          <span class="histo-texte"><strong>${dateCourte(m.date)}</strong><small>${n} valeur${n > 1 ? 's' : ''}${m.note ? ` · ${esc(m.note)}` : ''}</small></span>
          <span class="chevron-droit">${I.droite}</span></button></li>`;
      }).join('')}</ul>`
    : `<p class="vide">Note ton poids et tes mensurations quand tu veux : l'appli trace leur évolution et la croise avec tes programmes.</p>
       <button class="btn btn-principal btn-large" data-action="nouvelle-mesure">${I.plus} Première mesure</button>`}`;
  window.scrollTo(0, 0);
}

function fenetreMesure(m) {
  const c = S.corps();
  const nouvelle = !m;
  m = m || { date: aujourdhui(), valeurs: {}, note: '' };
  const actifs = c.points.filter((pt) => pt.actif || m.valeurs[pt.id] != null);
  const groupes = [...new Set(actifs.map((pt) => pt.groupe || 'Autres'))];
  const derniere = (pt) => { const s = S.serieCorps(pt.id).filter((x) => x.mesureId !== m.id); return s[s.length - 1]?.valeur; };
  ouvrirFenetre(`
    <form>
      <h2>${nouvelle ? 'Nouvelle mesure' : `Mesure du ${dateCourte(m.date)}`}</h2>
      <label class="champ"><span>Date</span><input type="date" name="date" value="${m.date}" max="${aujourdhui()}" required></label>
      <p class="aide">Remplis seulement ce que tu as mesuré. En gris : ta dernière valeur.</p>
      ${groupes.map((g) => `<p class="titre-choix">${esc(g)}</p>
        ${actifs.filter((pt) => (pt.groupe || 'Autres') === g).map((pt) => `
          <label class="ligne-mesure"><span>${esc(pt.nom)}</span>
            <span class="mini-champ"><input name="v-${pt.id}" inputmode="decimal" value="${m.valeurs[pt.id] != null ? String(m.valeurs[pt.id]).replace('.', ',') : ''}" placeholder="${derniere(pt) != null ? String(derniere(pt)).replace('.', ',') : ''}"><span>${pt.unite}</span></span></label>`).join('')}`).join('')}
      <label class="champ"><span>Note</span><textarea name="note" rows="2" placeholder="Le matin à jeun, après la séance…">${esc(m.note || '')}</textarea></label>
      <button class="btn btn-principal btn-large">Enregistrer</button>
      ${nouvelle ? '' : '<div class="actions-sec"><button type="button" class="lien danger" data-f="supprimer">Supprimer cette mesure</button></div>'}
    </form>`, (fd) => {
    const valeurs = {};
    for (const pt of actifs) {
      const v = String(fd.get(`v-${pt.id}`) || '').trim();
      if (v) valeurs[pt.id] = Math.round(num(v) * 100) / 100;
    }
    if (!Object.keys(valeurs).length) return toast('Saisis au moins une valeur');
    Object.assign(m, { date: fd.get('date'), valeurs, note: fd.get('note').trim() });
    S.enregistrerMesure(m);
    fermer(); vueCorps();
    toast(nouvelle ? 'Mesure enregistrée' : 'Mesure modifiée');
  });
  const sup = couche.querySelector('[data-f="supprimer"]');
  if (sup) sup.onclick = () => { if (confirmerDeux(sup)) { S.supprimerMesure(m.id); fermer(); vueCorps(); toast('Mesure supprimée'); } };
}

function fenetrePoints() {
  const c = S.corps();
  const ligne = (pt) => `
    <div class="ligne-point" data-point="${pt.id}">
      <label class="interrupteur" aria-label="Utiliser ce point"><input type="checkbox" name="actif" ${pt.actif ? 'checked' : ''}><span></span></label>
      <input class="nom-point" name="nom" value="${esc(pt.nom)}" autocapitalize="sentences">
      <select name="unite">${['cm', 'kg', '%'].map((u) => `<option ${u === pt.unite ? 'selected' : ''}>${u}</option>`).join('')}</select>
    </div>`;
  ouvrirFenetre(`
    <form>
      <h2>Points de mesure</h2>
      <p class="aide">Décoche un point pour ne plus le proposer : ses anciennes valeurs restent. Ajoute autant de hauteurs que tu veux (bras haut, milieu, bas…).</p>
      <div data-points>${c.points.map(ligne).join('')}</div>
      <div class="deux"><label class="champ"><span>Nouveau point</span><input name="nouveau" placeholder="Bras gauche, haut" autocapitalize="sentences"></label>
        <label class="champ"><span>Groupe</span><input name="groupe" placeholder="Bras" autocapitalize="sentences"></label></div>
      <button class="btn btn-principal btn-large">Enregistrer</button>
    </form>`, (fd, form) => {
    form.querySelectorAll('[data-point]').forEach((l) => {
      const pt = c.points.find((x) => x.id === l.dataset.point);
      pt.actif = l.querySelector('[name=actif]').checked;
      pt.nom = majuscule(l.querySelector('[name=nom]').value) || pt.nom;
      pt.unite = l.querySelector('[name=unite]').value;
    });
    const n = majuscule(fd.get('nouveau'));
    if (n) {
      const groupe = majuscule(fd.get('groupe')) || 'Autres';
      const pt = { id: uid('m'), nom: n, unite: n.toLowerCase().includes('poids') ? 'kg' : 'cm', groupe, actif: true };
      // Rangé à la fin de son groupe.
      const i = c.points.map((x) => x.groupe).lastIndexOf(groupe);
      c.points.splice(i >= 0 ? i + 1 : c.points.length, 0, pt);
    }
    S.enregistrer(); fermer(); vueCorps();
    toast('Points enregistrés');
  });
}

function fenetrePointCorps(pt) {
  const serie = S.serieCorps(pt.id);
  const programmes = S.get().programmes.filter((p) => p.debut).sort((a, b) => b.debut.localeCompare(a.debut));
  const evos = programmes.map((p) => ({ p, ev: S.evolutionPendant(p, pt.id) })).filter((x) => x.ev);
  ouvrirFenetre(`
    <h2>${esc(pt.nom)}</h2>
    ${serie.length > 1 ? G.courbe({ points: serie.map((x) => ({ etiquette: dateCourte(x.date), y: x.valeur, tip: `${kg(x.valeur)} ${pt.unite}\n${dateCourte(x.date)}` })), format: (v) => kg(v) }) : '<p class="aide">Une deuxième mesure tracera la courbe.</p>'}
    ${evos.length ? `<p class="titre-choix">Pendant les programmes</p><ul class="evolutions">${evos.map(({ p, ev }) => `<li><span>${esc(p.nom)}</span><span class="ev-val">${kg(ev.depart.valeur)} → ${kg(ev.arrivee.valeur)}</span><b>${signe(ev.ecart, pt.unite)}</b></li>`).join('')}</ul>` : ''}
    <table class="table-couloir">
      <thead><tr><th>Date</th><th>Valeur</th><th>Écart</th></tr></thead>
      <tbody>${serie.slice().reverse().map((x, i, l) => `<tr><td>${dateCourte(x.date)}</td><td>${kg(x.valeur)} ${pt.unite}</td><td>${l[i + 1] ? signe(x.valeur - l[i + 1].valeur, pt.unite) : ''}</td></tr>`).join('')}</tbody>
    </table>
    <button class="btn btn-large" data-f="ok">Fermer</button>`);
  couche.querySelector('[data-f="ok"]').onclick = fermer;
}

// --- Configuration : programmes ---------------------------------------------------

const STATUTS = { 'en-cours': 'En cours', preparation: 'En préparation', termine: 'Terminé' };

function vueProgrammes() {
  flottant.innerHTML = '';
  const tous = S.get().programmes;
  const groupe = (statut) => tous.filter((p) => p.statut === statut);
  const carte = (p) => {
    const b = S.bilanProgramme(p);
    const dates = p.debut ? `${dateCourte(p.debut)}${p.fin ? ` → ${dateCourte(p.fin)}` : ''}` : 'Pas encore commencé';
    return `<li><button class="split ligne-prog" data-action="programme" data-id="${p.id}" data-depuis="gestion" style="--c:var(--b)">
      <span class="split-texte"><strong>${esc(p.nom)}</strong><small>${dates} · ${p.splits.length} split${p.splits.length > 1 ? 's' : ''}${b.seances ? ` · ${b.seances} séance${b.seances > 1 ? 's' : ''}` : ''}</small></span>
      <span class="chevron-droit">${I.droite}</span>
    </button></li>`;
  };
  const section = (statut) => (groupe(statut).length ? `<h3 class="titre-section">${STATUTS[statut]}</h3><ul class="pool">${groupe(statut).map(carte).join('')}</ul>` : '');
  app.innerHTML = `
    <header class="bandeau-tete">
      <div class="bandeau-ligne">
        <button class="btn-icone sur-couleur" data-action="accueil" aria-label="Accueil">${I.retour}</button>
        <div class="bandeau-titre"><small>Configuration</small><h1>Gérer les programmes</h1></div>
      </div>
    </header>
    ${section('en-cours')}${section('preparation')}${section('termine')}
    <button class="ajout" data-action="nouveau-programme">${I.plus} Nouveau programme</button>`;
  window.scrollTo(0, 0);
}

function vueProgramme(p) {
  flottant.innerHTML = '';
  const b = S.bilanProgramme(p);
  void b;
  const actuel = S.programmeEnCours();
  app.innerHTML = `
    <header class="bandeau-tete">
      <div class="bandeau-ligne">
        <button class="btn-icone sur-couleur" data-action="${retourConfig === 'gestion' ? 'programmes' : 'ouvrir-programme'}" data-id="${p.id}" aria-label="Retour">${I.retour}</button>
        <button class="bandeau-titre titre-modifiable" data-action="renommer-programme" data-id="${p.id}"><small>Configuration · ${STATUTS[p.statut].toLowerCase()}</small><h1>${esc(p.nom)} <span class="crayon">${I.crayon}</span></h1></button>
      </div>
      <div class="bandeau-chiffres">
        <span>${p.debut ? `${dateCourte(p.debut)}${p.fin ? ` → ${dateCourte(p.fin)}` : ''}` : 'Pas encore commencé'}</span>
        ${p.debut ? `<span><b>${b.seances}</b> séance${b.seances > 1 ? 's' : ''} en <b>${b.jours}</b> j</span>` : ''}
      </div>
      ${p.statut === 'preparation' ? `<button class="btn-demarrer" data-action="basculer" data-id="${p.id}">${I.play} Démarrer ce programme</button>` : ''}
    </header>

    <div class="titre-ligne"><h3 class="titre-section">Splits</h3>
      ${p.splits.length ? `<button class="lien petit" data-action="export-structure" data-id="${p.id}">${I.partage} Structure</button>` : ''}</div>
    ${p.splits.length ? `<ul class="pool" data-liste="splits" data-programme="${p.id}">
      ${p.splits.map((sp) => `
        <li class="split" data-id="${sp.id}" style="--c:${sp.couleur}">
          <span class="poignee" data-glisser aria-label="Déplacer">${I.poignee}</span>
          <button class="split-texte" data-action="split" data-programme="${p.id}" data-split="${sp.id}">
            <strong>${esc(sp.nom)}</strong>
            <small>${(() => { const n = sp.blocs.reduce((a, bl) => a + bl.exos.length, 0); return n ? `${n} exercice${n > 1 ? 's' : ''}` : 'Vide : à remplir'; })()}</small>
          </button>
          <span class="chevron-droit">${I.droite}</span>
        </li>`).join('')}
    </ul>` : '<p class="vide">Ajoute les splits de ce programme : Legs, Push, Pull…</p>'}
    <button class="ajout" data-action="nouveau-split" data-programme="${p.id}">${I.plus} Ajouter un split</button>

    <div class="pied">
      ${p.statut === 'termine' && !actuel ? `<button class="lien" data-action="rouvrir" data-id="${p.id}">Rouvrir ce programme</button><br>` : ''}
      <button class="lien danger" data-action="supprimer-programme" data-id="${p.id}">Supprimer ce programme</button>
    </div>`;
  window.scrollTo(0, 0);
}

function blocBilan(b) {
  if (!b.seances) return '<p class="vide">Aucune séance terminée pour l\'instant.</p>';
  const f = (x) => x.toLocaleString('fr-FR', { maximumFractionDigits: 1 });
  return `
    <div class="tuiles">
      <div class="tuile"><small>Séances</small><strong>${b.seances} <em>en ${b.jours} j</em></strong></div>
      <div class="tuile"><small>Rythme</small><strong>${f(b.parSemaine)} <em>par semaine</em></strong></div>
      <div class="tuile"><small>Tonnage moyen</small><strong>${kg(Math.round(b.moyenne))} kg <em>/ séance</em></strong></div>
      <div class="tuile"><small>Ressenti moyen</small><strong>${b.ressenti ? `${f(b.ressenti)}/10` : '–'}</strong></div>
    </div>
    <div class="progressions">
      <p class="titre-choix">Progression du tonnage par split</p>
      ${b.parSplit.map((x) => `
        <div class="progression-split" style="--c:${x.split.couleur}">
          <span class="nom">${esc(x.split.nom)}</span>
          ${x.nb ? `<span class="valeurs">${kg(Math.round(x.debut))} → ${kg(Math.round(x.fin))} kg</span>
            <span class="evolution ${x.evolution > 0 ? 'hausse' : x.evolution < 0 ? 'baisse' : ''}">${x.nb > 1 && x.evolution != null ? `${x.evolution > 0 ? '+' : ''}${Math.round(x.evolution * 100)} %` : '–'}</span>` : '<span class="valeurs">pas encore fait</span>'}
        </div>`).join('')}
      <p class="anecdote">${b.activites ? `${b.activites} activité${b.activites > 1 ? 's' : ''} libre${b.activites > 1 ? 's' : ''} · ` : ''}Total soulevé : ${kg(Math.round(b.tonnage / 100) / 10)} t</p>
    </div>`;
}

function fenetreNom(titre, valeur, aide, onOk, extra = '') {
  ouvrirFenetre(`
    <form>
      <h2>${titre}</h2>
      <label class="champ"><span>Nom</span><input name="nom" value="${esc(valeur)}" required autocomplete="off" autocapitalize="sentences"></label>
      ${extra}
      ${aide ? `<p class="aide">${aide}</p>` : ''}
      <button class="btn btn-principal btn-large">Enregistrer</button>
    </form>`, (fd) => { const n = fd.get('nom').trim(); if (n) onOk(n, fd); });
  setTimeout(() => couche.querySelector('[name=nom]')?.select(), 60);
}

function choixCouleurSplit(actuelle) {
  return `<p class="titre-choix">Couleur</p>
    <div class="choix couleurs-split" data-groupe>
      <input type="hidden" name="couleur" value="${actuelle}">
      ${COULEURS_SPLITS.map((c) => `<button type="button" class="pastille-couleur ${c === actuelle ? 'choisi' : ''}" data-choix="${c}" style="--c:${c}" aria-label="Couleur"></button>`).join('')}
    </div>`;
}

function fenetreBascule(p) {
  if (S.seanceEnCours()) return toast("Termine d'abord la séance en cours");
  const ancien = S.programmeEnCours();
  const date = aujourdhui();
  const bil = ancien ? S.bilanProgramme(ancien, date) : null;
  ouvrirFenetre(`
    <form>
      <h2>Démarrer ${esc(p.nom)}</h2>
      <label class="champ"><span>Date de début</span><input type="date" name="date" value="${date}" required></label>
      ${ancien ? `
        <p class="aide">${esc(ancien.nom)} sera clôturé à cette date :</p>
        <div class="tuiles">
          <div class="tuile"><small>Séances</small><strong>${bil.seances}</strong></div>
          <div class="tuile"><small>Durée</small><strong data-jours>${bil.jours} j</strong></div>
        </div>
        <button type="button" class="btn btn-large" data-f="export">${I.partage} Exporter les données de ${esc(ancien.nom)}</button>` : ''}
      ${p.splits.length ? '' : '<p class="aide">Ce programme n\'a pas encore de split.</p>'}
      <button class="btn btn-principal btn-large">Démarrer le programme</button>
    </form>`, (fd) => {
    S.basculer(p, fd.get('date'));
    fermer();
    toast(`${p.nom} démarré`);
    aller(`#/p/${p.id}`);
  });
  const champ = couche.querySelector('[name=date]');
  const ex = couche.querySelector('[data-f="export"]');
  if (ex) ex.onclick = () => {
    const fin = { ...ancien, fin: champ.value };
    partagerFichier(X.nomDonnees(ancien), X.texteDonnees(fin, S.seancesDe(ancien.id), S.bilanProgramme(ancien, champ.value), S.activitesDe(fin), corpsPendant(fin)));
  };
  if (ancien) champ.addEventListener('change', () => {
    couche.querySelector('[data-jours]').textContent = `${S.bilanProgramme(ancien, champ.value).jours} j`;
  });
}

// --- Configuration : éditeur de split -----------------------------------------------

function texteModele(e) {
  if (!e.series.length) return 'aucune série';
  const t = e.series.map((x) => texteSerie(e, x));
  const pareil = t.every((x) => x === t[0]);
  return pareil ? `${e.series.length} × ${t[0]}` : t.join(' · ');
}

function vueSplit(p, sp) {
  flottant.innerHTML = '';
  app.innerHTML = `
    <header class="bandeau-tete seance" style="--c:${sp.couleur}">
      <div class="bandeau-ligne">
        <button class="btn-icone sur-couleur" data-action="programme" data-id="${p.id}" aria-label="Retour">${I.retour}</button>
        <button class="bandeau-titre titre-modifiable" data-action="renommer-split" data-programme="${p.id}" data-split="${sp.id}">
          <small><span class="pastille-mini" style="--c:${sp.couleur}"></span>${esc(p.nom)} · modèle du split</small>
          <h1>${esc(sp.nom)} <span class="crayon">${I.crayon}</span></h1></button>
      </div>
    </header>
    <p class="aide centre">Les changements valent pour les prochaines séances, jamais pour les séances passées.</p>

    <div class="blocs" data-liste="modele" data-programme="${p.id}" data-split="${sp.id}">
      ${sp.blocs.map((b) => `
        <article class="bloc" data-id="${b.id}">
          <div class="bloc-tete">
            <span class="poignee" data-glisser aria-label="Déplacer">${I.poignee}</span>
            <div class="bloc-titres">
              ${b.exos.map((e) => `
                <button class="modele-exo" data-action="modele-exo" data-programme="${p.id}" data-split="${sp.id}" data-bloc="${b.id}" data-exo="${e.id}">
                  <span class="exo-titre"><span class="exo-nom">${esc(e.nom)}</span>${e.uni ? '<span class="etiquette">Unilatéral</span>' : ''}</span>
                  <small>${texteModele(e)}${e.mesure !== 'charge' ? ` · ${MESURES[e.mesure].toLowerCase()}` : ''}</small>
                  ${e.note ? `<small class="exo-note">${esc(e.note)}</small>` : ''}
                </button>`).join('')}
            </div>
          </div>
          <div class="bloc-pied">
            <button data-action="modele-repos" data-programme="${p.id}" data-split="${sp.id}" data-bloc="${b.id}">${I.chrono} repos ${duree(b.repos)}</button>
            <button data-action="modele-enchainer" data-programme="${p.id}" data-split="${sp.id}" data-bloc="${b.id}" ${b.exos.length >= 4 ? 'disabled' : ''}>${I.plus} enchaîner</button>
          </div>
        </article>`).join('')}
    </div>
    ${sp.blocs.length ? '' : '<p class="vide">Ajoute les exercices de ce split, dans l\'ordre où tu les fais.</p>'}
    <button class="ajout" data-action="modele-ajouter" data-programme="${p.id}" data-split="${sp.id}">${I.plus} Ajouter un exercice</button>
    <p class="aide centre">« Enchaîner » ajoute un exercice au même bloc (biset, superset, circuit).</p>

    <div class="pied"><button class="lien danger" data-action="supprimer-split" data-programme="${p.id}" data-split="${sp.id}">Supprimer ce split</button></div>`;
}

function valeursParDefaut(mesure) {
  if (mesure === 'temps') return { sec: 30 };
  if (mesure === 'pdc') return { reps: 10 };
  return { kg: 20, reps: 10 };
}

function lignesSeries(mesure, series) {
  return series.map((x, i) => `
    <div class="ligne-modele" data-ligne>
      <span class="serie-num">${i + 1}</span>
      ${mesure === 'charge' ? `<label class="mini-champ"><input name="kg" inputmode="decimal" value="${String(x.kg ?? 0).replace('.', ',')}"><span>kg</span></label>` : ''}
      ${mesure === 'temps' ? `<label class="mini-champ"><input name="sec" inputmode="numeric" value="${x.sec ?? 30}"><span>s</span></label>`
        : `<label class="mini-champ"><input name="reps" inputmode="numeric" value="${x.reps ?? 10}"><span>reps</span></label>`}
      <button type="button" class="btn-icone petit" data-f="retirer-ligne" aria-label="Retirer la série">${I.croix}</button>
    </div>`).join('');
}

function lireLignes(form, mesure) {
  return [...form.querySelectorAll('[data-ligne]')].map((l) => {
    const v = (n) => l.querySelector(`[name="${n}"]`)?.value;
    if (mesure === 'temps') return { sec: Math.max(0, Math.round(num(v('sec')))) };
    if (mesure === 'pdc') return { reps: Math.max(0, Math.round(num(v('reps')))) };
    return { kg: Math.max(0, num(v('kg'))), reps: Math.max(0, Math.round(num(v('reps')))) };
  });
}

/** Fenêtre d'un exercice du modèle. bloc null = nouvel exercice dans un nouveau bloc. */
function fenetreModeleExo(p, sp, bloc, exo) {
  const nouveau = !exo;
  const e = exo || { nom: '', mesure: 'charge', uni: false, note: '', series: [valeursParDefaut('charge'), valeursParDefaut('charge'), valeursParDefaut('charge')] };
  ouvrirFenetre(`
    <form>
      <h2>${nouveau ? (bloc ? 'Enchaîner un exercice' : 'Nouvel exercice') : 'Exercice du modèle'}</h2>
      <label class="champ"><span>Nom</span><input name="nom" value="${esc(e.nom)}" required autocomplete="off" autocapitalize="sentences" placeholder="Squat"></label>
      ${choixMesure(e.mesure)}
      <label class="interrupteur"><input type="checkbox" name="uni" ${e.uni ? 'checked' : ''}><span></span>Unilatéral (valeurs par côté)</label>
      <p class="titre-choix">Séries prévues</p>
      <div data-lignes>${lignesSeries(e.mesure, e.series)}</div>
      <button type="button" class="lien" data-f="ajouter-ligne">${I.plus} série</button>
      <label class="champ"><span>Consigne</span><textarea name="note" rows="2" placeholder="Tempo 3-1-1, bras opposé en tension, demi-reps en fin de série…">${esc(e.note)}</textarea></label>
      <button class="btn btn-principal btn-large">Enregistrer</button>
      ${nouveau ? '' : '<div class="actions-sec"><button type="button" class="lien danger" data-f="supprimer">Supprimer cet exercice</button></div>'}
    </form>`, (fd, form) => {
    const mesure = fd.get('mesure');
    const donnees = { nom: majuscule(fd.get('nom')), mesure, uni: fd.get('uni') === 'on', note: fd.get('note').trim(), series: lireLignes(form, mesure) };
    if (nouveau) {
      const ex = { id: uid('e'), ...donnees };
      if (bloc) bloc.exos.push(ex);
      else sp.blocs.push({ id: uid('b'), repos: 90, exos: [ex] });
    } else Object.assign(exo, donnees);
    S.enregistrer(); fermer(); vueSplit(p, sp);
  });
  const form = couche.querySelector('form');
  const zone = form.querySelector('[data-lignes]');
  const renumeroter = () => zone.querySelectorAll('[data-ligne] .serie-num').forEach((n, i) => { n.textContent = i + 1; });
  form.querySelector('[data-f="ajouter-ligne"]').onclick = () => {
    const mesure = form.elements.mesure.value;
    const actuelles = lireLignes(form, mesure);
    const derniere = actuelles[actuelles.length - 1] || valeursParDefaut(mesure);
    zone.insertAdjacentHTML('beforeend', lignesSeries(mesure, [derniere]));
    renumeroter();
  };
  zone.addEventListener('click', (ev) => {
    const r = ev.target.closest('[data-f="retirer-ligne"]');
    if (r) { r.closest('[data-ligne]').remove(); renumeroter(); }
  });
  form.elements.mesure.addEventListener('change', () => {
    const mesure = form.elements.mesure.value;
    const n = zone.querySelectorAll('[data-ligne]').length || 3;
    zone.innerHTML = lignesSeries(mesure, Array.from({ length: n }, () => valeursParDefaut(mesure)));
  });
  const sup = form.querySelector('[data-f="supprimer"]');
  if (sup) sup.onclick = () => {
    if (!confirmerDeux(sup)) return;
    bloc.exos = bloc.exos.filter((x) => x.id !== exo.id);
    if (!bloc.exos.length) sp.blocs = sp.blocs.filter((x) => x.id !== bloc.id);
    S.enregistrer(); fermer(); vueSplit(p, sp);
  };
  if (nouveau) setTimeout(() => form.elements.nom.focus(), 60);
}

function fenetreModeleRepos(p, sp, bloc) {
  ouvrirFenetre(`
    <form>
      <h2>Repos prévu</h2>
      <p class="aide">Entre deux séries${bloc.exos.length > 1 ? ' (ou deux tours)' : ''} de ce bloc.</p>
      ${stepper('repos', 'Secondes', bloc.repos, 10, 's')}
      <p class="aide centre" data-lisible>${duree(bloc.repos)}</p>
      <button class="btn btn-principal btn-large">Enregistrer</button>
    </form>`, (fd) => {
    bloc.repos = Math.max(0, Math.round(num(fd.get('repos'))));
    S.enregistrer(); fermer(); vueSplit(p, sp);
  });
  const champ = couche.querySelector('[name=repos]');
  const lisible = couche.querySelector('[data-lisible]');
  const maj = () => { lisible.textContent = duree(num(champ.value)); };
  champ.addEventListener('input', maj);
  couche.querySelector('form').addEventListener('click', () => setTimeout(maj, 0));
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
  const s = active();
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
  const s = active();
  if (!s) return aller('#/');
  gererVeille();
  const b = bilan(s);
  const r = S.get().reglages;
  app.innerHTML = `
    <header class="bandeau-tete seance" style="--c:${s.couleur}">
      <div class="bandeau-ligne">
        <button class="btn-icone sur-couleur" data-action="${s.edition ? 'recap' : 'ouvrir-programme'}" data-id="${s.edition ? s.id : s.programmeId}" aria-label="Retour">${I.retour}</button>
        <div class="bandeau-titre"><h1>${esc(s.nom)}</h1>
          <small>${s.edition ? `Modification · séance du ${dateCourte(s.date)}` : s.passee ? `Séance du ${dateCourte(s.date)}${S.heure(s.debut) !== '12:00' ? ` · ${S.heure(s.debut)}` : ''}` : s.debut ? `${dateCourte(s.date)} · <span data-temps-seance>${duree(b.dureeSec)}</span>` : 'Pas commencée'}</small></div>
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
    ${s.debut ? `<button class="btn btn-principal btn-large" data-action="terminer">${s.edition ? 'Enregistrer les modifications' : 'Terminer la séance'}</button>` : ''}
    ${s.edition ? '<div class="actions-sec"><button class="lien" data-action="annuler-edition">Annuler les modifications</button></div>' : ''}
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
        <button class="btn-icone sur-couleur" data-action="ouvrir-programme" data-id="${s.programmeId}" aria-label="Retour au programme">${I.retour}</button>
        <button class="bandeau-titre titre-modifiable" data-action="dater" data-id="${s.id}"><h1>${esc(s.nom)}</h1><small>${dateCourte(s.date)}${S.heure(s.debut) !== '12:00' ? ` · ${S.heure(s.debut)}` : ''} · terminée <span class="crayon">${I.crayon}</span></small></button>
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
    <button class="btn btn-large ${s.edition ? 'btn-principal' : ''}" data-action="modifier-seance" data-id="${s.id}">${I.crayon} ${s.edition ? 'Reprendre la modification en cours' : 'Modifier cette séance'}</button>
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
  const s = active();
  // Pas de chrono pour une séance saisie après coup : les repos se saisissent dans chaque série.
  if (!s || !location.hash.startsWith('#/seance') || s.edition || s.passee) { flottant.innerHTML = ''; return; }
  // (la modification d'une séance passée n'a jamais de chrono)
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
  if (!s || !s.debut || s.passee) return;
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

function reposDe(s, blocId, exoId, i) {
  return s.repos.find((r) => r.ancre && r.ancre.bloc === blocId && r.ancre.exo === exoId && r.ancre.i === i);
}

/** Repos saisi à la main (séance après coup ou correction). 0 = pas de repos. */
function saisirRepos(s, blocId, exoId, i, sec) {
  const r = reposDe(s, blocId, exoId, i);
  if (!sec) { if (r) s.repos.splice(s.repos.indexOf(r), 1); return; }
  const prevu = s.blocs.find((b) => b.id === blocId)?.repos || 0;
  if (r) r.reel = sec;
  else s.repos.push({ blocId, ancre: { bloc: blocId, exo: exoId, i }, prevu, reel: sec, a: new Date().toISOString(), manuel: true });
}

function fenetreSerie(s, blocId, exoId, i) {
  const { e } = trouver(s, blocId, exoId);
  const v = e.series[i];
  ouvrirFenetre(`
    <form>
      <h2>${esc(e.nom)} <small>série ${i + 1}</small></h2>
      ${v.prevu ? `<p class="aide">Prévu : ${texteSerie(e, v.prevu)}${e.uni ? ' par côté' : ''}</p>` : ''}
      ${champsMesure(e.mesure, v)}
      ${s.edition || s.passee || reposDe(s, blocId, exoId, i) ? `${stepper('repos', 'Repos après cette série (0 = aucun)', reposDe(s, blocId, exoId, i)?.reel || 0, 10, 's')}` : ''}
      <button class="btn btn-principal btn-large">${v.fait ? 'Enregistrer' : 'Valider la série'}</button>
      <div class="actions-sec">
        ${v.fait ? '<button type="button" class="lien" data-f="defaire">Marquer non faite</button>' : ''}
        <button type="button" class="lien danger" data-f="supprimer">Retirer cette série</button>
      </div>
    </form>`, (fd) => {
    if (!v.fait) v.faitA = Date.now();
    Object.assign(v, lireMesure(fd, e.mesure), { fait: true });
    if (fd.has('repos')) saisirRepos(s, blocId, exoId, i, Math.max(0, Math.round(num(fd.get('repos')))));
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
      <label class="champ"><span>Nom</span><input name="nom" value="${esc(e.nom)}" required autocapitalize="sentences"></label>
      ${choixMesure(e.mesure)}
      <label class="interrupteur"><input type="checkbox" name="uni" ${e.uni ? 'checked' : ''}><span></span>Unilatéral (valeurs par côté)</label>
      <label class="champ"><span>Note</span><textarea name="note" rows="2" placeholder="Bras opposé en tension, demi-reps en fin de série…">${esc(e.note)}</textarea></label>
      <button class="btn btn-principal btn-large">Enregistrer</button>
      ${e.remplace || e.ponctuel ? '<div class="actions-sec"><button type="button" class="lien danger" data-f="retirer">Retirer cet exercice</button></div>' : ''}
    </form>`, (fd) => {
    const mesure = fd.get('mesure');
    if (mesure !== e.mesure) e.series.forEach((x) => { if (mesure === 'temps' && x.sec == null) x.sec = 30; if (mesure !== 'temps' && x.reps == null) x.reps = 10; if (mesure === 'charge' && x.kg == null) x.kg = 0; });
    Object.assign(e, { nom: majuscule(fd.get('nom')) || e.nom, mesure, uni: fd.get('uni') === 'on', note: fd.get('note').trim() });
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
      <label class="champ"><span>Exercice</span><input name="nom" required placeholder="Fentes marchées" autocomplete="off" autocapitalize="sentences"></label>
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
      id: uid('e'), src: null, nom: majuscule(fd.get('nom')), mesure, uni: fd.get('uni') === 'on', note: '',
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
      <h2>${s.edition ? 'Enregistrer les modifications' : 'Terminer la séance'}</h2>
      ${restantes ? `<p class="aide">${restantes} série${restantes > 1 ? 's' : ''} non validée${restantes > 1 ? 's' : ''} : elle${restantes > 1 ? 's' : ''} ne compte${restantes > 1 ? 'nt' : ''} pas.</p>` : ''}
      <p class="titre-choix">Ressenti</p>
      <div class="choix ressenti" data-groupe>
        <input type="hidden" name="ressenti" value="${s.ressenti || ''}">
        ${Array.from({ length: 10 }, (_, i) => `<button type="button" class="puce ${s.ressenti === i + 1 ? 'choisi' : ''}" data-choix="${i + 1}">${i + 1}</button>`).join('')}
      </div>
      <div class="ressenti-legende"><span>KO</span><span>En forme</span></div>
      <label class="champ"><span>Note</span><textarea name="note" rows="2" placeholder="Fatigué, machine prise…">${esc(s.note || '')}</textarea></label>
      <button class="btn btn-principal btn-large">Enregistrer la séance</button>
    </form>`, (fd) => {
    if (s.chrono) basculerChrono();
    const etaitEdition = !!s.edition;
    S.terminer(s, { ressenti: parseInt(fd.get('ressenti'), 10) || null, note: fd.get('note').trim() });
    if (etaitEdition) { toast('Modifications enregistrées'); return aller(`#/recap/${s.id}`); }
    recapAOuvrir = s.id;
    aller(`#/p/${s.programmeId}`);
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
    <button class="btn btn-large" data-f="date">${s.passee ? `Séance du ${dateCourte(s.date)} : modifier` : 'Saisir à une autre date'}</button>
    ${S.programme(s.programmeId)?.splits.some((x) => x.id === s.splitId) ? '<button class="btn btn-large" data-f="modele">Modifier le modèle de ce split</button>' : ''}
    <div class="deux">
      <button class="btn" data-f="replier">Tout replier</button>
      <button class="btn" data-f="deplier">Tout déplier</button>
    </div>
    <p class="aide">Pour changer l'ordre des blocs, attrape la poignée ⠿ à gauche d'un bloc.</p>
    <div class="actions-sec"><button class="lien danger" data-f="abandon">${s.edition ? 'Annuler les modifications' : s.debut ? 'Abandonner la séance' : 'Fermer sans démarrer'}</button></div>`);
  const tous = (v) => () => { s.blocs.forEach((b) => { b.replie = v; }); S.enregistrer(); fermer(); vueSeance(); };
  couche.querySelector('[data-f="date"]').onclick = () => fenetreDate(s, vueSeance);
  const mo = couche.querySelector('[data-f="modele"]');
  if (mo) mo.onclick = () => { retourConfig = 'programme'; fermer(); aller(`#/split/${s.programmeId}/${s.splitId}`); toast('Le modèle vaut pour les prochaines séances'); };
  couche.querySelector('[data-f="replier"]').onclick = tous(true);
  couche.querySelector('[data-f="deplier"]').onclick = tous(false);
  couche.querySelector('[data-f="abandon"]').onclick = (ev) => {
    if (s.edition) { const id = s.id; S.annulerEdition(s); fermer(); toast('Modifications annulées'); return aller(`#/recap/${id}`); }
    if (!s.debut || confirmerDeux(ev.currentTarget)) { S.abandonner(s); fermer(); aller(`#/p/${s.programmeId}`); }
  };
}

// --- Sauvegarde par le menu de partage ----------------------------------------------

async function partagerFichier(nom, contenu) {
  const fichier = new File([contenu], nom, { type: 'text/plain' });
  try {
    if (navigator.canShare?.({ files: [fichier] })) {
      await navigator.share({ files: [fichier], title: nom });
      toast('Fichier partagé');
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
  toast('Fichier téléchargé');
}

function fenetreSauvegarde() {
  ouvrirFenetre(`
    <h2>Sauvegarde</h2>
    <p class="aide">L'export complet contient tout : programmes, séances, réglages. C'est lui qui sert à tout restaurer.</p>
    <button class="btn btn-principal btn-large" data-f="exporter">${I.partage} Export complet</button>
    <p class="titre-choix">Restaurer</p>
    <p class="aide">Réimporter un export complet remplace toutes les données de cet appareil.</p>
    <label class="btn btn-large fichier">Choisir un export complet<input type="file" accept=".txt,.json,text/plain,application/json" hidden></label>
    <p class="aide centre">Les exports Structure et Données d'un programme se trouvent sur sa page.</p>`);
  couche.querySelector('[data-f="exporter"]').onclick = () => partagerFichier(X.nomComplet(), S.contenuSauvegarde());
  couche.querySelector('input[type=file]').onchange = async (ev) => {
    const f = ev.target.files[0];
    if (!f) return;
    let donnees;
    try { donnees = JSON.parse(await f.text()); } catch { return toast("Ce fichier n'est pas un export complet"); }
    if (!Array.isArray(donnees?.programmes) || !Array.isArray(donnees?.seances)) return toast("Ce fichier n'est pas un export complet");
    ouvrirFenetre(`
      <h2>Tout remplacer ?</h2>
      <p class="aide">${f.name}<br>${donnees.programmes.length} programme${donnees.programmes.length > 1 ? 's' : ''} · ${donnees.seances.length} séance${donnees.seances.length > 1 ? 's' : ''}${donnees.exporte ? ` · exporté le ${dateCourte(donnees.exporte.slice(0, 10))}` : ''}</p>
      <p class="aide">Les données actuelles de cet appareil seront remplacées.</p>
      <button class="btn btn-principal btn-large" data-f="ok">Remplacer</button>
      <div class="actions-sec"><button class="lien" data-f="non">Annuler</button></div>`);
    couche.querySelector('[data-f="non"]').onclick = fermer;
    couche.querySelector('[data-f="ok"]').onclick = () => {
      try { S.remplacerTout(donnees); } catch { return toast("Import impossible : fichier incomplet"); }
      fermer(); toast('Données restaurées'); aller('#/'); route();
    };
  };
}

// --- Actions ------------------------------------------------------------------------

app.addEventListener('pointerdown', activerGlisser);

app.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-action]');
  if (!el) return;
  const s = active();
  const d = el.dataset;
  switch (d.action) {
    case 'accueil': return aller('#/');
    case 'reprendre': return aller('#/seance');
    case 'sauvegarder': return fenetreSauvegarde();
    case 'export-structure': { const pr = S.programme(d.id); return partagerFichier(X.nomStructure(pr), X.texteStructure(pr)); }
    case 'export-donnees': { const pr = S.programme(d.id); return partagerFichier(X.nomDonnees(pr), X.texteDonnees(pr, S.seancesDe(pr.id), S.bilanProgramme(pr), S.activitesDe(pr), corpsPendant(pr))); }
    case 'couleur':
      S.get().reglages.couleur = d.couleur;
      S.enregistrer();
      appliquerCouleur();
      return vueAccueil();
    case 'reinitialiser':
      if (confirmerDeux(el)) { const c = couleur(); S.reinitialiser(); S.get().reglages.couleur = c; S.enregistrer(); vueAccueil(); toast('Démo réinitialisée'); }
      return;
    case 'recap': return aller(`#/recap/${d.id}`);
    case 'activite': return fenetreActivite(d.id ? S.activite(d.id) : null);
    case 'modifier-seance': {
      const se = S.seance(d.id);
      S.rouvrirSeance(se);
      return aller('#/edition');
    }
    case 'dater': { const se = S.seance(d.id); return fenetreDate(se, () => vueRecap(se)); }
    case 'programmes': return aller('#/programmes');
    case 'ouvrir-programme': return aller(`#/p/${d.id}`);
    case 'configurer': retourConfig = 'programme'; return aller(`#/programme/${d.id}`);
    case 'stats': return aller(`#/stats/${d.id}`);
    case 'couloir': return fenetreCouloir(derniersCouloirs.find((c) => c.id === d.id));
    case 'calendrier': calMode = null; calMois = null; S.synchroniserPlan(S.programme(d.id)); return aller(`#/calendrier/${d.id}`);
    case 'cal-mode': {
      calMode = calMode === d.mode ? null : d.mode;
      return vueCalendrier(S.programme(location.hash.split('/')[2]));
    }
    case 'cal-mois': {
      const [a, m] = calMois.split('-').map(Number);
      const n = new Date(a, m - 1 + Number(d.pas), 1);
      calMois = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
      return vueCalendrier(S.programme(location.hash.split('/')[2]));
    }
    case 'cal-jour': return calToucherJour(S.programme(location.hash.split('/')[2]), d.date);
    case 'cal-appliquer': {
      const pr = S.programme(d.id);
      S.appliquerPlan(pr);
      calMode = null;
      toast('Dates appliquées aux splits');
      return aller(`#/p/${pr.id}`);
    }
    case 'mensurations': return aller('#/corps');
    case 'nouvelle-mesure': return fenetreMesure(null);
    case 'mesure': return fenetreMesure(S.corps().mesures.find((m) => m.id === d.id));
    case 'points-corps': return fenetrePoints();
    case 'point-corps': return fenetrePointCorps(S.corps().points.find((x) => x.id === d.id));
    case 'programme': retourConfig = d.depuis === 'gestion' ? 'gestion' : retourConfig; return aller(`#/programme/${d.id}`);
    case 'split': return aller(`#/split/${d.programme}/${d.split}`);
    case 'nouveau-programme':
      return fenetreNom('Nouveau programme', '', 'Il démarre en préparation : tu le construis pendant le programme en cours, puis tu le démarres le jour J.', (n) => {
        const np = S.creerProgramme(n); fermer(); retourConfig = 'gestion'; aller(`#/programme/${np.id}`);
      });
    case 'renommer-programme': {
      const pr = S.programme(d.id);
      return fenetreNom('Programme', pr.nom, '', (n) => { pr.nom = n; S.enregistrer(); fermer(); vueProgramme(pr); });
    }
    case 'basculer': return fenetreBascule(S.programme(d.id));
    case 'rouvrir': S.rouvrir(S.programme(d.id)); return vueProgramme(S.programme(d.id));
    case 'supprimer-programme':
      if (S.seanceEnCours()?.programmeId === d.id) return toast("Termine d'abord la séance en cours");
      if (confirmerDeux(el)) { S.supprimerProgramme(d.id); toast('Programme supprimé'); aller('#/programmes'); }
      return;
    case 'nouveau-split': {
      const pr = S.programme(d.programme);
      return fenetreNom('Nouveau split', '', '', (n, fd) => {
        const sp = S.creerSplit(pr, n, fd.get('couleur')); fermer(); aller(`#/split/${pr.id}/${sp.id}`);
      }, choixCouleurSplit(S.couleurLibre(pr)));
    }
    case 'renommer-split': {
      const pr = S.programme(d.programme);
      const sp = pr.splits.find((x) => x.id === d.split);
      return fenetreNom('Split', sp.nom, '', (n, fd) => { sp.nom = n; sp.couleur = fd.get('couleur'); S.enregistrer(); fermer(); vueSplit(pr, sp); }, choixCouleurSplit(sp.couleur));
    }
    case 'supprimer-split': {
      const pr = S.programme(d.programme);
      if (confirmerDeux(el)) { S.supprimerSplit(pr, d.split); toast('Split supprimé'); aller(`#/programme/${pr.id}`); }
      return;
    }
    case 'modele-exo':
    case 'modele-repos':
    case 'modele-enchainer':
    case 'modele-ajouter': {
      const pr = S.programme(d.programme);
      const sp = pr.splits.find((x) => x.id === d.split);
      const bl = d.bloc ? sp.blocs.find((x) => x.id === d.bloc) : null;
      if (d.action === 'modele-exo') return fenetreModeleExo(pr, sp, bl, bl.exos.find((x) => x.id === d.exo));
      if (d.action === 'modele-repos') return fenetreModeleRepos(pr, sp, bl);
      if (d.action === 'modele-enchainer') return fenetreModeleExo(pr, sp, bl, null);
      return fenetreModeleExo(pr, sp, null, null);
    }
    case 'supprimer-seance':
      if (confirmerDeux(el)) { const pid = S.seance(d.id)?.programmeId; S.supprimerSeance(d.id); aller(pid ? `#/p/${pid}` : '#/'); toast('Séance supprimée'); }
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
    case 'annuler-edition': { const pid = s.programmeId, id = s.id; S.annulerEdition(s); toast('Modifications annulées'); void pid; return aller(`#/recap/${id}`); }
  }
});

flottant.addEventListener('click', (ev) => {
  if (ev.target.closest('[data-action="chrono"]')) basculerChrono();
});

document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { gererVeille(); tic(); } });
window.addEventListener('hashchange', route);
document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && !couche.hidden) fermer(); });

appliquerCouleur();
G.activerBulles();
suivreZoneVisible();
route();
setInterval(tic, 250);

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
