const B = window.BABYLON;
export const EYE_HEIGHT = 1.65;
export const VIEWS = [
  { name: 'Le salon', position: [4.65, EYE_HEIGHT, -2.65], target: [1.65, 1.25, -1.35] },
  { name: 'Côté salon', position: [.53, EYE_HEIGHT, -1.8], target: [2.1, 1.05, -3.12] },
  { name: 'Les fenêtres', position: [3.95, EYE_HEIGHT, -.75], target: [.6, 1.45, -.8] },
];

export function createNavigation(scene, camera, canvas, notify, options = {}) {
  scene.collisionsEnabled = true;
  // Only simple, dedicated proxies participate in Babylon's swept-ellipsoid solver.
  const proxies = [];
  const box = (name, x, z, width, depth) => {
    const mesh = B.MeshBuilder.CreateBox('collision-' + name, { width, height: 4, depth }, scene);
    mesh.position.set(x, 1.8, z);
    mesh.isVisible = false;
    mesh.isPickable = false;
    mesh.checkCollisions = true;
    mesh.computeWorldMatrix(true);
    proxies.push(mesh);
  };
  if (options.defaultColliders !== false) {
  box('west', -.1, -1.82, .2, 4.1);
  box('east', 5.22, -1.82, .2, 4.1);
  box('north', 2.56, .1, 5.6, .2);
  box('south', 2.56, -3.73, 5.6, .2);
  box('sofa', 1.9, -3.24, 2.04, .8);
  box('fireplace', 1.9, -.13, 1.12, .4);
  box('plant-left', .75, -.02, .4, .4);
  box('plant-right', 3.02, -.02, .4, .4);
  const table = B.MeshBuilder.CreateCylinder('collision-table', { diameter: .96, height: 4, tessellation: 16 }, scene);
  table.position.set(2.582, 1.8, -1.889);
  table.isVisible = false;
  table.isPickable = false;
  table.checkCollisions = true;
  table.computeWorldMatrix(true);
  proxies.push(table);
  }
  const player = B.MeshBuilder.CreateBox('visitor-collider', { size: .01 }, scene);
  player.isVisible = false;
  player.isPickable = false;
  player.ellipsoid.set(.23, .8, .23);
  player.ellipsoidOffset.set(0, -.8, 0);
  player.position.copyFrom(camera.position);
  camera.inputs.clear();
  camera.inertia = 0;
  const keys = new Set();
  const movementKeys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight', 'ShiftLeft', 'ShiftRight']);
  let drag = null, joystickPointer = null, analog = { x: 0, y: 0 }, paused = false, armed = false;
  let sensitivity = 1, invert = false, speedX = 0, speedZ = 0, assistance = null;
  let lookPointer = null, lookAnalog = { x: 0, y: 0 };
  const lookJoystick = document.getElementById('look-joystick');
  const lookStick = document.getElementById('look-stick');
  const stick = document.getElementById('stick');
  const joystick = document.getElementById('joystick');
  const isLocked = () => document.pointerLockElement === canvas;
  const clear = () => {
    keys.clear(); analog = { x: 0, y: 0 }; speedX = speedZ = 0;
    drag = null; joystickPointer = null; stick.style.transform = '';
    lookPointer = null; lookAnalog = { x: 0, y: 0 };
    if (lookStick) lookStick.style.transform = '';
    assistance = null;
  };
  const manual = () => { assistance = null; };
  const editable = e => e.target.closest?.('input, select, textarea, button, a, [contenteditable]');
  addEventListener('keydown', e => {
    if (e.code === 'Escape') { armed = false; clear(); }
    if (paused || !armed || editable(e) || (!isLocked() && document.activeElement !== canvas)) return;
    if (e.code === 'KeyE' && !e.repeat) { options.onInteract?.(); e.preventDefault(); }
    if (movementKeys.has(e.code)) { manual(); e.preventDefault(); keys.add(e.code); }
  });
  addEventListener('keyup', e => keys.delete(e.code));
  addEventListener('blur', () => { armed = false; clear(); });
  document.addEventListener('visibilitychange', () => { armed = false; clear(); });
  document.addEventListener('pointerlockchange', () => {
    clear();
    armed = isLocked();
    document.body.classList.toggle('walking', isLocked());
    document.getElementById('reticle').hidden = !isLocked();
    document.querySelector('#walk span').textContent = isLocked() ? 'Pause' : 'Explorer';
    document.querySelector('#walk img').src = isLocked() ? 'vendor/icons/pause.svg' : 'vendor/icons/navigation.svg';
  });
  document.addEventListener('pointerlockerror', () => notify('Le mode souris libre est indisponible. Le glisser-déplacer reste actif.'));
  async function explore() {
    if (paused) return;
    armed = true;
    canvas.focus({ preventScroll: true });
    if (isLocked()) { document.exitPointerLock(); return; }
    try { await canvas.requestPointerLock?.(); }
    catch { notify('Le mode souris libre est indisponible. Le glisser-déplacer reste actif.'); }
  }
  const look = (dx, dy) => {
    camera.rotation.y -= dx * .0017 * sensitivity;
    camera.rotation.x -= dy * .0017 * sensitivity * (invert ? -1 : 1);
    camera.rotation.x = B.Scalar.Clamp(camera.rotation.x, -1.25, 1.25);
  };
  document.addEventListener('mousemove', e => { if (isLocked() && !paused && (e.movementX || e.movementY)) { manual(); look(e.movementX, e.movementY); } });
  canvas.addEventListener('pointerdown', e => {
    if (!paused && isLocked() && e.button === 0) { options.onInteract?.(); return; }
    if (paused || isLocked() || e.button !== 0) return;
    canvas.focus({ preventScroll: true });
    armed = true;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, distance: 0, type: e.pointerType };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', e => {
    if (!drag || drag.id !== e.pointerId || paused || isLocked()) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 1) manual();
    drag.distance += Math.abs(dx) + Math.abs(dy);
    look(dx, dy);
    drag.x = e.clientX; drag.y = e.clientY;
  });
  canvas.addEventListener('pointerup', e => {
    if (!drag || drag.id !== e.pointerId) return;
    const tap = drag.distance < 5;
    const shouldLock = drag.type === 'mouse' && tap;
    drag = null;
    if (tap && options.onTap?.(e)) return;
    if (shouldLock) explore();
  });
  canvas.addEventListener('pointercancel', () => { drag = null; });
  canvas.addEventListener('lostpointercapture', () => { drag = null; });
  joystick.addEventListener('pointerdown', e => {
    if (paused || joystickPointer !== null) return;
    joystickPointer = e.pointerId;
    manual();
    joystick.setPointerCapture(e.pointerId);
    updateStick(e);
  });
  function updateStick(e) {
    const rect = joystick.getBoundingClientRect();
    let x = (e.clientX - rect.left - rect.width / 2) / 36;
    let y = (e.clientY - rect.top - rect.height / 2) / 36;
    const length = Math.max(1, Math.hypot(x, y));
    x /= length; y /= length;
    analog = { x, y };
    stick.style.transform = 'translate(' + x * 32 + 'px,' + y * 32 + 'px)';
  }
  joystick.addEventListener('pointermove', e => { if (e.pointerId === joystickPointer && !paused) updateStick(e); });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    joystick.addEventListener(name, () => { joystickPointer = null; analog = { x: 0, y: 0 }; stick.style.transform = ''; });
  }
  function updateLookStick(e) {
    const rect = lookJoystick.getBoundingClientRect();
    let x = (e.clientX - rect.left - rect.width / 2) / 36;
    let y = (e.clientY - rect.top - rect.height / 2) / 36;
    const length = Math.max(1, Math.hypot(x, y)); x /= length; y /= length;
    lookAnalog = { x: Math.abs(x) > .08 ? x : 0, y: Math.abs(y) > .08 ? y : 0 };
    lookStick.style.transform = `translate(${x * 30}px,${y * 30}px)`;
  }
  lookJoystick?.addEventListener('pointerdown', e => {
    if (paused || lookPointer !== null) return;
    manual(); lookPointer = e.pointerId; lookJoystick.setPointerCapture(e.pointerId); updateLookStick(e);
  });
  lookJoystick?.addEventListener('pointermove', e => { if (!paused && e.pointerId === lookPointer) updateLookStick(e); });
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) lookJoystick?.addEventListener(event, () => {
    lookPointer = null; lookAnalog = { x: 0, y: 0 }; lookStick.style.transform = '';
  });
  function move(delta) {
    player.computeWorldMatrix(true);
    player.moveWithCollisions(delta);
    player.position.y = EYE_HEIGHT;
    camera.position.copyFrom(player.position);
  }
  const down = (...codes) => codes.some(c => keys.has(c)) ? 1 : 0;
  function update(dt) {
    if (paused || document.hidden) return;
    dt = Math.min(dt, .1);
    look(lookAnalog.x * 950 * dt, lookAnalog.y * 750 * dt);
    let forward = down('KeyW', 'ArrowUp') - down('KeyS', 'ArrowDown') - analog.y;
    let right = down('KeyD', 'ArrowRight') - down('KeyA', 'ArrowLeft') + analog.x;
    const pad = isLocked() && navigator.getGamepads?.()[0];
    if (pad) {
      const deadzone = value => Math.abs(value) < .15 ? 0 : value;
      right += deadzone(pad.axes[0] || 0); forward -= deadzone(pad.axes[1] || 0);
      if (pad.axes.some(v => Math.abs(v) > .15)) manual();
      look(deadzone(pad.axes[2] || 0) * 1100 * dt, deadzone(pad.axes[3] || 0) * 800 * dt);
    }
    if (assistance) {
      const goal = assistance.points[0];
      const distance = Math.hypot(goal.x - player.position.x, goal.z - player.position.z);
      if (distance < assistance.threshold) {
        assistance.points.shift();
        assistance.elapsed = 0; assistance.stuck = 0;
        if (!assistance.points.length) { assistance = null; return; }
        return;
      }
      const oldRotation = camera.rotation.clone();
      camera.setTarget(goal);
      const yaw = Math.atan2(Math.sin(camera.rotation.y - oldRotation.y), Math.cos(camera.rotation.y - oldRotation.y));
      camera.rotation.copyFrom(oldRotation);
      const turn = 1 - Math.exp(-assistance.turnSpeed * dt);
      camera.rotation.y += yaw * turn; camera.rotation.x *= 1 - turn;
      assistance.elapsed += dt;
      if (Math.abs(yaw) < assistance.maxYaw) {
        const before = player.position.clone();
        const delta = goal.subtract(player.position); delta.y = 0;
        delta.normalize().scaleInPlace(Math.min(distance, assistance.speed * dt));
        move(delta);
        assistance.stuck = B.Vector3.Distance(before, player.position) < .002 ? assistance.stuck + dt : 0;
      }
      if (assistance.stuck > 1.6 || assistance.elapsed > assistance.maxSecondsPerPoint) {
        assistance = null; notify('Le passage est encombré. Reprenez la main pour vous repositionner.');
      }
      return;
    }
    const length = Math.max(1, Math.hypot(forward, right));
    const speed = down('ShiftLeft', 'ShiftRight') ? (options.fastSpeed || 2.3) : (options.walkSpeed || 1.45);
    const direction = camera.getForwardRay().direction;
    direction.y = 0; direction.normalize();
    const side = B.Vector3.Cross(direction, B.Axis.Y).normalize();
    const targetX = (direction.x * forward + side.x * right) * speed / length;
    const targetZ = (direction.z * forward + side.z * right) * speed / length;
    const blend = 1 - Math.exp(-18 * dt);
    speedX += (targetX - speedX) * blend; speedZ += (targetZ - speedZ) * blend;
    if (Math.abs(speedX) + Math.abs(speedZ) < .002) { speedX = speedZ = 0; return; }
    move(new B.Vector3(speedX * dt, 0, speedZ * dt));
  }
  return {
    get state() { return { keys: [...keys], armed, paused, assisting: !!assistance, lookAnalog, player: player.position.asArray(), absolute: player.absolutePosition.asArray(), speedX, speedZ }; },
    update, explore, clear, proxies, player,
    followPath(points, settings = {}) {
      if (paused) return false;
      clear();
      assistance = {
        points: points.map(p => new B.Vector3(p.x, EYE_HEIGHT, p.z)),
        elapsed: 0,
        stuck: 0,
        speed: settings.speed || 1.05,
        turnSpeed: settings.turnSpeed || 4.5,
        threshold: settings.threshold || .12,
        maxYaw: settings.maxYaw || .38,
        maxSecondsPerPoint: settings.maxSecondsPerPoint || 14,
      };
      canvas.focus({ preventScroll: true }); armed = true; return true;
    },
    recenter() { clear(); camera.rotation.x = 0; },
    setPaused(value) { paused = value; if (value) armed = false; clear(); if (value && isLocked()) document.exitPointerLock(); },
    setSensitivity(value) { sensitivity = value; },
    setInvert(value) { invert = value; },
    teleport(view) {
      clear(); player.position.copyFromFloats(...view.position);
      player.computeWorldMatrix(true);
      camera.position.copyFrom(player.position);
      camera.setTarget(B.Vector3.FromArray(view.target));
      camera.rotationQuaternion = null;
    }
  };
}
