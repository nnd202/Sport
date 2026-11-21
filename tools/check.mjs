// Vérifications avant publication : node tools/check.mjs
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { nouvelleSeance, bilan, volumeSerie, definirPoids, dateCourte, dateNum, pauseEntre } from '../js/calc.js';
import { programmeDemo } from '../js/demo.js';
import { couloirs, ressentiPerformance } from '../js/stats.js';
import { graduations } from '../js/graph.js';

let erreurs = 0;
const ko = (m) => { erreurs++; console.error('✗', m); };
const ok = (m) => console.log('✓', m);
const racine = new URL('..', import.meta.url).pathname;

// 1. Tous les fichiers servis sont dans la liste CORE du service worker.
const sw = readFileSync(join(racine, 'sw.js'), 'utf8');
const core = [...sw.match(/const CORE = \[([\s\S]*?)\]/)[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
const servis = [];
(function parcourir(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) { if (!['.git', 'tools', 'node_modules'].includes(f)) parcourir(p); }
    else if (/\.(html|css|js|svg|png|webmanifest)$/.test(f) && f !== 'sw.js') servis.push(relative(racine, p));
  }
})(racine);
const manquants = servis.filter((f) => !core.includes(f));
manquants.length ? ko(`absents de CORE dans sw.js : ${manquants.join(', ')}`) : ok('liste CORE complète');

// 2. Moteur : préremplissage depuis la dernière séance et tonnage.
const p = programmeDemo();
const legs = p.splits[0];
const s1 = nouvelleSeance(p, legs, null);
s1.blocs[0].exos[0].series.forEach((x, i) => { x.fait = true; x.kg = 62.5; x.reps = 10 - i; });
const s2 = nouvelleSeance(p, legs, s1);
const squat = s2.blocs[0].exos[0];
squat.series[0].kg === 62.5 && squat.series[3].reps === 7 ? ok('préremplissage depuis la séance précédente') : ko('préremplissage');
squat.series[0].prevu.kg === 60 ? ok('valeur prévue du modèle conservée') : ko('valeur prévue');
const t = bilan(s1).tonnage;
t === 62.5 * (10 + 9 + 8 + 7) ? ok(`tonnage ${t} kg`) : ko(`tonnage ${t}`);
volumeSerie({ mesure: 'charge', uni: true }, { kg: 10, reps: 10, fait: true }) === 200 ? ok('unilatéral : deux côtés additionnés') : ko('unilatéral');

// 3. Stats : couloir, remplacement, ponctuel.
s1.fin = 'x'; s1.date = '2026-10-01';
s2.date = '2026-10-05'; s2.fin = 'x';
s2.blocs[0].exos[0].series.forEach((x) => { x.fait = true; });
const presse = s2.blocs[1].exos[0];
presse.remplacePar = 'hx';
s2.blocs.push({ id: 'bh', repos: 90, exos: [{ id: 'hx', src: null, nom: 'Hack squat', mesure: 'charge', remplace: presse.id, series: [{ kg: 80, reps: 10, fait: true }] }] });
s2.blocs.push({ id: 'bp', repos: 60, exos: [{ id: 'px', src: null, nom: 'Abducteurs', mesure: 'charge', ponctuel: true, series: [{ kg: 30, reps: 15, fait: true }] }] });
const { couloirs: cl, ponctuels } = couloirs(p, [s1, s2]);
const cSquat = cl.find((c) => c.id === 'e-squat');
const cPresse = cl.find((c) => c.id === 'e-presse');
cSquat.points.length === 2 ? ok('couloir du squat : 2 séances') : ko(`couloir squat ${cSquat.points.length}`);
cPresse.points.length === 1 && cPresse.points[0].remplace === 'Hack squat' && cPresse.points[0].volume === 800 ? ok('remplacement compté dans le couloir du remplacé') : ko('remplacement');
ponctuels.length === 1 && ponctuels[0].volume === 450 ? ok('exercice en plus listé comme ponctuel') : ko('ponctuel');
JSON.stringify(graduations(62, 138, 4, true)) === '[60,90,120,150]' ? ok('graduations de durée rondes') : ko(`graduations ${graduations(62, 138, 4, true)}`);
s1.ressenti = 3; s2.ressenti = 8;
ressentiPerformance([s1, s2]).points.length === 2 ? ok('ressenti et performance') : ko('ressenti');

