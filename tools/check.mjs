// Vérifications avant publication : node tools/check.mjs
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { nouvelleSeance, bilan, volumeSerie } from '../js/calc.js';
import { programmeDemo } from '../js/demo.js';

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

process.exit(erreurs ? 1 : 0);
