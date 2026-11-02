// Calculs des stats d'un programme. Fonctions pures : aucune dépendance au DOM ni au stockage.
import { bilan, texteSerie, volumeSerie, enKg, chargeRep } from './calc.js';

export const UNITES = { charge: 'kg', pdc: 'reps', temps: 's' };

/** Volume d'un exercice dans une séance : tonnage (charge ou poids du corps chiffré), reps ou secondes. */
export function volumeExo(e, date) {
  return e.series.reduce((a, s) => a + volumeSerie(e, s, date), 0);
}

export const uniteExo = (e, date) => (enKg(e, date) ? 'kg' : e.mesure === 'temps' ? 's' : 'reps');

const chargeMax = (e, date) => (enKg(e, date) ? Math.max(0, ...e.series.filter((s) => s.fait).map((s) => chargeRep(e, s, date) || 0)) : null);
const faites = (e) => e.series.filter((s) => s.fait);

/**
 * Couloirs : un par exercice du modèle, sur tout le programme.
 * Un exercice qui en remplace un autre compte dans le couloir du remplacé (point marqué).
 * Les exercices « en plus » sont rendus à part (ponctuels).
 */
export function couloirs(p, seances) {
  const parId = new Map();
  const ordre = [];
  // Ordre et noms : ceux du modèle actuel d'abord.
  for (const sp of p.splits) for (const b of sp.blocs) for (const e of b.exos) {
    const c = { id: e.id, nom: e.nom, mesure: e.mesure, splitId: sp.id, points: [] };
    parId.set(e.id, c);
    ordre.push(c);
  }
  const ponctuels = [];
  for (const s of seances) {
    const tous = s.blocs.flatMap((b) => b.exos);
    for (const e of tous) {
      if (e.remplacePar) continue;
      if (e.ponctuel) {
        if (faites(e).length) ponctuels.push({ nom: e.nom, date: s.date, seanceId: s.id, volume: volumeExo(e, s.date), mesure: e.mesure, unite: uniteExo(e, s.date), texte: faites(e).map((x) => texteSerie(e, x)).join(', ') });
        continue;
      }
      let cle = e.src;
      let remplace = null;
      if (e.remplace) {
        const cible = tous.find((x) => x.id === e.remplace);
        cle = cible?.src;
        remplace = e.nom;
      }
      if (!cle) continue;
      if (!faites(e).length) continue;
      let c = parId.get(cle);
      if (!c) { // exercice retiré du modèle depuis : on garde son historique
        c = { id: cle, nom: e.nom, mesure: e.mesure, splitId: s.splitId, points: [], retire: true };
        parId.set(cle, c);
        ordre.push(c);
      }
      const precedent = c.points[c.points.length - 1];
      c.points.push({
        seanceId: s.id, date: s.date, volume: volumeExo(e, s.date), mesure: e.mesure, unite: uniteExo(e, s.date), remplace,
        chargeMax: chargeMax(e, s.date), uni: !!e.uni,
        changement: !!precedent && !remplace && !precedent.remplace && (precedent.uni !== !!e.uni || precedent.unite !== uniteExo(e, s.date)),
        texte: faites(e).map((x) => texteSerie(e, x)).join(', '),
        nbSeries: faites(e).length, nbPrevues: e.series.length,
      });
    }
  }
  for (const c of ordre) {
    c.unite = c.points[c.points.length - 1]?.unite || (c.mesure === 'temps' ? 's' : c.mesure === 'pdc' ? 'reps' : 'kg');
    const pts = c.points.filter((x) => !x.remplace && x.unite === c.unite);
    c.debut = pts[0]?.volume ?? null;
    c.fin = pts[pts.length - 1]?.volume ?? null;
    c.evolution = pts.length > 1 && c.debut ? (c.fin - c.debut) / c.debut : null;
  }
  return { couloirs: ordre, ponctuels };
}

/** Tonnage de chaque séance, regroupé par split. */
export function tonnageParSplit(p, seances) {
  return p.splits.map((sp) => ({
    split: sp,
    points: seances.filter((s) => s.splitId === sp.id).map((s) => ({ seanceId: s.id, date: s.date, valeur: bilan(s).tonnage })),
  }));
}

/** Repos moyen réel et prévu de chaque séance où le repos a été mesuré. */
export function reposParSeance(seances) {
  return seances.map((s) => ({ s, b: bilan(s) })).filter((x) => x.b.nbRepos)
    .map(({ s, b }) => ({ seanceId: s.id, date: s.date, nom: s.nom, reel: b.reposMoyen, prevu: b.reposPrevuMoyen }));
}

/**
 * Ressenti et performance. La performance d'une séance = son tonnage rapporté à la moyenne
 * de son split (100 % = séance habituelle), pour comparer Legs et Push sur la même échelle.
 */
export function ressentiPerformance(seances) {
  const moyennes = new Map();
  for (const s of seances) {
    const m = moyennes.get(s.splitId) || { total: 0, n: 0 };
    m.total += bilan(s).tonnage; m.n += 1;
    moyennes.set(s.splitId, m);
  }
  const points = seances.filter((s) => s.ressenti).map((s) => {
    const m = moyennes.get(s.splitId);
    const moy = m.total / m.n;
    const b = bilan(s);
    return { seanceId: s.id, date: s.date, nom: s.nom, ressenti: s.ressenti, perf: moy ? b.tonnage / moy : 1, repos: b.nbRepos ? b.reposMoyen : null };
  });
  const moyenne = (l) => (l.length ? l.reduce((a, b) => a + b, 0) / l.length : null);
  const bonnes = points.filter((x) => x.perf >= 1.02), moins = points.filter((x) => x.perf <= 0.98);
  const bas = points.filter((x) => x.ressenti <= 4 && x.repos != null), hauts = points.filter((x) => x.ressenti >= 7 && x.repos != null);
  return {
    points,
    ressentiBonnes: moyenne(bonnes.map((x) => x.ressenti)), nbBonnes: bonnes.length,
    ressentiMoins: moyenne(moins.map((x) => x.ressenti)), nbMoins: moins.length,
    reposBas: moyenne(bas.map((x) => x.repos)), reposHauts: moyenne(hauts.map((x) => x.repos)),
  };
}
