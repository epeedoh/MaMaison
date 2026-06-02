// MaMaison — Viewer Teia-style
// ArcRotateCamera + click-to-teleport + floor spots

const API_BASE = '/api';
let engine, scene, camera;
let villaId  = new URLSearchParams(window.location.search).get('villaId');
let viewpointActif = 0;

/* ================================================================
   VIEWPOINTS — position caméra + cible pour chaque pièce
   ================================================================ */
const VIEWPOINTS = [
    {
        nom: 'Salon', label: 'Salon — 35 m²', couleur: '#F5A623',
        target:  new BABYLON.Vector3(0, 1.4, 1.5),
        alpha:   Math.PI + 0.35,
        beta:    1.10,    // ~63° du zénith
        radius:  6.5,
        spot:    { x: 0, z: 2 },
        hotspots: [
            { libelle: 'Canapé & salon',  contenu: 'Canapé 3 places · Table basse noyer & laiton · Tapis terracotta', x:  0.5, z: 3.4 },
            { libelle: 'Espace TV',        contenu: 'Meuble TV blanc laqué · Écran 65" · LED ambiance', x:  0, z: -2.0 },
            { libelle: 'Parquet chêne',   contenu: '35 m² · Parquet chêne clair · Plafond 2,7m', x: -2.5, z: 0.5 },
        ]
    },
    {
        nom: 'Cuisine', label: 'Cuisine — 18 m²', couleur: '#7ED321',
        target:  new BABYLON.Vector3(-8.5, 1.4, -4.5),
        alpha:   -0.5,
        beta:    1.05,
        radius:  5.5,
        spot:    { x: -7, z: -4.5 },
        hotspots: [
            { libelle: 'Plan de travail', contenu: 'Inox brossé 4ml · Meubles blancs · Hotte design', x: -10, z: -7.5 },
            { libelle: 'Îlot central',    contenu: 'Plan inox · Bar tabourets · Pendants laiton', x: -8,  z: -3.8 },
        ]
    },
    {
        nom: 'Chambre', label: 'Chambre — 22 m²', couleur: '#D0021B',
        target:  new BABYLON.Vector3(-8.5, 1.4, 4),
        alpha:   Math.PI * 0.55,
        beta:    1.08,
        radius:  5.5,
        spot:    { x: -7, z: 4 },
        hotspots: [
            { libelle: 'Lit King-Size',  contenu: '200×200 cm · Tête de lit bois massif · Literie lin', x: -8.5, z: 3.8 },
            { libelle: 'Armoire miroir', contenu: 'Armoire 1.8m · Miroir coulissant · Dressing 6m²',  x: -8.5, z: 7.5 },
        ]
    },
];

/* ================================================================
   INIT
   ================================================================ */
window.addEventListener('DOMContentLoaded', () => {
    afficherLoading(true);
    const t = setTimeout(() => demarrer(null), 8000);
    if (villaId) {
        fetch(`${API_BASE}/villas/${villaId}`, { signal: AbortSignal.timeout(5000) })
            .then(r => r.ok ? r.json() : null)
            .then(v => { clearTimeout(t); demarrer(v); })
            .catch(() => { clearTimeout(t); demarrer(null); });
    } else { clearTimeout(t); demarrer(null); }
});

function demarrer(villa) {
    document.getElementById('villa-titre').textContent =
        villa?.titre ?? 'Villa Palm Beach — Cocody';
    document.getElementById('villa-prix').textContent =
        villa ? new Intl.NumberFormat('fr-CI', { style:'currency', currency:'XOF', maximumFractionDigits:0 }).format(villa.prix)
              : '45 000 000 FCFA';
    construireViewer();
}

/* ================================================================
   VIEWER
   ================================================================ */
