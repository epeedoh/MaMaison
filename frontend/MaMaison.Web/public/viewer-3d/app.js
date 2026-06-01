// MaMaison — Viewer Visite Virtuelle 360°
// Approche PhotoDome : vraie photo 360° = rendu photo-réaliste immédiat

const API_BASE = '/api';

let engine, scene, camera, dome;
let pointsVisite = [];
let indexCourant = 0;
let villaId = null;

// Panoramas locaux par pièce
const PANORAMAS = [
    'assets/equirectangular.jpg',
    'assets/2294472375_24a3b8ef46_o.jpg',
    'assets/equirectangular.jpg',
];

const params = new URLSearchParams(window.location.search);
villaId = params.get('villaId');

/* ================================================================
   INIT
   ================================================================ */
window.addEventListener('DOMContentLoaded', () => {
    const securite = setTimeout(() => chargerDemoLocal(), 8000);
    const lancer = villaId
        ? chargerVillaDepuisApi(villaId)
        : Promise.resolve(chargerDemoLocal());
    lancer.finally(() => clearTimeout(securite));
});

async function chargerVillaDepuisApi(id) {
    try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 5000);
        const res = await fetch(`${API_BASE}/villas/${id}`, { signal: ctrl.signal });
        clearTimeout(t);
        if (!res.ok) throw new Error();
        const villa = await res.json();
        document.getElementById('villa-titre').textContent = villa.titre;
        document.getElementById('villa-prix').textContent =
            new Intl.NumberFormat('fr-CI', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(villa.prix);
        pointsVisite = villa.pointsVisite?.length > 0 ? villa.pointsVisite : piecesDemoAvecHotspots();
        initialiserViewer();
    } catch {
        chargerDemoLocal();
    }
}

function chargerDemoLocal() {
    document.getElementById('villa-titre').textContent = 'Villa Palm Beach — Cocody';
    document.getElementById('villa-prix').textContent = '45 000 000 FCFA';
    pointsVisite = piecesDemoAvecHotspots();
    initialiserViewer();
}

/* ================================================================
   POINTS DE VISITE DEMO
   ================================================================ */
function piecesDemoAvecHotspots() {
    return [
        {
            id: '1', nomPiece: 'Salon — 35 m²', ordre: 0,
            panorama: 0,
            rotationY: 0,
            hotspots: [
                { id: 'h1', libelle: '35 m²', contenu: 'Parquet chêne · Plafond 2,7m · Baies vitrées double vitrage', angle: -0.4, elevation: 0 },
                { id: 'h2', libelle: 'Canapé 3 places', contenu: 'Tissu haut de gamme · Table basse noyer & laiton', angle: 0.8, elevation: -0.2 },
                { id: 'h3', libelle: 'TV 65"', contenu: 'Meuble TV blanc laqué · Éclairage indirect LED', angle: Math.PI, elevation: 0 },
            ]
        },
        {
            id: '2', nomPiece: 'Cuisine — 18 m²', ordre: 1,
            panorama: 1,
            rotationY: 0.3,
            hotspots: [
                { id: 'h4', libelle: 'Plan de travail', contenu: 'Inox brossé 4ml · Crédence carrelage métro', angle: 0.2, elevation: 0 },
                { id: 'h5', libelle: 'Îlot central', contenu: 'Inox · Bar 2 tabourets · Rangements intégrés', angle: -1.2, elevation: -0.1 },
            ]
        },
        {
            id: '3', nomPiece: 'Chambre principale — 22 m²', ordre: 2,
            panorama: 2,
            rotationY: 1.2,
            hotspots: [
                { id: 'h6', libelle: 'Lit King-Size', contenu: '200×200 cm · Tête de lit bois massif · Literie premium', angle: 0, elevation: -0.15 },
                { id: 'h7', libelle: 'Armoire 1.8m', contenu: 'Miroir coulissant · Dressing intégré 6 m²', angle: 1.4, elevation: 0 },
            ]
        }
    ];
}

/* ================================================================
   VIEWER PHOTODOME
   ================================================================ */
function initialiserViewer() {
    if (typeof BABYLON === 'undefined') {
        document.getElementById('loading').innerHTML =
            '<p style="color:#f59e0b">⚠️ BabylonJS non chargé.<br>Vérifiez votre connexion.</p>';
        return;
    }

    const canvas = document.getElementById('renderCanvas');
    engine = new BABYLON.Engine(canvas, true, { antialias: true });
    scene  = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.05, 0.05, 0.08, 1);

    // Caméra — regard libre, PAS de déplacement (on est dans une photo 360°)
    camera = new BABYLON.FreeCamera('cam', BABYLON.Vector3.Zero(), scene);
    camera.minZ = 0.1;
    camera.fov  = 1.05;
    camera.speed = 0;                         // pas de déplacement
    camera.angularSensibility = 500;
    camera.attachControl(canvas, true);
    camera.keysUp = camera.keysDown = camera.keysLeft = camera.keysRight = [];

    // Lumière ambiante pour les hotspots
    const light = new BABYLON.HemisphericLight('h', new BABYLON.Vector3(0,1,0), scene);
    light.intensity = 1.2;

    engine.runRenderLoop(() => scene.render());
    window.addEventListener('resize', () => engine.resize());

    if (pointsVisite.length > 0) naviguerVers(0);
}

