// Exports lisibles (structure et données d'un programme) et export complet.
import { aujourdhui, dateCourte, duree, dureeSeance, kg, texteSerie, bilan, MESURES } from './calc.js';

const ligne = '─'.repeat(32);
const AAAAMMJJ = () => aujourdhui().replaceAll('-', '');

/** « C4 » devient « Cycle 4 » ; un autre nom est gardé tel quel. */
export function nomCycle(p) {
  const m = p.nom.trim().match(/^c\s*(\d+)$/i);
  return m ? `Cycle ${m[1]}` : p.nom.trim();
}

export const nomStructure = (p) => `${AAAAMMJJ()} - Sport ${nomCycle(p)} - Structure.txt`;
export const nomDonnees = (p) => `${AAAAMMJJ()} - Sport ${nomCycle(p)} - Données.txt`;
export const nomComplet = () => `${AAAAMMJJ()} - Sport - Export complet.txt`;

function seriesModele(e) {
  const t = e.series.map((x) => texteSerie(e, x));
  if (!t.length) return 'aucune série';
  return t.every((x) => x === t[0]) ? `${t.length} × ${t[0]}` : t.join(', ');
}

function exoModele(e, prefixe) {
  const mesure = e.mesure !== 'charge' ? ` (${MESURES[e.mesure].toLowerCase()})` : '';
  let t = `${prefixe}${e.nom}${e.uni ? ' — unilatéral, valeurs par côté' : ''}${mesure} : ${seriesModele(e)}`;
  if (e.note) t += `\n${' '.repeat(prefixe.length)}Consigne : ${e.note}`;
  return t;
}

export function texteStructure(p) {
  const out = [`SPORT — ${nomCycle(p).toUpperCase()} — STRUCTURE`, `Exporté le ${dateCourte(aujourdhui())}${p.debut ? ` · programme commencé le ${dateCourte(p.debut)}` : ''}`, ''];
  for (const sp of p.splits) {
    out.push(ligne, sp.nom.toUpperCase(), ligne);
    sp.blocs.forEach((b, i) => {
      if (b.exos.length === 1) out.push(`${exoModele(b.exos[0], `${i + 1}. `)}\n   Repos : ${duree(b.repos)}`);
      else {
        out.push(`${i + 1}. Enchaînement de ${b.exos.length} exercices — repos ${duree(b.repos)} entre les tours`);
        b.exos.forEach((e, j) => out.push(exoModele(e, `   ${String.fromCharCode(97 + j)}. `)));
      }
    });
    out.push('');
  }
  out.push('', '--- Données brutes (pour un réimport) ---', JSON.stringify({ appli: 'Sport', type: 'structure', programme: p }));
  return out.join('\n');
}

const pct = (x) => `${x > 0 ? '+' : ''}${Math.round(x * 100)} %`;

export function texteDonnees(p, seances, b) {
  const out = [`SPORT — ${nomCycle(p).toUpperCase()} — DONNÉES`];
  out.push(p.debut ? `Du ${dateCourte(p.debut)} au ${dateCourte(p.fin || aujourdhui())}${p.fin ? '' : ' (en cours)'}` : 'Pas encore commencé', '');
  out.push(ligne, 'BILAN', ligne);
  out.push(`${b.seances} séance${b.seances > 1 ? "s" : ""} en ${b.jours} jour${b.jours > 1 ? "s" : ""}, soit ${b.parSemaine.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} par semaine`);
  if (b.seances) {
    out.push(`Durée moyenne d'une séance : ${dureeSeance(b.dureeMoyenne)}`);
    out.push(`Tonnage moyen par séance : ${kg(Math.round(b.moyenne))} kg`);
    if (b.reposMoyen) out.push(`Repos moyen : ${duree(b.reposMoyen)} (prévu ${duree(b.reposPrevu)})`);
    if (b.ressenti) out.push(`Ressenti moyen : ${b.ressenti.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}/10`);
    out.push('', 'Progression du tonnage par split (première → dernière séance) :');
    for (const x of b.parSplit) {
      if (!x.nb) out.push(`  ${x.split.nom} : pas encore fait`);
      else out.push(`  ${x.split.nom} : ${kg(Math.round(x.debut))} → ${kg(Math.round(x.fin))} kg${x.evolution != null && x.nb > 1 ? ` (${pct(x.evolution)})` : ''} · ${x.nb} séance${x.nb > 1 ? 's' : ''}`);
    }
    out.push('', `Total soulevé sur le programme : ${kg(Math.round(b.tonnage / 100) / 10)} t`);
  }
  out.push('', ligne, 'SÉANCES', ligne);
  for (const s of seances) {
    const bs = bilan(s);
    out.push(`${dateCourte(s.date)} · ${s.nom} · ${dureeSeance(bs.dureeSec)} · ${kg(Math.round(bs.tonnage))} kg${s.ressenti ? ` · ressenti ${s.ressenti}/10` : ''}`);
    for (const bl of s.blocs) for (const e of bl.exos) {
      if (e.remplacePar) continue;
      const faites = e.series.filter((x) => x.fait);
      const non = e.series.length - faites.length;
      const tags = [e.uni && 'unilatéral', e.remplace && 'remplacement', e.ponctuel && 'en plus'].filter(Boolean);
      out.push(`  ${e.nom}${tags.length ? ` (${tags.join(', ')})` : ''} : ${faites.length ? faites.map((x) => texteSerie(e, x)).join(', ') : 'non fait'}${non && faites.length ? ` · ${non} série${non > 1 ? 's' : ''} non faite${non > 1 ? 's' : ''}` : ''}`);
      if (e.note) out.push(`    Note : ${e.note}`);
    }
    if (bs.nbRepos) out.push(`  Repos moyen : ${duree(bs.reposMoyen)} (prévu ${duree(bs.reposPrevuMoyen)})`);
    if (s.note) out.push(`  Note de séance : ${s.note}`);
    out.push('');
  }
  out.push('--- Données brutes (pour un réimport) ---', JSON.stringify({ appli: 'Sport', type: 'donnees', programme: p, seances }));
  return out.join('\n');
}