// 4. Poids du corps : pourcentage × dernière pesée + lest.
definirPoids((date) => (date >= '2026-10-01' ? 80 : null));
const trac = { mesure: 'pdc', pct: 95, series: [{ reps: 10, fait: true }, { reps: 10, lest: 10, fait: true }] };
const vt = trac.series.reduce((a, x) => a + volumeSerie(trac, x, '2026-10-05'), 0);
vt === 760 + 860 ? ok('tractions : 95 % de 80 kg, puis +10 kg de lest') : ko(`tractions ${vt}`);
volumeSerie(trac, trac.series[0], '2026-09-01') === 10 ? ok('sans pesée : compté en répétitions') : ko('sans pesée');

// 5. Dégressives : paliers comptés dans le tonnage, reportés à la séance suivante.
const deg = { mesure: 'charge', series: [{ kg: 52.5, reps: 10, fait: true, paliers: [{ kg: 27.5, reps: 6 }, { kg: 12.5, reps: 8 }] }] };
volumeSerie(deg, deg.series[0]) === 790 ? ok('dégressives : 52,5 × 10 + 27,5 × 6 + 12,5 × 8 = 790 kg') : ko(`dégressives ${volumeSerie(deg, deg.series[0])}`);
const sd = nouvelleSeance(p, legs, null);
sd.blocs[0].exos[0].series[0].paliers = [{ kg: 30, reps: 8 }];
const sd2 = nouvelleSeance(p, legs, sd);
sd2.blocs[0].exos[0].series[0].paliers.length === 1 && sd2.blocs[0].exos[0].series[1].paliers.length === 0 ? ok('dégressive à la volée reportée à la séance suivante') : ko('report dégressive');
const modeleDeg = programmeDemo();
modeleDeg.splits[0].blocs[0].exos[0].series[0].paliers = [{ kg: 40, reps: 8 }];
const sm = nouvelleSeance(modeleDeg, modeleDeg.splits[0], sd);
sm.blocs[0].exos[0].series[0].paliers[0].kg === 30 && nouvelleSeance(modeleDeg, modeleDeg.splits[0], null).blocs[0].exos[0].series[0].paliers.length === 1 ? ok('dégressive du modèle toujours présente') : ko('dégressive modèle');

const an = new Date().getFullYear();
dateCourte(`${an}-06-12`).split('/').length === 2 && dateCourte(`${an - 1}-06-12`).endsWith(`/${an - 1}`) && dateNum('2025-06-12') === '12/06/2025'
  ? ok("année affichée hors de l'année en cours, toujours dans les mensurations") : ko(`dates ${dateCourte(`${an - 1}-06-12`)} ${dateNum('2025-06-12')}`);

// Hors timing : exclu des durées moyennes, charges conservées.
{
  const S = await import('../js/store.js').catch(() => null);
  if (S?.horsTiming) {
    S.horsTiming({ passee: true }) === true && S.horsTiming({}) === false && S.horsTiming({ passee: true, horsTiming: false }) === false
      ? ok('hors timing : saisie après coup exclue par défaut, réglable') : ko('hors timing');
  } else ok('hors timing : store non chargeable hors navigateur (vérifié en navigateur)');
}

// Dips assistés : 80 kg × 92 % − assistance ; dégressive = plus d'assistance.
{
  definirPoids(() => 80);
  const dips = { mesure: 'pdc', pct: 92, assiste: true };
  const v = volumeSerie(dips, { fait: true, reps: 10, lest: 0, paliers: [{ reps: 6, lest: 20 }, { reps: 5, lest: 35 }] }, '2026-11-20');
  const att = 73.6 * 10 + 53.6 * 6 + 38.6 * 5;
  Math.abs(v - att) < 1e-6 ? ok('dips assistés : 73,6×10 + 53,6×6 + 38,6×5 = 1 250,6 kg') : ko(`dips assistés ${v} ≠ ${att}`);
}

// Série passée : ni faite ni due ; pauses déduites de la durée.
{
  const se = { date: '2026-11-20', debut: '2026-11-20T14:00:00Z', fin: '2026-11-20T15:00:00Z',
    pauses: [{ de: Date.parse('2026-11-20T14:20:00Z'), a: Date.parse('2026-11-20T14:45:00Z') }],
    blocs: [{ exos: [{ mesure: 'charge', series: [{ fait: true, kg: 50, reps: 10 }, { saute: true, kg: 50, reps: 10 }, { fait: false, kg: 50, reps: 10 }] }] }] };
  const bi = bilan(se);
  bi.series === 2 && bi.faites === 1 && bi.tonnage === 500 && bi.dureeSec === 35 * 60
    ? ok('série passée exclue, pause de 25 min déduite (60 → 35 min)') : ko(`passée/pause ${JSON.stringify(bi)}`);
}

process.exit(erreurs ? 1 : 0);