/* ================================================================
   PHOTODOME + HOTSPOTS
   ================================================================ */
function chargerPanorama(pieceIndex, rotY) {
    if (dome) { dome.dispose(); dome = null; }

    const url = PANORAMAS[pieceIndex % PANORAMAS.length];
    dome = new BABYLON.PhotoDome(
        'dome', url,
        { resolution: 32, size: 1000, useDirectMapping: false },
        scene
    );

    // Orienter la vue initiale de la pièce
    camera.rotation.y = rotY || 0;
    camera.rotation.x = 0;
}

function placerHotspots(piece) {
    // Nettoie les anciens hotspots
    scene.meshes.filter(m => m.name.startsWith('hs_')).forEach(m => m.dispose());
    scene.getNodeByName('advTex')?.dispose();

    if (!piece.hotspots) return;

    piece.hotspots.forEach(h => {
        // Sphère à distance fixe, positionnée par angle azimut + élévation
        const dist = 8;
        const x = dist * Math.sin(h.angle);
        const y = dist * Math.sin(h.elevation || 0);
        const z = dist * Math.cos(h.angle);

        const sphere = BABYLON.MeshBuilder.CreateSphere(`hs_${h.id}`, { diameter: 0.55 }, scene);
        sphere.position.set(x, y, z);

        // Matériau doré pulsant
        const mat = new BABYLON.StandardMaterial(`mat_${h.id}`, scene);
        mat.diffuseColor  = new BABYLON.Color3(0.95, 0.72, 0.1);
        mat.emissiveColor = new BABYLON.Color3(0.5, 0.35, 0.0);
        mat.specularColor = new BABYLON.Color3(1, 0.9, 0.4);
        sphere.material = mat;

        // Anneau extérieur
        const ring = BABYLON.MeshBuilder.CreateTorus(`ring_${h.id}`, { diameter: 0.9, thickness: 0.05, tessellation: 32 }, scene);
        ring.position.set(x, y, z);
        const matRing = new BABYLON.StandardMaterial(`matr_${h.id}`, scene);
        matRing.diffuseColor  = new BABYLON.Color3(1, 0.85, 0.2);
        matRing.emissiveColor = new BABYLON.Color3(0.4, 0.28, 0.0);
        matRing.alpha = 0.75;
        ring.material = matRing;

        // Animation pulsation
        let t = 0;
        scene.registerBeforeRender(() => {
            t += 0.04;
            const s = 1 + 0.12 * Math.sin(t);
            ring.scaling.setAll(s);
        });

        // Label HTML
        sphere.actionManager = new BABYLON.ActionManager(scene);
        sphere.actionManager.registerAction(
            new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, () => {
                afficherHotspot(h.libelle, h.contenu);
            })
        );
    });
}

/* ================================================================
   NAVIGATION
   ================================================================ */
function naviguerVers(index) {
    if (index < 0 || index >= pointsVisite.length) return;

    indexCourant = index;
    const piece = pointsVisite[index];

    // Fondu au noir
    afficherLoading(true);

    setTimeout(() => {
        chargerPanorama(piece.panorama ?? index, piece.rotationY ?? 0);
        placerHotspots(piece);
        afficherLoading(false);

        document.getElementById('piece-courante').textContent = piece.nomPiece;
        document.getElementById('btn-precedent').disabled = index === 0;
        document.getElementById('btn-suivant').disabled = index === pointsVisite.length - 1;

        fermerHotspot();
    }, 300);
}

function naviguerPrecedent() { naviguerVers(indexCourant - 1); }
function naviguerSuivant()   { naviguerVers(indexCourant + 1); }

/* ================================================================
   HOTSPOT PANEL
   ================================================================ */
function afficherHotspot(titre, contenu) {
    document.getElementById('hotspot-titre').textContent  = titre;
    document.getElementById('hotspot-contenu').textContent = contenu || '';
    document.getElementById('hotspot-panel').classList.remove('hidden');
}
function fermerHotspot() {
    document.getElementById('hotspot-panel').classList.add('hidden');
}

function retourFiche() {
    if (villaId) window.location.href = `/villas/${villaId}`;
    else window.history.back();
}

function afficherLoading(v) {
    document.getElementById('loading').classList.toggle('hidden', !v);
}