function construireViewer() {
    if (typeof BABYLON === 'undefined') {
        document.getElementById('loading').innerHTML =
            '<p style="color:#f59e0b;text-align:center;font-size:1rem">⚠️ BabylonJS non chargé</p>';
        return;
    }

    const canvas = document.getElementById('renderCanvas');
    engine = new BABYLON.Engine(canvas, true, { antialias: true, stencil: true });
    scene  = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.82, 0.90, 0.97, 1);

    // ── ArcRotateCamera ─────────────────────────────────────────
    const vp0 = VIEWPOINTS[0];
    camera = new BABYLON.ArcRotateCamera('cam',
        vp0.alpha, vp0.beta, vp0.radius, vp0.target, scene);
    camera.lowerRadiusLimit  = 1.5;
    camera.upperRadiusLimit  = 18;
    camera.lowerBetaLimit    = 0.25;
    camera.upperBetaLimit    = Math.PI / 2.05;
    camera.wheelPrecision    = 60;
    camera.panningSensibility = 0;   // pas de pan, seulement orbite
    camera.inertia           = 0.5;
    camera.angularSensibilityX = 800;
    camera.angularSensibilityY = 800;
    camera.attachControl(canvas, true);

    // ── Éclairage ───────────────────────────────────────────────
    const hemi = new BABYLON.HemisphericLight('hemi', new BABYLON.Vector3(0,1,0), scene);
    hemi.intensity   = 0.65;
    hemi.diffuse     = new BABYLON.Color3(1, 0.97, 0.92);
    hemi.groundColor = new BABYLON.Color3(0.55, 0.44, 0.32);

    const sun = new BABYLON.DirectionalLight('sun', new BABYLON.Vector3(-0.6,-1,0.4), scene);
    sun.position  = new BABYLON.Vector3(8, 12, -6);
    sun.intensity = 0.55;
    sun.diffuse   = new BABYLON.Color3(1, 0.97, 0.87);

    const sg = new BABYLON.ShadowGenerator(1024, sun);
    sg.useExponentialShadowMap = true;
    sg.bias = 0.002;

    // ── Post-processing ─────────────────────────────────────────
    const pp = new BABYLON.DefaultRenderingPipeline('pp', true, scene, [camera]);
    pp.fxaaEnabled = true;
    pp.bloomEnabled = true;
    pp.bloomThreshold = 0.82;
    pp.bloomWeight    = 0.18;
    pp.imageProcessingEnabled = true;
    pp.imageProcessing.toneMappingEnabled = true;
    pp.imageProcessing.toneMappingType    = 1; // ACES
    pp.imageProcessing.exposure  = 1.1;
    pp.imageProcessing.contrast  = 1.06;

    // ── Villa 3D ─────────────────────────────────────────────────
    construireVilla(sg);

    // ── Floor spots ─────────────────────────────────────────────
    VIEWPOINTS.forEach((vp, i) => creerFloorSpot(vp, i));

    // ── Render loop ──────────────────────────────────────────────
    engine.runRenderLoop(() => scene.render());
    window.addEventListener('resize', () => engine.resize());

    // ── Selector UI ─────────────────────────────────────────────
    construireRoomSelector();
    teleporterVers(0, false); // position initiale sans animation
    afficherLoading(false);
}

/* ================================================================
   FLOOR SPOTS — cercles au sol cliquables
   ================================================================ */
function creerFloorSpot(vp, index) {
    const { x, z } = vp.spot;
    const hex = vp.couleur;
    const col = BABYLON.Color3.FromHexString(hex);

    // Disque principal
    const disc = BABYLON.MeshBuilder.CreateCylinder(`spot_${index}`,
        { diameter: 0.85, height: 0.025, tessellation: 48 }, scene);
    disc.position.set(x, 0.013, z);
    const matD = new BABYLON.StandardMaterial(`mDisc_${index}`, scene);
    matD.diffuseColor  = col;
    matD.emissiveColor = col.scale(0.35);
    matD.alpha         = 0.88;
    disc.material = matD;

    // Anneau externe pulsant
    const ring = BABYLON.MeshBuilder.CreateTorus(`ring_${index}`,
        { diameter: 1.3, thickness: 0.055, tessellation: 48 }, scene);
    ring.position.set(x, 0.013, z);
    const matR = new BABYLON.StandardMaterial(`mRing_${index}`, scene);
    matR.diffuseColor  = col;
    matR.emissiveColor = col.scale(0.5);
    matR.alpha         = 0.70;
    ring.material = matR;

    // Animation pulsation asynchrone
    let t = index * 1.2;
    scene.registerBeforeRender(() => {
        t += 0.03;
        const s = 1 + 0.15 * Math.sin(t);
        ring.scaling.setAll(s);
    });

    // Label 3D au-dessus du spot
    creerLabel3D(`label_${index}`, vp.nom, x, 0.55, z, col);

    // Hitbox invisible plus grande pour clic facile
    const hit = BABYLON.MeshBuilder.CreateCylinder(`hit_${index}`,
        { diameter: 1.6, height: 0.3, tessellation: 16 }, scene);
    hit.position.set(x, 0.15, z);
    hit.isVisible = false;
    hit.isPickable = true;

    hit.actionManager = new BABYLON.ActionManager(scene);
    hit.actionManager.registerAction(
        new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger,
            () => teleporterVers(index)));

    // Hover
    hit.actionManager.registerAction(
        new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPointerOverTrigger,
            () => { disc.scaling.setAll(1.12); canvas.style.cursor = 'pointer'; }));
    hit.actionManager.registerAction(
        new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPointerOutTrigger,
            () => { disc.scaling.setAll(1.0);  canvas.style.cursor = 'default'; }));
}

