const B = window.BABYLON;

// Experimental atlas: only opt in after an architecture bake and visual review.
export async function loadBakedLighting(scene, fill) {
  const response = await fetch('assets/villa/lighting/uv2.json');
  if (!response.ok) throw new Error('Lighting atlas is unavailable');
  const entries = await response.json();
  const texture = new B.Texture('assets/villa/lighting/indirect.png', scene, false, true);
  texture.coordinatesIndex = 1;
  texture.gammaSpace = true;
  texture.level = 1.8;
  const affected = [];
  const ambient = new B.HemisphericLight('Indirect study ambient', B.Vector3.Up(), scene);
  ambient.intensity = .3;
  ambient.groundColor.copyFrom(fill.groundColor);
  for (const entry of entries) {
    const mesh = scene.meshes.find(m => m.name + ':' + m.getTotalIndices() === entry.key);
    if (!mesh || entry.uv2.length !== mesh.getTotalIndices() * 2) throw new Error('Lighting geometry mismatch: ' + entry.key);
    mesh.makeGeometryUnique();
    mesh.convertToUnIndexedMesh();
    mesh.setVerticesData(B.VertexBuffer.UV2Kind, entry.uv2);
    const original = mesh.material;
    const material = original.clone(original.name + ' / indirect');
    material.lightmapTexture = texture;
    material.useLightmapAsShadowmap = false;
    material.environmentIntensity = .6;
    mesh.material = material;
    fill.excludedMeshes.push(mesh);
    affected.push({ mesh, original, material });
  }
  ambient.includedOnlyMeshes = affected.map(item => item.mesh);
  let overview = false;
  scene.onBeforeRenderObservable.add(() => {
    const next = document.body.dataset.mode === 'open';
    if (next === overview) return;
    overview = next;
    ambient.setEnabled(!next);
    for (const { mesh, original, material } of affected) mesh.material = next ? original : material;
    fill.excludedMeshes = next ? [] : affected.map(item => item.mesh);
  });
  return { meshes: affected.length, texture };
}
