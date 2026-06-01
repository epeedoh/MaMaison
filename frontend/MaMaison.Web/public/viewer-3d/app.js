// MaMaison — Viewer 3D BabylonJS MVP1
// Pipeline: Sweet Home 3D → Blender → GLB → BabylonJS

const API_BASE = '/api';

let engine, scene, camera;
let pointsVisite = [];
let indexCourant = 0;
let villaId = null;

// Récupère l'ID villa depuis les paramètres d'URL
const params = new URLSearchParams(window.location.search);
villaId = params.get('villaId');

window.addEventListener('DOMContentLoaded', () => {
    // Timeout global 8s : si rien ne se passe, mode démo
    const securite = setTimeout(() => {
        console.warn('Timeout — passage en mode démo');
        chargerDemoLocal();
    }, 8000);

    const lancer = villaId
        ? chargerVillaDepuisApi(villaId)
        : Promise.resolve(chargerDemoLocal());

    lancer.finally(() => clearTimeout(securite));
});

async function chargerVillaDepuisApi(id) {
    try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 5000);

        const res = await fetch(`${API_BASE}/villas/${id}`, { signal: ctrl.signal });
        clearTimeout(timer);

        if (!res.ok) throw new Error('Villa non trouvée');
        const villa = await res.json();

        document.getElementById('villa-titre').textContent = villa.titre;
        document.getElementById('villa-prix').textContent =
            new Intl.NumberFormat('fr-CI', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 })
                .format(villa.prix);

        pointsVisite = villa.pointsVisite || [];
        // Pas de GLB réel pour MVP → démo enrichie avec données API
        initialiserViewer(null);
    } catch (e) {
        console.error('API indisponible, mode démo:', e.message);
        chargerDemoLocal();
    }
}

function chargerDemoLocal() {
    document.getElementById('villa-titre').textContent = 'Villa Démo — Cocody';
    document.getElementById('villa-prix').textContent = '45 000 000 FCFA';

    pointsVisite = [
        {
            id: '1', nomPiece: 'Salon — 35 m²', ordre: 0,
            positionX: 0.2, positionY: 1.6, positionZ: 0.5,
            rotationX: 0, rotationY: Math.PI, rotationZ: 0,
            hotspots: [
                { id: 'h1', libelle: 'Surface & matériaux', contenu: '35 m² · Parquet chêne clair · Plafond 3,2m', positionX: 1.5, positionY: 1.2, positionZ: -3.5 },
                { id: 'h2', libelle: 'Canapé & salon', contenu: 'Canapé 3 places + méridienne · Table basse noyer & laiton', positionX: 0.2, positionY: 1.0, positionZ: 2.2 },
                { id: 'h3', libelle: 'Espace TV', contenu: 'Meuble TV suspendu blanc laqué · Écran 65"', positionX: 0, positionY: 1.3, positionZ: -4.5 }
            ]
        },
        {
            id: '2', nomPiece: 'Cuisine — 18 m²', ordre: 1,
            positionX: 7.5, positionY: 1.6, positionZ: -3.5,
            rotationX: 0, rotationY: -Math.PI * 0.6, rotationZ: 0,
            hotspots: [
                { id: 'h4', libelle: 'Équipements', contenu: 'Cuisine équipée inox · Îlot central avec bar · Hotte intégrée', positionX: 8.5, positionY: 1.1, positionZ: -5.8 },
                { id: 'h5', libelle: 'Plan de travail', contenu: 'Inox brossé 4ml · Rangements plafond', positionX: 10, positionY: 1.5, positionZ: -4 }
            ]
        },
        {
            id: '3', nomPiece: 'Chambre principale — 22 m²', ordre: 2,
            positionX: -6, positionY: 1.6, positionZ: 5,
            rotationX: 0, rotationY: Math.PI * 0.25, rotationZ: 0,
            hotspots: [
                { id: 'h6', libelle: 'Lit & literie', contenu: 'Lit king-size 200×200 · Tête de lit bois massif · Oreillers premium', positionX: -7, positionY: 0.9, positionZ: 4 },
                { id: 'h7', libelle: 'Armoire & rangements', contenu: 'Armoire 2m · Miroir coulissant · Dressing intégré 6 m²', positionX: -3.5, positionY: 1.4, positionZ: 5.5 }
            ]
        }
    ];

    initialiserViewer(null);
}

