// État de l'appli, gardé dans le stockage local du navigateur.
import { programmeDemo, COULEURS_SPLITS } from './demo.js';
import { nouvelleSeance, aujourdhui, uid, bilan } from './calc.js';

const CLE = 'sport-etat';
let etat = charger();
// Ancienne version : une modification occupait la place de la séance en cours.
if (etat.encours && etat.seances?.find((x) => x.id === etat.encours)?.edition) { etat.edition = etat.encours; etat.encours = null; }

function vierge() {
  return { version: 1, programmes: [programmeDemo()], seances: [], activites: [], encours: null, reglages: { antiVeille: false, couleur: 'C1' } };
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
    .filter((s) => s.programmeId === programmeId && s.fin && s.id !== etat.encours)
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
  if (s.edition) {
    // Modification d'une séance déjà terminée : les dates restent.
    delete s.edition;
    s.ressenti = ressenti; s.note = note || ''; s.chrono = null;
    etat.edition = null; delete etat.copieEdition;
    enregistrer();
    return;
  }
  if (!s.debut) lancer(s);
  // Séance saisie à une autre date : on garde les heures saisies.
  if (!s.passee) s.fin = new Date().toISOString();
  else if (!s.fin) s.fin = s.debut;
  s.ressenti = ressenti;
  s.note = note || '';
  // La date prévue de ce split est consommée : la séance est faite.
  const p = programme(s.programmeId);
  const sp = p?.splits.find((x) => x.id === s.splitId);
  if (sp?.prevu) { sp.prevu = null; if (p.plan?.splits) delete p.plan.splits[sp.id]; }
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
    seances: l.length, jours, tonnage, activites: activitesDe(p).length,
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

// --- Dates, activités libres, chronologie ----------------------------------------------

const iso = (date, heure) => (heure ? new Date(`${date}T${heure}:00`) : new Date(`${date}T12:00:00`)).toISOString();
export const heure = (isoTexte) => {
  if (!isoTexte) return '';
  const d = new Date(isoTexte);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/** Place une séance à une date (et des heures) choisies. */
export function dater(s, date, heureDebut, heureFin) {
  const terminee = !!s.fin;
  s.date = date;
  if (!terminee && date === aujourdhui() && !heureDebut) { s.passee = false; enregistrer(); return; }
  const dureeAvant = terminee && s.debut ? new Date(s.fin) - new Date(s.debut) : 0;
  s.passee = true;
  s.debut = iso(date, heureDebut);
  // Une séance antérieure au début du programme recule ce début.
  const p = programme(s.programmeId);
  if (p && (!p.debut || date < p.debut)) p.debut = date;
  if (heureFin) s.fin = new Date(Math.max(new Date(iso(date, heureFin)), new Date(s.debut))).toISOString();
  else if (terminee) s.fin = new Date(new Date(s.debut).getTime() + dureeAvant).toISOString();
  else s.fin = null;
  enregistrer();
}

const activitesListe = () => (etat.activites ||= []);
export const activite = (id) => activitesListe().find((a) => a.id === id);

export function enregistrerActivite(a) {
  const l = activitesListe();
  if (!a.id) { a.id = uid('a'); l.push(a); }
  enregistrer();
  return a;
}

export function supprimerActivite(id) {
  etat.activites = activitesListe().filter((a) => a.id !== id);
  enregistrer();
}

/** Activités libres faites pendant un programme (entre son début et sa fin). */
export function activitesDe(p) {
  if (!p.debut) return [];
  return activitesListe()
    .filter((a) => a.date >= p.debut && (!p.fin || a.date <= p.fin))
    .sort((x, y) => (x.date + (x.heureDebut || '12:00')).localeCompare(y.date + (y.heureDebut || '12:00')));
}

/** Chronologie d'un programme : séances terminées et activités libres, de la plus ancienne à la plus récente. */
export function chronologie(p) {
  const cle = (x) => x.type === 'seance' ? x.item.date + heure(x.item.debut) : x.item.date + (x.item.heureDebut || '12:00');
  return [
    ...seancesDe(p.id).map((item) => ({ type: 'seance', item })),
    ...activitesDe(p).map((item) => ({ type: 'activite', item })),
  ].sort((a, b) => cle(a).localeCompare(cle(b)));
}

// --- Calendrier --------------------------------------------------------------------------

export function plan(p) {
  p.plan ||= { splits: {}, libres: [], bloques: [] };
  return p.plan;
}

/** À l'ouverture du calendrier : le plan repart des dates appliquées. */
export function synchroniserPlan(p) {
  const pl = plan(p);
  pl.splits = {};
  for (const sp of p.splits) if (sp.prevu) pl.splits[sp.id] = sp.prevu;
  enregistrer();
}

export function appliquerPlan(p) {
  const pl = plan(p);
  for (const sp of p.splits) sp.prevu = pl.splits[sp.id] || null;
  enregistrer();
}

// --- Modifier une séance terminée -------------------------------------------------------

export const seanceEdition = () => (etat.edition ? seance(etat.edition) : null);

/** Ouvre une séance terminée en modification, à part de la séance en cours (temps arrêté). */
export function rouvrirSeance(s) {
  const autre = seanceEdition();
  if (autre && autre !== s) annulerEdition(autre);
  if (!s.edition) {
    etat.copieEdition = JSON.stringify(s);
    s.edition = true;
    s.blocs.forEach((b) => { b.replie = true; });
  }
  etat.edition = s.id;
  enregistrer();
  return true;
}

export function annulerEdition(s) {
  const i = etat.seances.findIndex((x) => x.id === s.id);
  if (i >= 0 && etat.copieEdition) etat.seances[i] = JSON.parse(etat.copieEdition);
  delete etat.copieEdition;
  etat.edition = null;
  enregistrer();
}

// --- Corps : points de mesure et mesures ---------------------------------------------------

const POINTS_DEFAUT = [
  ['Poids', 'kg', 'Général'], ['Masse grasse', '%', 'Général'], ['Tour de taille', 'cm', 'Tronc'],
  ['Cou', 'cm', 'Tronc'], ['Épaules', 'cm', 'Tronc'], ['Poitrine', 'cm', 'Tronc'], ['Hanches', 'cm', 'Tronc'],
  ['Bras droit, haut', 'cm', 'Bras'], ['Bras droit, milieu', 'cm', 'Bras'], ['Bras droit, bas', 'cm', 'Bras'],
  ['Bras gauche, milieu', 'cm', 'Bras'], ['Avant-bras', 'cm', 'Bras'],
  ['Cuisse droite, haut', 'cm', 'Jambes'], ['Cuisse droite, milieu', 'cm', 'Jambes'], ['Mollet', 'cm', 'Jambes'],
];

export function corps() {
  etat.corps ||= { points: POINTS_DEFAUT.map(([nom, unite, groupe], i) => ({ id: `m${i + 1}`, nom, unite, groupe, actif: true })), mesures: [] };
  return etat.corps;
}

export function enregistrerMesure(m) {
  const c = corps();
  if (!m.id) { m.id = uid('mes'); c.mesures.push(m); }
  c.mesures.sort((a, b) => a.date.localeCompare(b.date));
  enregistrer();
}

export function supprimerMesure(id) {
  const c = corps();
  c.mesures = c.mesures.filter((m) => m.id !== id);
  enregistrer();
}

/** Valeurs d'un point dans le temps : [{ date, valeur, mesureId }]. */
export function serieCorps(pointId) {
  return corps().mesures.filter((m) => m.valeurs[pointId] != null).map((m) => ({ date: m.date, valeur: m.valeurs[pointId], mesureId: m.id }));
}

/**
 * Évolution d'un point pendant un programme : dernière mesure au plus tard au début
 * (ou première pendant), comparée à la dernière mesure jusqu'à la fin.
 */
export function evolutionPendant(p, pointId) {
  if (!p.debut) return null;
  const fin = p.fin || aujourdhui();
  const serie = serieCorps(pointId);
  const avant = serie.filter((x) => x.date <= p.debut);
  const pendant = serie.filter((x) => x.date > p.debut && x.date <= fin);
  const depart = avant[avant.length - 1] || pendant[0];
  const arrivee = pendant[pendant.length - 1];
  if (!depart || !arrivee || depart === arrivee) return null;
  return { depart, arrivee, ecart: arrivee.valeur - depart.valeur };
}
