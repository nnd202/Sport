// Interface de Sport : accueil, séance, chrono, fenêtres de saisie.
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
  check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5z" class="plein"/></svg>',
  stop: '<svg viewBox="0 0 24 24"><rect x="7" y="7" width="10" height="10" rx="2" class="plein"/></svg>',
  haut: '<svg viewBox="0 0 24 24"><path d="M6 15l6-6 6 6"/></svg>',
  bas: '<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>',
  plusPetit: '<svg viewBox="0 0 24 24"><path d="M12 6v12M6 12h12"/></svg>',
  moins: '<svg viewBox="0 0 24 24"><path d="M6 12h12"/></svg>',
  menu: '<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.6" class="plein"/><circle cx="12" cy="12" r="1.6" class="plein"/><circle cx="19" cy="12" r="1.6" class="plein"/></svg>',
  ecran: '<svg viewBox="0 0 24 24"><rect x="7" y="3" width="10" height="18" rx="2.5"/><path d="M11 18h2"/></svg>',
  partage: '<svg viewBox="0 0 24 24"><path d="M12 15V4M8 8l4-4 4 4"/><path d="M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"/></svg>',
  chrono: '<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="7.5"/><path d="M12 13V9.5M10 3h4"/></svg>',
};

let reorganiser = false;
const teinte = () => S.get().reglages.teinte || 'peche';
const appliquerTeinte = () => { document.documentElement.dataset.teinte = teinte(); };
let resumeAOuvrir = null;

// --- Zone visible : suit les barres du navigateur et le clavier ---------------------