function initialiserViewer(modele3DUrl) {
    if (typeof BABYLON === 'undefined') {
        console.error('BabylonJS non chargé');
        document.getElementById('loading').innerHTML =
            '<p style="color:#f59e0b;font-size:1rem">⚠️ BabylonJS non disponible.<br>Vérifiez votre connexion internet.</p>';
        return;
    }

    const canvas = document.getElementById('renderCanvas');
    engine = new BABYLON.Engine(canvas, true, {
        preserveDrawingBuffer: true, stencil: true, antialias: true
    });
    scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.75, 0.88, 0.98, 1);

    // Caméra FPS confortable
    camera = new BABYLON.FreeCamera('camera', new BABYLON.Vector3(0, 1.65, 0), scene);
    camera.minZ = 0.05;
    camera.fov  = 1.05;
    camera.setTarget(new BABYLON.Vector3(0, 1.65, -4));

    if (modele3DUrl) {
        chargerModeleGLB(modele3DUrl);
    } else {
        creerSceneDemo();
        afficherLoading(false);
    }

    engine.runRenderLoop(() => scene.render());
    window.addEventListener('resize', () => engine.resize());

    if (pointsVisite.length > 0) {
        naviguerVers(0);
    }
}

function chargerModeleGLB(url) {
    BABYLON.SceneLoader.AppendAsync('', url, scene)
        .then(() => {
            afficherLoading(false);
            if (pointsVisite.length > 0) naviguerVers(0);
        })
        .catch(e => {
            console.error('Erreur chargement GLB:', e);
            creerSceneDemo();
            afficherLoading(false);
        });
}

/* ================================================================
   HELPERS PBR
   ================================================================ */
function pbr(nom, hex, rough = 0.7, metal = 0, emissive = null) {
    if (scene.getMaterialByName(nom)) return scene.getMaterialByName(nom);
    const m = new BABYLON.PBRMaterial(nom, scene);
    m.albedoColor  = BABYLON.Color3.FromHexString(hex);
    m.roughness    = rough;
    m.metallic     = metal;
    m.ambientColor = new BABYLON.Color3(1, 1, 1);
    if (emissive) m.emissiveColor = BABYLON.Color3.FromHexString(emissive);
    return m;
}

function box(nom, w, h, d, x, y, z, mat, shadows) {
    const b = BABYLON.MeshBuilder.CreateBox(nom, { width: w, height: h, depth: d }, scene);
    b.position.set(x, y, z);
    b.material = mat;
    b.receiveShadows = true;
    if (shadows) shadows.addShadowCaster(b);
    return b;
}

function cyl(nom, h, dTop, dBot, x, y, z, mat, shadows, tess = 20) {
    const c = BABYLON.MeshBuilder.CreateCylinder(nom, { height: h, diameterTop: dTop, diameterBottom: dBot, tessellation: tess }, scene);
    c.position.set(x, y, z);
    c.material = mat;
    c.receiveShadows = true;
    if (shadows) shadows.addShadowCaster(c);
    return c;
}

