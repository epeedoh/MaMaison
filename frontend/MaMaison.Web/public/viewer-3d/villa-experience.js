import { roomAt } from './villa-layout.js';
const B = window.BABYLON;
export const ROOM_STARTS = {
  living: [-3.2, 1.65, 1.5], kitchen: [-3, 1.65, 8], suite: [3.1, 1.65, 2.6],
  bath: [2.2, 1.65, 8.7], guest: [6.4, 1.65, 8.1], hall: [0, 1.65, 2], passage: [4.1, 1.65, 6.25],
};
const GUIDED_PATH = [
  { x: 0, z: -3 }, { x: 0, z: -.65 }, { x: 0, z: 1.6 }, { x: 0, z: 3 },
  { x: -1.05, z: 3 }, { x: -2.2, z: 3 }, { x: -3.2, z: 4.9 },
  { x: -4.8, z: 6.25 }, { x: -4.8, z: 7.35 }, { x: -4.8, z: 8.65 },
  { x: -2.4, z: 9.2 }, { x: -1.05, z: 9.2 }, { x: 0, z: 8.7 },
  { x: 0, z: 6.25 }, { x: 2.1, z: 6.25 }, { x: 3, z: 6.55 },
  { x: 3, z: 7.35 }, { x: 3, z: 8.25 }, { x: 3, z: 6.55 },
  { x: 5.25, z: 6.25 }, { x: 6.4, z: 6.55 }, { x: 6.4, z: 7.35 },
  { x: 6.4, z: 8.15 }, { x: 6.4, z: 6.55 }, { x: 2.2, z: 6.25 },
  { x: 0, z: 4.1 }, { x: 0, z: 3 }, { x: 1.05, z: 3 },
  { x: 2.1, z: 3 }, { x: 3.2, z: 3.3 }, { x: 1.05, z: 3 },
  { x: 0, z: 5.8 }, { x: 0, z: 9.4 }, { x: 0, z: 12.55 }, { x: -2, z: 14.5 },
];

export function createExperience({ scene, camera, orbit, canvas, navigation, getWorld, isReady, notify }) {
  let mode = 'walk', busy = false, selectedRoom = null, pointerStart = null;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const selection = document.getElementById('room-selection');
  const chooseButton = document.getElementById('visit-room');
  function frameOverview(next) {
    const aspect = canvas.clientWidth / canvas.clientHeight;
    const halfAngle = Math.atan(Math.tan(orbit.fov / 2) * Math.min(1, aspect));
    orbit.radius = (next === 'open' ? 12.5 : 15) / Math.sin(halfAngle);
  }
  addEventListener('resize', () => { if (mode !== 'walk') frameOverview(mode); });
  function clearRoom() { selectedRoom = null; selection.hidden = true; }
  async function switchMode(next, spawn = null) {
    if (!isReady() || busy || !['walk', 'orbit', 'open'].includes(next)) return;
    busy = true; navigation.setPaused(true); orbit.detachControl();
    const fade = document.getElementById('fade'); fade.classList.add('active');
    if (!reduceMotion) await new Promise(resolve => setTimeout(resolve, 170));
    getWorld().roofMeshes.forEach(m => m.setEnabled(next !== 'open'));
    if (next === 'walk') {
      if (spawn) navigation.teleport({ position: spawn, target: [spawn[0], 1.65, spawn[2] + 2] });
      scene.activeCamera = camera;
      navigation.setPaused(false);
    } else {
      if (mode === 'walk') orbit.alpha = Math.atan2(camera.position.z - 6, camera.position.x);
      orbit.setTarget(new B.Vector3(0, 1, 6));
      orbit.beta = next === 'open' ? .36 : 1.05;
      frameOverview(next);
      orbit.lowerBetaLimit = .12; orbit.upperBetaLimit = next === 'open' ? .8 : 1.38;
      orbit.lowerRadiusLimit = next === 'open' ? 14 : 22;
      orbit.upperRadiusLimit = 120;
      scene.activeCamera = orbit; orbit.attachControl(canvas, true);
    }
    mode = next; document.body.dataset.mode = mode;
    document.querySelectorAll('button[data-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mode === mode)));
    clearRoom(); fade.classList.remove('active'); busy = false;
  }
  document.querySelectorAll('button[data-mode]').forEach(button => button.onclick = () => switchMode(button.dataset.mode));
  document.getElementById('guided-tour').onclick = async () => {
    if (!isReady() || busy) return;
    const start = [0, 1.65, -3.5];
    await switchMode('walk', start);
    getWorld().doors.forEach(door => { door.manual = false; door.target = 1; });
    if (navigation.followPath(GUIDED_PATH, { speed: .86, turnSpeed: 3.8, maxSecondsPerPoint: 18 })) {
      document.getElementById('guided-tour').setAttribute('aria-pressed', 'true');
      notify('Visite guidée lancée. Touchez un joystick, la souris ou le clavier pour reprendre la main.');
    }
  };
  function selectRoom(room) {
    if (!ROOM_STARTS[room.id]) return;
    selectedRoom = room; selection.hidden = false;
    document.getElementById('selected-room').textContent = room.name;
  }
  chooseButton.onclick = () => { if (selectedRoom) switchMode('walk', ROOM_STARTS[selectedRoom.id]); };
  canvas.addEventListener('pointerdown', e => { if (mode === 'open') pointerStart = { x: e.clientX, y: e.clientY, id: e.pointerId }; });
  canvas.addEventListener('pointermove', e => {
    if (pointerStart && e.pointerId === pointerStart.id && Math.hypot(e.clientX - pointerStart.x, e.clientY - pointerStart.y) > 6) pointerStart = null;
  });
  canvas.addEventListener('pointercancel', () => { pointerStart = null; });
  canvas.addEventListener('pointerup', e => {
    if (!pointerStart || pointerStart.id !== e.pointerId || mode !== 'open') return;
    pointerStart = null;
    const rect = canvas.getBoundingClientRect();
    const ray = scene.createPickingRay(e.clientX - rect.left, e.clientY - rect.top, B.Matrix.Identity(), orbit);
    const distance = ray.intersectsPlane(new B.Plane(0, 1, 0, -.03));
    if (distance === null || distance < 0) return;
    const point = ray.origin.add(ray.direction.scale(distance));
    selectRoom(roomAt(point.x, point.z));
  });
  function assistDoor(door) {
    if (!door || mode !== 'walk' || busy || !isReady()) return false;
    const normal = door.axis === 'x' ? new B.Vector3(0, 0, 1) : new B.Vector3(1, 0, 0);
    const position = camera.position;
    if (Math.hypot(position.x - door.center.x, position.z - door.center.z) > 3) return false;
    const side = B.Vector3.Dot(position.subtract(door.center), normal) >= 0 ? 1 : -1;
    door.manual = true; door.target = 1;
    const approach = door.center.add(normal.scale(side * .85));
    const exit = door.center.subtract(normal.scale(side * .95));
    return navigation.followPath([approach, exit]);
  }
  function tapDoor(e) {
    if (mode !== 'walk' || !isReady()) return false;
    const rect = canvas.getBoundingClientRect();
    const ray = scene.createPickingRay(e.clientX - rect.left, e.clientY - rect.top, B.Matrix.Identity(), camera);
    const hit = ray.intersectsMeshes(getWorld().colliders)[0];
    if (!hit || hit.distance > 3) return false;
    const door = getWorld().doors.find(d => d.leaf === hit.pickedMesh);
    return assistDoor(door);
  }
  return { get mode() { return mode; }, get busy() { return busy; }, switchMode, assistDoor, tapDoor, selectRoom };
}