function suivreZoneVisible() {
  const vv = window.visualViewport;
  const maj = () => {
    const h = vv ? vv.height : window.innerHeight;
    const top = vv ? vv.offsetTop : 0;
    document.documentElement.style.setProperty('--vv-h', `${h}px`);
    document.documentElement.style.setProperty('--vv-top', `${top}px`);
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
  return vueAccueil();
}

function aller(h) {
  if (location.hash === h) route(); else location.hash = h;
}

// --- Accueil ------------------------------------------------------------------------

function vueAccueil() {
  reorganiser = false;
  gererVeille();
  const p = S.programmeEnCours();
  const faites = S.seancesDe(p.id);
  const enCours = S.seanceEnCours();
  const derniere = faites[faites.length - 1];
  const idxSuivant = derniere ? (p.splits.findIndex((s) => s.id === derniere.splitId) + 1) % p.splits.length : 0;

  app.innerHTML = `
    <header class="entete">
      <h1>Sport</h1>
      <button class="btn-rond" data-action="sauvegarder" aria-label="Sauvegarder">${I.partage}</button>
    </header>

    ${enCours ? `
      <button class="carte encours" data-action="reprendre">
        <span class="pastille" style="--c:${enCours.couleur}"></span>
        <span class="encours-texte"><small>Séance en cours</small><strong>${esc(enCours.nom)}</strong></span>
        <span class="encours-temps" data-temps-seance>${duree((Date.now() - new Date(enCours.debut)) / 1000)}</span>
      </button>` : ''}

    <section class="carte programme">
      <div class="programme-tete">
        <div><small>Programme en cours</small><h2>${esc(p.nom)}</h2></div>
        <div class="jauge-mini"><strong>${faites.length}</strong><small>séance${faites.length > 1 ? 's' : ''}</small></div>
      </div>
      <p class="aide">${p.debut ? `Commencé le ${dateCourte(p.debut)}` : 'Pas encore commencé'}</p>
    </section>

    <h3 class="titre-section">Splits</h3>
    <ul class="liste-splits">
      ${p.splits.map((sp, i) => {
        const der = S.derniereDuSplit(p.id, sp.id);
        const jours = der ? Math.round((new Date().setHours(12) - new Date(`${der.date}T12:00:00`)) / 864e5) : null;
        return `
        <li class="carte split ${i === idxSuivant ? 'suivant' : ''}">
          <span class="pastille" style="--c:${sp.couleur}"></span>
          <span class="split-texte">
            <strong>${esc(sp.nom)}</strong>
            <small>${der ? `${dateCourte(der.date)} · ${jours === 0 ? "aujourd'hui" : `il y a ${jours} j`}` : 'Jamais fait'}</small>
          </span>
          ${i === idxSuivant ? '<span class="badge">Suivant</span>' : ''}
          <button class="btn ${i === idxSuivant ? 'btn-principal' : ''} btn-petit" data-action="demarrer" data-split="${sp.id}">Démarrer</button>
        </li>`;
      }).join('')}
    </ul>

    <h3 class="titre-section">Historique</h3>
    ${faites.length ? `<ul class="historique">
      ${faites.slice().reverse().map((s) => {
        const b = bilan(s);
        return `<li><button class="ligne-histo" data-action="voir" data-id="${s.id}">
          <span class="pastille" style="--c:${s.couleur}"></span>
          <span class="histo-texte"><strong>${esc(s.nom)}</strong><small>${dateCourte(s.date)} · ${dureeSeance(b.dureeSec)}</small></span>
          <span class="histo-chiffres"><strong>${kg(Math.round(b.tonnage))} kg</strong>${s.ressenti ? `<small>ressenti ${s.ressenti}/10</small>` : ''}</span>
        </button></li>`;
      }).join('')}
    </ul>` : '<p class="vide">Tes séances terminées apparaîtront ici.</p>'}

    <div class="pied">
      <div class="teintes">Teinte
        ${[['peche', 'Pêche', '#f79a78'], ['orange', 'Orange', '#ff6a3d']].map(([k, l, c]) => `<button class="puce ${teinte() === k ? 'choisi' : ''}" data-action="teinte" data-teinte="${k}"><span class="apercu" style="background:${c}"></span>${l}</button>`).join('')}
      </div>
      <button class="lien" data-action="reinitialiser">Réinitialiser la démo</button>
    </div>`;
  flottant.innerHTML = '';
  if (resumeAOuvrir) {
    const r = S.seance(resumeAOuvrir);
    resumeAOuvrir = null;
    if (r) fenetreResume(r, true);
  }
}

// --- Séance -------------------------------------------------------------------------

const typeBloc = (n) => (n === 2 ? 'Biset' : n === 3 ? 'Triset' : n >= 4 ? 'Circuit' : '');
const lettre = (i) => String.fromCharCode(65 + i);

function nbTours(b) { return Math.max(...b.exos.map((e) => e.series.length)); }
const actifs = (b) => b.exos.filter((e) => !e.remplacePar);
function blocFini(b) { return actifs(b).every((e) => e.series.length && e.series.every((x) => x.fait)); }

function ligneSerie(b, e, si, prefixe) {
  const s = e.series[si];
  if (!s) return '';
  const change = s.prevu && texteSerie(e, s) !== texteSerie(e, s.prevu);
  return `
    <div class="serie ${s.fait ? 'faite' : ''}">
      <span class="serie-num">${prefixe}</span>
      <button class="serie-valeur" data-action="editer-serie" data-bloc="${b.id}" data-exo="${e.id}" data-i="${si}">
        ${texteSerie(e, s)}${e.uni ? '<em>/côté</em>' : ''}${change ? '<i class="modifie" title="Différent du prévu"></i>' : ''}
      </button>
      <button class="coche" data-action="cocher" data-bloc="${b.id}" data-exo="${e.id}" data-i="${si}" aria-label="Valider la série">${I.check}</button>
    </div>`;
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

function carteBloc(s, b, idx) {
  if (!actifs(b).length) {
    const tous = s.blocs.flatMap((x) => x.exos);
    return `
    <article class="carte bloc remplace" data-bloc-id="${b.id}">
      ${b.exos.map((e) => `<p><s>${esc(e.nom)}</s> <span class="etiquette">remplacé par ${esc(tous.find((x) => x.id === e.remplacePar)?.nom || '')}</span></p>`).join('')}
      ${reorganiser ? `<span class="bloc-deplacer">
          <button class="btn-rond petit" data-action="monter" data-bloc="${b.id}" aria-label="Monter" ${idx === 0 ? 'disabled' : ''}>${I.haut}</button>
          <button class="btn-rond petit" data-action="descendre" data-bloc="${b.id}" aria-label="Descendre" ${idx === s.blocs.length - 1 ? 'disabled' : ''}>${I.bas}</button></span>` : ''}
    </article>`;
  }
  const multi = b.exos.length > 1;
  const fini = blocFini(b);
  const tete = `
    <div class="bloc-tete">
      ${multi ? `<span class="bloc-type">${typeBloc(b.exos.length)}</span>` : `<button class="exo-nom" data-action="editer-exo" data-bloc="${b.id}" data-exo="${b.exos[0].id}">${esc(b.exos[0].nom)}</button>`}
      <span class="bloc-repos">${I.chrono} ${duree(b.repos)}</span>
      ${reorganiser ? `
        <span class="bloc-deplacer">
          <button class="btn-rond petit" data-action="monter" data-bloc="${b.id}" aria-label="Monter" ${idx === 0 ? 'disabled' : ''}>${I.haut}</button>
          <button class="btn-rond petit" data-action="descendre" data-bloc="${b.id}" aria-label="Descendre" ${idx === s.blocs.length - 1 ? 'disabled' : ''}>${I.bas}</button>
        </span>` : ''}
    </div>`;

  let corps;
  if (!multi) {
    const e = b.exos[0];
    corps = `
      ${etiquettes(e, s) ? `<div class="etiquettes">${etiquettes(e, s)}</div>` : ''}
      ${e.note ? `<p class="exo-note">${esc(e.note)}</p>` : ''}
      ${reorganiser ? '' : `<div class="series">${e.series.map((_, i) => ligneSerie(b, e, i, i + 1)).join('')}</div>`}`;
  } else {
    corps = `
      <ul class="exos-multi">
        ${b.exos.map((e, i) => `<li><span class="lettre">${lettre(i)}</span>
          <button class="exo-nom" data-action="editer-exo" data-bloc="${b.id}" data-exo="${e.id}">${esc(e.nom)}</button>
          ${etiquettes(e, s)}</li>
          ${e.note ? `<li class="exo-note">${esc(e.note)}</li>` : ''}`).join('')}
      </ul>
      ${reorganiser ? '' : `<div class="series">
        ${Array.from({ length: nbTours(b) }, (_, t) => `
          <div class="tour">${b.exos.map((e, i) => ligneSerie(b, e, t, `${t + 1}${lettre(i)}`)).join('')}</div>`).join('')}
      </div>`}`;
  }

  return `
    <article class="carte bloc ${fini ? 'fini' : ''}" data-bloc-id="${b.id}">
      ${tete}${corps}
      ${reorganiser ? '' : `<div class="bloc-pied"><button class="lien" data-action="ajouter-serie" data-bloc="${b.id}">${I.plusPetit} série</button></div>`}
    </article>`;
}

function vueSeance() {
  const s = S.seanceEnCours();
  if (!s) return aller('#/');
  gererVeille();
  const b = bilan(s);
  const reglages = S.get().reglages;
  app.innerHTML = `
    <header class="entete seance-tete">
      <button class="btn-rond" data-action="accueil" aria-label="Accueil">${I.retour}</button>
      <div class="seance-titre">
        <small>${dateCourte(s.date)} · <span data-temps-seance>${duree(b.dureeSec)}</span></small>
        <h1><span class="pastille" style="--c:${s.couleur}"></span>${esc(s.nom)}</h1>
      </div>
      <button class="btn-rond ${reglages.antiVeille ? 'actif' : ''}" data-action="veille" aria-label="Garder l'écran allumé" aria-pressed="${reglages.antiVeille}">${I.ecran}</button>
      <button class="btn-rond" data-action="menu-seance" aria-label="Plus d'actions">${I.menu}</button>
    </header>

    <div class="progression"><span style="width:${b.series ? (b.faites / b.series) * 100 : 0}%"></span></div>
    <p class="resume-seance"><strong>${b.faites}</strong>/${b.series} séries · <strong>${kg(Math.round(b.tonnage))}</strong> kg</p>

    ${reorganiser ? `<div class="bandeau">Touche les flèches pour changer l'ordre.<button class="btn btn-petit btn-principal" data-action="fin-reorganiser">Terminé</button></div>` : ''}

    <div class="blocs">${s.blocs.map((bl, i) => carteBloc(s, bl, i)).join('')}</div>

    ${reorganiser ? '' : `
      <button class="carte ajout" data-action="ajouter-exo">${I.plus} Ajouter un exercice</button>
      <button class="btn btn-principal btn-large" data-action="terminer">Terminer la séance</button>`}
    <div class="espace-chrono"></div>`;
  dessinerChrono();
}

function trouver(s, blocId, exoId) {
  const b = s.blocs.find((x) => x.id === blocId);
  return { b, e: b?.exos.find((x) => x.id === exoId) };
}

// --- Chrono -------------------------------------------------------------------------

function blocCourant(s) {
  if (s.chrono?.blocId) return s.blocs.find((b) => b.id === s.chrono.blocId);
  if (s.dernierBloc) return s.blocs.find((b) => b.id === s.dernierBloc) || s.blocs.find((b) => !blocFini(b));
  return s.blocs.find((b) => !blocFini(b)) || s.blocs[0];
}

function dessinerChrono() {
  const s = S.seanceEnCours();
  if (!s || location.hash.indexOf('#/seance') !== 0) { flottant.innerHTML = ''; return; }
  const b = blocCourant(s);
  const marche = !!s.chrono;
  flottant.innerHTML = `
    <div class="chrono ${marche ? 'marche' : ''}">
      <div class="chrono-info">
        <small>Repos</small>
        <span>prévu ${duree(b?.repos || 0)}</span>
      </div>
      <div class="chrono-temps" data-chrono>${marche ? duree((Date.now() - s.chrono.depart) / 1000) : '0:00'}</div>
      <button class="chrono-btn" data-action="chrono" aria-label="${marche ? 'Arrêter' : 'Démarrer'} le chrono">${marche ? I.stop : I.play}</button>
    </div>`;
}

function basculerChrono() {
  const s = S.seanceEnCours();
  if (!s) return;
  if (!s.chrono) {
    const b = blocCourant(s);
    s.chrono = { depart: Date.now(), blocId: b?.id || null };
  } else {
    const reel = Math.round((Date.now() - s.chrono.depart) / 1000);
    const b = s.blocs.find((x) => x.id === s.chrono.blocId);
    s.repos.push({ blocId: s.chrono.blocId, prevu: b?.repos || 0, reel, a: new Date().toISOString() });
    s.chrono = null;
    const ecart = reel - (b?.repos || 0);
    toast(`Repos ${duree(reel)} · ${ecart > 0 ? `+${duree(ecart)}` : ecart < 0 ? `−${duree(-ecart)}` : 'pile'} sur le prévu`);
  }
  S.enregistrer();
  dessinerChrono();
}

function tic() {
  const s = S.seanceEnCours();
  if (!s) return;
  const t = duree((Date.now() - new Date(s.debut)) / 1000);
  document.querySelectorAll('[data-temps-seance]').forEach((el) => { el.textContent = t; });
  const c = document.querySelector('[data-chrono]');
  if (c && s.chrono) {
    const ecoule = (Date.now() - s.chrono.depart) / 1000;
    c.textContent = duree(ecoule);
    const b = s.blocs.find((x) => x.id === s.chrono.blocId);
    c.classList.toggle('depasse', !!b && ecoule > b.repos);
  }
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

function ouvrir(html, onSubmit) {
  couche.innerHTML = `<div class="fenetre" role="dialog" aria-modal="true"><div class="poignee"></div>${html}</div>`;
  couche.hidden = false;
  document.body.classList.add('fige');
  couche.onclick = (ev) => { if (ev.target === couche) fermer(); };
  const f = couche.querySelector('form');
  if (f && onSubmit) f.onsubmit = (ev) => { ev.preventDefault(); onSubmit(new FormData(f), f); };
  return couche.querySelector('.fenetre');
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
        <button type="button" class="btn-rond" data-pas="-${pas}" data-champ="${nom}" aria-label="Moins">${I.moins}</button>
        <label class="stepper-champ"><input name="${nom}" inputmode="decimal" value="${valeur ?? 0}" autocomplete="off"><span>${unite}</span></label>
        <button type="button" class="btn-rond" data-pas="${pas}" data-champ="${nom}" aria-label="Plus">${I.plusPetit}</button>
      </div>
    </div>`;
}

function champsMesure(mesure, v) {
  if (mesure === 'temps') return stepper('sec', 'Durée', v.sec, 5, 's');
  if (mesure === 'pdc') return stepper('reps', 'Répétitions', v.reps, 1, 'reps');
  return stepper('kg', 'Charge', v.kg, 2.5, 'kg') + stepper('reps', 'Répétitions', v.reps, 1, 'reps');
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
  ouvrir(`
    <form>
      <h2>${esc(e.nom)} <small>série ${i + 1}</small></h2>
      ${v.prevu ? `<p class="aide">Prévu : ${texteSerie(e, v.prevu)}${e.uni ? ' par côté' : ''}</p>` : ''}
      ${champsMesure(e.mesure, v)}
      <button class="btn btn-principal btn-large">${v.fait ? 'Enregistrer' : 'Valider la série'}</button>
      <div class="actions-sec">
        ${v.fait ? '<button type="button" class="lien" data-f="defaire">Marquer non faite</button>' : ''}
        <button type="button" class="lien danger" data-f="supprimer">Supprimer la série</button>
      </div>
    </form>`, (fd) => {
    Object.assign(v, lireMesure(fd, e.mesure), { fait: true });
    s.dernierBloc = blocId;
    S.enregistrer(); fermer(); vueSeance();
  });
  couche.querySelector('[data-f="supprimer"]').onclick = () => {
    e.series.splice(i, 1);
    S.enregistrer(); fermer(); vueSeance();
  };
  const d = couche.querySelector('[data-f="defaire"]');
  if (d) d.onclick = () => { v.fait = false; S.enregistrer(); fermer(); vueSeance(); };
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
  ouvrir(`
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
  const candidats = s.blocs.flatMap((b) => b.exos.filter((e) => !e.remplace && !e.ponctuel && !e.series.every((x) => x.fait) && !e.remplacePar));
  ouvrir(`
    <form>
      <h2>Ajouter un exercice</h2>
      <label class="champ"><span>Exercice</span><input name="nom" required placeholder="Fentes marchées" autocomplete="off"></label>
      ${choixMesure('charge')}
      <div data-mesure-champs>${champsMesure('charge', { kg: 20, reps: 10 })}</div>
      ${stepper('nb', 'Séries faites', 3, 1, 'séries')}
      <label class="interrupteur"><input type="checkbox" name="uni"><span></span>Unilatéral</label>
      <input type="hidden" name="mode" value="">
      <p class="titre-choix">Cet exercice…</p>
      <button class="btn btn-large" data-mode="plus">vient en plus</button>
      ${candidats.length ? `<p class="titre-choix">…ou remplace :</p>
        <div class="choix-remplace">${candidats.map((e) => `<button class="puce" data-mode="r:${e.id}">${esc(e.nom)}</button>`).join('')}</div>` : ''}
    </form>`, (fd) => {
    const mode = fd.get('mode');
    const mesure = fd.get('mesure');
    const val = lireMesure(fd, mesure);
    const nb = Math.max(1, Math.round(num(fd.get('nb'))));
    const exo = {
      id: uid('e'), src: null, nom: fd.get('nom').trim(), mesure, uni: fd.get('uni') === 'on', note: '',
      series: Array.from({ length: nb }, () => ({ prevu: null, ...val, fait: true })),
    };
    const bloc = { id: uid('b'), src: null, repos: 60, exos: [exo] };
    let pos;
    if (mode.startsWith('r:')) {
      exo.remplace = mode.slice(2);
      const cible = s.blocs.flatMap((b) => b.exos).find((x) => x.id === exo.remplace);
      if (cible) cible.remplacePar = exo.id;
      pos = s.blocs.findIndex((b) => b.exos.some((x) => x.id === exo.remplace));
      bloc.repos = s.blocs[pos]?.repos || 60;
    } else {
      exo.ponctuel = true;
      const derFait = s.blocs.map((b) => b.exos.some((x) => x.series.some((y) => y.fait))).lastIndexOf(true);
      pos = derFait;
    }
    s.blocs.splice(pos + 1, 0, bloc);
    s.dernierBloc = bloc.id;
    S.enregistrer(); fermer(); vueSeance();
    toast(exo.remplace ? 'Ajouté en remplacement' : 'Ajouté en plus');
  });
  const f = couche.querySelector('form');
  f.querySelectorAll('[data-mode]').forEach((btn) => btn.addEventListener('click', () => { f.elements.mode.value = btn.dataset.mode; }));
  f.elements.mesure.addEventListener('change', () => {
    const m = f.elements.mesure.value;
    f.querySelector('[data-mesure-champs]').innerHTML = champsMesure(m, { kg: 20, reps: 10, sec: 30 });
  });
  setTimeout(() => f.elements.nom.focus(), 60);
}

function fenetreFin(s) {
  const b = bilan(s);
  const restantes = b.series - b.faites;
  ouvrir(`
    <form>
      <h2>Terminer la séance</h2>
      ${restantes ? `<p class="aide">${restantes} série${restantes > 1 ? 's' : ''} non validée${restantes > 1 ? 's' : ''} : elle${restantes > 1 ? 's' : ''} ne compteront pas.</p>` : ''}
      <p class="titre-choix">Ressenti</p>
      <div class="choix ressenti" data-groupe>
        <input type="hidden" name="ressenti" value="">
        ${Array.from({ length: 10 }, (_, i) => `<button type="button" class="puce" data-choix="${i + 1}">${i + 1}</button>`).join('')}
      </div>
      <div class="ressenti-legende"><span>KO</span><span>En feu</span></div>
      <label class="champ"><span>Note</span><textarea name="note" rows="2" placeholder="Fatigué, machine prise…"></textarea></label>
      <button class="btn btn-principal btn-large">Enregistrer la séance</button>
    </form>`, (fd) => {
    if (s.chrono) basculerChrono();
    S.terminer(s, { ressenti: parseInt(fd.get('ressenti'), 10) || null, note: fd.get('note').trim() });
    reorganiser = false;
    resumeAOuvrir = s.id;
    aller('#/');
  });
}

function fenetreResume(s, nouvelle = false) {
  const b = bilan(s);
  const ponct = s.blocs.flatMap((x) => x.exos).filter((e) => e.ponctuel);
  ouvrir(`
    <h2><span class="pastille" style="--c:${s.couleur}"></span>${esc(s.nom)} <small>${dateCourte(s.date)}</small></h2>
    ${nouvelle ? '<p class="aide">Séance enregistrée.</p>' : ''}
    <div class="tuiles">
      <div class="tuile"><small>Durée</small><strong>${dureeSeance(b.dureeSec)}</strong></div>
      <div class="tuile"><small>Tonnage</small><strong>${kg(Math.round(b.tonnage))} kg</strong></div>
      <div class="tuile"><small>Séries</small><strong>${b.faites}/${b.series}</strong></div>
      <div class="tuile"><small>Ressenti</small><strong>${s.ressenti ? `${s.ressenti}/10` : '–'}</strong></div>
      <div class="tuile large"><small>Repos moyen</small><strong>${b.nbRepos ? `${duree(b.reposMoyen)} <em>prévu ${duree(b.reposPrevuMoyen)}</em>` : 'Chrono non utilisé'}</strong></div>
    </div>
    ${ponct.length ? `<p class="aide">Ponctuel : ${ponct.map((e) => esc(e.nom)).join(', ')}</p>` : ''}
    ${s.note ? `<p class="note-seance">${esc(s.note)}</p>` : ''}
    <button class="btn btn-large" data-f="ok">Fermer</button>
    <div class="actions-sec"><button type="button" class="lien danger" data-f="suppr">Supprimer cette séance</button></div>`);
  couche.querySelector('[data-f="ok"]').onclick = fermer;
  couche.querySelector('[data-f="suppr"]').onclick = () => {
    if (confirmerDeux(couche.querySelector('[data-f="suppr"]'))) { S.supprimerSeance(s.id); fermer(); vueAccueil(); }
  };
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
  ouvrir(`
    <h2>${esc(s.nom)}</h2>
    <button class="btn btn-large" data-f="reorg">Réorganiser les blocs</button>
    <div class="actions-sec"><button class="lien danger" data-f="abandon">Abandonner la séance</button></div>`);
  couche.querySelector('[data-f="reorg"]').onclick = () => { reorganiser = true; fermer(); vueSeance(); };
  couche.querySelector('[data-f="abandon"]').onclick = (ev) => {
    if (confirmerDeux(ev.currentTarget)) { S.abandonner(s); fermer(); aller('#/'); }
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

app.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-action]');
  if (!el) return;
  const s = S.seanceEnCours();
  const d = el.dataset;
  switch (d.action) {
    case 'accueil': return aller('#/');
    case 'reprendre': return aller('#/seance');
    case 'sauvegarder': return sauvegarder();
    case 'teinte':
      S.get().reglages.teinte = d.teinte;
      S.enregistrer();
      appliquerTeinte();
      return vueAccueil();
    case 'reinitialiser':
      if (confirmerDeux(el)) { S.reinitialiser(); vueAccueil(); toast('Démo réinitialisée'); }
      return;
    case 'voir': return fenetreResume(S.seance(d.id));
    case 'demarrer':
      if (S.seanceEnCours()) return toast("Termine d'abord la séance en cours");
      S.demarrer(S.programmeEnCours().id, d.split);
      return aller('#/seance');
    case 'veille': {
      const r = S.get().reglages;
      r.antiVeille = !r.antiVeille;
      S.enregistrer();
      if (r.antiVeille && !('wakeLock' in navigator)) toast("Ce navigateur ne peut pas garder l'écran allumé");
      else toast(r.antiVeille ? 'Écran gardé allumé' : 'Mise en veille normale');
      return vueSeance();
    }
    case 'menu-seance': return fenetreMenuSeance(s);
    case 'fin-reorganiser': reorganiser = false; return vueSeance();
    case 'monter':
    case 'descendre': {
      const i = s.blocs.findIndex((b) => b.id === d.bloc);
      const j = d.action === 'monter' ? i - 1 : i + 1;
      if (j < 0 || j >= s.blocs.length) return;
      [s.blocs[i], s.blocs[j]] = [s.blocs[j], s.blocs[i]];
      S.enregistrer();
      return vueSeance();
    }
    case 'cocher': {
      const { e } = trouver(s, d.bloc, d.exo);
      const v = e.series[+d.i];
      v.fait = !v.fait;
      if (v.fait) s.dernierBloc = d.bloc;
      S.enregistrer();
      return vueSeance();
    }
    case 'editer-serie': return fenetreSerie(s, d.bloc, d.exo, +d.i);
    case 'editer-exo': return fenetreExo(s, d.bloc, d.exo);
    case 'ajouter-serie': {
      const b = s.blocs.find((x) => x.id === d.bloc);
      b.exos.forEach((e) => {
        const der = e.series[e.series.length - 1] || {};
        e.series.push({ prevu: null, kg: der.kg, reps: der.reps, sec: der.sec, fait: false });
      });
      S.enregistrer();
      return vueSeance();
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

appliquerTeinte();
suivreZoneVisible();
route();
setInterval(tic, 250);

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
