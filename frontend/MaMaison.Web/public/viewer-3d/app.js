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
    engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
    scene = new BABYLON.Scene(engine);

    scene.clearColor = new BABYLON.Color4(0.05, 0.05, 0.08, 1);

    camera = new BABYLON.FreeCamera('camera', BABYLON.Vector3.Zero(), scene);
    camera.minZ = 0.1;
    camera.fov = 1.0;

    const lumiere = new BABYLON.HemisphericLight('lumiere', new BABYLON.Vector3(0, 1, 0), scene);
    lumiere.intensity = 0.8;

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
   SCÈNE DÉMO RÉALISTE — Villa Palm Beach
   ================================================================ */
function creerSceneDemo() {
    // ── Fond + lumières ──────────────────────────────────────────
    scene.clearColor = new BABYLON.Color4(0.55, 0.72, 0.90, 1); // ciel bleu doux

    // Lumière ambiante principale
    const hemi = new BABYLON.HemisphericLight('hemi', new BABYLON.Vector3(0, 1, 0), scene);
    hemi.intensity = 0.85;
    hemi.diffuse   = new BABYLON.Color3(1, 0.97, 0.92);
    hemi.groundColor = new BABYLON.Color3(0.45, 0.35, 0.28);

    // Lumière soleil (fenêtre gauche)
    const soleil = new BABYLON.DirectionalLight('soleil', new BABYLON.Vector3(0.4, -0.8, 0.5), scene);
    soleil.intensity = 0.5;
    soleil.diffuse   = new BABYLON.Color3(1, 0.95, 0.82);
    soleil.position  = new BABYLON.Vector3(-8, 5, -3);

    // ── Matériaux ────────────────────────────────────────────────
    const matParquet = creerMateriau('parquet', 0.72, 0.52, 0.30, 0.12); // chêne clair
    const matMur     = creerMateriau('mur',     0.96, 0.95, 0.92, 0.03); // blanc cassé
    const matPlafond = creerMateriau('plafond', 0.99, 0.99, 0.99, 0.02); // blanc pur
    const matPlinthe = creerMateriau('plinthe', 0.88, 0.87, 0.85, 0.05);
    const matCanape  = creerMateriau('canape',  0.38, 0.42, 0.52, 0.04); // gris-bleu
    const matCoussin = creerMateriau('coussin', 0.96, 0.94, 0.88, 0.02); // crème
    const matTable   = creerMateriau('table',   0.14, 0.09, 0.06, 0.15); // noyer foncé
    const matTablePied = creerMateriau('tpied', 0.75, 0.65, 0.20, 0.35); // laiton
    const matTV      = creerMateriau('tv',      0.04, 0.04, 0.04, 0.02); // noir
    const matMeuble  = creerMateriau('meuble',  0.96, 0.96, 0.96, 0.05); // blanc laqué
    const matBois    = creerMateriau('bois',    0.55, 0.38, 0.22, 0.08); // bois moyen
    const matInox    = creerMateriau('inox',    0.70, 0.70, 0.72, 0.45); // inox
    const matVitro   = creerMateriau('vitro',   0.25, 0.55, 0.80, 0.10); // verre bleu
    const matLit     = creerMateriau('lit',     0.92, 0.88, 0.84, 0.03); // lin naturel
    const matTete    = creerMateriau('tete',    0.22, 0.16, 0.12, 0.04); // bois tête lit
    const matTapis   = creerMateriau('tapis',   0.45, 0.32, 0.24, 0.01); // terracotta
    const matLampe   = creerMateriau('lampe',   1.0, 0.90, 0.60, 0.05, 0.6); // lueur

    // ── ARCHITECTURE DE BASE ─────────────────────────────────────
    const LX = 22, LZ = 16, H = 3.2;

    // Sol parquet
    creerBox('sol', LX, 0.12, LZ, 0, -0.06, 0, matParquet);
    // Plafond
    creerBox('plafond', LX, 0.12, LZ, 0, H + 0.06, 0, matPlafond);

    // Murs
    creerBox('mFond',    LX,  H, 0.18,  0,    H/2, -LZ/2, matMur);
    creerBox('mArriere', LX,  H, 0.18,  0,    H/2,  LZ/2, matMur);
    creerBox('mGauche',  0.18, H, LZ,   -LX/2, H/2, 0,    matMur);
    creerBox('mDroite',  0.18, H, LZ,    LX/2, H/2, 0,    matMur);

    // Plinthes
    [[LX, -LZ/2], [LX, LZ/2]].forEach(([w, z], i) =>
        creerBox(`pl${i}`, w, 0.12, 0.04, 0, 0.06, z, matPlinthe));
    [[-LX/2, LZ], [LX/2, LZ]].forEach(([x, d], i) =>
        creerBox(`plv${i}`, 0.04, 0.12, d, x, 0.06, 0, matPlinthe));

    // Fenêtre lumineuse (mur gauche)
    const fenMat = creerMateriau('fen', 0.82, 0.93, 1.0, 0.1, 0.5);
    fenMat.alpha = 0.35;
    creerBox('fenetre', 0.05, 1.8, 2.5, -LX/2 + 0.1, 1.8, -2, fenMat);
    const lumiereInterieure = new BABYLON.PointLight('lumFen', new BABYLON.Vector3(-9, 2.5, -2), scene);
    lumiereInterieure.intensity = 0.6;
    lumiereInterieure.diffuse = new BABYLON.Color3(1, 0.97, 0.88);
    lumiereInterieure.range = 12;

    // ── SALON ────────────────────────────────────────────────────
    // Tapis
    creerBox('tapis', 5, 0.04, 3.5, 0, 0.02, 0, matTapis);

    // Canapé 3 places
    creerBox('canBase',  2.4, 0.45, 0.95,  0.2, 0.225, 1.8, matCanape);
    creerBox('canDos',   2.4, 0.55, 0.20,  0.2, 0.725, 2.2, matCanape);
    creerBox('canBrasG', 0.20, 0.55, 0.95, -1.0, 0.475, 1.8, matCanape);
    creerBox('canBrasD', 0.20, 0.55, 0.95,  1.4, 0.475, 1.8, matCanape);
    // Pieds canapé
    [[-0.9,1.38],[1.3,1.38],[-0.9,2.22],[1.3,2.22]].forEach(([x,z], i) =>
        creerBox(`cpied${i}`, 0.07, 0.1, 0.07, x, 0.05, z, matTablePied));
    // Coussins
    [-0.55, 0.2, 0.9].forEach((x, i) =>
        creerBox(`cous${i}`, 0.55, 0.3, 0.12, x, 0.62, 1.92, matCoussin));

    // Méridienne/fauteuil (angle)
    creerBox('fauBase', 1.0, 0.45, 0.85, -2.8, 0.225, 1.8, matCanape);
    creerBox('fauDos',  1.0, 0.55, 0.18, -2.8, 0.725, 2.18, matCanape);
    creerBox('fauBras', 0.18, 0.5, 0.85, -3.24, 0.45, 1.8, matCanape);
    creerBox('fauCous', 0.75, 0.28, 0.1, -2.8, 0.62, 1.9, matCoussin);

    // Table basse
    creerBox('tablePlateau', 1.2, 0.06, 0.7, 0, 0.45, 0.6, matTable);
    [[-0.5, 0.28], [0.5, 0.28], [-0.5, 0.92], [0.5, 0.92]].forEach(([x, z], i) =>
        creerBox(`tpied${i}`, 0.05, 0.42, 0.05, x, 0.21, z, matTablePied));
    // Livre + vase déco
    creerBox('livre', 0.25, 0.04, 0.18, -0.2, 0.49, 0.6, creerMateriau('lv', 0.8, 0.2, 0.2, 0.02));
    const vase = BABYLON.MeshBuilder.CreateCylinder('vase', { height: 0.22, diameterTop: 0.08, diameterBottom: 0.06 }, scene);
    vase.position.set(0.3, 0.59, 0.55);
    vase.material = creerMateriau('vm', 0.85, 0.75, 0.55, 0.15);

    // Meuble TV
    creerBox('meuTV',  3.5, 0.5, 0.45,  0, 0.25, -5.5, matMeuble);
    creerBox('meuTVP', 3.5, 0.04, 0.45, 0, 0.51, -5.5, creerMateriau('tpn', 0.78, 0.6, 0.35));
    creerBox('tv',     1.8, 1.05, 0.06, 0, 1.3, -5.58, matTV);
    creerBox('tvBord', 1.85, 1.1, 0.04, 0, 1.3, -5.55, creerMateriau('tvb', 0.1, 0.1, 0.1));
    // Pied TV
    creerBox('tvPied', 0.08, 0.35, 0.12, 0, 0.69, -5.56, matInox);
    // Écran (légère lueur)
    creerBox('ecran', 1.74, 0.99, 0.01, 0, 1.3, -5.54, creerMateriau('ec', 0.1, 0.2, 0.4, 0.02, 0.15));

    // Lampadaire
    creerBox('lampPied', 0.04, 1.7, 0.04, 3.8, 0.85, 1.5, matInox);
    creerBox('lampPied2', 0.35, 0.03, 0.35, 3.8, 0.04, 1.5, matInox);
    const abajour = BABYLON.MeshBuilder.CreateCylinder('abajour',
        { height: 0.35, diameterTop: 0.45, diameterBottom: 0.1, tessellation: 24 }, scene);
    abajour.position.set(3.8, 1.87, 1.5);
    abajour.material = matLampe;
    const ptLamp = new BABYLON.PointLight('ptlamp', new BABYLON.Vector3(3.8, 1.7, 1.5), scene);
    ptLamp.intensity = 0.5;
    ptLamp.diffuse = new BABYLON.Color3(1, 0.92, 0.72);
    ptLamp.range = 6;

    // ── CUISINE ──────────────────────────────────────────────────
    const KX = 8, KZ = 8; // coin cuisine à droite (+x)
    const cx = LX/2 - 2, cz = -LZ/2 + 4;

    // Sol cuisine (carrelage)
    const matCarrelage = creerMateriau('carrelage', 0.88, 0.86, 0.83, 0.2);
    creerBox('solCuis', 7, 0.13, 7.5, cx, 0.065, cz, matCarrelage);

    // Plan de travail L
    creerBox('plan1', 4, 0.06, 0.65, cx-1, 0.9, cz-3, matInox);    // façade
    creerBox('plan2', 0.65, 0.06, 4,  cx+1.7, 0.9, cz-0.8, matInox); // côté
    // Meubles bas
    creerBox('bas1', 4, 0.86, 0.62, cx-1, 0.43, cz-3, matMeuble);
    creerBox('bas2', 0.62, 0.86, 4, cx+1.7, 0.43, cz-0.8, matMeuble);
    // Meubles hauts
    creerBox('haut1', 3.8, 0.7, 0.38, cx-1, 2.25, cz-3.05, matMeuble);
    creerBox('haut2', 0.38, 0.7, 3, cx+1.78, 2.25, cz-0.3, matMeuble);
    // Poignées
    for (let i = 0; i < 4; i++) {
        creerBox(`pg${i}`, 0.03, 0.03, 0.32, cx - 2.4 + i*1.2, 0.85, cz - 2.7, matInox);
        creerBox(`pgh${i}`, 0.03, 0.03, 0.32, cx - 2.4 + i*1.15, 2.25, cz - 2.82, matInox);
    }
    // Îlot central
    creerBox('ilot', 1.4, 0.92, 0.8, cx-1, 0.46, cz+0.8, matMeuble);
    creerBox('ilotTop', 1.4, 0.05, 0.8, cx-1, 0.945, cz+0.8, matInox);
    // Tabourets
    [-0.5, 0.5].forEach((x, i) => {
        creerBox(`tab${i}`, 0.32, 0.02, 0.32, cx - 1 + x, 0.74, cz + 1.6, matBois);
        creerBox(`tabp${i}`, 0.04, 0.72, 0.04, cx - 1 + x, 0.36, cz + 1.6, matInox);
    });
    // Hotte
    creerBox('hotte', 0.9, 0.5, 0.42, cx-1, 2.0, cz-3.1, creerMateriau('hm', 0.6, 0.6, 0.62, 0.4));
    // Lumière cuisine (spot)
    const spotCuis = new BABYLON.PointLight('spotCuis', new BABYLON.Vector3(cx-1, 2.8, cz-1), scene);
    spotCuis.intensity = 0.7;
    spotCuis.diffuse = new BABYLON.Color3(1, 0.97, 0.90);
    spotCuis.range = 7;

    // ── CHAMBRE PRINCIPALE ───────────────────────────────────────
    const bx = -LX/2 + 4, bz = LZ/2 - 4;

    // Sol chambre (parquet plus sombre)
    const matParqCh = creerMateriau('parqCh', 0.55, 0.38, 0.22, 0.08);
    creerBox('solCh', 8, 0.13, 8.5, bx, 0.065, bz, matParqCh);

    // Lit king-size
    const lw = 2.0, ll = 2.2;
    creerBox('lit',       lw, 0.32, ll,    bx, 0.16, bz-0.5, matLit);
    creerBox('litDrap',   lw, 0.04, ll,    bx, 0.34, bz-0.5, matCoussin);
    creerBox('teteLit',   lw, 0.9,  0.14, bx, 0.65, bz-1.55, matTete);
    creerBox('piedLit',   lw, 0.28, 0.12, bx, 0.14, bz+0.6,  matTete);
    // Oreillers
    [-0.45, 0.45].forEach((x, i) =>
        creerBox(`oreiller${i}`, 0.55, 0.14, 0.36, bx + x, 0.4, bz-1.1, matCoussin));
    // Tables de chevet
    [-1.25, 1.25].forEach((x, i) => {
        creerBox(`chevet${i}`, 0.5, 0.55, 0.42, bx+x, 0.275, bz-0.5, matTete);
        // Lampe de chevet
        const lc = BABYLON.MeshBuilder.CreateCylinder(`lamc${i}`,
            { height: 0.28, diameterTop: 0.22, diameterBottom: 0.06, tessellation: 20 }, scene);
        lc.position.set(bx+x, 0.69, bz-0.5);
        lc.material = matLampe;
        creerBox(`lamcPied${i}`, 0.03, 0.35, 0.03, bx+x, 0.445, bz-0.5, matInox);
        const pl = new BABYLON.PointLight(`plch${i}`, new BABYLON.Vector3(bx+x, 0.9, bz-0.5), scene);
        pl.intensity = 0.35;
        pl.diffuse = new BABYLON.Color3(1, 0.88, 0.65);
        pl.range = 3.5;
    });
    // Armoire
    creerBox('armoire', 2.0, 2.4, 0.65, bx+2.8, 1.2, bz-1.55, matMeuble);
    creerBox('armMiroir', 0.92, 2.35, 0.04, bx+2.3, 1.175, bz-1.25, matVitro);
    [0, 0.96].forEach((dx, i) =>
        creerBox(`armPoig${i}`, 0.03, 0.03, 0.5, bx+2.3+dx, 1.2, bz-1.22, matInox));
    // Tapis chambre
    creerBox('tapisCh', 2.6, 0.03, 1.8, bx, 0.015, bz+0.8, creerMateriau('tc', 0.32, 0.28, 0.55));

    // Hotspots visuels
    afficherHotspotsVisuels();
}

function creerMateriau(nom, r, g, b, spec = 0.05, emis = 0) {
    if (scene.getMaterialByName(nom)) return scene.getMaterialByName(nom);
    const m = new BABYLON.StandardMaterial(nom, scene);
    m.diffuseColor  = new BABYLON.Color3(r, g, b);
    m.specularColor = new BABYLON.Color3(spec, spec, spec);
    if (emis > 0) m.emissiveColor = new BABYLON.Color3(emis * r, emis * g, emis * b);
    return m;
}

function creerBox(nom, w, h, d, x, y, z, mat) {
    const b = BABYLON.MeshBuilder.CreateBox(nom, { width: w, height: h, depth: d }, scene);
    b.position.set(x, y, z);
    if (mat) b.material = mat;
    return b;
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