/* Texture parquet procédurale (canvas 2D — aucun CDN) */
function texParquet() {
    const dt = new BABYLON.DynamicTexture('texParquet', { width: 512, height: 512 }, scene);
    const ctx = dt.getContext();
    const planks = 8;
    const ph = 512 / planks;
    const palette = ['#8B6340','#7A5530','#9C7248','#6E4B28','#8A6038','#7B5432','#A07848','#6A472A'];
    for (let i = 0; i < planks; i++) {
        ctx.fillStyle = palette[i % palette.length];
        ctx.fillRect(0, i * ph, 512, ph - 1.5);
        // grain
        ctx.globalAlpha = 0.07;
        for (let x = 0; x < 512; x += 14 + Math.random() * 10) {
            ctx.strokeStyle = '#5A3818';
            ctx.lineWidth = 0.5 + Math.random();
            ctx.beginPath();
            ctx.moveTo(x + Math.random() * 6, i * ph);
            ctx.lineTo(x + Math.random() * 6, (i + 1) * ph);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
        // joint
        ctx.fillStyle = '#3A2510';
        ctx.fillRect(0, (i + 1) * ph - 1.5, 512, 1.5);
    }
    dt.update();
    dt.uScale = 4; dt.vScale = 3;
    return dt;
}

/* Texture carrelage procédurale */
function texCarrelage() {
    const dt = new BABYLON.DynamicTexture('texCarrelage', { width: 512, height: 512 }, scene);
    const ctx = dt.getContext();
    const n = 8; const s = 512 / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const v = 220 + (i + j) % 2 * 12;
        ctx.fillStyle = `rgb(${v},${v-4},${v-8})`;
        ctx.fillRect(j * s + 1.5, i * s + 1.5, s - 3, s - 3);
    }
    ctx.strokeStyle = '#BEB8B2'; ctx.lineWidth = 3;
    for (let i = 0; i <= n; i++) {
        ctx.beginPath(); ctx.moveTo(0, i*s); ctx.lineTo(512, i*s); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(i*s, 0); ctx.lineTo(i*s, 512); ctx.stroke();
    }
    dt.update(); dt.uScale = 3; dt.vScale = 3;
    return dt;
}

/* ================================================================
   SCÈNE ARCHVIZ PBR — Villa Palm Beach
   Ombres portées · Tone mapping ACES · Textures procédurales
   ================================================================ */
