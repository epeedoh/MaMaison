// MaMaison — Villa Walker FPS
// Navigue librement dans toute la villa comme dans un jeu vidéo

const API_BASE = '/api';
let engine, scene, camera, shadows;
let villaId = new URLSearchParams(window.location.search).get('villaId');

/* ================================================================
   LANCEMENT
   ================================================================ */
window.addEventListener('DOMContentLoaded', () => {
    if (typeof BABYLON === 'undefined') {
        document.getElementById('loading').innerHTML =
            '<p style="color:#f59e0b;font-size:1.1rem;text-align:center">⚠️ BabylonJS non chargé<br>Vérifiez votre connexion</p>';
        return;
    }
    const t = setTimeout(() => demarrer(null), 8000);
    if (villaId) {
        fetch(`${API_BASE}/villas/${villaId}`, { signal: AbortSignal.timeout(5000) })
            .then(r => r.ok ? r.json() : null)
            .then(villa => { clearTimeout(t); demarrer(villa); })
            .catch(() => { clearTimeout(t); demarrer(null); });
    } else {
        clearTimeout(t); demarrer(null);
    }
});

function demarrer(villa) {
    if (villa) {
        document.getElementById('villa-titre').textContent = villa.titre;
        document.getElementById('villa-prix').textContent =
            new Intl.NumberFormat('fr-CI', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(villa.prix);
    } else {
        document.getElementById('villa-titre').textContent = 'Villa Palm Beach — Cocody';
        document.getElementById('villa-prix').textContent = '45 000 000 FCFA';
    }
    document.getElementById('piece-courante').textContent = 'Salon';
    afficherLoading(false);
    creerVilla();
}

/* ================================================================
   VILLA COMPLÈTE — FPS WALKER
   ================================================================ */
function creerVilla() {
    const canvas = document.getElementById('renderCanvas');
    engine = new BABYLON.Engine(canvas, true, { antialias: true, stencil: true });
    scene  = new BABYLON.Scene(engine);
    scene.collisionsEnabled = true;
    scene.fogMode   = BABYLON.Scene.FOGMODE_EXP2;
    scene.fogDensity = 0.012;
    scene.fogColor  = new BABYLON.Color3(0.96, 0.94, 0.91);
    scene.clearColor = new BABYLON.Color4(0.82, 0.90, 0.97, 1);

    // ── Caméra FPS ──────────────────────────────────────────────
    camera = new BABYLON.UniversalCamera('fps',
        new BABYLON.Vector3(0, 1.65, 2), scene);
    camera.setTarget(new BABYLON.Vector3(0, 1.65, -2));
    camera.speed              = 0.14;
    camera.angularSensibility = 900;    // plus doux (valeur haute = moins sensible)
    camera.inertia            = 0.55;   // léger glissement pour fluidité
    camera.minZ               = 0.08;
    camera.fov                = 1.0;
    camera.checkCollisions    = true;
    camera.applyGravity       = false;  // pas de gravité — on verrouille Y manuellement
    camera.ellipsoid          = new BABYLON.Vector3(0.32, 0.1, 0.32); // fine capsule
    camera.ellipsoidOffset    = new BABYLON.Vector3(0, 0, 0);

    // WASD + flèches + strafe Q/E
    camera.keysUp    = [87, 38];        // W ↑
    camera.keysDown  = [83, 40];        // S ↓
    camera.keysLeft  = [65, 37, 81];    // A ← Q (strafe gauche)
    camera.keysRight = [68, 39, 69];    // D → E (strafe droite)
    camera.attachControl(canvas, true);

    // Verrouille la hauteur des yeux à 1.65m — empêche vol et enfoncement
    const EYE_HEIGHT = 1.65;
    scene.registerBeforeRender(() => {
        camera.position.y = EYE_HEIGHT;
    });

    // Pointer lock au clic
    canvas.addEventListener('click', () => {
        if (document.pointerLockElement !== canvas)
            canvas.requestPointerLock();
    });
    document.addEventListener('pointerlockchange', () => {
        const locked = document.pointerLockElement === canvas;
        document.getElementById('click-hint').style.display = locked ? 'none' : 'flex';
        document.getElementById('esc-hint').style.display   = locked ? 'flex' : 'none';
    });

    // ── Éclairage ───────────────────────────────────────────────
    const hemi = new BABYLON.HemisphericLight('hemi', new BABYLON.Vector3(0,1,0), scene);
    hemi.intensity   = 0.65;
    hemi.diffuse     = new BABYLON.Color3(1, 0.97, 0.92);
    hemi.groundColor = new BABYLON.Color3(0.55, 0.44, 0.32);

    const sun = new BABYLON.DirectionalLight('sun', new BABYLON.Vector3(-0.6, -1, 0.4), scene);
    sun.position  = new BABYLON.Vector3(8, 12, -6);
    sun.intensity = 0.55;
    sun.diffuse   = new BABYLON.Color3(1, 0.97, 0.87);

    shadows = new BABYLON.ShadowGenerator(1024, sun);
    shadows.useExponentialShadowMap = true;
    shadows.bias = 0.002;

    // Spots chauds par pièce
    addSpot(-8, 3, -5,  'spot1', 0.35, 4.5);  // cuisine
    addSpot(-9, 3,  4,  'spot2', 0.40, 4.0);  // chambre
    addSpot( 4, 3,  4,  'spot3', 0.25, 3.5);  // coin salon

    // ── Construction de la villa ────────────────────────────────
    construireVilla();

    // ── Post-processing ─────────────────────────────────────────
    const pipeline = new BABYLON.DefaultRenderingPipeline('pp', true, scene, [camera]);
    pipeline.fxaaEnabled             = true;
    pipeline.bloomEnabled            = true;
    pipeline.bloomThreshold          = 0.82;
    pipeline.bloomWeight             = 0.18;
    pipeline.imageProcessingEnabled  = true;
    pipeline.imageProcessing.toneMappingEnabled = true;
    pipeline.imageProcessing.toneMappingType    = 1; // ACES
    pipeline.imageProcessing.exposure           = 1.1;
    pipeline.imageProcessing.contrast           = 1.06;

    engine.runRenderLoop(() => scene.render());
    window.addEventListener('resize', () => engine.resize());
}

function addSpot(x, y, z, nom, intensity, range) {
    const l = new BABYLON.PointLight(nom, new BABYLON.Vector3(x, y, z), scene);
    l.intensity = intensity;
    l.diffuse   = new BABYLON.Color3(1, 0.92, 0.72);
    l.range     = range;
}

/* ================================================================
   MATÉRIAUX PBR
   ================================================================ */
const MAT = {};
function mat(id, hex, rough = 0.7, metal = 0) {
    if (MAT[id]) return MAT[id];
    const m = new BABYLON.PBRMaterial(id, scene);
    m.albedoColor = BABYLON.Color3.FromHexString(hex);
    m.roughness   = rough;
    m.metallic    = metal;
    return MAT[id] = m;
}

/* ================================================================
   GÉOMETRIE HELPERS
   ================================================================ */
function b(nom, w, h, d, x, y, z, matId, coll = false) {
    const mesh = BABYLON.MeshBuilder.CreateBox(nom, { width:w, height:h, depth:d }, scene);
    mesh.position.set(x, y, z);
    if (matId) mesh.material = typeof matId === 'string' ? mat(matId, '#888') : matId;
    mesh.receiveShadows    = true;
    mesh.checkCollisions   = coll;
    if (coll && shadows) shadows.addShadowCaster(mesh, true);
    return mesh;
}
function s(nom, d, x, y, z, matId) {
    const mesh = BABYLON.MeshBuilder.CreateBox(nom, { size: d }, scene);
    mesh.position.set(x, y, z);
    if (matId) mesh.material = matId;
    mesh.receiveShadows = true;
    shadows?.addShadowCaster(mesh);
    return mesh;
}
function cyl(nom, h, dt, db, x, y, z, matId, tess = 20) {
    const mesh = BABYLON.MeshBuilder.CreateCylinder(nom,
        { height: h, diameterTop: dt, diameterBottom: db, tessellation: tess }, scene);
    mesh.position.set(x, y, z);
    if (matId) mesh.material = matId;
    shadows?.addShadowCaster(mesh);
    return mesh;
}

/* ================================================================
   CONSTRUCTION VILLA COMPLÈTE
   ================================================================ */
function construireVilla() {
    // Villa = 3 zones connectées + couloir + salle de bain
    // Plan (vue du dessus, Z vers le bas = nord)
    //
    //  +------+--+------+
    //  |CHAMB | C|CUIS  |
    //  |      | O|      |
    //  +---+  | R|  +---+
    //      |  | R|  |
    //  +---+--+--+--+---+
    //  |                |
    //  |    S A L O N   |
    //  |                |
    //  +----------------+

    const H = 2.8;  // hauteur plafond

    // ── MATÉRIAUX ───────────────────────────────────────────────
    const mParquet  = mat('parquet',  '#8C6A40', 0.65, 0);
    const mParqCh   = mat('parqCh',   '#6E4F28', 0.70, 0);
    const mCarrelage= mat('carrel',   '#D8D4CE', 0.45, 0);
    const mMur      = mat('mur',      '#F5F3EE', 0.92, 0);
    const mMurAcc   = mat('murAcc',   '#E8E0D5', 0.88, 0);  // ton chaud
    const mPlafond  = mat('plafond',  '#FAFAFA', 0.95, 0);
    const mCanape   = mat('canape',   '#4A5466', 0.85, 0);
    const mCoussin  = mat('coussin',  '#F5F0E8', 0.90, 0);
    const mNoyer    = mat('noyer',    '#1E120A', 0.55, 0);
    const mLaiton   = mat('laiton',   '#C8A048', 0.35, 0.6);
    const mInox     = mat('inox',     '#B0B0B4', 0.30, 0.8);
    const mBlanc    = mat('blanc',    '#F2F2F2', 0.85, 0);
    const mNoir     = mat('noir',     '#080808', 0.20, 0);
    const mLin      = mat('lin',      '#EDE8DE', 0.90, 0);
    const mTeteLit  = mat('teteLit',  '#2A1A0E', 0.70, 0);
    const mVerre    = mat('verre',    '#9BBFCC', 0.05, 0);
    const mArdoise  = mat('ardoise',  '#3A3A3C', 0.60, 0);
    const mBeton    = mat('beton',    '#C8C4BE', 0.80, 0);

    // Textures dynamiques parquet
    mParquet.albedoTexture  = texParquet('#8C6A40', '#6B4E2A');
    mParqCh.albedoTexture   = texParquet('#6E4F28', '#5A3D1E');
    mCarrelage.albedoTexture = texCarrelage();

    // ── SOL & PLAFOND ────────────────────────────────────────────
    // Salon (14×10)
    const floorSalon = BABYLON.MeshBuilder.CreateBox('flSalon',
        { width: 14, height: 0.14, depth: 10 }, scene);
    floorSalon.position.set(0, -0.07, 2);
    floorSalon.material = mParquet;
    floorSalon.receiveShadows = true;
    floorSalon.checkCollisions = true;

    // Cuisine (7×7)
    const floorCuis = BABYLON.MeshBuilder.CreateBox('flCuis',
        { width: 7, height: 0.14, depth: 7 }, scene);
    floorCuis.position.set(-8.5, -0.07, -4.5);
    floorCuis.material = mCarrelage;
    floorCuis.receiveShadows = true;
    floorCuis.checkCollisions = true;

    // Chambre (7×8)
    const floorCh = BABYLON.MeshBuilder.CreateBox('flCh',
        { width: 7, height: 0.14, depth: 8 }, scene);
    floorCh.position.set(-8.5, -0.07, 4);
    floorCh.material = mParqCh;
    floorCh.receiveShadows = true;
    floorCh.checkCollisions = true;

    // Couloir (2.5×8)
    const floorCouloir = BABYLON.MeshBuilder.CreateBox('flCouloir',
        { width: 2.5, height: 0.14, depth: 8 }, scene);
    floorCouloir.position.set(-4.25, -0.07, -0.5);
    floorCouloir.material = mBeton;
    floorCouloir.receiveShadows = true;
    floorCouloir.checkCollisions = true;

    // Plafonds
    b('plSalon', 14, 0.1, 10,    0,    H+0.05, 2,     mPlafond, false);
    b('plCuis',   7, 0.1,  7,   -8.5,  H+0.05, -4.5,  mPlafond, false);
    b('plCh',     7, 0.1,  8,   -8.5,  H+0.05, 4,     mPlafond, false);
    b('plCoul', 2.5, 0.1,  8,   -4.25, H+0.05, -0.5,  mPlafond, false);

    // Plinthe tout autour (décor)
    const mp = mat('plinthe', '#E8E4DC', 0.7, 0);

    // ── MURS EXTÉRIEURS (avec collision) ────────────────────────
    // Salon
    b('mS_N',  14, H, 0.2, 0,    H/2,  7.1,  mMur, true);
    b('mS_S',  14, H, 0.2, 0,    H/2, -3.1,  mMur, true);
    b('mS_E', 0.2, H, 10,  7.1,  H/2,  2,    mMur, true);

    // Cuisine extérieur
    b('mC_N', 7, H, 0.2,  -8.5, H/2, -8.1,  mMurAcc, true);
    b('mC_W', 0.2, H, 7, -12.1, H/2, -4.5,  mMurAcc, true);

    // Chambre extérieur
    b('mCh_N', 7, H, 0.2, -8.5, H/2,  8.1, mMurAcc, true);
    b('mCh_W', 0.2, H, 8, -12.1, H/2, 4,   mMurAcc, true);

    // ── MURS INTÉRIEURS avec OUVERTURES ─────────────────────────
    // Mur salon/couloir (laisser ouverture 2.5m au centre)
    b('mSC_high', 2.5, H, 0.2, -4.25, H/2, -3.05, mMur, true); // au-dessus ouverture
    b('mSC_gauche', 1.0, H, 0.2, -2.75, H/2, -3.05, mMur, true);
    b('mSC_droite', 1.25, H, 0.2, -5.625, H/2, -3.05, mMur, true);

    // Mur couloir/cuisine
    b('mCC_E', 0.2, H, 7, -3.0, H/2, -4.5, mMur, true);

    // Mur couloir/chambre
    b('mCCh_E', 0.2, H, 8, -3.0, H/2, 4, mMur, true);

    // Mur cuisine/chambre (séparation)
    b('mCuisCh', 7, H, 0.2, -8.5, H/2, -1.0, mMurAcc, true);

    // Fenêtres (rectangles vitrés, non-collision, juste décoratif)
    mVerre.alpha = 0.28;
    b('fen_salon_E',  0.06, 1.6, 2.5,  7.05, 1.5, 2,    mVerre, false);
    b('fen_salon_E2', 0.06, 1.6, 2.5,  7.05, 1.5, 5.5,  mVerre, false);
    b('fen_cuis',  0.06, 1.4, 2.0, -12.05, 1.5, -4.5,   mVerre, false);
    b('fen_ch',    0.06, 1.4, 2.5, -12.05, 1.5, 4,      mVerre, false);
    b('fen_N',  2.5, 1.6, 0.06, 0, 1.5, 7.05,           mVerre, false);

    // Lumières fenêtres
    addSpot(7, 2, 2, 'lf1', 0.3, 6);
    addSpot(7, 2, 5.5, 'lf2', 0.25, 5);

    // ── SALON ───────────────────────────────────────────────────
    // Tapis
    b('tapis', 4.5, 0.03, 3.0, 1, 0.015, 2, mat('tapis', '#8B6852', 0.95));

    // Canapé 3 places + méridienne
    b('canBase', 2.4, 0.44, 0.95, 0.5, 0.22, 3.5, mCanape, true);
    b('canDos',  2.4, 0.52, 0.18, 0.5, 0.72, 3.9, mCanape, true);
    b('canBG', 0.18, 0.52, 0.95, -0.7, 0.46, 3.5, mCanape, true);
    b('canBD', 0.18, 0.52, 0.95, 1.7, 0.46, 3.5, mCanape, true);
    [-0.35, 0.5, 1.3].forEach((x,i) =>
        b(`cc${i}`, 0.52, 0.28, 0.1, x, 0.6, 3.62, mCoussin));

    // Fauteuil
    b('fBase', 0.95, 0.44, 0.85,  3.2, 0.22, 3.2, mCanape, true);
    b('fDos',  0.95, 0.52, 0.18,  3.2, 0.72, 3.6, mCanape, true);
    b('fBG', 0.16, 0.48, 0.85,  2.74, 0.44, 3.2, mCanape, true);
    b('fBD', 0.16, 0.48, 0.85,  3.66, 0.44, 3.2, mCanape, true);
    b('fCous', 0.72, 0.26, 0.1, 3.2, 0.6, 3.32, mCoussin);

    // Table basse noyer + laiton
    b('tb', 1.2, 0.06, 0.7, 1.2, 0.46, 2.2, mNoyer);
    [[-0.45,0.28],[0.45,0.28],[-0.45,0.92],[0.45,0.92]].forEach(([x,z],i) =>
        cyl(`tbp${i}`, 0.44, 0.04, 0.04, 1.2+x, 0.22, 2.2+z, mLaiton));
    // Vase déco
    cyl('vase', 0.22, 0.07, 0.05, 1.35, 0.58, 2.2, mat('vasMat', '#A0895C', 0.4));

    // TV wall + meuble bas
    b('meuTV', 3.0, 0.5, 0.45, 0, 0.25, -2.4, mBlanc, true);
    b('meuTVPlan', 3.0, 0.04, 0.45, 0, 0.52, -2.4, mNoyer);
    b('tvEcran', 1.9, 1.05, 0.06, 0, 1.3, -2.48, mNoir);
    b('tvBord', 1.95, 1.1, 0.04, 0, 1.3, -2.45, mat('tvb','#111111',0.1));
    b('tvPied', 0.06, 0.35, 0.1, 0, 0.69, -2.47, mInox);
    b('ecranLueur', 1.85, 0.99, 0.01, 0, 1.3, -2.44,
        mat('ecleur','#1A2A4A',0.1,0));
    // LED sous meuble TV
    const ledMat = mat('led','#FFEEB8', 0.1, 0.5);
    ledMat.emissiveColor = new BABYLON.Color3(1, 0.93, 0.7);
    b('ledTV', 2.8, 0.04, 0.04, 0, 0.0, -2.18, ledMat);

    // Lampadaire
    b('lpPied', 0.04, 1.7, 0.04, 4.8, 0.85, 0.5, mInox);
    b('lpBase', 0.3, 0.04, 0.3,  4.8, 0.04, 0.5, mInox);
    cyl('lpAbajour', 0.32, 0.42, 0.08, 4.8, 1.87, 0.5,
        mat('lMat','#FFF5E0',0.9,0), 24);
    addSpot(4.8, 1.7, 0.5, 'lp', 0.45, 5);

    // Meuble console + miroir mur est (entrée)
    b('console', 1.0, 0.82, 0.32, 5.5, 0.41, -1.5, mNoyer, true);
    b('miroir',  1.0, 1.4, 0.04, 5.5, 1.4, -2.5, mVerre);
    b('miroirCad', 1.06, 1.46, 0.03, 5.5, 1.4, -2.47,
        mat('mCad','#C0A860',0.3,0.5));

    // ── COULOIR ─────────────────────────────────────────────────
    // Sol béton ciré déjà fait
    // Spot couloir
    addSpot(-4.25, 2.5, -0.5, 'lCoul', 0.5, 5);
    // Tableaux décoratifs
    b('tab1', 0.8, 0.55, 0.04, -2.95, 1.5, -1, mat('tabMat','#2C4A6E',0.9));
    b('tab2', 0.7, 0.5, 0.04,  -2.95, 1.5,  1, mat('tabMat2','#8B3A3A',0.9));

    // ── CUISINE ─────────────────────────────────────────────────
    addSpot(-8.5, 2.7, -4.5, 'lCuis', 0.8, 7);

    // Plan de travail L + meubles bas
    b('bas1', 4, 0.88, 0.62, -8, 0.44, -7.7, mBlanc, true);
    b('bas2', 0.62, 0.88, 4, -11.8, 0.44, -5.5, mBlanc, true);
    b('plan1', 4, 0.06, 0.62, -8, 0.91, -7.7, mInox);
    b('plan2', 0.62, 0.06, 4, -11.8, 0.91, -5.5, mInox);

    // Meubles hauts
    b('haut1', 3.8, 0.7, 0.38, -8, 2.25, -7.78, mBlanc, true);
    b('haut2', 0.38, 0.7, 3.0, -11.78, 2.25, -5, mBlanc, true);

    // Hotte
    b('hotte', 1.0, 0.55, 0.45, -8.2, 2.05, -7.75, mat('hotteM','#787878',0.3,0.7));

    // Îlot central
    b('ilot', 1.4, 0.92, 0.88, -8, 0.46, -3.8, mBlanc, true);
    b('ilotTop', 1.4, 0.05, 0.88, -8, 0.945, -3.8, mInox);
    // Tabourets
    [-0.45, 0.45].forEach((x,i) => {
        b(`stool${i}`, 0.32, 0.02, 0.32, -8+x, 0.74, -2.8, mat('stoolTop','#2A2A2A',0.5));
        cyl(`stoolP${i}`, 0.72, 0.04, 0.04, -8+x, 0.36, -2.8, mInox);
    });

    // Pendants lumière au-dessus de l'îlot
    [-0.4, 0.4].forEach((x, i) => {
        b(`pendFil${i}`, 0.01, 1.0, 0.01, -8+x, 1.9, -3.8, mInox);
        cyl(`pend${i}`, 0.2, 0.22, 0.06, -8+x, 1.35, -3.8,
            mat('pendM','#C8A048',0.3,0.6), 16);
        addSpot(-8+x, 1.3, -3.8, `lPend${i}`, 0.4, 3);
    });

    // ── CHAMBRE PRINCIPALE ───────────────────────────────────────
    addSpot(-8.5, 2.7, 4, 'lChambre', 0.65, 8);

    // Lit king
    b('litBase', 2.0, 0.32, 2.2, -8.5, 0.16, 4, mLin, true);
    b('litDrap', 2.0, 0.04, 2.2, -8.5, 0.34, 4, mCoussin);
    b('teteLit', 2.0, 0.9, 0.14, -8.5, 0.65, 5.05, mTeteLit, true);
    b('piedLit', 2.0, 0.28, 0.12, -8.5, 0.14, 2.9, mTeteLit);
    // Oreillers
    [-0.45, 0.45].forEach((x,i) =>
        b(`oreiller${i}`, 0.58, 0.14, 0.38, -8.5+x, 0.42, 4.8, mCoussin));
    // Couverture repliée
    b('couv', 2.0, 0.08, 0.65, -8.5, 0.38, 3.5, mat('couvM','#9B8B7A',0.85));

    // Tables de chevet + lampes
    [-1.2, 1.2].forEach((x,i) => {
        b(`chev${i}`, 0.55, 0.55, 0.42, -8.5+x, 0.275, 4, mTeteLit, true);
        cyl(`lampPied${i}`, 0.35, 0.03, 0.03, -8.5+x, 0.565, 4, mInox);
        cyl(`lampAb${i}`, 0.26, 0.22, 0.06, -8.5+x, 0.72, 4,
            mat('lampChMat','#FFF8EC',0.9), 20);
        addSpot(-8.5+x, 0.9, 4, `lChev${i}`, 0.35, 3.2);
    });

    // Armoire
    b('armoire', 2.2, 2.35, 0.65, -8.5, 1.175, 7.7, mBlanc, true);
    mVerre.alpha = 0.35;
    b('mirArmoire', 1.05, 2.3, 0.04, -8.1, 1.15, 7.4, mVerre);
    b('mirCad', 1.08, 2.33, 0.03, -8.1, 1.15, 7.37, mat('mCadW','#F0F0F0',0.6));

    // Tapis chambre
    b('tapisCh', 2.8, 0.03, 2.0, -8.5, 0.015, 3.2, mat('tapisCh','#6B5A8A',0.92));

    // ── HOTSPOTS VISITE ──────────────────────────────────────────
    placerHotspot('hs_TV',     'Espace TV',         'Meuble TV blanc laqué · Écran 65" · LED ambiance',    0, 1.2, -2.2);
    placerHotspot('hs_canape', 'Canapé & salon',    'Canapé 3 pl. + fauteuil · Tissu premium gris-bleu',  0.5, 1.0, 3.2);
    placerHotspot('hs_ilot',   'Îlot cuisine',      'Plan inox · Bar 2 tabourets · Pendants laiton',     -8.0, 0.96, -3.5);
    placerHotspot('hs_cuis',   'Plan de travail',   'Inox brossé · Meubles hauts blancs · Hotte design', -9.5, 1.1, -6.5);
    placerHotspot('hs_lit',    'Lit King-Size',     '200×200 cm · Tête de lit bois · Literie lin naturel',-8.5, 0.85, 3.8);
    placerHotspot('hs_armoire','Dressing & rangement','Armoire 2m · Miroir · Dressing 6m²',              -8.5, 1.5, 7.5);

    // Indication clavier/souris
    document.getElementById('click-hint').style.display = 'flex';
}

function placerHotspot(nom, titre, contenu, x, y, z) {
    const sphere = BABYLON.MeshBuilder.CreateSphere(nom,
        { diameter: 0.28, segments: 10 }, scene);
    sphere.position.set(x, y, z);

    const m = new BABYLON.StandardMaterial(nom + '_mat', scene);
    m.diffuseColor  = new BABYLON.Color3(0.95, 0.72, 0.08);
    m.emissiveColor = new BABYLON.Color3(0.55, 0.38, 0.0);
    m.specularColor = new BABYLON.Color3(1, 0.9, 0.3);
    sphere.material = m;

    // Anneau
    const ring = BABYLON.MeshBuilder.CreateTorus(nom + '_ring',
        { diameter: 0.52, thickness: 0.04, tessellation: 32 }, scene);
    ring.position.set(x, y, z);
    const rm = new BABYLON.StandardMaterial(nom + '_rmat', scene);
    rm.diffuseColor  = new BABYLON.Color3(1, 0.82, 0.15);
    rm.emissiveColor = new BABYLON.Color3(0.4, 0.28, 0);
    rm.alpha = 0.80;
    ring.material = rm;

    let t = Math.random() * Math.PI * 2;
    scene.registerBeforeRender(() => {
        t += 0.035;
        ring.scaling.setAll(1 + 0.13 * Math.sin(t));
        sphere.position.y = y + 0.06 * Math.sin(t * 0.7);
        ring.position.y   = sphere.position.y;
    });

    sphere.actionManager = new BABYLON.ActionManager(scene);
    sphere.actionManager.registerAction(
        new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger,
            () => afficherInfo(titre, contenu)));
}