function creerLabel3D(nom, texte, x, y, z, col) {
    const plane = BABYLON.MeshBuilder.CreatePlane(nom,
        { width: 0.95, height: 0.3 }, scene);
    plane.position.set(x, y, z);
    plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
    plane.isPickable = false;

    const dt = new BABYLON.DynamicTexture(nom + '_t',
        { width: 320, height: 96 }, scene);
    const ctx = dt.getContext();
    // Fond arrondi
    ctx.fillStyle = 'rgba(5,13,26,0.82)';
    ctx.beginPath();
    ctx.roundRect?.(4, 4, 312, 88, 14);
    ctx.fill?.();
    // Barre couleur gauche
    ctx.fillStyle = '#' + col.toHexString().replace('#','');
    ctx.fillRect(4, 4, 6, 88);
    // Texte
    ctx.font = 'bold 34px "Segoe UI", sans-serif';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(texte, 166, 50);
    dt.update();

    const mat = new BABYLON.StandardMaterial(nom + '_m', scene);
    mat.diffuseTexture  = dt;
    mat.emissiveColor   = BABYLON.Color3.White();
    mat.hasAlpha        = true;
    mat.backFaceCulling = false;
    plane.material = mat;
}

/* ================================================================
   HOTSPOT markers (sphères petites, discrètes)
   ================================================================ */
function creerHotspots(vp) {
    // Nettoie les anciens
    scene.meshes.filter(m => m.name.startsWith('hs_')).forEach(m => m.dispose());
    if (!vp.hotspots) return;
    vp.hotspots.forEach((h, i) => {
        const sp = BABYLON.MeshBuilder.CreateSphere(`hs_${i}`,
            { diameter: 0.2, segments: 8 }, scene);
        sp.position.set(h.x, 1.2, h.z);
        const m = new BABYLON.StandardMaterial(`hmat_${i}`, scene);
        m.diffuseColor  = new BABYLON.Color3(0.96, 0.72, 0.08);
        m.emissiveColor = new BABYLON.Color3(0.55, 0.35, 0.0);
        sp.material = m;
        let tt = i * 0.9;
        scene.registerBeforeRender(() => { tt += 0.04; sp.position.y = 1.2 + 0.08 * Math.sin(tt); });
        sp.actionManager = new BABYLON.ActionManager(scene);
        sp.actionManager.registerAction(
            new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger,
                () => afficherInfo(h.libelle, h.contenu)));
    });
}

/* ================================================================
   TÉLÉPORTATION — animation fluide ArcRotateCamera
   ================================================================ */
