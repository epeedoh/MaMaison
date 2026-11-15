// MaMaison — Viewer Teia-style
// UniversalCamera (marche libre ZQSD/WASD + souris, pointer lock) + click-to-teleport + floor spots

const API_BASE = '/api';
const EYE_HEIGHT = 1.65; // hauteur d'œil d'un adulte debout
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
        beta:    1.45,    // hauteur d'œil, sous le plafond
        radius:  5.5,
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
        beta:    1.45,
        radius:  4.5,
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
        beta:    1.45,
        radius:  4.5,
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
    // Plafonne la résolution réelle sur écrans haute densité (mobile) — évite de
    // rendre à 3x la résolution physique pour un gain visuel imperceptible.
    engine.setHardwareScalingLevel(1 / Math.min(window.devicePixelRatio || 1, 1.5));
    scene  = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.82, 0.90, 0.97, 1);

    // ── Environnement HDRI — éclairage ambiant + reflets PBR réalistes ──
    // (CDN officiel Babylon.js, studio neutre — pas de skybox visible, juste
    // les reflets/la lumière ambiante qu'il apporte aux matériaux PBR)
    scene.environmentTexture = BABYLON.CubeTexture.CreateFromPrefilteredData(
        'https://assets.babylonjs.com/environments/studio.env', scene);
    scene.environmentIntensity = 0.7;

    // ── Collisions — empêche physiquement la caméra de traverser murs/sol/plafond ──
    scene.collisionsEnabled = true;
    scene.gravity = new BABYLON.Vector3(0, 0, 0); // pas de gravité, hauteur d'œil fixe

    // ── UniversalCamera — marche libre façon FPS ─────────────────
    const vp0 = VIEWPOINTS[0];
    camera = new BABYLON.UniversalCamera('cam',
        new BABYLON.Vector3(vp0.spot.x, EYE_HEIGHT, vp0.spot.z), scene);
    camera.setTarget(vp0.target.clone());

    // On désactive le déplacement clavier natif de Babylon : il avance dans l'axe
    // exact du regard (donc plonge dans le sol/plafond si on regarde en haut/bas).
    // On gère ZQSD/WASD nous-mêmes, à plat, pour un déplacement horizontal pur.
    camera.inputs.removeByType('FreeCameraKeyboardMoveInput');
    camera.angularSensibility = 3200; // regard souris — plus haut = plus doux

    // Pas de collision moteur Babylon ici : sur cette scène, le système de
    // collision mesh-vs-ellipsoïde de Babylon peut dégénérer (cas constatés en
    // test : plusieurs secondes, voire un gel complet, après ~1s de marche
    // soutenue contre un mur). On reste donc dans la maison via un simple
    // cadrage de la position (cf. limiterDansLaMaison), déterministe et rapide.
    camera.checkCollisions = false;
    camera.applyGravity    = false;
    camera.minZ = 0.05;

    camera.attachControl(canvas, true);
    activerDeplacementHorizontal(canvas);

    // Empêche de regarder pile à la verticale (singularité mathématique qui
    // peut faire dégénérer le calcul de déplacement, voir activerDeplacementHorizontal)
    const LIMITE_PITCH = 1.3; // ~74°, suffisant pour regarder le plafond/sol sans excès
    scene.onBeforeRenderObservable.add(() => {
        if (camera.rotation.x >  LIMITE_PITCH) camera.rotation.x =  LIMITE_PITCH;
        if (camera.rotation.x < -LIMITE_PITCH) camera.rotation.x = -LIMITE_PITCH;
    });

    // ── Pointer lock — regard souris façon jeu vidéo ─────────────
    activerPointerLock(canvas);

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
    sg.useBlurExponentialShadowMap = true; // ombres douces (vs. bords durs/numériques)
    sg.blurKernel = 16;
    sg.bias = 0.002;

    // ── Environnement HDRI — reflets et éclairage ambiant réalistes sur les
    // matériaux PBR (inox, laiton, verre…), hébergé gratuitement par Babylon.js.
    scene.environmentTexture = BABYLON.CubeTexture.CreateFromPrefilteredData(
        'https://assets.babylonjs.com/environments/environmentSpecular.env', scene);
    scene.environmentIntensity = 0.7; // discret : on ne veut pas un studio photo, juste de la nuance

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

    // ── Occlusion ambiante — ombres de contact (coins, sous les meubles) qui
    // donnent du volume ; l'un des gains de réalisme les moins chers en perf.
    if (BABYLON.SSAO2RenderingPipeline.IsSupported) {
        const ssao = new BABYLON.SSAO2RenderingPipeline('ssao', scene, {
            ssaoRatio: 0.5, blurRatio: 0.5
        }, [camera]);
        ssao.radius = 1.2;
        ssao.totalStrength = 0.9;
        ssao.base = 0.2;
        ssao.expensiveBlur = false;
    }

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
   POINTER LOCK — regard souris façon FPS, sans glisser-déposer
   ================================================================ */