/* ================================================================
   TÉLÉPORTATION vers les pièces
   ================================================================ */
// Y = 1.65 = hauteur des yeux. L'ellipsoïde s'ajuste automatiquement.
const POSITIONS = {
    salon:   { x:  0,   y: 1.65, z:  2,    rotY: 0 },
    cuisine: { x: -7.5, y: 1.65, z: -4.5,  rotY: -Math.PI / 2 },
    chambre: { x: -7.5, y: 1.65, z:  4.5,  rotY: Math.PI },
};

function naviguerVers(index) {
    const noms = ['salon', 'cuisine', 'chambre'];
    const nom  = noms[index] || 'salon';
    const pos  = POSITIONS[nom];
    if (!pos || !camera) return;

    camera.position.set(pos.x, pos.y, pos.z);
    camera.rotation.set(0, pos.rotY, 0);

    const labels = ['Salon', 'Cuisine — 18 m²', 'Chambre principale'];
    document.getElementById('piece-courante').textContent = labels[index] || 'Salon';
    document.getElementById('btn-precedent').disabled = index === 0;
    document.getElementById('btn-suivant').disabled   = index === 2;
    fermerInfo();
}

function naviguerPrecedent() {
    const labels = ['Salon', 'Cuisine — 18 m²', 'Chambre principale'];
    const cur = labels.indexOf(document.getElementById('piece-courante').textContent);
    naviguerVers(Math.max(0, cur - 1));
}
function naviguerSuivant() {
    const labels = ['Salon', 'Cuisine — 18 m²', 'Chambre principale'];
    const cur = labels.indexOf(document.getElementById('piece-courante').textContent);
    naviguerVers(Math.min(2, cur + 1));
}

