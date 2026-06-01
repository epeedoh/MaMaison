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
    if (!villaId) {
        chargerDemoLocal();
    } else {
        chargerVillaDepuisApi(villaId);
    }
});

async function chargerVillaDepuisApi(id) {
    try {
        const res = await fetch(`${API_BASE}/villas/${id}`);
        if (!res.ok) throw new Error('Villa non trouvée');
        const villa = await res.json();

        document.getElementById('villa-titre').textContent = villa.titre;
        document.getElementById('villa-prix').textContent =
            new Intl.NumberFormat('fr-CI', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 })
                .format(villa.prix);

        pointsVisite = villa.pointsVisite || [];
        initialiserViewer(villa.modele3DUrl);
    } catch (e) {
        console.error(e);
        chargerDemoLocal();
    }
}

function chargerDemoLocal() {
    document.getElementById('villa-titre').textContent = 'Villa Démo — Cocody';
    document.getElementById('villa-prix').textContent = '45 000 000 FCFA';

    pointsVisite = [
        {
            id: '1', nomPiece: 'Salon', ordre: 0,
            positionX: 0, positionY: 1.6, positionZ: 0,
            rotationX: 0, rotationY: 0, rotationZ: 0,
            hotspots: [
                { id: 'h1', libelle: 'Surface', contenu: '35 m² — Carrelage marbre blanc', positionX: 2, positionY: 1.2, positionZ: -1 },
                { id: 'h2', libelle: 'Hauteur sous plafond', contenu: '3,2 m — Luminosité optimale', positionX: -1, positionY: 2.5, positionZ: 1 }
            ]
        },
        {
            id: '2', nomPiece: 'Cuisine', ordre: 1,
            positionX: 5, positionY: 1.6, positionZ: 0,
            rotationX: 0, rotationY: -Math.PI / 4, rotationZ: 0,
            hotspots: [
                { id: 'h3', libelle: 'Équipements', contenu: 'Cuisine équipée — Électroménager inclus', positionX: 5, positionY: 1.2, positionZ: -2 }
            ]
        },
        {
            id: '3', nomPiece: 'Chambre principale', ordre: 2,
            positionX: -4, positionY: 1.6, positionZ: 3,
            rotationX: 0, rotationY: Math.PI / 6, rotationZ: 0,
            hotspots: [
                { id: 'h4', libelle: 'Surface', contenu: '22 m² — Dressing intégré', positionX: -4, positionY: 1.2, positionZ: 1 }
            ]
        }
    ];

    initialiserViewer(null);
}

function initialiserViewer(modele3DUrl) {
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

function creerSceneDemo() {
    // Sol
    const sol = BABYLON.MeshBuilder.CreateBox('sol', { width: 20, height: 0.1, depth: 15 }, scene);
    sol.position.y = -0.05;
    const matSol = new BABYLON.StandardMaterial('matSol', scene);
    matSol.diffuseColor = new BABYLON.Color3(0.85, 0.82, 0.78);
    sol.material = matSol;

    // Murs
    const matMur = new BABYLON.StandardMaterial('matMur', scene);
    matMur.diffuseColor = new BABYLON.Color3(0.95, 0.94, 0.92);

    [
        { w: 20, h: 3, d: 0.2, x: 0, y: 1.5, z: -7.4 },
        { w: 20, h: 3, d: 0.2, x: 0, y: 1.5, z: 7.4 },
        { w: 0.2, h: 3, d: 15, x: -9.9, y: 1.5, z: 0 },
        { w: 0.2, h: 3, d: 15, x: 9.9, y: 1.5, z: 0 },
    ].forEach((m, i) => {
        const mur = BABYLON.MeshBuilder.CreateBox(`mur${i}`, { width: m.w, height: m.h, depth: m.d }, scene);
        mur.position = new BABYLON.Vector3(m.x, m.y, m.z);
        mur.material = matMur;
    });

    // Hotspots visuels
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