function activerPointerLock(canvas) {
    canvas.addEventListener('click', () => {
        if (document.pointerLockElement !== canvas) canvas.requestPointerLock?.();
    });

    document.addEventListener('pointerlockchange', () => {
        const verrouille = document.pointerLockElement === canvas;
        document.getElementById('crosshair')?.classList.toggle('hidden', !verrouille);
        document.getElementById('move-hint')?.classList.toggle('hidden', verrouille);
        canvas.style.cursor = verrouille ? 'none' : 'grab';
    });
}

/* ================================================================
   DÉPLACEMENT — ZQSD/WASD à plat (toujours horizontal, jamais incliné
   par le regard), comme dans un FPS classique. La hauteur d'œil ne
   change donc jamais : impossible de "tomber" dans le sol ou le toit.
   ================================================================ */
function activerDeplacementHorizontal(canvas) {
    const touches = new Set();
    // e.code = position PHYSIQUE de la touche, indépendante du clavier :
    // "KeyW" se déclenche aussi bien en appuyant sur le W d'un QWERTY que sur
    // le Z (même position) d'un AZERTY — donc ZQSD fonctionne sans code séparé.
    const AVANCER = ['KeyW','ArrowUp'], RECULER = ['KeyS','ArrowDown'],
          GAUCHE  = ['KeyA','ArrowLeft'], DROITE  = ['KeyD','ArrowRight'];

    window.addEventListener('keydown', e => touches.add(e.code));
    window.addEventListener('keyup',   e => touches.delete(e.code));
    // Évite de garder une touche "collée" si la fenêtre perd le focus
    window.addEventListener('blur', () => touches.clear());

    const VITESSE = 3.2; // m/s

    scene.onBeforeRenderObservable.add(() => {
        if (!touches.size) return;
        // dt borné : un onglet remis au premier plan peut renvoyer un delta énorme
        const dt = Math.min(engine.getDeltaTime() / 1000, 0.1);

        // Direction de la caméra projetée sur le plan horizontal (on ignore le pitch).
        const avantBrut = camera.getDirection(BABYLON.Axis.Z);
        avantBrut.y = 0;
        if (avantBrut.lengthSquared() < 1e-6) return;
        const avant  = avantBrut.normalize();
        const droite = BABYLON.Vector3.Cross(BABYLON.Axis.Y, avant).normalize();

        const dep = BABYLON.Vector3.Zero();
        if (AVANCER.some(k => touches.has(k)))  dep.addInPlace(avant);
        if (RECULER.some(k => touches.has(k)))  dep.subtractInPlace(avant);
        if (DROITE.some(k => touches.has(k)))   dep.addInPlace(droite);
        if (GAUCHE.some(k => touches.has(k)))   dep.subtractInPlace(droite);

        if (dep.lengthSquared() > 0 && Number.isFinite(dep.lengthSquared())) {
            dep.normalize().scaleInPlace(VITESSE * dt);
            // Déplacement direct (pas de moteur de collision Babylon, voir plus
            // haut) — on reste dans la maison via un simple cadrage de zone.
            camera.position.addInPlace(dep);
            limiterDansLaMaison(camera.position);
        }
    });
}

/* ================================================================
   LIMITES DE LA MAISON — empêche de sortir du plan (maison en "L" :
   salon à l'est, aile cuisine/chambre à l'ouest). Volontairement
   simple et déterministe : pas de moteur de collision, donc pas de
   risque de cas dégénéré/gel.
   ================================================================ */
