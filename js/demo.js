// Couleurs de split : distinctes mais douces (6 au besoin).
export const COULEURS_SPLITS = ['#4fa8a0', '#6f8fd0', '#c68a9b', '#c9a35e', '#9a88c8', '#83aa72'];

// Programme de démonstration inventé (le dépôt est public : jamais de vraies données ici).

const ch = (n, kg, reps) => Array.from({ length: n }, () => ({ kg, reps }));
const tps = (n, sec) => Array.from({ length: n }, () => ({ sec }));
const pdc = (n, reps) => Array.from({ length: n }, () => ({ reps }));

export function programmeDemo() {
  return {
    id: 'p-demo',
    nom: 'Démo',
    statut: 'en-cours',
    debut: null,
    splits: [
      {
        id: 's-legs', nom: 'Legs', couleur: '#4fa8a0',
        blocs: [
          { id: 'b1', repos: 120, exos: [{ id: 'e-squat', nom: 'Squat', mesure: 'charge', series: ch(4, 60, 10) }] },
          { id: 'b2', repos: 90, exos: [{ id: 'e-presse', nom: 'Presse à cuisses', mesure: 'charge', series: ch(3, 120, 12) }] },
          { id: 'b3', repos: 90, exos: [
            { id: 'e-legext', nom: 'Leg extension', mesure: 'charge', series: ch(3, 35, 12) },
            { id: 'e-legcurl', nom: 'Leg curl', mesure: 'charge', series: ch(3, 30, 12) },
          ] },
          { id: 'b4', repos: 60, exos: [{ id: 'e-fentes', nom: 'Fentes bulgares', mesure: 'charge', uni: true, series: ch(3, 10, 10) }] },
          { id: 'b5', repos: 60, exos: [{ id: 'e-mollets', nom: 'Mollets debout', mesure: 'charge', series: ch(3, 40, 15) }] },
        ],
      },
      {
        id: 's-push', nom: 'Push / triceps', couleur: '#c68a9b',
        blocs: [
          { id: 'b1', repos: 120, exos: [{ id: 'e-dc', nom: 'Développé couché', mesure: 'charge', series: ch(4, 50, 10) }] },
          { id: 'b2', repos: 90, exos: [{ id: 'e-dci', nom: 'Développé incliné haltères', mesure: 'charge', series: ch(3, 18, 10) }] },
          { id: 'b3', repos: 75, exos: [
            { id: 'e-dips', nom: 'Dips', mesure: 'pdc', series: pdc(3, 10) },
            { id: 'e-ext', nom: 'Extension poulie', mesure: 'charge', series: ch(3, 20, 12) },
          ] },
        ],
      },
      {
        id: 's-pull', nom: 'Pull / biceps', couleur: '#6f8fd0',
        blocs: [
          { id: 'b1', repos: 120, exos: [{ id: 'e-tractions', nom: 'Tractions', mesure: 'pdc', series: pdc(4, 8) }] },
          { id: 'b2', repos: 90, exos: [{ id: 'e-rowing', nom: 'Rowing barre', mesure: 'charge', series: ch(3, 45, 10) }] },
          { id: 'b3', repos: 60, exos: [{ id: 'e-curl', nom: 'Curl haltères', mesure: 'charge', series: ch(3, 12, 10) }] },
        ],
      },
      {
        id: 's-core', nom: 'Shoulder / core', couleur: '#c9a35e',
        blocs: [
          { id: 'b1', repos: 90, exos: [{ id: 'e-dm', nom: 'Développé militaire', mesure: 'charge', series: ch(4, 30, 10) }] },
          { id: 'b2', repos: 60, exos: [
            { id: 'e-elev', nom: 'Élévations latérales', mesure: 'charge', series: ch(3, 8, 15) },
            { id: 'e-oiseau', nom: 'Oiseau', mesure: 'charge', series: ch(3, 6, 15) },
            { id: 'e-gainage', nom: 'Gainage', mesure: 'temps', series: tps(3, 45) },
          ] },
        ],
      },
    ],
  };
}
