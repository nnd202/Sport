// État de l'appli, gardé dans le stockage local du navigateur.
import { programmeDemo, COULEURS_SPLITS } from './demo.js';
import { nouvelleSeance, aujourdhui, uid, bilan } from './calc.js';

const CLE = 'sport-etat';
let etat = charger();

function vierge() {
  return { version: 1, programmes: [programmeDemo()], seances: [], encours: null, reglages: { antiVeille: false, couleur: 'C1' } };
}

function charger() {
  try {
    const brut = localStorage.getItem(CLE);
    if (brut) return JSON.parse(brut);
  } catch { /* stockage indisponible ou illisible */ }
  return vierge();
}

export function enregistrer() {
  try { localStorage.setItem(CLE, JSON.stringify(etat)); } catch { /* plein ou bloqué */ }
}

export const get = () => etat;
export const programme = (id) => etat.programmes.find((p) => p.id === id);
export const programmeEnCours = () => etat.programmes.find((p) => p.statut === 'en-cours') || null;
export const seance = (id) => etat.seances.find((s) => s.id === id);
export const seanceEnCours = () => (etat.encours ? seance(etat.encours) : null);

export function seancesDe(programmeId) {
  return etat.seances
    .filter((s) => s.programmeId === programmeId && s.fin)
    .sort((a, b) => (a.date + a.debut).localeCompare(b.date + b.debut));
}

export function derniereDuSplit(programmeId, splitId) {
  const l = seancesDe(programmeId).filter((s) => s.splitId === splitId);
  return l[l.length - 1] || null;
}

// Ouvre une séance sans lancer le temps : on peut l'ajuster avant de commencer.
export function ouvrir(programmeId, splitId) {
  const p = programme(programmeId);
  const split = p.splits.find((s) => s.id === splitId);
  const s = nouvelleSeance(p, split, derniereDuSplit(programmeId, splitId));
  s.debut = null;
  etat.seances.push(s);
  etat.encours = s.id;
  enregistrer();
  return s;
}

export function lancer(s) {
  if (s.debut) return;
  s.debut = new Date().toISOString();
  s.date = aujourdhui();
  const p = programme(s.programmeId);
  if (p && !p.debut) p.debut = s.date;
  enregistrer();
}

export function ordonnerSplits(programmeId, ids) {
  const p = programme(programmeId);
  p.splits.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
  enregistrer();
}

export function terminer(s, { ressenti, note }) {
  if (!s.debut) lancer(s);
  s.fin = new Date().toISOString();
  s.ressenti = ressenti;
  s.note = note || '';
  s.chrono = null;
  etat.encours = null;
  enregistrer();
}

export function abandonner(s) {
  etat.seances = etat.seances.filter((x) => x.id !== s.id);
  etat.encours = null;
  enregistrer();
}

export function supprimerSeance(id) {
  etat.seances = etat.seances.filter((x) => x.id !== id);
  if (etat.encours === id) etat.encours = null;
  enregistrer();
}

export function reinitialiser() {
  etat = vierge();
  enregistrer();
}

// --- Sauvegarde -----------------------------------------------------------------

export function contenuSauvegarde() {
  return JSON.stringify({ appli: 'Sport', exporte: new Date().toISOString(), ...etat }, null, 2);
}

// --- Configuration --------------------------------------------------------------------

export function creerProgramme(nom) {
  const p = { id: uid('p'), nom, statut: etat.programmes.some((x) => x.statut === 'en-cours') ? 'preparation' : 'preparation', debut: null, fin: null, splits: [] };
  etat.programmes.push(p);
  enregistrer();
  return p;
}

export function supprimerProgramme(id) {
  etat.programmes = etat.programmes.filter((p) => p.id !== id);
  etat.seances = etat.seances.filter((x) => x.programmeId !== id);
  if (etat.encours && !seance(etat.encours)) etat.encours = null;
  enregistrer();
}

export function couleurLibre(p) {
  const prises = new Set(p.splits.map((s) => s.couleur));
  return COULEURS_SPLITS.find((c) => !prises.has(c)) || COULEURS_SPLITS[p.splits.length % COULEURS_SPLITS.length];
}

export function creerSplit(p, nom, couleur) {
  const sp = { id: uid('s'), nom, couleur: couleur || couleurLibre(p), blocs: [] };
  p.splits.push(sp);
  enregistrer();
  return sp;
}

export function supprimerSplit(p, splitId) {
  p.splits = p.splits.filter((s) => s.id !== splitId);
  enregistrer();
}

/** Bilan d'un programme : séances, jours, rythme, tonnage moyen, progression par split, repos, ressenti. */
export function bilanProgramme(p, jusqua = p.fin || aujourdhui()) {
  const l = seancesDe(p.id);
  const jours = p.debut ? Math.round((new Date(`${jusqua}T12:00:00`) - new Date(`${p.debut}T12:00:00`)) / 864e5) + 1 : 0;
  const bilans = l.map((x) => bilan(x));
  const tonnage = bilans.reduce((a, b) => a + b.tonnage, 0);
  const repos = bilans.filter((b) => b.nbRepos);
  const ressentis = l.filter((x) => x.ressenti).map((x) => x.ressenti);
  const parSplit = p.splits.map((sp) => {
    const ls = l.filter((x) => x.splitId === sp.id);
    if (!ls.length) return { split: sp, nb: 0 };
    const debut = bilan(ls[0]).tonnage, fin = bilan(ls[ls.length - 1]).tonnage;
    return { split: sp, nb: ls.length, debut, fin, evolution: debut ? (fin - debut) / debut : null };
  });
  return {
    seances: l.length, jours, tonnage,
    parSemaine: jours ? (l.length / jours) * 7 : 0,
    moyenne: l.length ? tonnage / l.length : 0,
    dureeMoyenne: l.length ? bilans.reduce((a, b) => a + b.dureeSec, 0) / l.length : 0,
    reposMoyen: repos.length ? repos.reduce((a, b) => a + b.reposMoyen, 0) / repos.length : 0,
    reposPrevu: repos.length ? repos.reduce((a, b) => a + b.reposPrevuMoyen, 0) / repos.length : 0,
    ressenti: ressentis.length ? ressentis.reduce((a, b) => a + b, 0) / ressentis.length : null,
    parSplit,
  };
}

export function remplacerTout(donnees) {
  if (!donnees || !Array.isArray(donnees.programmes) || !Array.isArray(donnees.seances)) throw new Error('format');
  const { appli, exporte, ...reste } = donnees;
  etat = { version: 1, encours: null, reglages: { antiVeille: false }, ...reste };
  if (etat.encours && !seance(etat.encours)) etat.encours = null;
  enregistrer();
}

/** Bascule : clôture le programme en cours (s'il y en a un) et démarre p à la date donnée. */
export function basculer(p, date) {
  const ancien = programmeEnCours();
  if (ancien && ancien !== p) { ancien.statut = 'termine'; ancien.fin = date; }
  p.statut = 'en-cours';
  p.debut = date;
  p.fin = null;
  enregistrer();
  return ancien;
}

export function rouvrir(p) {
  const actuel = programmeEnCours();
  if (actuel && actuel !== p) { actuel.statut = 'preparation'; }
  p.statut = 'en-cours';
  p.fin = null;
  enregistrer();
}