function limiterDansLaMaison(pos) {
    const SALON = { xMin: -6.8, xMax: 6.8, zMin: -2.9, zMax: 6.9 };
    const AILE  = { xMin: -11.8, xMax: -3.1, zMin: -7.9, zMax: 7.9 };

    const dansSalon = pos.x >= SALON.xMin && pos.x <= SALON.xMax && pos.z >= SALON.zMin && pos.z <= SALON.zMax;
    const dansAile  = pos.x >= AILE.xMin  && pos.x <= AILE.xMax  && pos.z >= AILE.zMin  && pos.z <= AILE.zMax;
    if (dansSalon || dansAile) return; // déjà dans une zone valide

    // Hors des deux zones : on referme sur la plus proche (ramène doucement
    // vers l'intérieur plutôt que de bloquer net, pour rester fluide).
    const zone = Math.abs(pos.x - (-3.1)) < Math.abs(pos.x - 6.8) ? AILE : SALON;
    pos.x = Math.min(Math.max(pos.x, zone.xMin), zone.xMax);
    pos.z = Math.min(Math.max(pos.z, zone.zMin), zone.zMax);
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
        // Badge "i" plat et discret (au lieu d'une sphère jaune façon ampoule)
        const sp = BABYLON.MeshBuilder.CreatePlane(`hs_${i}`, { size: 0.26 }, scene);
        sp.position.set(h.x, 1.2, h.z);
        sp.isPickable = true;

        const dt = new BABYLON.DynamicTexture(`hsTex_${i}`, { width: 128, height: 128 }, scene);
        const ctx = dt.getContext();
        ctx.clearRect(0, 0, 128, 128);
        ctx.beginPath(); ctx.arc(64, 64, 58, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(5,13,26,.82)'; ctx.fill();
        ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.stroke();
        ctx.fillStyle = '#F5D98A';
        ctx.font = 'bold 60px Georgia, serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('i', 64, 68);
        dt.hasAlpha = true; dt.update();

        const m = new BABYLON.StandardMaterial(`hmat_${i}`, scene);
        m.diffuseTexture  = dt;
        m.emissiveColor   = BABYLON.Color3.White();
        m.opacityTexture  = dt;
        m.backFaceCulling = false;
        m.disableLighting = true;
        sp.material = m;

        let tt = i * 0.9;
        scene.registerBeforeRender(() => {
            tt += 0.03;
            sp.position.y = 1.2 + 0.05 * Math.sin(tt);
            // billboardMode rendait parfois le badge ovale selon l'angle —
            // on force un face-à-caméra explicite, garanti circulaire.
            sp.lookAt(camera.position);
        });
        sp.actionManager = new BABYLON.ActionManager(scene);
        sp.actionManager.registerAction(
            new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger,
                () => afficherInfo(h.libelle, h.contenu)));
    });
}

/* ================================================================
   TÉLÉPORTATION — déplace le joueur (style "point de spawn" jeu vidéo)
   ================================================================ */
