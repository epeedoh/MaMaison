import { createNavigation } from './navigation.js';
import { buildVilla } from './villa-world.js';
import { VILLA_VIEWS, ROOMS, WALLS, roomAt } from './villa-layout.js';
import { createExperience, ROOM_STARTS } from './villa-experience.js';
const B = window.BABYLON;
const canvas = document.getElementById('renderCanvas');
const engine = new B.Engine(canvas, true, { stencil: true, preserveDrawingBuffer: false });
const coarse = matchMedia('(pointer: coarse)').matches;
const modestGPU = coarse || /Intel|SwiftShader|llvmpipe/i.test(engine.getGlInfo().renderer);
const scene = new B.Scene(engine);
scene.useRightHandedSystem = true;
scene.skipPointerMovePicking = scene.skipPointerDownPicking = scene.skipPointerUpPicking = true;
scene.clearColor = new B.Color4(.72, .82, .88, 1);
const camera = new B.UniversalCamera('visitor', new B.Vector3(...VILLA_VIEWS[0].position), scene);
camera.minZ = .045; camera.maxZ = 500; scene.activeCamera = camera;
const orbit = new B.ArcRotateCamera('overview', -Math.PI / 2, 1.05, 32, new B.Vector3(0, 1, 6), scene);
orbit.minZ = .1; orbit.maxZ = 500; orbit.panningSensibility = 0;
orbit.wheelDeltaPercentage = .015; orbit.pinchDeltaPercentage = .008;
orbit.angularSensibilityX = orbit.angularSensibilityY = 650;
orbit.inertia = .65;
scene.activeCamera = camera;
const fov = document.getElementById('fov');
function resize() {
  engine.resize();
  const portrait = engine.getRenderWidth() < engine.getRenderHeight();
  camera.fovMode = portrait ? B.Camera.FOVMODE_VERTICAL_FIXED : B.Camera.FOVMODE_HORIZONTAL_FIXED;
  camera.fov = Number(fov.value) * Math.PI / 180 * (portrait ? .88 : 1);
  document.getElementById('fov-value').value = fov.value + '°';
}
fov.oninput = resize;
addEventListener('resize', resize);
let timer, world, nearest, experience, ready = false;
function notify(message) {
  const notice = document.getElementById('notice');
  notice.textContent = message; notice.hidden = false;
  clearTimeout(timer); timer = setTimeout(() => { notice.hidden = true; }, 5000);
}
function interact() {
  if (!nearest) return;
  const distance = Math.hypot(camera.position.x - nearest.center.x, camera.position.z - nearest.center.z);
  if (nearest.target && distance < 1.35) { notify('Reculez un peu pour refermer la porte.'); return; }
  nearest.manual = true; nearest.target = nearest.target ? 0 : 1;
}
const navigation = createNavigation(scene, camera, canvas, notify, {
  defaultColliders: false, walkSpeed: 1.7, fastSpeed: 2.8,
  onInteract: () => experience?.assistDoor(nearest), onTap: e => experience?.tapDoor(e),
});
navigation.teleport(VILLA_VIEWS[0]); navigation.setPaused(true);
window.tour = { scene, engine, camera, navigation, ready: false, views: VILLA_VIEWS };
experience = createExperience({ scene, camera, orbit, canvas, navigation, getWorld: () => world, isReady: () => ready, notify });
Object.assign(window.tour, { orbit, experience });
const environment = new B.HDRCubeTexture('assets/salon/garden.hdr', scene, 128, false, true, false, true);
scene.environmentTexture = environment; scene.environmentIntensity = .92;
const sky = scene.createDefaultSkybox(environment, true, 300, .12);
sky.material.environmentIntensity = 1.35;
const sun = new B.DirectionalLight('sun', new B.Vector3(.68, -1, .38), scene);
sun.position.set(-22, 18, -16); sun.intensity = 2.35;
sun.diffuse.set(1, .89, .72);
const fill = new B.HemisphericLight('sky-fill', new B.Vector3(0, 1, 0), scene);
fill.intensity = .48; fill.groundColor.set(.46, .5, .48);
const shadows = new B.CascadedShadowGenerator(1024, sun);
shadows.numCascades = 2; shadows.shadowMaxZ = 45; shadows.lambda = .6;
shadows.stabilizeCascades = true; shadows.usePercentageCloserFiltering = true;
shadows.filteringQuality = B.ShadowGenerator.QUALITY_LOW;
shadows.bias = .001; shadows.normalBias = .025; shadows.darkness = .12;
const pipeline = new B.DefaultRenderingPipeline('villa-image', true, scene, [camera, orbit]);
pipeline.fxaaEnabled = true;
pipeline.imageProcessing.toneMappingEnabled = true;
pipeline.imageProcessing.toneMappingType = B.ImageProcessingConfiguration.TONEMAPPING_ACES;
pipeline.imageProcessing.exposure = 1.05;
pipeline.imageProcessing.contrast = 1.12;
let ao;
function quality(mode) {
  engine.setHardwareScalingLevel(mode === 'high' ? 1 / Math.min(devicePixelRatio, 1.5) : mode === 'low' ? 1.65 : modestGPU ? 1.25 : 1);
  shadows.getShadowMap().refreshRate = mode === 'low' ? 2 : 1;
  shadows.filteringQuality = mode === 'high' ? B.ShadowGenerator.QUALITY_MEDIUM : B.ShadowGenerator.QUALITY_LOW;
  const contactShadows = mode === 'high' || mode === 'auto' && !coarse;
  if (contactShadows && !ao && B.SSAO2RenderingPipeline.IsSupported) {
    ao = new B.SSAO2RenderingPipeline('contact-shadows', scene, { ssaoRatio: .5, blurRatio: .5 }, [camera, orbit]);
    ao.radius = .7; ao.totalStrength = .65; ao.samples = 8;
  } else if (!contactShadows && ao) { ao.dispose(); ao = null; }
  resize();
}
quality('auto');
const interaction = document.getElementById('interact');
interaction.onclick = interact;
document.getElementById('enter-door').onclick = () => experience.assistDoor(nearest);
document.getElementById('recenter').onclick = () => navigation.recenter();
const autoDoors = document.getElementById('auto-doors');
function updateDoors(dt) {
  nearest = null; let nearestDistance = 2.4;
  for (const door of world.doors) {
    const distance = Math.hypot(camera.position.x - door.center.x, camera.position.z - door.center.z);
    if (distance < nearestDistance) { nearest = door; nearestDistance = distance; }
    if (distance > 3.3) { door.manual = false; if (autoDoors.checked) door.target = 0; }
    if (autoDoors.checked && !door.manual && distance < 2) door.target = 1;
    if (door.target === 0 && distance < 1.35 && door.angle > .1) door.target = 1;
    door.angle += (door.target - door.angle) * Math.min(1, dt * 6);
    if (Math.abs(door.target - door.angle) < .001) door.angle = door.target;
    door.pivot.rotation.y = door.baseRotation - door.angle * Math.PI / 2;
    door.pivot.computeWorldMatrix(true); door.leaf.computeWorldMatrix(true);
  }
  interaction.hidden = !nearest;
  document.getElementById('door-actions').hidden = !nearest;
  if (nearest) {
    interaction.querySelector('span').textContent = (nearest.target ? 'Fermer' : 'Ouvrir') + ' · ' + nearest.name;
    interaction.setAttribute('aria-label', interaction.textContent);
  }
}
const mapPanel = document.getElementById('map-panel'), map = document.getElementById('floor-plan');
const mapContext = map.getContext('2d');
function drawMap() {
  if (mapPanel.hidden) return;
  const ctx = mapContext, scale = 14, ox = 139, oy = 205;
  const p = (x, z) => [ox - x * scale, oy - z * scale];
  ctx.clearRect(0, 0, map.width, map.height);
  ctx.fillStyle = '#e4ebe2'; ctx.fillRect(0, 0, map.width, map.height);
  for (const room of ROOMS) {
    const [x0, x1, z0, z1] = room.bounds, [x, y] = p(x1, z1);
    ctx.fillStyle = room.id === roomAt(camera.position.x, camera.position.z).id ? '#c5d9ce' : '#f8faf6';
    ctx.fillRect(x, y, (x1 - x0) * scale, (z1 - z0) * scale);
    if (room.id === 'hall' || room.id === 'passage') continue;
    const [tx, ty] = p((x0 + x1) / 2, (z0 + z1) / 2);
    ctx.fillStyle = '#34453c'; ctx.font = '10px Segoe UI'; ctx.textAlign = 'center';
    ctx.fillText(room.name, tx, ty, (x1 - x0) * scale - 5);
  }
  ctx.strokeStyle = '#425349'; ctx.lineWidth = 2;
  for (const wall of WALLS) {
    let start = wall.from;
    function segment(a, b) {
      const [x0, y0] = p(wall.axis === 'x' ? a : wall.at, wall.axis === 'x' ? wall.at : a);
      const [x1, y1] = p(wall.axis === 'x' ? b : wall.at, wall.axis === 'x' ? wall.at : b);
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    }
    for (const o of wall.openings) { segment(start, o.at - o.width / 2); start = o.at + o.width / 2; }
    segment(start, wall.to);
  }
  const [x, y] = p(camera.position.x, camera.position.z);
  const direction = camera.getForwardRay().direction;
  ctx.save(); ctx.translate(Math.max(9, Math.min(269, x)), Math.max(9, Math.min(269, y)));
  ctx.rotate(Math.atan2(-direction.x, direction.z));
  ctx.fillStyle = '#226c53'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(6, 6); ctx.lineTo(0, 3); ctx.lineTo(-6, 6); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
}
function toggleMap(open) {
  if (open) { settingsPanel.hidden = true; document.getElementById('settings').setAttribute('aria-expanded', 'false'); }
  mapPanel.hidden = !open; document.getElementById('map-toggle').setAttribute('aria-expanded', String(open));
  drawMap();
  syncPanels();
  document.getElementById(open ? 'close-map' : 'map-toggle').focus();
}
document.getElementById('map-toggle').onclick = () => toggleMap(mapPanel.hidden);
document.getElementById('close-map').onclick = () => toggleMap(false);
map.addEventListener('click', e => {
  if (!ready) return;
  const rect = map.getBoundingClientRect();
  const px = (e.clientX - rect.left) * map.width / rect.width;
  const py = (e.clientY - rect.top) * map.height / rect.height;
  const room = roomAt((139 - px) / 14, (205 - py) / 14);
  if (!ROOM_STARTS[room.id]) return;
  toggleMap(false); experience.switchMode('walk', ROOM_STARTS[room.id]);
});
let hudTime = 0;
engine.runRenderLoop(() => {
  const dt = Math.min(.1, engine.getDeltaTime() / 1000);
  if (ready && experience.mode === 'walk') updateDoors(dt);
  else document.getElementById('door-actions').hidden = true;
  navigation.update(dt);
  hudTime += dt;
  if (hudTime > .12) {
    hudTime = 0;
    const room = roomAt(camera.position.x, camera.position.z);
    document.getElementById('view-name').textContent = experience.mode === 'walk' ? room.name : experience.mode === 'open' ? 'Maison ouverte' : 'Vue extérieure';
    document.getElementById('room-area').textContent = experience.mode === 'walk' ? room.area : '';
    document.getElementById('guided-tour').setAttribute('aria-pressed', String(navigation.state.assisting));
    drawMap();
  }
  scene.render();
});
const LOAD_TIMEOUT_MS = 300000;
let loadTimer;
try {
  await Promise.race([
    (async () => {
      world = await buildVilla(scene, shadows, value => { document.getElementById('progress').value = value; });
      if (new URLSearchParams(location.search).get('lighting') === 'study') {
        const { loadBakedLighting } = await import('./villa-lighting.js');
        window.tour.bakedLighting = await loadBakedLighting(scene, fill);
      }
      await scene.whenReadyAsync();
    })(),
    new Promise((_, reject) => { loadTimer = setTimeout(() => reject(new Error('Villa load timed out')), LOAD_TIMEOUT_MS); }),
  ]);
  document.getElementById('loading').hidden = true;
  navigation.setPaused(false); ready = true;
  Object.assign(window.tour, { ready: true, world });
} catch (error) {
  console.error(error);
  document.getElementById('loading-label').textContent = 'La villa n’a pas pu être chargée.';
  document.getElementById('retry').hidden = false;
  document.getElementById('retry').onclick = () => location.reload();
} finally {
  clearTimeout(loadTimer);
}
let transitioning = false;
async function goTo(index) {
  if (!ready || transitioning) return;
  if (!mapPanel.hidden) toggleMap(false);
  if (experience.mode !== 'walk') await experience.switchMode('walk');
  transitioning = true; navigation.setPaused(true);
  document.getElementById('fade').classList.add('active');
  await new Promise(resolve => setTimeout(resolve, 180));
  navigation.teleport(VILLA_VIEWS[index]);
  document.querySelectorAll('[data-view]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.view) === index)));
  document.getElementById('fade').classList.remove('active');
  navigation.setPaused(false); transitioning = false;
}
document.querySelectorAll('[data-view]').forEach(button => button.onclick = () => goTo(Number(button.dataset.view)));
document.getElementById('reset').onclick = () => goTo(0);
document.getElementById('walk').onclick = () => navigation.explore();
const settingsPanel = document.getElementById('settings-panel');
function syncPanels() {
  const open = !settingsPanel.hidden || !mapPanel.hidden;
  document.getElementById('panel-backdrop').hidden = !open;
  document.body.classList.toggle('panel-open', open);
  document.querySelectorAll('.tour-header, .tools, .tour-footer, .credits, #renderCanvas').forEach(element => { element.inert = open; });
  navigation.setPaused(open || !ready || experience.mode !== 'walk');
  if (experience.mode !== 'walk') { if (open) orbit.detachControl(); else orbit.attachControl(canvas, true); }
}
function settings(open) {
  if (open) { mapPanel.hidden = true; document.getElementById('map-toggle').setAttribute('aria-expanded', 'false'); }
  settingsPanel.hidden = !open; document.getElementById('settings').setAttribute('aria-expanded', String(open));
  syncPanels();
  (open ? document.getElementById('quality') : document.getElementById('settings')).focus();
}
document.getElementById('settings').onclick = () => settings(settingsPanel.hidden);
document.getElementById('close-settings').onclick = () => settings(false);
document.getElementById('panel-backdrop').onclick = () => { if (!settingsPanel.hidden) settings(false); else toggleMap(false); };
addEventListener('keydown', e => {
  if (e.key !== 'Tab' || !document.body.classList.contains('panel-open')) return;
  const panel = settingsPanel.hidden ? mapPanel : settingsPanel;
  const controls = [...panel.querySelectorAll('button, input, select, a[href]')].filter(el => !el.disabled && el.getClientRects().length);
  const first = controls[0], last = controls[controls.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});
document.getElementById('quality').onchange = e => quality(e.target.value);
document.getElementById('sensitivity').oninput = e => navigation.setSensitivity(Number(e.target.value));
document.getElementById('invert').onchange = e => navigation.setInvert(e.target.checked);
addEventListener('keydown', e => { if (e.code === 'Escape') { if (!settingsPanel.hidden) settings(false); if (!mapPanel.hidden) toggleMap(false); } });
const fullscreen = document.getElementById('fullscreen');
if (!document.fullscreenEnabled) fullscreen.hidden = true;
fullscreen.onclick = async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.getElementById('tour').requestFullscreen();
  } catch { notify('Le plein écran est indisponible dans ce navigateur.'); }
};
document.addEventListener('fullscreenchange', () => {
  const active = !!document.fullscreenElement;
  fullscreen.setAttribute('aria-label', active ? 'Quitter le plein écran' : 'Plein écran');
  fullscreen.title = fullscreen.getAttribute('aria-label');
  fullscreen.querySelector('img').src = 'vendor/icons/' + (active ? 'minimize' : 'maximize') + '.svg'; resize();
});
addEventListener('pagehide', e => { if (!e.persisted) engine.dispose(); });
const villaId = new URLSearchParams(location.search).get('villaId');
if (villaId) document.getElementById('back').href = '/villas/' + encodeURIComponent(villaId);
