export const HEIGHT = 3.05;
export const ROOMS = [
  { id: 'living', name: 'Séjour', bounds: [-8, -1.3, 0, 7], area: '47 m²' },
  { id: 'kitchen', name: 'Cuisine', bounds: [-8, -1.3, 7, 12], area: '33 m²' },
  { id: 'suite', name: 'Suite', bounds: [1.3, 8, 0, 5.5], area: '37 m²' },
  { id: 'bath', name: 'Salle d’eau', bounds: [1.3, 4.8, 7, 12], area: '17 m²' },
  { id: 'guest', name: 'Chambre', bounds: [4.8, 8, 7, 12], area: '16 m²' },
  { id: 'hall', name: 'Entrée & circulation', bounds: [-1.3, 1.3, 0, 12], area: '' },
  { id: 'passage', name: 'Dégagement', bounds: [1.3, 8, 5.5, 7], area: '' },
];
export const VILLA_VIEWS = [
  { name: 'Le jardin', position: [1.8, 1.65, -11.5], target: [-1, 1.9, 2] },
  { name: 'Le séjour', position: [-3.2, 1.65, 1.5], target: [-5.1, 1.35, 5.4] },
  { name: 'La terrasse', position: [-6, 1.65, 16.2], target: [-3, 1.5, 10] },
];
// Axis x: horizontal wall at z=at; axis z: vertical wall at x=at.
export const WALLS = [
  { axis: 'x', at: 0, from: -8, to: 8, exterior: true, openings: [
    { at: -4.7, width: 4.5, bottom: .12, top: 2.75, kind: 'window' },
    { at: 0, width: 1.4, bottom: 0, top: 2.55, kind: 'door', id: 'entry', name: 'Entrée' },
    { at: 5, width: 3.5, bottom: .8, top: 2.65, kind: 'window' },
  ] },
  { axis: 'x', at: 12, from: -8, to: 8, exterior: true, openings: [
    { at: -4.8, width: 3.5, bottom: .12, top: 2.75, kind: 'window' },
    { at: 0, width: 1.4, bottom: 0, top: 2.55, kind: 'door', id: 'garden', name: 'Terrasse' },
    { at: 3.1, width: 1.4, bottom: 1.5, top: 2.65, kind: 'window' },
    { at: 6.4, width: 2, bottom: .8, top: 2.65, kind: 'window' },
  ] },
  { axis: 'z', at: -8, from: 0, to: 12, exterior: true, openings: [
    { at: 3.6, width: 3.5, bottom: .12, top: 2.75, kind: 'window' },
    { at: 9.4, width: 2.4, bottom: 1.15, top: 2.65, kind: 'window' },
  ] },
  { axis: 'z', at: 8, from: 0, to: 12, exterior: true, openings: [
    { at: 2.6, width: 2.7, bottom: .8, top: 2.65, kind: 'window' },
    { at: 9.7, width: 2.5, bottom: .8, top: 2.65, kind: 'window' },
  ] },
  { axis: 'z', at: -1.3, from: 0, to: 12, openings: [
    { at: 3, width: 1.4, bottom: 0, top: 2.5, kind: 'door', id: 'living', name: 'Séjour' },
    { at: 9.2, width: 1.2, bottom: 0, top: 2.5, kind: 'door', id: 'kitchen', name: 'Cuisine' },
  ] },
  { axis: 'z', at: 1.3, from: 0, to: 12, openings: [
    { at: 3, width: 1.2, bottom: 0, top: 2.5, kind: 'door', id: 'suite', name: 'Suite' },
    { at: 6.25, width: 1.5, bottom: 0, top: 2.6, kind: 'passage' },
  ] },
  { axis: 'x', at: 7, from: -8, to: -1.3, openings: [{ at: -4.8, width: 3.2, bottom: 0, top: 2.75, kind: 'passage' }] },
  { axis: 'x', at: 5.5, from: 1.3, to: 8, openings: [] },
  { axis: 'x', at: 7, from: 1.3, to: 8, openings: [
    { at: 3, width: 1.1, bottom: 0, top: 2.5, kind: 'door', id: 'bath', name: 'Salle d’eau' },
    { at: 6.4, width: 1.1, bottom: 0, top: 2.5, kind: 'door', id: 'guest', name: 'Chambre' },
  ] },
  { axis: 'z', at: 4.8, from: 7, to: 12, openings: [] },
];
export function roomAt(x, z) {
  return ROOMS.find(({ bounds: [x0, x1, z0, z1] }) => x >= x0 && x <= x1 && z >= z0 && z <= z1)
    || { id: 'garden', name: z > 12 ? 'Terrasse & jardin' : 'Jardin', area: '' };
}
