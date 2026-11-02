// Calculs purs : préremplissage, tonnage, formats. Aucun accès au DOM ni au stockage.

export const uid = (p = 'x') => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const MESURES = {
  charge: 'Charge × reps',
  pdc: 'Poids du corps',
  temps: 'Temps',
};

export function aujourdhui(d = new Date()) {
  const z = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

export function duree(sec) {
  sec = Math.max(0, Math.round(sec));
  const m = Math.floor(sec / 60), s = sec % 60;
  if (m >= 60) return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function dureeSeance(sec) {
  const m = Math.floor(Math.max(0, sec) / 60);
  return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}` : `${m} min`;
}

export function dateCourte(iso) {
  const d = new Date(`${iso}T12:00:00`);
  const j = d.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '');
  return `${j} ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export const kg = (n) => (Math.round(n * 100) / 100).toLocaleString('fr-FR');

/** Texte d'une série : « 45 kg × 12 », « 45 s », « 10 reps », « 10 reps +10 kg ». */
export function texteSerie(exo, s) {
  if (exo.mesure === 'temps') return `${s.sec ?? 0} s`;
  if (exo.mesure === 'pdc') return `${s.reps ?? 0} reps${s.lest ? ` +${kg(s.lest)} kg` : ''}`;
  return `${kg(s.kg ?? 0)} kg × ${s.reps ?? 0}`;
}

// Poids du corps à une date (dernière pesée au plus tard ce jour-là), fourni par le stockage.
let poidsAu = () => null;
export function definirPoids(fn) { poidsAu = fn; }

/**
 * Charge d'une répétition, en kg, ou null si elle ne se calcule pas.
 * Poids du corps : poids × pourcentage de l'exercice + lest éventuel.
 */
export function chargeRep(exo, s, date) {
  if (exo.mesure === 'charge') return s.kg || 0;
  if (exo.mesure !== 'pdc' || !exo.pct) return null;
  const poids = poidsAu(date);
  if (!poids) return null;
  return (poids * exo.pct) / 100 + (s.lest || 0);
}

/** Volume d'une série faite : tonnage si la charge est connue, sinon reps (pdc) ou secondes (temps). */
export function volumeSerie(exo, s, date) {
  if (!s.fait) return 0;
  const cotes = exo.uni ? 2 : 1;
  if (exo.mesure === 'temps') return (s.sec || 0) * cotes;
  const c = chargeRep(exo, s, date);
  if (c == null) return (s.reps || 0) * cotes;
  return c * (s.reps || 0) * cotes;
}

/** L'exercice se compte-t-il en kg (tonnage) à cette date ? */
export const enKg = (exo, date) => exo.mesure === 'charge' || (exo.mesure === 'pdc' && chargeRep(exo, {}, date) != null);

export function bilan(seance) {
  let tonnage = 0, tonnageCorps = 0, series = 0, faites = 0;
  for (const b of seance.blocs) for (const e of b.exos) if (!e.remplacePar) for (const s of e.series) {
    series++;
    if (s.fait) faites++;
    if (s.fait && enKg(e, seance.date)) {
      const v = volumeSerie(e, s, seance.date);
      tonnage += v;
      if (e.mesure === 'pdc') tonnageCorps += v;
    }
  }
  const repos = seance.repos || [];
  const reel = repos.reduce((a, r) => a + r.reel, 0);
  const prevu = repos.reduce((a, r) => a + (r.prevu || 0), 0);
  const fin = seance.fin ? new Date(seance.fin) : new Date();
  const debut = seance.debut ? new Date(seance.debut) : fin;
  return {
    tonnage, tonnageCorps, series, faites,
    dureeSec: (fin - debut) / 1000,
    reposMoyen: repos.length ? reel / repos.length : 0,
    reposPrevuMoyen: repos.length ? prevu / repos.length : 0,
    nbRepos: repos.length,
  };
}

/**
 * Crée une séance à partir du modèle actuel du split.
 * Chaque série est préremplie avec ce qui a été fait la dernière fois (même exercice, même rang),
 * sinon avec la valeur prévue du modèle.
 */
export function nouvelleSeance(programme, split, derniere) {
  const passe = new Map();
  if (derniere) for (const b of derniere.blocs) for (const e of b.exos) if (e.src && !e.remplace) passe.set(e.src, e);
  return {
    id: uid('se'),
    programmeId: programme.id,
    splitId: split.id,
    nom: split.nom,
    couleur: split.couleur,
    date: aujourdhui(),
    debut: new Date().toISOString(),
    fin: null,
    ressenti: null,
    note: '',
    repos: [],
    chrono: null,
    blocs: split.blocs.map((b) => ({
      id: uid('b'),
      src: b.id,
      repos: b.repos,
      replie: true,
      exos: b.exos.map((e) => {
        const avant = passe.get(e.id);
        return {
          id: uid('e'),
          src: e.id,
          nom: e.nom,
          mesure: e.mesure,
          uni: !!e.uni,
          pct: e.pct ?? null,
          note: '',
          series: e.series.map((p, i) => {
            const v = avant?.series[i] ?? avant?.series[avant.series.length - 1];
            const base = v ? { kg: v.kg, reps: v.reps, sec: v.sec, lest: v.lest } : p;
            return { prevu: { ...p }, kg: base.kg, reps: base.reps, sec: base.sec, lest: base.lest || 0, fait: false };
          }),
        };
      }),
    })),
  };
}
