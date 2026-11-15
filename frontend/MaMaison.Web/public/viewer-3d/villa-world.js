import { HEIGHT, WALLS } from './villa-layout.js';
const B = window.BABYLON;
const V = (x, y, z) => new B.Vector3(x, y, z);

export async function buildVilla(scene, shadow, progress) {
  const colliders = [], doors = [], roofMeshes = [], batches = new Map();
  const color = hex => B.Color3.FromHexString(hex).toLinearSpace();
  function material(name, hex, roughness = .7, metallic = 0) {
    const m = new B.PBRMaterial(name, scene);
    m.albedoColor = color(hex); m.roughness = roughness; m.metallic = metallic;
    m.maxSimultaneousLights = 4;
    return m;
  }
  const plaster = material('Lime plaster', '#e9e5dc'), white = material('White enamel', '#f4f5f2', .35);
  const graphite = material('Graphite aluminium', '#363b3b', .36, .65);
  const stone = material('Pale terrazzo', '#c3c6c2', .6), tile = material('Porcelain', '#d7dad8', .32);
  const oak = material('Oak', '#cfb593', .5), grass = material('Lawn', '#b6c894', .95);
  const soil = material('Planting soil', '#323a29'), fabric = material('Woven linen', '#ddddcf', .95);
  const green = material('Sage upholstery', '#718579', .92), blue = material('Bedding', '#698f9a', .96);
  const brass = material('Brushed brass', '#b4a375', .26, .85);
  const glass = material('Clear glazing', '#dfe8e5', .025, 0);
  glass.alpha = .18; glass.transparencyMode = B.Material.MATERIAL_ALPHABLEND;
  glass.indexOfRefraction = 1.5;
  glass.backFaceCulling = false; glass.environmentIntensity = 1.35;
  glass.clearCoat.isEnabled = true; glass.clearCoat.intensity = .9; glass.clearCoat.roughness = .04;
  glass.subSurface.isRefractionEnabled = true; glass.subSurface.refractionIntensity = .15;
  const lamp = material('Warm LED', '#ffffff', .3);
  lamp.emissiveColor.set(1, .83, .6); lamp.unlit = true;
  function maps(m, id, repeat = 1) {
    m.albedoColor = B.Color3.White();
    m.albedoTexture = new B.Texture(`assets/villa/${id}-diff.jpg`, scene);
    m.bumpTexture = new B.Texture(`assets/villa/${id}-nor_gl.jpg`, scene);
    m.bumpTexture.level = .3;
    m.metadata = { repeat };
  }
  plaster.bumpTexture = new B.Texture('assets/villa/white_plaster_02-nor_gl.jpg', scene);
  plaster.bumpTexture.level = .08;
  plaster.metadata = { repeat: 1 };
  maps(oak, 'wood_floor', .59);
  oak.metallicTexture = new B.Texture('assets/villa/wood_floor-rough.jpg', scene);
  oak.metallicTexture.gammaSpace = false;
  oak.useRoughnessFromMetallicTextureAlpha = false;
  oak.useRoughnessFromMetallicTextureGreen = true;
  oak.useMetallnessFromMetallicTextureBlue = false;
  oak.roughness = .85;
  oak.clearCoat.isEnabled = true; oak.clearCoat.intensity = .16; oak.clearCoat.roughness = .35;
  // Furniture uses continuous veneer, not the floor's repeating plank joints.
  const veneer = material('Furniture oak veneer', '#ffffff', .8);
  maps(veneer, 'oak_veneer_01');
  veneer.bumpTexture.level = .12;
  veneer.bumpTexture.gammaSpace = false;
  veneer.metallicTexture = new B.Texture('assets/villa/oak_veneer_01-rough.jpg', scene);
  veneer.metallicTexture.gammaSpace = false;
  veneer.useRoughnessFromMetallicTextureAlpha = false;
  veneer.useRoughnessFromMetallicTextureGreen = true;
  veneer.useMetallnessFromMetallicTextureBlue = false;
  veneer.clearCoat.isEnabled = true;
  veneer.clearCoat.intensity = .12;
  veneer.clearCoat.roughness = .4;
  fabric.sheen.isEnabled = true; fabric.sheen.intensity = .3;
  const weave = new B.DynamicTexture('Linen weave micro-normal', 128, scene, true);
  const weaveContext = weave.getContext(), pixels = weaveContext.createImageData(128, 128);
  for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
    const i = (y * 128 + x) * 4;
    pixels.data[i] = 128 + Math.round(12 * Math.sin(x * Math.PI / 4));
    pixels.data[i + 1] = 128 + Math.round(12 * Math.sin(y * Math.PI / 4));
    pixels.data[i + 2] = 254; pixels.data[i + 3] = 255;
  }
  weaveContext.putImageData(pixels, 0, 0); weave.update(false);
  weave.gammaSpace = false; weave.uScale = weave.vScale = 20; weave.level = .12;
  fabric.bumpTexture = weave;
  maps(grass, 'aerial_grass_rock', .14);
  grass.albedoColor.set(.4, .8, .35);
  function collider(name, x, y, z, w, h, d) {
    const m = B.MeshBuilder.CreateBox('solid-' + name, { width: w, height: h, depth: d }, scene);
    m.position.set(x, y, z); m.isVisible = false; m.isPickable = false; m.checkCollisions = true;
    m.computeWorldMatrix(true); colliders.push(m); return m;
  }
  function register(m, mat, cast = true, merge = true) {
    m.material = mat; m.isPickable = false; m.receiveShadows = true;
    if (merge) {
      const key = mat.name + ':' + cast;
      if (!batches.has(key)) batches.set(key, { meshes: [], mat, cast });
      batches.get(key).meshes.push(m);
    } else if (cast) shadow.addShadowCaster(m);
    return m;
  }
  function box(name, x, y, z, w, h, d, mat, solid = false, cast = true, merge = true) {
    const roof = /^(roof|porch-roof|pergola-rafters)/.test(name);
    if (roof) merge = false;
    const m = B.MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, scene);
    m.position.set(x, y, z);
    // World-size UVs keep material scale constant across different wall lengths.
    const p = m.getVerticesData(B.VertexBuffer.PositionKind), n = m.getVerticesData(B.VertexBuffer.NormalKind), uv = [];
    const repeat = mat.metadata?.repeat || .5;
    for (let i = 0; i < p.length; i += 3) {
      if (Math.abs(n[i + 1]) > .5) uv.push((p[i] + x) * repeat, (p[i + 2] + z) * repeat);
      else if (Math.abs(n[i]) > .5) uv.push((p[i + 2] + z) * repeat, (p[i + 1] + y) * repeat);
      else uv.push((p[i] + x) * repeat, (p[i + 1] + y) * repeat);
    }
    m.setVerticesData(B.VertexBuffer.UVKind, uv);
    if (solid) collider(name, x, y, z, w, h, d);
    if (roof) roofMeshes.push(m);
    return register(m, mat, cast, merge);
  }
  function cylinder(name, x, y, z, diameter, height, mat, top = diameter, merge = true) {
    const m = B.MeshBuilder.CreateCylinder(name, { diameterTop: top, diameterBottom: diameter, height, tessellation: 24 }, scene);
    m.position.set(x, y, z); return register(m, mat, true, merge);
  }
  function plane(name, x, y, z, width, height, mat, rotation = V(0, 0, 0), cast = false) {
    const m = B.MeshBuilder.CreatePlane(name, { width, height, sideOrientation: B.Mesh.DOUBLESIDE }, scene);
    m.position.set(x, y, z); m.rotation.copyFrom(rotation);
    return register(m, mat, cast, false);
  }
  function wallPart(wall, u0, u1, bottom, top, mat = plaster) {
    if (u1 - u0 < .001 || top - bottom < .001) return;
    const horizontal = wall.axis === 'x', thick = wall.exterior ? .28 : .16;
    const u = (u0 + u1) / 2, y = (bottom + top) / 2;
    box('wall', horizontal ? u : wall.at, y, horizontal ? wall.at : u,
      horizontal ? u1 - u0 : thick, top - bottom, horizontal ? thick : u1 - u0, mat, bottom < 1.9);
    if (bottom === 0) {
      for (const side of [-1, 1]) box('skirting', horizontal ? u : wall.at + side * (thick / 2 + .012), .06,
        horizontal ? wall.at + side * (thick / 2 + .012) : u,
        horizontal ? u1 - u0 : .025, .12, horizontal ? .025 : u1 - u0, white, false, false);
    }
  }
  for (const wall of WALLS) {
    let start = wall.from;
    for (const opening of wall.openings) {
      const a = opening.at - opening.width / 2, b = opening.at + opening.width / 2;
      wallPart(wall, start, a, 0, HEIGHT);
      wallPart(wall, a, b, 0, opening.bottom);
      wallPart(wall, a, b, opening.top, HEIGHT);
      const horizontal = wall.axis === 'x';
      const frame = (u, y, width, height, mat, depth = .09) => box('frame', horizontal ? u : wall.at, y, horizontal ? wall.at : u,
        horizontal ? width : depth, height, horizontal ? depth : width, mat, false, mat !== glass);
      const frameMat = opening.kind === 'window' ? graphite : oak;
      frame(a + .025, (opening.top + opening.bottom) / 2, .05, opening.top - opening.bottom, frameMat);
      frame(b - .025, (opening.top + opening.bottom) / 2, .05, opening.top - opening.bottom, frameMat);
      frame(opening.at, opening.top - .025, opening.width, .05, frameMat);
      if (opening.kind === 'window') {
        frame(opening.at, opening.bottom + .025, opening.width, .05, graphite);
        frame(opening.at, (opening.top + opening.bottom) / 2, opening.width - .08, opening.top - opening.bottom - .08, glass, .018);
        const panels = Math.ceil(opening.width / 1.5);
        for (let i = 1; i < panels; i++) frame(a + opening.width * i / panels, (opening.top + opening.bottom) / 2, .04, opening.top - opening.bottom, graphite);
        collider('window', horizontal ? opening.at : wall.at, 1.5, horizontal ? wall.at : opening.at,
          horizontal ? opening.width : .09, 3, horizontal ? .09 : opening.width);
      }
      if (opening.kind === 'door') {
        const pivot = new B.TransformNode('hinge-' + opening.id, scene);
        pivot.position.set(horizontal ? a + .05 : wall.at, 0, horizontal ? wall.at : a + .05);
        const baseRotation = horizontal ? 0 : -Math.PI / 2;
        pivot.rotation.y = baseRotation;
        const width = opening.width - .1;
        const leaf = box('door-' + opening.id, width / 2, (opening.top - .07) / 2, 0, width, opening.top - .07, .055, oak, false, true, false);
        leaf.parent = pivot; leaf.checkCollisions = true; colliders.push(leaf);
        for (const side of [-1, 1]) {
          const handle = box('handle', width - .12, 1.02, side * .065, .15, .028, .032, brass, false, true, false);
          handle.parent = pivot;
          const plate = box('handle-plate', width - .18, 1.02, side * .035, .045, .16, .025, brass, false, true, false);
          plate.parent = pivot;
        }
        doors.push({ ...opening, axis: wall.axis, pivot, leaf, baseRotation, angle: 0, target: 0, manual: false,
          center: V(horizontal ? opening.at : wall.at, 1.1, horizontal ? wall.at : opening.at) });
      }
      start = b;
    }
    wallPart(wall, start, wall.to, 0, HEIGHT);
  }
  progress(22);
  // A continuous level floor avoids artificial steps in the walking controller.
  box('foundation', 0, -.14, 6, 16.4, .28, 12.4, stone, false, false);
  box('living-parquet', -4.65, -.012, 3.5, 6.7, .025, 7, oak, false, false);
  box('suite-parquet', 4.65, -.01, 2.75, 6.7, .025, 5.5, oak, false, false);
  box('guest-parquet', 6.4, -.01, 9.5, 3.2, .025, 5, oak, false, false);
  for (let x = -7.5; x < 8; x += 1) for (let z = .5; z < 12; z += 1) {
    if (x < -1.3 && z < 7 || x > 1.3 && z < 5.5 || x > 4.8 && z > 7) continue;
    box('floor-tile', x, .002, z, .992, .015, .992, tile, false, false);
  }
  box('roof', 0, HEIGHT + .14, 6, 17, .28, 13, white);
  for (const z of [-.48, 12.48]) box('roof-edge', 0, HEIGHT + .05, z, 17, .13, .06, graphite);
  for (const x of [-8.48, 8.48]) box('roof-edge', x, HEIGHT + .05, 6, .06, .13, 13, graphite);
  // Deep porch and narrow timber fins give the entry a legible architectural scale.
  box('porch-roof', 0, 2.87, -1.2, 3.3, .18, 2.7, graphite);
  box('porch-soffit', 0, 2.765, -1.2, 3.12, .035, 2.48, veneer, false, false);
  for (let x = -7.2; x <= 7.2; x += 1.2) box('front-soffit-strip', x, HEIGHT - .12, -.18, .82, .045, .13, veneer, false, false);
  for (const x of [-1.58, 1.58]) box('porch-post', x, 1.4, -2.4, .09, 2.8, .09, graphite, true);
  for (let x = .88; x < 2.7; x += .105) box('entry-slat', x, 1.4, -.2, .048, 2.8, .07, oak);
  box('door-mat', 0, .006, -.6, 1.25, .012, .8, graphite, false, false);
  box('lawn', 0, -.095, 2, 38, .12, 42, grass, false, false);
  box('rear-terrace', -1, -.025, 14.1, 15, .05, 4.2, stone, false, false);
  for (let z = -13; z < 0; z += 1.2) box('entry-paver', 0, -.008, z, 2.1, .03, 1.16, stone, false, false);
  for (const x of [-1.15, 1.15]) box('path-border', x, -.01, -6.6, .08, .05, 13.8, white, false, false);
  const dryLeafA = material('Dry mango leaves', '#9f7240', .9), dryLeafB = material('Dry palm leaves', '#c0944e', .88);
  for (let i = 0; i < 34; i++) {
    const side = i % 2 ? -1 : 1;
    const z = -12.4 + i * .38;
    const x = side * (.18 + (i % 5) * .16);
    const mat = i % 3 ? dryLeafA : dryLeafB;
    const leaf = plane('fallen-leaf', x, .012, z, .16 + (i % 4) * .025, .055, mat, V(Math.PI / 2, 0, i * .77), false);
    leaf.scaling.y = .65 + (i % 4) * .12;
  }
  for (const z of [-18.5, 22.5]) box('garden-boundary', 0, .48, z, 37, .96, .22, plaster, true);
  for (const x of [-18.5, 18.5]) box('garden-boundary', x, .48, 2, .22, .96, 41, plaster, true);
  const wallMark = material('Subtle rainy-season wall marks', '#8e806f', .95);
  wallMark.alpha = .16; wallMark.transparencyMode = B.Material.MATERIAL_ALPHABLEND;
  for (const [x, y, w, h, a] of [[-6.7, 2.1, .22, 1.2, -.04], [-2.2, 1.9, .16, .9, .06], [2.7, 2.2, .2, 1.1, .02], [6.6, 1.8, .14, .75, -.08]]) {
    plane('plaster-weathering', x, y, -.151, w, h, wallMark, V(0, 0, a), false);
  }
  // Pergola over the rear terrace; no steps or invisible perimeter around the home.
  for (const x of [-7.6, -1.9]) for (const z of [12.7, 16]) box('pergola-post', x, 1.5, z, .12, 3, .12, graphite, true);
  for (let z = 12.6; z <= 16.2; z += .32) box('pergola-rafters', -4.75, 3, z, 6.2, .12, .065, oak);
  // Kitchen: worktop, fitted cabinetry, island, sink and stools.
  box('kitchen-base', -7.47, .44, 9.5, .78, .88, 4.1, oak, true);
  box('countertop', -7.45, .92, 9.5, .85, .065, 4.2, white);
  for (let z = 7.6; z < 11.6; z += .65) {
    box('cabinet-front', -7.058, .43, z, .025, .78, .62, white);
    box('cabinet-pull', -7.03, .74, z, .035, .024, .22, graphite);
  }
  box('island', -4.55, .44, 9.9, 2.25, .88, .9, oak, true);
  box('island-stone', -4.55, .925, 9.9, 2.5, .07, 1.1, white);
  box('sink', -7.43, .96, 9.6, .56, .012, .7, graphite);
  cylinder('tap', -7.65, 1.12, 9.6, .035, .34, brass);
  const faucet = box('tap-spout', -7.52, 1.28, 9.6, .28, .035, .035, brass);
  for (let x = -5.25; x < -3.5; x += .7) {
    cylinder('stool-seat', x, .65, 8.9, .43, .09, green);
    for (const dx of [-.14, .14]) for (const dz of [-.14, .14]) box('stool-leg', x + dx, .3, 8.9 + dz, .035, .6, .035, graphite);
  }
  box('fridge', -2, 1.08, 11.45, 1, 2.16, .8, graphite, true);
  box('fridge-seam', -2, 1.32, 11.035, .96, .015, .01, brass);
  box('fridge-handle', -2.38, 1.52, 11, .022, .58, .025, brass);
  // Living room, with clear 1.2m-plus walking routes around the furniture.
  box('rug', -4.9, .012, 3.45, 4.1, .024, 3.3, fabric, false, false);
  collider('coffee-table', -4.9, .5, 3.6, 1.1, 1, 1.1);
  box('media-console', -4.7, .27, .52, 2.8, .54, .55, oak, true);
  box('television', -4.7, 1.35, .25, 1.75, 1.04, .05, graphite);
  box('screen', -4.7, 1.35, .281, 1.68, .97, .008, material('Screen glass', '#203a42', .12, .4));
  box('book', -4.4, .57, .55, .25, .045, .3, blue);
  box('book', -4.35, .615, .55, .28, .035, .3, fabric);
  // Upholstered beds, wardrobes and bedside tables at real-world dimensions.
  function bed(x, z, width) {
    collider('bed', x, .5, z, width + .12, 1, 2.2);
    for (const side of [-1, 1]) {
      cylinder('bedside', x + side * (width / 2 + .35), .23, z + .68, .48, .46, oak);
      cylinder('lamp-base', x + side * (width / 2 + .35), .59, z + .68, .09, .3, brass);
      cylinder('lamp-shade', x + side * (width / 2 + .35), .78, z + .68, .3, .23, fabric, .24);
    }
  }
  bed(4.85, 3.9, 1.8); bed(6.42, 10.3, 1.5);
  box('wardrobe', 2, 1.35, 1.25, .65, 2.7, 2.05, oak, true);
  for (const z of [.8, 1.7]) box('wardrobe-handle', 2.35, 1.25, z, .025, .45, .025, brass);
  box('bench', 4.85, .35, 1.95, 1.65, .18, .5, green, true);
  // Bathroom: shower screen leaves a real entry gap, vanity and WC.
  box('shower-tray', 2.2, .012, 11.1, 1.5, .024, 1.65, white, false, false);
  box('shower-glass', 2.95, 1.15, 11.25, .025, 2.3, 1.4, glass, true, false);
  cylinder('shower-pipe', 1.49, 1.5, 11.25, .024, 1.7, brass);
  box('rain-head', 1.75, 2.37, 11.25, .55, .035, .28, brass);
  box('vanity', 4.32, .42, 9.25, .65, .65, 1.5, oak, true);
  box('vanity-top', 4.32, .78, 9.25, .7, .07, 1.6, white);
  cylinder('basin', 4.3, .84, 9.25, .47, .12, white, .52);
  box('bath-mirror', 4.685, 1.65, 9.25, .025, 1.1, 1.15, material('Mirror', '#d2dcdb', .03, 1));
  cylinder('WC-base', 3.85, .21, 11.55, .38, .42, white, .48);
  box('WC-cistern', 3.85, .68, 11.82, .42, .72, .22, white, true);
  // Interior lighting fixtures stay subtle in daylight.
  for (const x of [-4.7, 0, 4.8]) for (const z of [2, 5, 8, 11]) {
    cylinder('downlight', x, HEIGHT - .025, z, .13, .025, lamp);
  }
  for (const x of [-5.25, -3.9]) {
    cylinder('pendant-wire', x, 2.74, 9.9, .012, .58, graphite);
    cylinder('pendant', x, 2.4, 9.9, .32, .17, graphite, .15);
    cylinder('pendant-light', x, 2.31, 9.9, .27, .01, lamp);
  }
  // Pleated curtains: mesh folds retain depth at grazing viewing angles.
  for (const x of [-7.08, -2.98]) {
    const paths = [[], []];
    for (let i = 0; i <= 32; i++) {
      const u = x + i / 32 * .55, depth = .3 + Math.sin(i / 32 * Math.PI * 12) * .045;
      paths[0].push(V(u, .04, depth)); paths[1].push(V(u, 2.83, depth));
    }
    register(B.MeshBuilder.CreateRibbon('linen-curtain', { pathArray: paths, sideOrientation: B.Mesh.DOUBLESIDE }, scene), fabric);
  }
  // Real geometry for vegetation is added below; the HDR is only the distant sky.
  for (const [x, z] of [[-10, -5], [9, -5], [-12, 9], [11, 16]]) {
    cylinder('planting-bed', x, -.01, z, 3.4, .04, soil);
    collider('tree-trunk', x, 1.2, z, .4, 2.4, .4);
  }
  for (const [x, z, w, d] of [[-2.3, -6.9, 2.7, 1.1], [2.5, -6.4, 2.2, .9], [-6.4, -2.1, 2.4, .95], [6.7, -1.4, 2.5, 1.1]]) {
    cylinder('low-planting-mass', x, .08, z, w, .16, green, d / w);
  }
  for (const { meshes, mat, cast } of batches.values()) {
    const merged = B.Mesh.MergeMeshes(meshes, true, true);
    if (!merged) continue;
    merged.name = 'architecture-' + mat.name; merged.material = mat; merged.receiveShadows = true; merged.isPickable = false;
    merged.freezeWorldMatrix(); if (cast) shadow.addShadowCaster(merged);
  }
  // Instanced ground cover gives the lawn a silhouette without a mesh per blade.
  const grassBlade = new B.Mesh('grass-blades', scene);
  const bladeData = new B.VertexData();
  bladeData.positions = [-.006, 0, 0, .006, 0, 0, .015, .16, .018, 0, .23, .03, 0, 0, -.006, 0, 0, .006, .018, .14, .03];
  bladeData.indices = [0, 1, 2, 0, 2, 3, 4, 5, 6];
  bladeData.normals = [];
  B.VertexData.ComputeNormals(bladeData.positions, bladeData.indices, bladeData.normals);
  bladeData.applyToMesh(grassBlade);
  const bladeMat = material('Living grass', '#4e7041', .95);
  bladeMat.backFaceCulling = false;
  grassBlade.material = bladeMat; grassBlade.isPickable = false; grassBlade.receiveShadows = true;
  let seed = 417;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) | 0; return (seed >>> 0) / 4294967296; };
  const matrices = [];
  for (let i = 0; i < 45000; i++) {
    const x = random() * 33 - 16.5, z = random() * 36 - 15.5;
    if (Math.abs(x) < 8.6 && z > -.35 && z < 16.3 || Math.abs(x) < 1.3 && z < 0) continue;
    const s = .25 + random() * .22;
    matrices.push(...B.Matrix.Compose(new B.Vector3(s, s, s), B.Quaternion.RotationAxis(B.Axis.Y, random() * Math.PI), V(x, -.035, z)).asArray());
  }
  grassBlade.thinInstanceSetBuffer('matrix', new Float32Array(matrices), 16);
  progress(40);
  const doorDetail = await B.SceneLoader.LoadAssetContainerAsync('assets/villa/', 'door-detail.glb', scene);
  for (const door of doors) {
    const instance = doorDetail.instantiateModelsToScene(name => name + '-' + door.id, false, { doNotInstantiate: true });
    const scale = new B.TransformNode('door-detail-scale-' + door.id, scene);
    scale.parent = door.pivot; scale.scaling.set((door.width - .1) / 1.3, (door.top - .07) / 2.48, 1);
    for (const root of instance.rootNodes) root.parent = scale;
    for (const mesh of scale.getChildMeshes()) {
      if (mesh.material?.name === 'Detail oak') mesh.material = veneer;
      mesh.checkCollisions = false; mesh.isPickable = false; mesh.receiveShadows = true;
      shadow.addShadowCaster(mesh);
    }
    door.leaf.isVisible = false;
  }
  async function furniture(folder, file, name, x, z, width, rotation = 0) {
    const loaded = await B.SceneLoader.ImportMeshAsync('', folder, file, scene);
    const root = new B.TransformNode(name, scene);
    for (const m of loaded.meshes) if (!m.parent) m.parent = root;
    root.computeWorldMatrix(true);
    const bounds = root.getHierarchyBoundingVectors();
    const scale = width / (bounds.max.x - bounds.min.x);
    root.scaling.setAll(scale);
    const center = bounds.min.add(bounds.max).scale(.5);
    const offset = V(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
    const pivot = new B.TransformNode(name + '-position', scene);
    root.parent = pivot; root.position.copyFrom(offset);
    pivot.rotation.y = rotation; pivot.position.set(x, .02, z);
    for (const m of loaded.meshes) {
      m.isPickable = false; m.checkCollisions = false; m.receiveShadows = true;
      if (m.getTotalVertices()) shadow.addShadowCaster(m);
    }
    return { pivot, meshes: loaded.meshes };
  }
  await furniture('assets/meubles/sofa_02/', 'sofa_02_1k.gltf', 'sofa', -4.9, 5.35, 2.8, Math.PI);
  const table = await furniture('assets/villa/', 'table-detail.glb', 'coffee-table', -4.9, 3.6, 1.1);
  for (const mesh of table.meshes) if (mesh.material?.name === 'Detail oak') mesh.material = veneer;
  collider('sofa', -4.9, .65, 5.35, 2.8, 1.3, 1.05);
  progress(60);
  await furniture('assets/meubles/mid_century_lounge_chair/', 'mid_century_lounge_chair_1k.gltf', 'armchair', -6.7, 3.1, .9, Math.PI / 3);
  collider('armchair', -6.7, .6, 3.1, .9, 1.2, .9);
  progress(72);
  await furniture('assets/villa/', 'bed.glb', 'suite-bed', 4.85, 3.9, 2.06);
  await furniture('assets/villa/', 'bed.glb', 'guest-bed', 6.42, 10.3, 1.76);
  const plant = await furniture('assets/villa/plant/', 'plant.gltf', 'planter', -2.5, -8.4, .95);
  collider('planter', -2.5, .6, -8.4, .6, 1.2, .6);
  for (const [i, x, z] of [[1, 2.5, -8.4], [2, -2.5, -3.9], [3, 2.5, -3.9], [4, -7.25, 6.2]]) {
    const clone = plant.pivot.clone('planter-' + i, null, false);
    clone.position.set(x, .02, z); clone.rotation.y = i * 1.8;
    for (const m of clone.getChildMeshes()) if (m.getTotalVertices()) shadow.addShadowCaster(m);
    collider('planter-' + i, x, .6, z, .6, 1.2, .6);
  }
  const tree = await furniture('assets/villa/', 'tree-web.glb', 'tree', -10, -5, 6);
  const height = tree.pivot.getHierarchyBoundingVectors().max.y;
  for (const [i, x, z] of [[1, 9, -5], [2, -12, 9], [3, 11, 16]]) {
    const clone = tree.pivot.clone('tree-' + i, null, false);
    clone.position.set(x, .02, z); clone.rotation.y = i * 1.7; clone.scaling.setAll(.8 + (i % 3) * .12);
    for (const m of clone.getChildMeshes()) if (m.getTotalVertices()) shadow.addShadowCaster(m);
  }
  progress(95);
  return { doors, colliders, roofMeshes, treeHeight: height };
}