function teleporterVers(index, anime = true) {
    if (index < 0 || index >= VIEWPOINTS.length) return;
    viewpointActif = index;

    const vp = VIEWPOINTS[index];
    const destination = new BABYLON.Vector3(vp.spot.x, EYE_HEIGHT, vp.spot.z);
    fermerInfo();

    if (!anime) {
        camera.position.copyFrom(destination);
        camera.setTarget(vp.target.clone());
        creerHotspots(vp);
        mettreAJourSelector(index);
        return;
    }

    // Fondu rapide façon "écran de chargement" entre deux points de spawn
    afficherLoading(true);
    setTimeout(() => {
        const ease = new BABYLON.CubicEase();
        ease.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT);

        const animPos = new BABYLON.Animation('aPos', 'position', 60,
            BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
        animPos.setEasingFunction(ease);
        animPos.setKeys([
            { frame: 0,  value: camera.position.clone() },
            { frame: 30, value: destination }
        ]);

        camera.animations = [animPos];
        scene.beginAnimation(camera, 0, 30, false, 1, () => {
            camera.setTarget(vp.target.clone());
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

// Bump procédural très léger pour mur peint — du bruit doux, pas de motif
// visible, juste assez pour que la lumière n'accroche pas un plat parfait.
function texPlatre() {
    const dt = new BABYLON.DynamicTexture('tPlatre', { width: 256, height: 256 }, scene);
    const ctx = dt.getContext();
    ctx.fillStyle = '#8080ff'; // bleu neutre = "pas de relief" en normal map
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 3000; i++) {
        const x = Math.random() * 256, y = Math.random() * 256;
        const v = 118 + Math.random() * 20; // léger bruit autour du neutre
        ctx.fillStyle = `rgb(${v},${v},255)`;
        ctx.fillRect(x, y, 1.4, 1.4);
    }
    dt.update();
    dt.uScale = dt.vScale = 6;
    return dt;
}

// Bump procédural en trame croisée pour tissu (canapé, coussins, literie) —
// un quadrillage fin qui suggère un tissage sans être un motif visible.
function texTissu(tuilage = 10) {
    const dt = new BABYLON.DynamicTexture('tTissu' + tuilage, { width: 128, height: 128 }, scene);
    const ctx = dt.getContext();
    ctx.fillStyle = '#8080ff';
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = 'rgba(96,96,255,.5)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 128; i += 4) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 128); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(128, i); ctx.stroke();
    }
    dt.update();
    dt.uScale = dt.vScale = tuilage;
    return dt;
}

/* ================================================================
   MEUBLES RÉELS — modèles CC0 (Poly Haven, libres de droits), téléchargés
   une fois et hébergés dans assets/meubles/ plutôt que résolus en direct
   depuis Poly Haven à chaque visite (lenteur/indisponibilité du service
   tiers évitée, pas de dépendance réseau externe en production).
   Échelle/centrage automatiques pour ne pas dépendre des unités exactes
   du modèle source.
   ================================================================ */
async function chargerMeuble(slug, fichierGltf, x, z, rotY, largeurCible, sg) {
    try {
        const rootUrl = `assets/meubles/${slug}/`;
        const resultat = await BABYLON.SceneLoader.ImportMeshAsync('', rootUrl, fichierGltf, scene);
        const racine = new BABYLON.TransformNode('grp_' + slug, scene);
        resultat.meshes.forEach(m => {
            if (!m.parent) m.parent = racine;
            m.receiveShadows = true;
            if (sg) sg.addShadowCaster(m, true);
        });

        racine.computeWorldMatrix(true);
        const b1 = racine.getHierarchyBoundingVectors();
        const taille = b1.max.subtract(b1.min);
        const echelle = largeurCible / Math.max(taille.x, taille.z, 0.01);
        racine.scaling.setAll(echelle);

        racine.computeWorldMatrix(true);
        const b2 = racine.getHierarchyBoundingVectors();
        racine.position.x += x - (b2.min.x + b2.max.x) / 2;
        racine.position.z += z - (b2.min.z + b2.max.z) / 2;
        racine.position.y += -b2.min.y;
        racine.rotation.y = rotY;
        return racine;
    } catch (e) {
        console.warn('Échec du chargement du meuble', slug, e);
        return null;
    }
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

    // Vraies textures photo (CDN gratuits — Babylon.js et three.js examples,
    // tous deux CORS-ouverts) plutôt que les textures dessinées au canvas.
    const texBoisAlbedo = () => { const t = new BABYLON.Texture('https://threejs.org/examples/textures/hardwood2_diffuse.jpg', scene); t.uScale = 3; t.vScale = 3; return t; };
    mParquet.albedoTexture = texBoisAlbedo();
    mParqCh.albedoTexture  = texBoisAlbedo();
    // Légère teinte pour rester proche du parquet chêne visé (la photo est assez neutre)
    mParquet.albedoColor = BABYLON.Color3.FromHexString('#E8DCC8');
    mParqCh.albedoColor  = BABYLON.Color3.FromHexString('#D8C8AC');

    // Carrelage damier — bien plus crédible en cuisine que le pavé extérieur
    // ("floor.png" de Babylon) utilisé dans une première tentative.
    mCarrelage.albedoTexture = new BABYLON.Texture('https://threejs.org/examples/textures/floors/FloorsCheckerboard_S_Diffuse.jpg', scene);
    mCarrelage.albedoTexture.uScale = mCarrelage.albedoTexture.vScale = 4;
    mCarrelage.albedoColor = BABYLON.Color3.FromHexString('#FFFFFF');

    // Murs — pas de texture photo fiable trouvée pour du plâtre/peinture (les
    // candidats disponibles en hotlink sont de la brique/pierre, pas adaptés).
    // On génère un bump procédural très subtil : un mur peint reste uni à
    // l'œil, mais accroche légèrement la lumière au lieu d'être plat-numérique.
    const bumpPlatre = texPlatre();
    bumpPlatre.level = 0.35; // reste subtil, pas un mur "bosselé"
    mMur.bumpTexture    = bumpPlatre;
    mMurAcc.bumpTexture = bumpPlatre;

    // Tissus (canapé, coussins, literie) — même principe : un tissage discret
    // plutôt qu'une couleur plate numérique.
    const bumpTissu = texTissu(10);
    bumpTissu.level = 0.4;
    mCanape.bumpTexture  = bumpTissu;
    mCoussin.bumpTexture = bumpTissu;

    // Bois foncé (table basse, table de nuit) — même photo que le parquet,
    // tuilage réduit à 1 (un seul pan de grain) pour éviter la distorsion
    // visible sur de petits objets quand le motif se répète trop.
    const texBoisFonce = new BABYLON.Texture('https://threejs.org/examples/textures/hardwood2_diffuse.jpg', scene);
    texBoisFonce.uScale = texBoisFonce.vScale = 1;
    mNoyer.albedoTexture   = texBoisFonce;
    mNoyer.albedoColor     = BABYLON.Color3.FromHexString('#3A2010');
    mTeteLit.albedoTexture = texBoisFonce;
    mTeteLit.albedoColor   = BABYLON.Color3.FromHexString('#4A2A14');
    mLin.bumpTexture     = bumpTissu;

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
    [['plS',14,10,0,2],['plC',7,7,-8.5,-4.5],['plCh',7,8,-8.5,4],['plCo',2.5,8,-4.25,-0.5]].forEach(([n,w,d,x,z])=>{
        const plaf = b(n,w,0.1,d,x,H+0.05,z,mPlafond);
        plaf.checkCollisions = true;
    });

    // MURS EXTÉRIEURS — collidables pour empêcher la caméra de les traverser
    const mw = (n,w,h,d,x,y,z,m) => { const mesh=b(n,w,h,d,x,y,z,m); mesh.receiveShadows=true; mesh.checkCollisions=true; return mesh; };
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

    // Canapé — vrai modèle CC0 (Poly Haven, hébergé localement)
    chargerMeuble('sofa_02', 'sofa_02_1k.gltf', 0.5, 3.7, Math.PI, 2.0, sg);

    // Fauteuil — vrai modèle CC0
    chargerMeuble('mid_century_lounge_chair', 'mid_century_lounge_chair_1k.gltf', 3.2, 3.3, -Math.PI / 2, 0.95, sg);

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
    // Écran avec un dégradé d'ambiance plutôt qu'un bleu plat — suggère un
    // écran allumé (veille/économiseur) sans avoir à charger une vraie image.
    const dtEcran = new BABYLON.DynamicTexture('tEcran', { width: 256, height: 144 }, scene);
    const ctxEcran = dtEcran.getContext();
    const grad = ctxEcran.createLinearGradient(0, 0, 256, 144);
    grad.addColorStop(0, '#0D1B3A'); grad.addColorStop(0.55, '#142A52'); grad.addColorStop(1, '#0A1428');
    ctxEcran.fillStyle = grad; ctxEcran.fillRect(0, 0, 256, 144);
    dtEcran.update();
    const eLed = mat('elum', '#1A2A4A', 0.15);
    eLed.albedoTexture  = dtEcran;
    eLed.emissiveTexture = dtEcran;
    eLed.emissiveColor  = new BABYLON.Color3(0.4, 0.4, 0.4);
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
    // Lit — vrai modèle CC0 (seul lit disponible en CC0 chez Poly Haven est
    // un style gothique/ancien ; détail à ajuster plus tard si le style ne
    // convient pas, mais nettement mieux qu'une boîte plate).
    chargerMeuble('GothicBed_01', 'GothicBed_01_1k.gltf', -8.5, 4, Math.PI / 2, 2.0, sg);
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

    // ── Perf : aucun matériau du décor ne change après construction ──
    // freeze() évite à Babylon de revérifier/recompiler leurs bindings à chaque frame.
    Object.values(MAT).forEach(m => m.freeze());
}