function teleporterVers(index, anime = true) {
    if (index < 0 || index >= VIEWPOINTS.length) return;
    viewpointActif = index;

    const vp = VIEWPOINTS[index];
    fermerInfo();

    if (!anime) {
        camera.alpha  = vp.alpha;
        camera.beta   = vp.beta;
        camera.radius = vp.radius;
        camera.target = vp.target.clone();
        creerHotspots(vp);
        mettreAJourSelector(index);
        return;
    }

    // Fondu rapide
    afficherLoading(true);
    setTimeout(() => {
        // Animation alpha/beta/radius
        const ease = new BABYLON.CubicEase();
        ease.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT);

        const animTarget = new BABYLON.Animation('aTarget','target', 60,
            BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
        animTarget.setEasingFunction(ease);
        animTarget.setKeys([
            { frame: 0,  value: camera.target.clone() },
            { frame: 40, value: vp.target.clone() }
        ]);

        const animAlpha = new BABYLON.Animation('aAlpha','alpha', 60,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
        animAlpha.setEasingFunction(ease);
        animAlpha.setKeys([
            { frame: 0,  value: camera.alpha },
            { frame: 40, value: vp.alpha }
        ]);

        const animBeta = new BABYLON.Animation('aBeta','beta', 60,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
        animBeta.setEasingFunction(ease);
        animBeta.setKeys([
            { frame: 0,  value: camera.beta },
            { frame: 40, value: vp.beta }
        ]);

        const animRadius = new BABYLON.Animation('aRadius','radius', 60,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
        animRadius.setEasingFunction(ease);
        animRadius.setKeys([
            { frame: 0,  value: camera.radius },
            { frame: 40, value: vp.radius }
        ]);

        camera.animations = [animTarget, animAlpha, animBeta, animRadius];
        scene.beginAnimation(camera, 0, 40, false, 1, () => {
            creerHotspots(vp);
            mettreAJourSelector(index);
            afficherLoading(false);
        });
    }, 80);
}

/* ================================================================
   ROOM SELECTOR UI
   ================================================================ */
function construireRoomSelector() {
    const sel = document.getElementById('room-selector');
    sel.innerHTML = '';
    VIEWPOINTS.forEach((vp, i) => {
        const btn = document.createElement('button');
        btn.className = 'room-btn' + (i === 0 ? ' active' : '');
        btn.dataset.room = i;
        btn.innerHTML = `
            <span class="room-dot" style="background:${vp.couleur}"></span>
            <span class="room-name">${vp.nom}</span>`;
        btn.onclick = () => teleporterVers(i);
        sel.appendChild(btn);
    });
}

function mettreAJourSelector(index) {
    document.querySelectorAll('.room-btn').forEach((btn, i) => {
        btn.classList.toggle('active', i === index);
    });
    document.getElementById('piece-courante').textContent =
        VIEWPOINTS[index].label;
}

/* ================================================================
   INFO PANEL
   ================================================================ */
function afficherInfo(titre, contenu) {
    document.getElementById('hotspot-titre').textContent   = titre;
    document.getElementById('hotspot-contenu').textContent = contenu;
    document.getElementById('hotspot-panel').classList.remove('hidden');
}
function fermerInfo() {
    document.getElementById('hotspot-panel').classList.add('hidden');
}

function resetCamera() { teleporterVers(viewpointActif, true); }
function retourFiche() {
    if (villaId) window.location.href = `/villas/${villaId}`;
    else window.history.back();
}
function afficherLoading(v) {
    document.getElementById('loading').classList.toggle('hidden', !v);
}
const canvas = document.getElementById?.('renderCanvas');

/* ================================================================
   MATÉRIAUX PBR
   ================================================================ */
const MAT = {};
function mat(id, hex, r = 0.7, m = 0) {
    if (MAT[id]) return MAT[id];
    const mat = new BABYLON.PBRMaterial(id, scene);
    mat.albedoColor = BABYLON.Color3.FromHexString(hex);
    mat.roughness   = r;
    mat.metallic    = m;
    return MAT[id] = mat;
}

function b(n, w, h, d, x, y, z, matId, sg) {
    const mesh = BABYLON.MeshBuilder.CreateBox(n, { width:w, height:h, depth:d }, scene);
    mesh.position.set(x, y, z);
    if (matId) mesh.material = typeof matId === 'string' ? mat(matId,'#888') : matId;
    mesh.receiveShadows = true;
    if (sg) sg.addShadowCaster(mesh, true);
    return mesh;
}
function c(n, h, dt, db, x, y, z, matId, sg, tess = 20) {
    const mesh = BABYLON.MeshBuilder.CreateCylinder(n,
        { height:h, diameterTop:dt, diameterBottom:db, tessellation:tess }, scene);
    mesh.position.set(x, y, z);
    if (matId) mesh.material = matId;
    if (sg) sg.addShadowCaster(mesh);
    return mesh;
}

function texParquet(c1, c2) {
    const dt = new BABYLON.DynamicTexture('tp'+c1, { width:512, height:512 }, scene);
    const ctx = dt.getContext();
    const n = 7, ph = 512/n;
    [c1,c2,c1,c2,c1,c2,c1].forEach((col, i) => {
        ctx.fillStyle = col;
        ctx.fillRect(0, i*ph, 512, ph - 2);
        ctx.globalAlpha = 0.06;
        for (let x = 0; x < 512; x += 14 + Math.random()*10) {
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(x + Math.random()*4, i*ph);
            ctx.lineTo(x + Math.random()*4, (i+1)*ph);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#1A0800';
        ctx.fillRect(0, (i+1)*ph - 2, 512, 2);
    });
    dt.update(); dt.uScale = 3.5; dt.vScale = 2.5; return dt;
}
function texCarrelage() {
    const dt = new BABYLON.DynamicTexture('tc', { width:512, height:512 }, scene);
    const ctx = dt.getContext();
    const n = 8, s = 512/n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const v = 215 + ((i+j)%2)*18;
        ctx.fillStyle = `rgb(${v},${v-3},${v-6})`;
        ctx.fillRect(j*s+2, i*s+2, s-4, s-4);
    }
    ctx.strokeStyle='#C8C4BE'; ctx.lineWidth=4;
    for (let i = 0; i <= n; i++) {
        ctx.beginPath(); ctx.moveTo(0,i*s); ctx.lineTo(512,i*s); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(i*s,0); ctx.lineTo(i*s,512); ctx.stroke();
    }
    dt.update(); dt.uScale=3; dt.vScale=3; return dt;
}

/* ================================================================
   VILLA COMPLETE
   ================================================================ */
function construireVilla(sg) {
    const H = 2.8;
    const mParquet   = mat('parquet', '#8C6A40', 0.65);
    const mParqCh    = mat('parqCh',  '#6E4F28', 0.70);
    const mCarrelage = mat('carrel',  '#D8D4CE', 0.45);
    const mMur       = mat('mur',     '#F5F3EE', 0.92);
    const mMurAcc    = mat('murAcc',  '#EDE6DC', 0.90);
    const mPlafond   = mat('plaf',    '#FAFAFA', 0.95);
    const mCanape    = mat('canape',  '#4A5466', 0.85);
    const mCoussin   = mat('coussin', '#F5F0E8', 0.90);
    const mNoyer     = mat('noyer',   '#1E120A', 0.55);
    const mLaiton    = mat('laiton',  '#C8A048', 0.35, 0.6);
    const mInox      = mat('inox',    '#B0B0B4', 0.30, 0.8);
    const mBlanc     = mat('blanc',   '#F2F2F2', 0.85);
    const mNoir      = mat('noir',    '#080808', 0.20);
    const mLin       = mat('lin',     '#EDE8DE', 0.90);
    const mTeteLit   = mat('teteLit', '#2A1A0E', 0.70);
    const mVerre     = mat('verre',   '#9BBFCC', 0.05);

    mParquet.albedoTexture   = texParquet('#8C6A40','#6B4E2A');
    mParqCh.albedoTexture    = texParquet('#6E4F28','#5A3D1E');
    mCarrelage.albedoTexture = texCarrelage();

    // Spots lumière
    const addSpot = (x,y,z,n,i,r) => {
        const l = new BABYLON.PointLight(n, new BABYLON.Vector3(x,y,z), scene);
        l.intensity=i; l.diffuse=new BABYLON.Color3(1,0.92,0.72); l.range=r;
    };
    addSpot(7,2,2,'lf1',0.3,6); addSpot(7,2,5.5,'lf2',0.25,5);
    addSpot(-8.5,2.7,-4.5,'lCuis',0.8,7);
    addSpot(-8.5,2.7,4,'lCh',0.65,8);
    addSpot(-4.25,2.5,-0.5,'lCoul',0.5,5);
    addSpot(4,3,4,'ls',0.25,3.5);

    // SOL
    const addFloor = (n,w,d,x,z,m) => {
        const f = BABYLON.MeshBuilder.CreateBox(n,{width:w,height:0.14,depth:d},scene);
        f.position.set(x,-0.07,z); f.material=m;
        f.receiveShadows=true; f.checkCollisions=false;
    };
    addFloor('flS',14,10,0,2,mParquet);
    addFloor('flC',7,7,-8.5,-4.5,mCarrelage);
    addFloor('flCh',7,8,-8.5,4,mParqCh);
    addFloor('flCo',2.5,8,-4.25,-0.5,mat('beton','#C8C4BE',0.80));

    // PLAFONDS
    [['plS',14,10,0,2],['plC',7,7,-8.5,-4.5],['plCh',7,8,-8.5,4],['plCo',2.5,8,-4.25,-0.5]].forEach(([n,w,d,x,z])=>
        b(n,w,0.1,d,x,H+0.05,z,mPlafond));

    // MURS EXTÉRIEURS
    const mw = (n,w,h,d,x,y,z,m) => { const mesh=b(n,w,h,d,x,y,z,m); mesh.receiveShadows=true; return mesh; };
    mw('mSN',14,H,0.2,0,H/2,7.1,mMur); mw('mSS',14,H,0.2,0,H/2,-3.1,mMur);
    mw('mSE',0.2,H,10,7.1,H/2,2,mMur);
    mw('mCN',7,H,0.2,-8.5,H/2,-8.1,mMurAcc); mw('mCW',0.2,H,7,-12.1,H/2,-4.5,mMurAcc);
    mw('mChN',7,H,0.2,-8.5,H/2,8.1,mMurAcc); mw('mChW',0.2,H,8,-12.1,H/2,4,mMurAcc);

    // MURS INTÉRIEURS
    mw('mSC1',2.5,H,0.2,-4.25,H/2,-3.05,mMur);
    mw('mSC2',1.0,H,0.2,-2.75,H/2,-3.05,mMur);
    mw('mSC3',1.25,H,0.2,-5.625,H/2,-3.05,mMur);
    mw('mCC',0.2,H,7,-3.0,H/2,-4.5,mMur);
    mw('mCCh',0.2,H,8,-3.0,H/2,4,mMur);
    mw('mCuisCh',7,H,0.2,-8.5,H/2,-1.0,mMurAcc);

    // Fenêtres
    mVerre.alpha=0.3;
    [[7.05,1.5,2],[7.05,1.5,5.5]].forEach(([x,y,z])=>
        b('f'+x+z,0.06,1.6,2.5,x,y,z,mVerre));

    // ── SALON ──────────────────────────────────────────────────
    const mTapis = mat('tapis','#8B6852',0.95);
    b('tapis',4.5,0.03,3.0,1,0.015,2,mTapis);

    // Canapé
    b('canBase',2.4,0.44,0.95,0.5,0.22,3.5,mCanape,sg);
    b('canDos',2.4,0.52,0.18,0.5,0.72,3.9,mCanape,sg);
    b('canBG',0.18,0.52,0.95,-0.7,0.46,3.5,mCanape,sg);
    b('canBD',0.18,0.52,0.95,1.7,0.46,3.5,mCanape,sg);
    [-0.35,0.5,1.3].forEach((x,i)=>b(`cc${i}`,0.52,0.28,0.1,x,0.60,3.62,mCoussin,sg));

    // Fauteuil
    b('fB',0.95,0.44,0.85,3.2,0.22,3.2,mCanape,sg);
    b('fD',0.95,0.52,0.18,3.2,0.72,3.6,mCanape,sg);
    b('fBG',0.16,0.48,0.85,2.74,0.44,3.2,mCanape,sg);
    b('fBD',0.16,0.48,0.85,3.66,0.44,3.2,mCanape,sg);
    b('fC',0.72,0.26,0.1,3.2,0.60,3.32,mCoussin,sg);

    // Table basse
    b('tb',1.2,0.06,0.7,1.2,0.46,2.2,mNoyer,sg);
    [[-0.45,0.28],[0.45,0.28],[-0.45,0.92],[0.45,0.92]].forEach(([x,z],i)=>
        c(`tp${i}`,0.44,0.04,0.04,1.2+x,0.22,2.2+z,mLaiton,sg));
    c('vase',0.22,0.07,0.05,1.35,0.58,2.2,mat('vm','#A0895C',0.4),sg);

    // TV
    b('mTV',3.0,0.5,0.45,0,0.25,-2.4,mBlanc,sg);
    b('mTVP',3.0,0.04,0.45,0,0.52,-2.4,mat('tpn','#B8923A',0.5),sg);
    b('tv',1.9,1.05,0.06,0,1.3,-2.48,mNoir,sg);
    b('tvB',1.95,1.1,0.04,0,1.3,-2.45,mat('tvb','#111',0.1),sg);
    const eLed=mat('elum','#1A2A4A',0.1); eLed.emissiveColor=new BABYLON.Color3(0.05,0.12,0.3);
    b('ecr',1.85,0.99,0.01,0,1.3,-2.44,eLed);
    const ledMat=mat('led','#FFEEB8',0.1); ledMat.emissiveColor=new BABYLON.Color3(1,0.93,0.7);
    b('ledTV',2.8,0.04,0.04,0,0.0,-2.18,ledMat);

    // Lampadaire
    b('lpP',0.04,1.7,0.04,4.8,0.85,0.5,mInox);
    b('lpB',0.3,0.04,0.3,4.8,0.04,0.5,mInox);
    c('lpA',0.32,0.42,0.08,4.8,1.87,0.5,mat('lm','#FFF5E0',0.9),null,24);
    const mLumLamp=mat('lumLamp','#FFF5E0',0.1);
    mLumLamp.emissiveColor=new BABYLON.Color3(0.9,0.78,0.55);
    c('lumLamp',0.05,0.3,0.3,4.8,1.72,0.5,mLumLamp);
    addSpot(4.8,1.7,0.5,'lp',0.45,5);

    // ── CUISINE ────────────────────────────────────────────────
    b('bas1',4,0.88,0.62,-8,0.44,-7.7,mBlanc,sg);
    b('bas2',0.62,0.88,4,-11.8,0.44,-5.5,mBlanc,sg);
    b('plan1',4,0.06,0.62,-8,0.91,-7.7,mInox,sg);
    b('plan2',0.62,0.06,4,-11.8,0.91,-5.5,mInox,sg);
    b('haut1',3.8,0.7,0.38,-8,2.25,-7.78,mBlanc);
    b('haut2',0.38,0.7,3,-11.78,2.25,-5,mBlanc);
    b('hotte',1.0,0.55,0.45,-8.2,2.05,-7.75,mat('hm','#787878',0.3,0.7));
    b('ilot',1.4,0.92,0.88,-8,0.46,-3.8,mBlanc,sg);
    b('ilotT',1.4,0.05,0.88,-8,0.945,-3.8,mInox,sg);
    [-0.45,0.45].forEach((x,i)=>{
        b(`stl${i}`,0.32,0.02,0.32,-8+x,0.74,-2.8,mat('stlT','#2A2A2A',0.5),sg);
        c(`stlP${i}`,0.72,0.04,0.04,-8+x,0.36,-2.8,mInox,sg);
    });
    [-0.4,0.4].forEach((x,i)=>{
        b(`pf${i}`,0.01,1.0,0.01,-8+x,1.9,-3.8,mInox);
        c(`pd${i}`,0.2,0.22,0.06,-8+x,1.35,-3.8,mat('pm','#C8A048',0.3,0.6),null,16);
        addSpot(-8+x,1.3,-3.8,`lP${i}`,0.4,3);
    });

    // ── CHAMBRE ────────────────────────────────────────────────
    b('lit',2.0,0.32,2.2,-8.5,0.16,4,mLin,sg);
    b('litD',2.0,0.04,2.2,-8.5,0.34,4,mCoussin,sg);
    b('tete',2.0,0.9,0.14,-8.5,0.65,5.05,mTeteLit,sg);
    b('pied',2.0,0.28,0.12,-8.5,0.14,2.9,mTeteLit,sg);
    [-0.45,0.45].forEach((x,i)=>b(`orl${i}`,0.58,0.14,0.38,-8.5+x,0.42,4.8,mCoussin,sg));
    b('couv',2.0,0.08,0.65,-8.5,0.38,3.5,mat('cm','#9B8B7A',0.85));
    [-1.2,1.2].forEach((x,i)=>{
        b(`cv${i}`,0.55,0.55,0.42,-8.5+x,0.275,4,mTeteLit,sg);
        c(`lcP${i}`,0.35,0.03,0.03,-8.5+x,0.565,4,mInox);
        c(`lcA${i}`,0.26,0.22,0.06,-8.5+x,0.72,4,mat('lcm','#FFF8EC',0.9),null,20);
        addSpot(-8.5+x,0.9,4,`lC${i}`,0.35,3.2);
    });
    b('arm',2.2,2.35,0.65,-8.5,1.175,7.7,mBlanc,sg);
    mVerre.alpha=0.35;
    b('mirArm',1.05,2.3,0.04,-8.1,1.15,7.4,mVerre);
    b('tapisCh',2.8,0.03,2.0,-8.5,0.015,3.2,mat('tCh','#6B5A8A',0.92));
}