function creerSceneDemo() {
    // ══════════════════════════════════════════════════════════
    // ÉCLAIRAGE RÉALISTE
    // ══════════════════════════════════════════════════════════

    // Lumière ambiante douce (rebond de lumière)
    const hemi = new BABYLON.HemisphericLight('hemi', new BABYLON.Vector3(0, 1, 0), scene);
    hemi.intensity   = 0.35;
    hemi.diffuse     = new BABYLON.Color3(0.95, 0.92, 0.88);
    hemi.groundColor = new BABYLON.Color3(0.30, 0.22, 0.15);

    // Soleil directionnel (lumière principale)
    const sun = new BABYLON.DirectionalLight('sun', new BABYLON.Vector3(-0.4, -1, 0.6), scene);
    sun.position  = new BABYLON.Vector3(6, 8, -4);
    sun.intensity = 1.1;
    sun.diffuse   = new BABYLON.Color3(1, 0.97, 0.88);

    // ShadowGenerator (ombres douces ESM)
    const sg = new BABYLON.ShadowGenerator(2048, sun);
    sg.useExponentialShadowMap = true;
    sg.bias = 0.0008;

    // ══════════════════════════════════════════════════════════
    // MATÉRIAUX PBR
    // ══════════════════════════════════════════════════════════
    const mWall   = pbr('wall',   '#F5F2ED', 0.92, 0.0);
    const mCeil   = pbr('ceil',   '#FAFAF8', 0.98, 0.0);
    const mPlinth = pbr('plinth', '#E8E5E0', 0.85, 0.0);
    const mSofa   = pbr('sofa',   '#5C6478', 0.85, 0.0);  // gris-bleu ardoise
    const mCush   = pbr('cush',   '#F0EBE0', 0.90, 0.0);  // crème
    const mNoyer  = pbr('noyer',  '#2C1A0E', 0.55, 0.0);  // noyer foncé
    const mLaiton = pbr('laiton', '#C8A84B', 0.25, 0.85); // laiton métallique
    const mInox   = pbr('inox',   '#C0C0C4', 0.15, 0.90); // acier inox
    const mTV     = pbr('tv',     '#080808', 0.90, 0.0);
    const mLaqué  = pbr('laque',  '#F8F8F6', 0.30, 0.0);  // blanc laqué brillant
    const mTapis  = pbr('tapis',  '#8B6355', 0.98, 0.0);  // terracotta mat
    const mLin    = pbr('lin',    '#E8DFD0', 0.95, 0.0);  // lin naturel
    const mTete   = pbr('tete',   '#3D2B1A', 0.60, 0.0);  // bois tête de lit
    const mGlass  = pbr('glass',  '#A8C8E8', 0.05, 0.0);  // verre
    const mTerr   = pbr('terr',   '#C4956A', 0.70, 0.0);  // terracotta

    // Matériau émissif lampe
    const mLamp = new BABYLON.PBRMaterial('lamp', scene);
    mLamp.albedoColor = new BABYLON.Color3(1, 0.95, 0.75);
    mLamp.emissiveColor = new BABYLON.Color3(0.8, 0.6, 0.2);
    mLamp.roughness = 0.8;

    // Parquet — texture procédurale canvas
    const mParquet = pbr('parquet', '#9B7045', 0.65, 0.0);
    mParquet.albedoTexture = texParquet();

    // Carrelage — texture procédurale
    const mCarrel = pbr('carrel', '#D8D4CE', 0.30, 0.0);
    mCarrel.albedoTexture = texCarrelage();
    mCarrel.roughness = 0.25;

    // ══════════════════════════════════════════════════════════
    // ARCHITECTURE — Appartement 8×6m · H=2.7m
    // ══════════════════════════════════════════════════════════
    const W = 8, D = 6, H = 2.7;

    // Sol (reçoit les ombres)
    const sol = box('sol', W, 0.02, D, 0, -0.01, 0, mParquet, sg);
    sol.receiveShadows = true;

    box('ceil', W, 0.06, D, 0, H+0.03, 0, mCeil, null);

    // Murs
    const murs = [
        box('mN', W, H, 0.14, 0,    H/2, -D/2, mWall, null),
        box('mS', W, H, 0.14, 0,    H/2,  D/2, mWall, null),
        box('mW', 0.14, H, D, -W/2, H/2,  0,   mWall, null),
        box('mE', 0.14, H, D,  W/2, H/2,  0,   mWall, null),
    ];
    murs.forEach(m => m.receiveShadows = true);

    // Plinthes
    box('plN',  W, 0.10, 0.025, 0,   0.05, -D/2+0.08, mPlinth, null);
    box('plS',  W, 0.10, 0.025, 0,   0.05,  D/2-0.08, mPlinth, null);
    box('plW', 0.025, 0.10, D, -W/2+0.08, 0.05, 0,    mPlinth, null);
    box('plE', 0.025, 0.10, D,  W/2-0.08, 0.05, 0,    mPlinth, null);

    // Fenêtre (mur ouest) — lumière volumique
    const fenMat = new BABYLON.PBRMaterial('fen', scene);
    fenMat.albedoColor = new BABYLON.Color3(0.7, 0.88, 1.0);
    fenMat.alpha = 0.18;
    fenMat.roughness = 0.05;
    fenMat.emissiveColor = new BABYLON.Color3(0.6, 0.75, 0.9);
    const fen = box('fen', 0.06, 1.6, 2.2, -W/2+0.06, 1.5, -0.5, fenMat, null);
    // Encadrement fenêtre
    [[-0.25,1.68],[-0.25,0.32],[-0.25,2.1]].forEach(([z,y],i)=> {
        const f = box(`fenC${i}`, 0.08, 0.06, 2.3, -W/2+0.06, y, -0.5, mLaqué, null);
    });

    // Éclairage fenêtre
    const lumFen = new BABYLON.PointLight('lumFen', new BABYLON.Vector3(-W/2+1.5, 1.8, -0.5), scene);
    lumFen.intensity = 0.8; lumFen.range = 10;
    lumFen.diffuse = new BABYLON.Color3(0.95, 0.97, 1.0);

    // ══════════════════════════════════════════════════════════
    // SALON
    // ══════════════════════════════════════════════════════════

    // Tapis
    const tapis = box('tapis', 3.2, 0.012, 2.2, 0.2, 0.006, 0.8, mTapis, sg);
    tapis.receiveShadows = true;

    // Canapé 3 places + dossier
    sg.addShadowCaster(box('cBase', 2.2, 0.42, 0.88, 0.2, 0.21, 2.1, mSofa, sg));
    sg.addShadowCaster(box('cDos',  2.2, 0.52, 0.16, 0.2, 0.68, 2.48, mSofa, sg));
    sg.addShadowCaster(box('cBrG', 0.16, 0.50, 0.88, -0.9, 0.45, 2.1, mSofa, sg));
    sg.addShadowCaster(box('cBrD', 0.16, 0.50, 0.88,  1.3, 0.45, 2.1, mSofa, sg));
    [-0.5, 0.2, 0.85].forEach((x,i) =>
        sg.addShadowCaster(box(`cos${i}`, 0.52, 0.26, 0.10, x, 0.60, 2.2, mCush, sg)));
    [[-0.8,1.28],[1.2,1.28],[-0.8,2.12],[1.2,2.12]].forEach(([x,z],i) =>
        box(`cpd${i}`, 0.06, 0.08, 0.06, x, 0.04, z, mLaiton, sg));

    // Fauteuil
    sg.addShadowCaster(box('fauB', 0.88, 0.40, 0.82, -2.4, 0.20, 2.0, mSofa, sg));
    sg.addShadowCaster(box('fauD', 0.88, 0.48, 0.14, -2.4, 0.64, 2.38, mSofa, sg));
    sg.addShadowCaster(box('fauBr', 0.14, 0.44, 0.82, -2.82, 0.42, 2.0, mSofa, sg));
    sg.addShadowCaster(box('fauC', 0.68, 0.24, 0.10, -2.4, 0.58, 2.1, mCush, sg));

    // Table basse
    const tb = box('tbPl', 1.1, 0.048, 0.62, 0, 0.44, 0.9, mNoyer, sg);
    sg.addShadowCaster(tb);
    tb.receiveShadows = true;
    [[-0.45, 0.3], [0.45, 0.3], [-0.45, 0.9], [0.45, 0.9]].forEach(([x,z],i) =>
        sg.addShadowCaster(box(`tbPd${i}`, 0.04, 0.40, 0.04, x, 0.20, z, mLaiton, sg)));
    // Vase déco
    const vase = cyl('vase', 0.28, 0.09, 0.06, 0.3, 0.58, 0.85, mTerr, sg);
    sg.addShadowCaster(vase);
    // Livre
    const livMat = pbr('liv', '#CC3333', 0.9, 0);
    sg.addShadowCaster(box('livre', 0.22, 0.03, 0.16, -0.15, 0.47, 0.9, livMat, sg));

    // Meuble TV
    sg.addShadowCaster(box('tvMeu', 3.0, 0.44, 0.40, 0, 0.22, -2.7, mLaqué, sg));
    box('tvMeuTop', 3.0, 0.03, 0.40, 0, 0.45, -2.7, mNoyer, sg);
    sg.addShadowCaster(box('tvS', 1.65, 0.96, 0.055, 0, 1.18, -2.72, mTV, sg));
    box('tvBrd', 1.68, 0.98, 0.04, 0, 1.18, -2.70, pbr('tvbrd','#1A1A1A',0.7,0), sg);
    box('tvPd', 0.07, 0.28, 0.10, 0, 0.60, -2.71, mInox, sg);
    // Écran allumé
    const ecMat = new BABYLON.PBRMaterial('ec', scene);
    ecMat.albedoColor = new BABYLON.Color3(0.05, 0.15, 0.35);
    ecMat.emissiveColor = new BABYLON.Color3(0.04, 0.12, 0.28);
    ecMat.roughness = 1; ecMat.metallic = 0;
    box('ecran', 1.60, 0.92, 0.01, 0, 1.18, -2.69, ecMat, null);

    // Lampadaire
    sg.addShadowCaster(box('lampB', 0.30, 0.03, 0.30, 3.4, 0.015, 1.8, mInox, sg));
    sg.addShadowCaster(box('lampP', 0.036, 1.65, 0.036, 3.4, 0.84, 1.8, mInox, sg));
    sg.addShadowCaster(cyl('abj', 0.32, 0.42, 0.09, 3.4, 1.82, 1.8, mLamp, sg, 24));
    const ptL = new BABYLON.PointLight('ptl', new BABYLON.Vector3(3.4, 1.62, 1.8), scene);
    ptL.intensity = 0.65; ptL.range = 7;
    ptL.diffuse = new BABYLON.Color3(1, 0.90, 0.68);

    // Plante (pot + tige)
    sg.addShadowCaster(cyl('pot', 0.35, 0.25, 0.18, -3.4, 0.175, -2.2, mTerr, sg));
    const plantMat = pbr('plant', '#2D5A27', 0.9, 0);
    for (let i = 0; i < 5; i++) {
        const a = (i/5)*Math.PI*2, r = 0.12+Math.random()*0.08;
        sg.addShadowCaster(box(`pl${i}`, 0.04, 0.35+Math.random()*0.2, 0.04,
            -3.4 + Math.cos(a)*r, 0.5+i*0.04, -2.2 + Math.sin(a)*r, plantMat, sg));
    }

    // ══════════════════════════════════════════════════════════
    // CUISINE — coin nord-est
    // ══════════════════════════════════════════════════════════
    const cx = W/2 - 2.2, cz = -D/2 + 2.5;

    const solCuis = box('solCuis', 4.5, 0.02, 4.5, cx+0.8, -0.005, cz+0.2, mCarrel, null);
    solCuis.receiveShadows = true;

    sg.addShadowCaster(box('kbas1', 3.0, 0.86, 0.58, cx, 0.43, cz-1.5, mLaqué, sg));
    sg.addShadowCaster(box('kbas2', 0.58, 0.86, 2.4, cx+1.7, 0.43, cz+0.3, mLaqué, sg));
    box('kplan1', 3.0, 0.04, 0.60, cx, 0.88, cz-1.5, mInox, sg);
    box('kplan2', 0.60, 0.04, 2.4, cx+1.7, 0.88, cz+0.3, mInox, sg);
    sg.addShadowCaster(box('khaut1', 2.8, 0.64, 0.34, cx, 2.1, cz-1.52, mLaqué, sg));
    sg.addShadowCaster(box('khaut2', 0.34, 0.64, 2.0, cx+1.72, 2.1, cz+0.1, mLaqué, sg));
    // Poignées inox
    for (let i=0;i<3;i++) {
        box(`kpg${i}`, 0.025,0.025,0.26, cx-0.9+i, 0.82, cz-1.25, mInox, null);
        box(`kpgh${i}`, 0.025,0.025,0.26, cx-0.9+i, 2.06, cz-1.26, mInox, null);
    }
    // Îlot
    sg.addShadowCaster(box('ilot', 1.2, 0.90, 0.70, cx-0.4, 0.45, cz+1.2, mLaqué, sg));
    box('ilotTop', 1.2, 0.04, 0.70, cx-0.4, 0.92, cz+1.2, mInox, sg);
    [-0.4, 0.4].forEach((x,i) => {
        sg.addShadowCaster(box(`tab${i}`, 0.28,0.02,0.28, cx-0.4+x, 0.72, cz+1.9, mNoyer, sg));
        sg.addShadowCaster(box(`tabP${i}`, 0.035,0.70,0.035, cx-0.4+x, 0.36, cz+1.9, mInox, sg));
    });
    // Hotte
    sg.addShadowCaster(box('hotte', 0.85,0.42,0.38, cx, 1.98, cz-1.55, mInox, sg));
    // Spot cuisine
    const spotK = new BABYLON.PointLight('spotK', new BABYLON.Vector3(cx, 2.6, cz), scene);
    spotK.intensity = 0.75; spotK.range = 6;
    spotK.diffuse = new BABYLON.Color3(1, 0.98, 0.90);

    // ══════════════════════════════════════════════════════════
    // CHAMBRE — coin sud-ouest
    // ══════════════════════════════════════════════════════════
    const bx = -W/2 + 2.5, bz = D/2 - 2.8;

    // Sol parquet plus foncé
    const mParqCh = pbr('parqCh', '#7A5330', 0.68, 0.0);
    mParqCh.albedoTexture = texParquet();
    const solCh = box('solCh', 5.0, 0.02, 5.0, bx+0.2, -0.005, bz-0.2, mParqCh, null);
    solCh.receiveShadows = true;

    // Lit king
    sg.addShadowCaster(box('litC', 1.85, 0.30, 2.0, bx, 0.15, bz, mLin, sg));
    sg.addShadowCaster(box('litD', 1.85, 0.04, 2.0, bx, 0.32, bz, mCush, sg));
    sg.addShadowCaster(box('tete', 1.85, 0.85, 0.12, bx, 0.63, bz-1.0, mTete, sg));
    sg.addShadowCaster(box('pied', 1.85, 0.24, 0.10, bx, 0.12, bz+0.95, mTete, sg));
    [-0.42,0.42].forEach((x,i) =>
        sg.addShadowCaster(box(`ore${i}`, 0.50,0.12,0.34, bx+x, 0.38, bz-0.7, mCush, sg)));
    // Chevets
    [-1.12, 1.12].forEach((x,i) => {
        sg.addShadowCaster(box(`chv${i}`, 0.46,0.50,0.38, bx+x, 0.25, bz, mTete, sg));
        sg.addShadowCaster(cyl(`lch${i}`, 0.24, 0.20,0.055, bx+x, 0.65, bz, mLamp, sg, 18));
        sg.addShadowCaster(box(`lchP${i}`, 0.028,0.32,0.028, bx+x, 0.41, bz, mInox, sg));
        const plCh = new BABYLON.PointLight(`plch${i}`, new BABYLON.Vector3(bx+x, 0.82, bz), scene);
        plCh.intensity = 0.32; plCh.range = 3.2;
        plCh.diffuse = new BABYLON.Color3(1, 0.86, 0.62);
    });
    // Armoire
    sg.addShadowCaster(box('arm', 1.8, 2.3, 0.58, bx+2.4, 1.15, bz-0.95, mLaqué, sg));
    const gMat = new BABYLON.PBRMaterial('miroir', scene);
    gMat.reflectionColor = new BABYLON.Color3(0.85, 0.9, 0.95);
    gMat.roughness = 0.02; gMat.metallic = 0.9;
    gMat.albedoColor = new BABYLON.Color3(0.7, 0.78, 0.85);
    box('mir', 0.84, 2.25, 0.03, bx+2.0, 1.125, bz-0.68, gMat, null);
    // Tapis chambre
    const tapisCh = box('tapCh', 2.2, 0.01, 1.5, bx, 0.005, bz+0.9, pbr('tch','#4A3870',0.98,0), sg);
    tapisCh.receiveShadows = true;

    // ══════════════════════════════════════════════════════════
    // POST-PROCESSING ACES
    // ══════════════════════════════════════════════════════════
    try {
        const pipeline = new BABYLON.DefaultRenderingPipeline('pp', true, scene, [camera]);
        pipeline.fxaaEnabled = true;
        pipeline.bloomEnabled = true;
        pipeline.bloomThreshold = 0.82;
        pipeline.bloomWeight    = 0.22;
        pipeline.bloomScale     = 0.5;
        pipeline.imageProcessingEnabled = true;
        pipeline.imageProcessing.toneMappingEnabled = true;
        pipeline.imageProcessing.toneMappingType =
            BABYLON.ImageProcessingConfiguration.TONEMAPPING_ACES;
        pipeline.imageProcessing.exposure  = 1.15;
        pipeline.imageProcessing.contrast  = 1.10;
        pipeline.imageProcessing.vignetteEnabled = true;
        pipeline.imageProcessing.vignetteWeight  = 2.5;
        pipeline.imageProcessing.vignetteCameraFov = 1.05;
        pipeline.depthOfFieldEnabled = false; // activer si perf OK
        pipeline.sharpenEnabled = true;
        pipeline.sharpen.edgeAmount = 0.3;
    } catch(e) { console.warn('Pipeline non disponible:', e); }

    // Hotspots
    afficherHotspotsVisuels();
}