/* ================================================================
   PANEL INFO
   ================================================================ */
function afficherInfo(titre, contenu) {
    document.getElementById('hotspot-titre').textContent   = titre;
    document.getElementById('hotspot-contenu').textContent = contenu;
    document.getElementById('hotspot-panel').classList.remove('hidden');
}
function fermerInfo() {
    document.getElementById('hotspot-panel').classList.add('hidden');
}

function retourFiche() {
    if (villaId) window.location.href = `/villas/${villaId}`;
    else window.history.back();
}
function afficherLoading(v) {
    document.getElementById('loading').classList.toggle('hidden', !v);
}

/* ================================================================
   TEXTURES PROCÉDURALES
   ================================================================ */
function texParquet(c1, c2) {
    const dt = new BABYLON.DynamicTexture('tp'+c1, { width:512, height:512 }, scene);
    const ctx = dt.getContext();
    const n = 7, ph = 512 / n;
    const cols = [c1, c2, c1, c2, c1, c2, c1];
    for (let i = 0; i < n; i++) {
        ctx.fillStyle = cols[i];
        ctx.fillRect(0, i * ph, 512, ph - 2);
        ctx.globalAlpha = 0.05;
        for (let x = 0; x < 512; x += 12 + Math.random() * 10) {
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 0.5 + Math.random() * 0.5;
            ctx.beginPath();
            ctx.moveTo(x + Math.random() * 4, i * ph);
            ctx.lineTo(x + Math.random() * 4, (i+1) * ph);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#1A0800';
        ctx.fillRect(0, (i+1) * ph - 2, 512, 2);
    }
    dt.update();
    dt.uScale = 3.5; dt.vScale = 2.5;
    return dt;
}

function texCarrelage() {
    const dt = new BABYLON.DynamicTexture('tc', { width:512, height:512 }, scene);
    const ctx = dt.getContext();
    const n = 8, s = 512 / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const v = 215 + ((i+j) % 2) * 18;
        ctx.fillStyle = `rgb(${v},${v-3},${v-6})`;
        ctx.fillRect(j*s+2, i*s+2, s-4, s-4);
    }
    ctx.strokeStyle = '#C8C4BE'; ctx.lineWidth = 4;
    for (let i = 0; i <= n; i++) {
        ctx.beginPath(); ctx.moveTo(0, i*s); ctx.lineTo(512, i*s); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(i*s, 0); ctx.lineTo(i*s, 512); ctx.stroke();
    }
    dt.update(); dt.uScale = 3; dt.vScale = 3;
    return dt;
}
