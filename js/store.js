// État de l'appli, gardé dans le stockage local du navigateur.
import { programmeDemo } from './demo.js';
import { nouvelleSeance, aujourdhui } from './calc.js';

const CLE = 'sport-etat';
let etat = charger();

function vierge() {
  return { version: 1, programmes: [programmeDemo()], seances: [], encours: null, reglages: { antiVeille: false } };
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
export const programmeEnCours = () => etat.programmes.find((p) => p.statut === 'en-cours') || etat.programmes[0];
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

export function demarrer(programmeId, splitId) {
  const p = programme(programmeId);
  const split = p.splits.find((s) => s.id === splitId);
  const s = nouvelleSeance(p, split, derniereDuSplit(programmeId, splitId));
  if (!p.debut) p.debut = aujourdhui();
  etat.seances.push(s);
  etat.encours = s.id;
  enregistrer();
  return s;
}

export function terminer(s, { ressenti, note }) {
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

export function nomSauvegarde() {
  return `${aujourdhui().replaceAll('-', '')} - Export Sport.txt`;
}

export function contenuSauvegarde() {
  return JSON.stringify({ appli: 'Sport', exporte: new Date().toISOString(), ...etat }, null, 2);
}