function afficherHotspotsVisuels() {
    const pointCourant = pointsVisite[indexCourant];
    if (!pointCourant?.hotspots) return;

    scene.meshes.filter(m => m.name.startsWith('hotspot_')).forEach(m => m.dispose());

    pointCourant.hotspots.forEach(h => {
        const sphere = BABYLON.MeshBuilder.CreateSphere(`hotspot_${h.id}`, { diameter: 0.3 }, scene);
        sphere.position = new BABYLON.Vector3(h.positionX, h.positionY, h.positionZ);

        const mat = new BABYLON.StandardMaterial(`matHotspot_${h.id}`, scene);
        mat.diffuseColor = new BABYLON.Color3(0.96, 0.62, 0.04);
        mat.emissiveColor = new BABYLON.Color3(0.5, 0.3, 0);
        sphere.material = mat;

        sphere.actionManager = new BABYLON.ActionManager(scene);
        sphere.actionManager.registerAction(
            new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, () => {
                afficherHotspot(h.libelle, h.contenu);
            })
        );
    });
}

function naviguerVers(index) {
    if (index < 0 || index >= pointsVisite.length) return;

    indexCourant = index;
    const point = pointsVisite[index];

    const cible = new BABYLON.Vector3(point.positionX, point.positionY, point.positionZ);
    BABYLON.Animation.CreateAndStartAnimation(
        'deplacement', camera, 'position',
        60, 30, camera.position, cible,
        BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
    );

    camera.rotation = new BABYLON.Vector3(point.rotationX, point.rotationY, point.rotationZ);

    document.getElementById('piece-courante').textContent = point.nomPiece;
    document.getElementById('btn-precedent').disabled = index === 0;
    document.getElementById('btn-suivant').disabled = index === pointsVisite.length - 1;

    fermerHotspot();
    afficherHotspotsVisuels();
}

function naviguerPrecedent() { naviguerVers(indexCourant - 1); }
function naviguerSuivant() { naviguerVers(indexCourant + 1); }

function afficherHotspot(titre, contenu) {
    document.getElementById('hotspot-titre').textContent = titre;
    document.getElementById('hotspot-contenu').textContent = contenu || '';
    document.getElementById('hotspot-panel').classList.remove('hidden');
}

function fermerHotspot() {
    document.getElementById('hotspot-panel').classList.add('hidden');
}

function retourFiche() {
    if (villaId) {
        window.location.href = `/villas/${villaId}`;
    } else {
        window.history.back();
    }
}

function afficherLoading(visible) {
    document.getElementById('loading').classList.toggle('hidden', !visible);
}
