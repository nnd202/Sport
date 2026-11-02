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

/** Texte d'une série : « 45 kg × 12 », « 45 s », « 10 reps ». */
export function texteSerie(exo, s) {
  if (exo.mesure === 'temps') return `${s.sec ?? 0} s`;
  if (exo.mesure === 'pdc') return `${s.reps ?? 0} reps`;
  return `${kg(s.kg ?? 0)} kg × ${s.reps ?? 0}`;
}

/** Volume d'une série faite : tonnage (charge), reps (pdc) ou secondes (temps). */
export function volumeSerie(exo, s) {
  if (!s.fait) return 0;
  const cotes = exo.uni ? 2 : 1;
  if (exo.mesure === 'temps') return (s.sec || 0) * cotes;
  if (exo.mesure === 'pdc') return (s.reps || 0) * cotes;
  return (s.kg || 0) * (s.reps || 0) * cotes;
}

export function bilan(seance) {
  let tonnage = 0, series = 0, faites = 0;
  for (const b of seance.blocs) for (const e of b.exos) if (!e.remplacePar) for (const s of e.series) {
    series++;
    if (s.fait) faites++;
    if (e.mesure === 'charge') tonnage += volumeSerie(e, s);
  }
  const repos = seance.repos || [];
  const reel = repos.reduce((a, r) => a + r.reel, 0);
  const prevu = repos.reduce((a, r) => a + (r.prevu || 0), 0);
  const fin = seance.fin ? new Date(seance.fin) : new Date();
  return {
    tonnage, series, faites,
    dureeSec: (fin - new Date(seance.debut)) / 1000,
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
      exos: b.exos.map((e) => {
        const avant = passe.get(e.id);
        return {
          id: uid('e'),
          src: e.id,
          nom: e.nom,
          mesure: e.mesure,
          uni: !!e.uni,
          note: '',
          series: e.series.map((p, i) => {
            const v = avant?.series[i] ?? avant?.series[avant.series.length - 1];
            const base = v ? { kg: v.kg, reps: v.reps, sec: v.sec } : p;
            return { prevu: { ...p }, kg: base.kg, reps: base.reps, sec: base.sec, fait: false };
          }),
        };
      }),
    })),
  };
}
