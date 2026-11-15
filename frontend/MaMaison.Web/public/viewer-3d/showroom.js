import { createNavigation, VIEWS } from './navigation.js';
const B = window.BABYLON;
const canvas = document.getElementById('renderCanvas');
const engine = new B.Engine(canvas, true, { stencil: true });
const coarse = matchMedia('(pointer: coarse)').matches;
const modestGPU = coarse || /Intel|SwiftShader|llvmpipe/i.test(engine.getGlInfo().renderer);
engine.setHardwareScalingLevel(coarse ? 1.25 : 1);
const scene = new B.Scene(engine);
scene.useRightHandedSystem = true;
scene.skipPointerMovePicking = true;
scene.skipPointerDownPicking = true;
scene.skipPointerUpPicking = true;
scene.clearColor = new B.Color4(.7, .76, .8, 1);
const camera = new B.UniversalCamera('visitor', new B.Vector3(4.8, 1.65, -2.7), scene);
camera.setTarget(new B.Vector3(1.7, 1.2, -1.4));
camera.minZ = .04;
camera.maxZ = 80;
camera.fov = .94;
scene.activeCamera = camera;
let noticeTimer;
function notify(message) {
  const notice = document.getElementById('notice');
  notice.textContent = message; notice.hidden = false;
  clearTimeout(noticeTimer); noticeTimer = setTimeout(() => { notice.hidden = true; }, 5500);
}
const navigation = createNavigation(scene, camera, canvas, notify);
navigation.teleport(VIEWS[0]);
navigation.setPaused(true);
window.tour = { engine, scene, camera, navigation };
const environment = new B.HDRCubeTexture('assets/salon/garden.hdr', scene, 256, false, true, false, true);
scene.environmentTexture = environment;
scene.environmentIntensity = .45;
const sky = scene.createDefaultSkybox(environment, true, 60, 0);
sky.material.environmentIntensity = 1.5;
const fill = new B.HemisphericLight('window-fill', new B.Vector3(-.5, 1, .3), scene);
fill.intensity = .55;
fill.groundColor = new B.Color3(.35, .36, .34);
const pipeline = new B.DefaultRenderingPipeline('image', true, scene, [camera]);
pipeline.fxaaEnabled = true;
pipeline.imageProcessing.toneMappingEnabled = true;
pipeline.imageProcessing.toneMappingType = B.ImageProcessingConfiguration.TONEMAPPING_ACES;
pipeline.imageProcessing.exposure = 1.4;
let mirror;
const quality = document.getElementById('quality');
function applyQuality(mode) {
  const high = mode === 'high';
  engine.setHardwareScalingLevel(high ? 1 / Math.min(devicePixelRatio, 1.5) : mode === 'low' ? 1.5 : modestGPU ? 1.25 : 1);
  if (mirror) mirror.refreshRate = mode === 'low' ? 4 : high ? 1 : 2;
}
engine.runRenderLoop(() => {
  navigation.update(engine.getDeltaTime() / 1000);
  scene.render();
});
try {
  const imported = await B.SceneLoader.ImportMeshAsync('', 'assets/salon/', 'salon-baked.glb', scene, event => {
    if (event.lengthComputable) document.getElementById('progress').value = event.loaded / event.total * 90;
  });
  for (const mesh of imported.meshes) {
    mesh.checkCollisions = false;
  }
  const lightmap = new B.Texture('assets/salon/salon-light.png', scene, false, false);
  lightmap.coordinatesIndex = 1;
  lightmap.gammaSpace = false;
  for (const mesh of imported.meshes) {
    if (mesh.isVerticesDataPresent(B.VertexBuffer.UV2Kind) && mesh.material instanceof B.PBRMaterial) {
      mesh.material.lightmapTexture = lightmap;
      mesh.material.useLightmapAsShadowmap = true;
      mesh.material.unlit = true;
      mesh.material.directIntensity = 1;
      mesh.material.environmentIntensity = .06;
      mesh.material.disableLighting = true;
    }
  }
  for (const material of scene.materials) {
    if (!(material instanceof B.PBRMaterial)) continue;
    // Fine mouldings keep clean highlights; broad surfaces use baked irradiance.
    if (['Paneling', 'MattePaint'].includes(material.name)) {
      material.lightmapTexture = null;
      material.unlit = false;
      material.disableLighting = false;
      material.directIntensity = 1;
      material.environmentIntensity = .5;
    }
    if (material.name === 'Glass') {
      material.subSurface.isRefractionEnabled = false;
      material.alpha = .22;
      material.transparencyMode = B.Material.MATERIAL_ALPHABLEND;
    }
    if (material.name === 'Sofa') { material.albedoColor.set(.72, .70, .65); material.sheen.isEnabled = true; material.sheen.intensity = .35; }
    if (material.name === 'Floor') { material.clearCoat.intensity = .35; material.clearCoat.roughness = .36; }
  }
  const mirrorMesh = scene.getMeshByName('29_Mirror');
  mirror = new B.MirrorTexture('salon-reflection', 512, scene, true);
  mirror.mirrorPlane = new B.Plane(0, 0, -1, -.024);
  mirror.renderList = [...imported.meshes.filter(m => m !== mirrorMesh && m.getTotalVertices()), sky];
  const mirrorMaterial = new B.StandardMaterial('real-mirror', scene);
  mirrorMaterial.diffuseColor = B.Color3.Black();
  mirrorMaterial.specularColor = B.Color3.Black();
  mirrorMaterial.reflectionTexture = mirror;
  mirrorMesh.material = mirrorMaterial;
  scene.activeCamera = camera;
  applyQuality('auto');
  await scene.whenReadyAsync();
  imported.meshes.forEach(mesh => mesh.freezeWorldMatrix());
  document.getElementById('loading').hidden = true;
  navigation.setPaused(false);
  window.tour.ready = true;
} catch (error) {
  console.error(error);
  document.getElementById('loading-label').textContent = 'Le salon n’a pas pu être chargé.';
  document.getElementById('retry').hidden = false;
  document.getElementById('retry').onclick = () => location.reload();
}
addEventListener('resize', () => engine.resize());
addEventListener('pagehide', event => { if (!event.persisted) engine.dispose(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) navigation.clear(); });
let transitioning = false;
async function goTo(index) {
  if (!window.tour.ready || transitioning) return;
  transitioning = true;
  navigation.setPaused(true);
  document.getElementById('fade').classList.add('active');
  await new Promise(resolve => setTimeout(resolve, 180));
  navigation.teleport(VIEWS[index]);
  document.getElementById('view-name').textContent = VIEWS[index].name;
  document.querySelectorAll('[data-view]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.view) === index)));
  document.getElementById('fade').classList.remove('active');
  navigation.setPaused(false);
  transitioning = false;
}
document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => goTo(Number(button.dataset.view))));
document.getElementById('reset').onclick = () => goTo(0);
document.getElementById('walk').onclick = () => navigation.explore();
const panel = document.getElementById('settings-panel');
function settings(open) {
  panel.hidden = !open;
  document.getElementById('settings').setAttribute('aria-expanded', String(open));
  navigation.setPaused(open || !window.tour.ready);
  if (open) document.getElementById('quality').focus();
  else document.getElementById('settings').focus();
}
document.getElementById('settings').onclick = () => settings(panel.hidden);
document.getElementById('close-settings').onclick = () => settings(false);
addEventListener('keydown', e => { if (e.code === 'Escape' && !panel.hidden) settings(false); });
quality.onchange = () => applyQuality(quality.value);
document.getElementById('sensitivity').oninput = e => navigation.setSensitivity(Number(e.target.value));
document.getElementById('invert').onchange = e => navigation.setInvert(e.target.checked);
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
  fullscreen.querySelector('img').src = 'vendor/icons/' + (active ? 'minimize' : 'maximize') + '.svg';
  engine.resize();
});
const villaId = new URLSearchParams(location.search).get('villaId');
if (villaId) document.getElementById('back').href = '/villas/' + encodeURIComponent(villaId);
