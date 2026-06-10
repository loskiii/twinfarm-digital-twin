
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';


let currentUser = null;
let scene, camera, renderer, labelRenderer, controls;
let fields = [];
let fieldMeshes = [];
let corianderPlants = [];
let currentCropHealth = [0.85, 0.65, 0.92, 0.48, 0.78, 0.72];
let growthChart = null;
let weatherChart = null;
let currentGrowthDays = 45;
let animationId = null;
let sunLight;
let farmMap = null;
let mapFieldMarkers = [];
let liveDataInterval = null;
let usingLiveApi = false;
let mlLiveInterval = null;
let liveDataFallbackTimer = null;
let liveDataResolved = false;
let farmSceneReady = false;

const AUTH_TOKEN_KEY = 'twinfarm_auth_token';
const WEATHER_API_URL = 'https://api.open-meteo.com/v1/forecast?latitude=-1.2921&longitude=36.8219&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=Africa%2FNairobi&forecast_days=3';
const JKUAT_LAT = -1.0914;
const JKUAT_LNG = 37.0101;

// Field data with realistic positions
const fieldData = [
    { name: "North Field", x: -12, z: -8, width: 8, height: 6, color: 0x4CAF50, health: 0.85, area: 8.5, moisture: 72 },
    { name: "East Field", x: 2, z: -8, width: 8, height: 6, color: 0xFF9800, health: 0.65, area: 10.2, moisture: 58 },
    { name: "South Field", x: 16, z: -8, width: 8, height: 6, color: 0x4CAF50, health: 0.92, area: 7.5, moisture: 78 },
    { name: "West Field", x: -12, z: 4, width: 8, height: 6, color: 0xF44336, health: 0.48, area: 6.8, moisture: 35 },
    { name: "Central Field", x: 2, z: 4, width: 8, height: 6, color: 0x8BC34A, health: 0.78, area: 12.0, moisture: 65 },
    { name: "Irrigation Field", x: 16, z: 4, width: 8, height: 6, color: 0x8BC34A, health: 0.72, area: 9.2, moisture: 62 }
];

// ==================== MOBILE MENU TOGGLE ====================
function setMobileMenuOpen(open) {
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const navLinks = document.getElementById('nav-links');
    const navbar = document.querySelector('.navbar');
    if (!mobileBtn || !navLinks || !navbar) return;

    navbar.classList.toggle('menu-open', open);
    document.body.classList.toggle('menu-open', open);
    mobileBtn.setAttribute('aria-expanded', open ? 'true' : 'false');

    const icon = mobileBtn.querySelector('i');
    if (icon) {
        icon.classList.toggle('fa-bars', !open);
        icon.classList.toggle('fa-times', open);
    }
}

function initializeMobileMenu() {
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const navLinks = document.getElementById('nav-links');
    const navbar = document.querySelector('.navbar');

    if (mobileBtn && navLinks && navbar) {
        mobileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            setMobileMenuOpen(!navbar.classList.contains('menu-open'));
        });

        document.addEventListener('click', (e) => {
            if (!navbar.contains(e.target)) {
                setMobileMenuOpen(false);
            }
        });

        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => setMobileMenuOpen(false));
        });

        document.querySelectorAll('#auth-buttons .btn').forEach(btn => {
            btn.addEventListener('click', () => setMobileMenuOpen(false));
        });

        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) setMobileMenuOpen(false);
        });
    }
}

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function() {
    console.log("TwinFarm - Realistic 3D Coriander Digital Twin Platform Initializing...");
    
    initializeNavigation();
    initializeDashboard();
    initializeRealistic3DFarm();
    initializeMaps();
    initializePredictions();
    initializeChatbot();
    initializeAuth();
    restoreAuthSession();
    initializeDemoButton();
    initializeMobileMenu();
    initializeMlLiveValues();

    console.log("TwinFarm Platform Ready!");
});

// ==================== REALISTIC 3D FARM ====================
function initializeRealistic3DFarm() {
    const container = document.getElementById('farm-3d-container');
    if (!container) return;
    
    // Create Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 50, 150);
    
    // Camera
    camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(25, 20, 30);
    camera.lookAt(0, 0, 0);
    
    // Renderers
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);
    
    // CSS2 Renderer for labels
    labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(container.clientWidth, container.clientHeight);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0';
    labelRenderer.domElement.style.left = '0';
    labelRenderer.domElement.style.width = '100%';
    labelRenderer.domElement.style.height = '100%';
    labelRenderer.domElement.style.pointerEvents = 'none';
    labelRenderer.domElement.style.zIndex = '2';
    container.appendChild(labelRenderer.domElement);
    
    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 1.0;
    controls.zoomSpeed = 1.2;
    controls.panSpeed = 0.8;
    controls.maxPolarAngle = Math.PI / 2.2;
    controls.touchRotate = true;
    controls.touchZoom = true;
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
    scene.add(ambientLight);
    
    sunLight = new THREE.DirectionalLight(0xfff5e6, 1.2);
    sunLight.position.set(30, 40, 20);
    sunLight.castShadow = true;
    sunLight.receiveShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 60;
    sunLight.shadow.camera.left = -15;
    sunLight.shadow.camera.right = 15;
    sunLight.shadow.camera.top = 15;
    sunLight.shadow.camera.bottom = -15;
    scene.add(sunLight);
    
    const fillLight = new THREE.PointLight(0x4466cc, 0.3);
    fillLight.position.set(-10, 20, 10);
    scene.add(fillLight);
    
    const rimLight = new THREE.PointLight(0xffaa66, 0.4);
    rimLight.position.set(0, 15, -15);
    scene.add(rimLight);
    
    // Ground Plane
    const groundGeometry = new THREE.CircleGeometry(35, 32);
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x5a8c5a, roughness: 0.8, metalness: 0.1 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.2;
    ground.receiveShadow = true;
    scene.add(ground);
    
    // Grass patches
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x6a9c6a });
    for (let i = 0; i < 800; i++) {
        const blade = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.1 + Math.random() * 0.2, 3), grassMat);
        const angle = Math.random() * Math.PI * 2;
        const radius = 20 + Math.random() * 15;
        blade.position.x = Math.cos(angle) * radius;
        blade.position.z = Math.sin(angle) * radius;
        blade.position.y = -0.15;
        blade.castShadow = true;
        scene.add(blade);
    }
    
    // Terrain elevation
    const terrainGroup = new THREE.Group();
    for (let i = 0; i < 60; i++) {
        const hillGeo = new THREE.CylinderGeometry(1.5, 2.5, 0.4, 8);
        const hillMat = new THREE.MeshStandardMaterial({ color: 0x6a8c5a, roughness: 0.9 });
        const hill = new THREE.Mesh(hillGeo, hillMat);
        const angle = Math.random() * Math.PI * 2;
        const radius = 28 + Math.random() * 8;
        hill.position.x = Math.cos(angle) * radius;
        hill.position.z = Math.sin(angle) * radius;
        hill.position.y = -0.3;
        hill.castShadow = true;
        hill.receiveShadow = true;
        terrainGroup.add(hill);
    }
    scene.add(terrainGroup);
    
    // Create Trees
    function createTree(x, z) {
        const treeGroup = new THREE.Group();
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8B5A2B, roughness: 0.7 });
        const foliageMat = new THREE.MeshStandardMaterial({ color: 0x4CAF50, roughness: 0.4 });
        
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 1.2, 6), trunkMat);
        trunk.position.y = 0.6;
        trunk.castShadow = true;
        treeGroup.add(trunk);
        
        const foliage1 = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1, 8), foliageMat);
        foliage1.position.y = 1.2;
        foliage1.castShadow = true;
        treeGroup.add(foliage1);
        
        const foliage2 = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.9, 8), foliageMat);
        foliage2.position.y = 1.9;
        foliage2.castShadow = true;
        treeGroup.add(foliage2);
        
        treeGroup.position.set(x, -0.2, z);
        scene.add(treeGroup);
    }
    
    const treePositions = [
        [-22, -18], [-24, -12], [-23, -5], [-22, 2], [-21, 10], [-20, 18],
        [22, -18], [23, -12], [24, -5], [23, 2], [22, 10], [21, 18],
        [-15, -23], [-7, -24], [0, -25], [8, -24], [15, -23],
        [-15, 22], [-7, 23], [0, 24], [8, 23], [15, 22]
    ];
    treePositions.forEach(pos => createTree(pos[0], pos[1]));
    
    // Create fields
    fieldData.forEach((field, idx) => {
        const soilMat = new THREE.MeshStandardMaterial({ color: 0x8B5A2B, roughness: 0.9 });
        const fieldBase = new THREE.Mesh(new THREE.BoxGeometry(field.width, 0.2, field.height), soilMat);
        fieldBase.position.set(field.x, -0.1, field.z);
        fieldBase.receiveShadow = true;
        fieldBase.userData = { type: 'field', index: idx, name: field.name, health: field.health };
        scene.add(fieldBase);
        fieldMeshes.push(fieldBase);
        
        const woodMat = new THREE.MeshStandardMaterial({ color: 0xCDA87A });
        const borderHeight = 0.15;
        const borderDepth = 0.1;
        
        const borders = [
            { pos: [field.x, 0, field.z - field.height/2], size: [field.width, borderHeight, borderDepth] },
            { pos: [field.x, 0, field.z + field.height/2], size: [field.width, borderHeight, borderDepth] },
            { pos: [field.x - field.width/2, 0, field.z], size: [borderDepth, borderHeight, field.height] },
            { pos: [field.x + field.width/2, 0, field.z], size: [borderDepth, borderHeight, field.height] }
        ];
        
        borders.forEach(b => {
            const border = new THREE.Mesh(new THREE.BoxGeometry(b.size[0], b.size[1], b.size[2]), woodMat);
            border.position.set(b.pos[0], b.pos[1], b.pos[2]);
            border.castShadow = true;
            scene.add(border);
        });
        
        const plantCount = Math.floor(60 + field.health * 80);
        const plantGroup = new THREE.Group();
        
        for (let i = 0; i < plantCount; i++) {
            const px = field.x + (Math.random() - 0.5) * (field.width - 1.2);
            const pz = field.z + (Math.random() - 0.5) * (field.height - 1.2);
            const plant = createCorianderPlant(field.health * (0.7 + Math.random() * 0.6));
            plant.position.set(px, 0, pz);
            plant.castShadow = true;
            plant.userData = { fieldIdx: idx, fieldName: field.name };
            plantGroup.add(plant);
            corianderPlants.push(plant);
        }
        scene.add(plantGroup);
        
        const div = document.createElement('div');
        div.textContent = `${field.name}\n${(field.health * 100).toFixed(0)}% Health`;
        div.style.color = 'white';
        div.style.fontSize = '14px';
        div.style.fontWeight = 'bold';
        div.style.textShadow = '1px 1px 0px black';
        div.style.backgroundColor = 'rgba(0,0,0,0.6)';
        div.style.padding = '4px 12px';
        div.style.borderRadius = '20px';
        div.style.borderLeft = `4px solid ${field.health > 0.7 ? '#4CAF50' : field.health > 0.4 ? '#FF9800' : '#F44336'}`;
        const label = new CSS2DObject(div);
        label.position.set(field.x, 1.2, field.z);
        scene.add(label);
        
        fields.push({ ...field, mesh: fieldBase, plants: plantGroup, label });
    });
    
    // Farm house
    const houseGroup = new THREE.Group();
    const houseBase = new THREE.Mesh(new THREE.BoxGeometry(3, 2, 3), new THREE.MeshStandardMaterial({ color: 0xE8DDCB }));
    houseBase.position.y = 1;
    houseBase.castShadow = true;
    houseGroup.add(houseBase);
    
    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.2, 1.2, 4), new THREE.MeshStandardMaterial({ color: 0xB85C1A }));
    roof.position.y = 2.1;
    roof.castShadow = true;
    houseGroup.add(roof);
    
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.2, 0.1), new THREE.MeshStandardMaterial({ color: 0x8B4513 }));
    door.position.set(0, 0.6, 1.51);
    door.castShadow = true;
    houseGroup.add(door);
    
    houseGroup.position.set(-18, -0.2, -12);
    scene.add(houseGroup);
    
    // Water tower
    const towerGroup = new THREE.Group();
    const towerPole = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 3, 8), new THREE.MeshStandardMaterial({ color: 0xAA8C6E }));
    towerPole.position.y = 1.5;
    towerPole.castShadow = true;
    towerGroup.add(towerPole);
    
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 1, 12), new THREE.MeshStandardMaterial({ color: 0x5D9B9B }));
    tank.position.y = 3.2;
    tank.castShadow = true;
    towerGroup.add(tank);
    
    towerGroup.position.set(20, -0.2, -15);
    scene.add(towerGroup);
    
    // Clouds
    const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xccccaa });
    const cloudPositions = [[-15, 15, -10], [0, 16, -5], [12, 15, -12], [-5, 14, 5], [8, 13, 8]];
    cloudPositions.forEach(pos => {
        const cloudGroup = new THREE.Group();
        cloudGroup.add(new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 8), cloudMat));
        cloudGroup.add(new THREE.Mesh(new THREE.SphereGeometry(1, 8, 8), cloudMat).translateX(1));
        cloudGroup.add(new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 8), cloudMat).translateX(-0.8));
        cloudGroup.add(new THREE.Mesh(new THREE.SphereGeometry(0.8, 8, 8), cloudMat).translateY(-0.5).translateX(0.5));
        cloudGroup.position.set(pos[0], pos[1], pos[2]);
        scene.add(cloudGroup);
    });
    
    function hideFarmLoading() {
        const loadingEl = document.getElementById('farm-3d-loading');
        if (loadingEl) loadingEl.classList.add('hidden');
    }

    // Animation
    function animate() {
        requestAnimationFrame(animate);
        controls.update();

        const time = Date.now() * 0.0005;
        scene.children.forEach(child => {
            if (child.isGroup && child.children.length === 4 && child.children[0] instanceof THREE.Mesh && child.children[0].geometry.type === 'SphereGeometry') {
                child.position.x += Math.sin(time) * 0.001;
            }
        });

        renderer.render(scene, camera);
        labelRenderer.render(scene, camera);

        if (!farmSceneReady) {
            farmSceneReady = true;
            hideFarmLoading();
        }
    }
    animate();
    
    // Raycaster for field selection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    
    function selectFieldAtClient(clientX, clientY) {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(fieldMeshes);

        if (intersects.length > 0) {
            const fieldIdx = intersects[0].object.userData.index;
            if (fieldIdx !== undefined) {
                showFieldInfo(fieldData[fieldIdx], fieldIdx);
            }
        }
    }

    renderer.domElement.addEventListener('click', (event) => {
        selectFieldAtClient(event.clientX, event.clientY);
    });

    renderer.domElement.addEventListener('touchend', (event) => {
        if (event.changedTouches.length === 1) {
            const touch = event.changedTouches[0];
            selectFieldAtClient(touch.clientX, touch.clientY);
        }
    }, { passive: true });

    function resizeFarmViewport() {
        const width = container.clientWidth;
        const height = container.clientHeight;
        if (!width || !height) return;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
        labelRenderer.setSize(width, height);
    }

    window.addEventListener('resize', resizeFarmViewport);
    if (typeof ResizeObserver !== 'undefined') {
        const farmResizeObserver = new ResizeObserver(resizeFarmViewport);
        farmResizeObserver.observe(container);
    }

    requestAnimationFrame(() => {
        resizeFarmViewport();
        setTimeout(hideFarmLoading, 1200);
    });

    // Control buttons
    document.getElementById('reset-camera-btn')?.addEventListener('click', () => {
        camera.position.set(25, 20, 30);
        controls.target.set(0, 0, 0);
        controls.update();
    });
    
    let shadowsEnabled = true;
    document.getElementById('toggle-shadows-btn')?.addEventListener('click', () => {
        shadowsEnabled = !shadowsEnabled;
        renderer.shadowMap.enabled = shadowsEnabled;
        const btn = document.getElementById('toggle-shadows-btn');
        if (btn) btn.style.opacity = shadowsEnabled ? '1' : '0.5';
    });
    
    let wireframeMode = false;
    document.getElementById('toggle-wireframe-btn')?.addEventListener('click', () => {
        wireframeMode = !wireframeMode;
        fieldMeshes.forEach(mesh => mesh.material.wireframe = wireframeMode);
    });
}

function createCorianderPlant(health) {
    const group = new THREE.Group();
    const stemHeight = 0.3 + health * 0.4;
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x5C9C3C });
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, stemHeight, 5), stemMat);
    stem.position.y = stemHeight / 2;
    group.add(stem);
    
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x4CAF50 });
    const leafCount = 4 + Math.floor(health * 6);
    for (let i = 0; i < leafCount; i++) {
        const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.25, 4), leafMat);
        leaf.position.y = stemHeight - 0.05;
        leaf.rotation.z = (i / leafCount) * Math.PI * 2;
        leaf.rotation.x = 0.6;
        group.add(leaf);
    }
    
    if (health > 0.7) {
        const flowerMat = new THREE.MeshStandardMaterial({ color: 0xFFD966 });
        const flower = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6), flowerMat);
        flower.position.y = stemHeight + 0.05;
        group.add(flower);
    }
    
    return group;
}

function showFieldInfo(field, idx) {
    const panel = document.getElementById('field-info-panel');
    if (!panel) return;
    
    document.getElementById('field-name').textContent = field.name;
    document.getElementById('field-crop').textContent = 'Coriander';
    document.getElementById('field-health').textContent = `${Math.round(field.health * 100)}%`;
    document.getElementById('field-area').textContent = `${field.area} acres`;
    document.getElementById('field-moisture').textContent = `${field.moisture}%`;
    document.getElementById('field-yield').textContent = `${(field.predictedYield || (5 + field.health * 4)).toFixed(1)} tons/ha`;
    document.getElementById('field-water').textContent = `${field.waterNeed || Math.round(800 + field.health * 500)} L/day`;
    
    panel.style.display = 'block';
    
    document.getElementById('close-panel-btn').onclick = () => panel.style.display = 'none';
}

function update3DPlantGrowth(growthDays) {
    const growthFactor = Math.min(1, growthDays / 120);
    corianderPlants.forEach((plant, idx) => {
        const fieldIdx = plant.userData.fieldIdx;
        const health = fieldData[fieldIdx]?.health || 0.7;
        const plantScale = 0.5 + growthFactor * 0.8 + (health * 0.3);
        plant.scale.set(plantScale, plantScale, plantScale);
    });
}

function getMlSensorInputs() {
    const ml = window.TwinFarmML;
    if (ml && typeof ml.getDefaultSensors === 'function') {
        return ml.getDefaultSensors();
    }
    return {
        soilMoisture: 75,
        temperature: 23,
        humidity: 65,
        dayNumber: 30
    };
}

function healthBadgeClass(status) {
    if (status === 'Healthy') return 'badge-healthy';
    if (status === 'High Stress') return 'badge-stress';
    return 'badge-moderate';
}

function updateCropHealthBadge(status, confidence) {
    const badge = document.getElementById('crop-health-badge');
    const healthFill = document.getElementById('health-fill');
    const healthStatusEl = document.getElementById('health-status');

    if (badge) {
        badge.textContent = status;
        badge.className = `crop-health-badge ${healthBadgeClass(status)}`;
    }
    if (healthFill) {
        healthFill.style.width = `${Math.round((confidence ?? 0.82) * 100)}%`;
    }
    if (healthStatusEl) {
        healthStatusEl.textContent = `${Math.round((confidence ?? 0.82) * 100)}% confidence · ${healthStatusText(status)}`;
    }
}

function updateBiomassDisplay(biomass, healthConfidence) {
    const biomassG = biomass?.biomass_g ?? 724;
    const pct = biomass?.percentOfOptimal ?? biomass?.percent_optimal ?? 85.2;
    const conf = healthConfidence ?? 0.82;

    const yieldEl = document.getElementById('yield-prediction');
    const yieldUnit = document.getElementById('yield-biomass-unit');
    const yieldBar = document.getElementById('yield-biomass-bar');
    const yieldConf = document.getElementById('yield-confidence');
    const yieldConfText = document.getElementById('yield-confidence-text');
    const fieldYield = document.getElementById('field-yield');

    if (yieldEl) yieldEl.textContent = `${biomassG} g`;
    if (yieldUnit) yieldUnit.textContent = `${pct}% of 850g optimal target`;
    if (yieldBar) yieldBar.style.width = `${pct}%`;
    if (yieldConf) yieldConf.style.width = `${Math.round(conf * 100)}%`;
    if (yieldConfText) yieldConfText.textContent = `${Math.round(conf * 100)}%`;
    if (fieldYield) fieldYield.textContent = `${biomassG} g (${pct}% optimal)`;
}

function growthStageIndex(stage) {
    const map = { seed: 0, germinating: 1, seedling: 2, vegetative: 3 };
    return map[String(stage).toLowerCase()] ?? 2;
}

function healthStatusText(status) {
    if (status === 'Healthy') return 'Good condition';
    if (status === 'Moderate Stress') return 'Monitor closely';
    return 'Needs attention';
}

async function applyMlPredictionsToDashboard() {
    const ml = window.TwinFarmML;
    if (!ml) return;

    const sensors = getMlSensorInputs();

    try {
        const health = await ml.fetchHealthStatus(sensors);
        const growth = await ml.fetchGrowthStage(sensors);
        const biomassFinal = await ml.fetchBiomass({
            moisture: sensors.soilMoisture,
            stage: growth.stage
        });

        const stageLabel = growth.stageLabel || (growth.stage ? growth.stage.charAt(0).toUpperCase() + growth.stage.slice(1) : 'Vegetative');

        updateCropHealthBadge(health.status, health.confidence);

        const growthStageEl = document.getElementById('growth-stage-value');
        if (growthStageEl) growthStageEl.textContent = stageLabel;

        updateGrowthStageDots(growthStageIndex(growth.stage));
        updateGrowthStagesFromMl(growth.stage || 'vegetative');
        updateBiomassDisplay(biomassFinal, health.confidence);

        const heroHealth = document.querySelector('.health-value');
        const heroPct = health.status === 'Healthy' ? 92 : health.status === 'Moderate Stress' ? 75 : 48;
        if (heroHealth) heroHealth.textContent = `${heroPct}%`;

        const heroProgress = document.querySelector('.preview-progress .progress-fill');
        if (heroProgress) heroProgress.style.width = `${heroPct}%`;

        window.TwinFarmLiveMl = { sensors, health, growth, biomass: biomassFinal };
    } catch (err) {
        console.warn('[TwinFarm] ML dashboard sync failed:', err);
        updateCropHealthBadge('Moderate Stress', 0.82);
        updateBiomassDisplay(null, 0.82);
        updateGrowthStagesFromMl('vegetative');
    }
}

function initializeMlLiveValues() {
    applyMlPredictionsToDashboard();
    if (mlLiveInterval) clearInterval(mlLiveInterval);
    mlLiveInterval = setInterval(applyMlPredictionsToDashboard, 12000);
}

// ==================== LIVE DATA ====================
function setLiveDataStatus(state, message) {
    const badge = document.getElementById('live-data-badge');
    const label = document.getElementById('live-data-label');
    if (!badge || !label) return;

    badge.classList.remove('offline', 'simulated', 'live', 'connecting', 'historical');
    if (state === 'live') badge.classList.add('live');
    else if (state === 'simulated') badge.classList.add('simulated');
    else if (state === 'connecting') badge.classList.add('connecting');
    else if (state === 'offline') badge.classList.add('offline');
    else if (state === 'historical') badge.classList.add('historical');

    label.textContent = message;
}

function setHistoricalDataStatus() {
    setLiveDataStatus('historical', 'Historical data loaded — 30-day dataset');
}

function formatUpdatedAt(isoString) {
    if (!isoString) return 'just now';
    return new Date(isoString).toLocaleTimeString();
}

async function fetchFarmState() {
    const response = await fetch('/api/farm/state', { cache: 'no-store' });
    if (!response.ok) throw new Error('Farm API unavailable');
    return response.json();
}

function updateGrowthStageDots(stageIndex) {
    document.querySelectorAll('.stage-dot').forEach((dot, index) => {
        dot.classList.toggle('active', index === stageIndex);
    });
}

function syncFieldDataFromApi(apiFields) {
    apiFields.forEach((field, idx) => {
        if (!fieldData[idx]) return;
        fieldData[idx].name = field.name;
        fieldData[idx].health = field.health;
        fieldData[idx].moisture = field.moisture;
        fieldData[idx].area = field.area;

        if (fields[idx]?.label?.element) {
            fields[idx].label.element.textContent = `${field.name}\n${Math.round(field.health * 100)}% Health`;
            fields[idx].label.element.style.borderLeftColor = field.color;
        }
    });
}

function updateMapMarkers(apiFields) {
    if (!farmMap || !mapFieldMarkers.length) return;

    apiFields.forEach((field, index) => {
        const marker = mapFieldMarkers[index];
        if (!marker) return;
        const color = field.color;
        const healthLabel = field.ndvi > 0.6 ? 'Good' : field.ndvi > 0.4 ? 'Moderate' : 'Poor';
        marker.setIcon(L.divIcon({
            html: `<div style="background:${color};width:16px;height:16px;border-radius:50%;border:2px solid white;"></div>`,
            iconSize: [16, 16]
        }));
        marker.setPopupContent(`<b>${field.name}</b><br>NDVI: ${field.ndvi}<br>Moisture: ${field.moisture}%<br>Health: ${healthLabel}`);
    });
}

function applyFarmState(state) {
    if (!state) return;

    const dashboard = state.dashboard;
    const predictions = state.predictions;
    const weather = state.weather;

    document.getElementById('soil-moisture-value').textContent = `${Math.round(dashboard.soilMoisture)}%`;
    document.getElementById('soil-moisture-fill').style.width = `${dashboard.soilMoisture}%`;
    document.getElementById('soil-status').textContent = dashboard.soilMoistureStatus;

    document.getElementById('soil-temp-value').textContent = `${Math.round(dashboard.soilTemperature)}°C`;
    document.getElementById('temp-fill').style.width = `${((dashboard.soilTemperature - 15) / 20) * 100}%`;
    document.getElementById('temp-status').textContent = dashboard.soilTempStatus;

    document.getElementById('growth-stage-value').textContent = dashboard.growthStage;
    document.getElementById('days-to-harvest').textContent = dashboard.daysToHarvest;
    updateGrowthStageDots(dashboard.stageIndex);

    if (predictions) {
        document.getElementById('irrigation-amount').textContent = predictions.irrigationLitersPerDay.toLocaleString();
        document.getElementById('irrigation-time').textContent = `${predictions.irrigationNextHours} hours`;
        document.getElementById('harvest-days').textContent = predictions.harvestDays;
        document.getElementById('harvest-range').innerHTML = `<strong>${predictions.harvestRange}</strong>`;
    }

    if (weather && weatherChart) {
        weatherChart.data.labels = weather.labels;
        weatherChart.data.datasets[0].data = weather.temperature;
        weatherChart.data.datasets[1].data = weather.humidity;
        weatherChart.update('none');
    }

    if (state.fields?.length) {
        const avgNdvi = state.fields.reduce((sum, field) => sum + field.ndvi, 0) / state.fields.length;
        const avgNdviEl = document.getElementById('avg-ndvi');
        if (avgNdviEl) avgNdviEl.textContent = avgNdvi.toFixed(2);
        document.getElementById('map-update-time').textContent = formatUpdatedAt(state.updatedAt);
        syncFieldDataFromApi(state.fields);
        updateMapMarkers(state.fields);
    }

    applyMlPredictionsToDashboard();
}

function updateDashboardValuesFallback() {
    const mock = window.MockData;
    if (!mock) return;

    liveDataResolved = true;

    const soilMoisture = 75;
    const temperature = 23;
    const growthStages = ['Seed', 'Germinating', 'Seedling', 'Vegetative'];
    const stageIndex = 3;

    applyFarmState({
        updatedAt: new Date().toISOString(),
        dashboard: {
            soilMoisture,
            soilMoistureStatus: 'From 30-day basin dataset',
            cropHealth: 8.2,
            cropHealthStatus: 'Good condition',
            soilTemperature: temperature,
            soilTempStatus: 'Ideal for coriander',
            growthStage: 'Vegetative',
            stageIndex,
            daysToHarvest: 0
        },
        weather: {
            labels: ['6AM', '9AM', '12PM', '3PM', '6PM', '9PM'],
            temperature: [18, 22, 26, 28, 24, 20],
            humidity: [75, 68, 55, 52, 60, 70]
        },
        fields: fieldData.map((field) => ({
            ...field,
            ndvi: field.health * 0.8,
            color: field.health > 0.7 ? '#4CAF50' : field.health > 0.4 ? '#FF9800' : '#F44336'
        }))
    });

    setHistoricalDataStatus();

    applyMlPredictionsToDashboard();
}

async function refreshFarmData() {
    try {
        const state = await fetchFarmState();
        usingLiveApi = true;
        liveDataResolved = true;
        if (liveDataFallbackTimer) {
            clearTimeout(liveDataFallbackTimer);
            liveDataFallbackTimer = null;
        }
        applyFarmState(state);
    } catch {
        usingLiveApi = false;
    }
}

function startHistoricalDataFeed() {
    setHistoricalDataStatus();
    updateDashboardValuesFallback();
}

// ==================== DASHBOARD ====================
function initializeDashboard() {
    initializeWeatherForecast();
    startHistoricalDataFeed();
}

function weatherEmoji(code) {
    if (code === 0) return '☀️';
    if (code <= 3) return '🌤️';
    if (code >= 51) return '🌧️';
    return '🌤️';
}

function weatherDescription(code) {
    const descriptions = {
        0: 'Clear sky',
        1: 'Mainly clear',
        2: 'Partly cloudy',
        3: 'Overcast',
        45: 'Foggy',
        48: 'Depositing rime fog',
        51: 'Light drizzle',
        53: 'Moderate drizzle',
        55: 'Dense drizzle',
        61: 'Slight rain',
        63: 'Moderate rain',
        65: 'Heavy rain',
        80: 'Rain showers',
        95: 'Thunderstorm'
    };
    return descriptions[code] || 'Variable conditions';
}

async function initializeWeatherForecast() {
    const container = document.getElementById('weather-chart');
    if (!container) return;

    container.innerHTML = '<p class="weather-loading">Loading weather data…</p>';

    try {
        const response = await fetch(WEATHER_API_URL);
        if (!response.ok) throw new Error('Weather API failed');
        const data = await response.json();

        const current = data.current;
        const daily = data.daily;
        const todayDesc = weatherDescription(current.weather_code);
        const todayEmoji = weatherEmoji(current.weather_code);

        let forecastHtml = '';
        if (daily && daily.time) {
            for (let i = 0; i < daily.time.length; i++) {
                const date = new Date(daily.time[i]);
                const dayLabel = i === 0 ? 'Today' : date.toLocaleDateString('en-KE', { weekday: 'short' });
                const emoji = weatherEmoji(daily.weather_code[i]);
                forecastHtml += `
                    <div class="weather-day">
                        <span class="weather-day-label">${dayLabel}</span>
                        <span class="weather-day-icon">${emoji}</span>
                        <span class="weather-day-temp">${Math.round(daily.temperature_2m_min[i])}–${Math.round(daily.temperature_2m_max[i])}°C</span>
                    </div>
                `;
            }
        }

        container.innerHTML = `
            <div class="weather-panel">
                <div class="weather-current">
                    <span class="weather-current-emoji">${todayEmoji}</span>
                    <div class="weather-current-details">
                        <strong>${Math.round(current.temperature_2m)}°C</strong>
                        <span>${todayDesc}</span>
                        <span>Humidity ${current.relative_humidity_2m}% · Wind ${current.wind_speed_10m} km/h</span>
                    </div>
                </div>
                <div class="weather-forecast-row">${forecastHtml}</div>
            </div>
        `;
    } catch (err) {
        console.warn('[TwinFarm] Weather fetch failed:', err);
        container.innerHTML = '<p class="weather-unavailable">Weather data unavailable</p>';
    }
}

// ==================== MAPS ====================
function initializeMaps() {
    const mapContainer = document.getElementById('farm-map');
    if (!mapContainer || typeof L === 'undefined') return;

    try {
        farmMap = L.map('farm-map', { tap: true }).setView([JKUAT_LAT, JKUAT_LNG], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(farmMap);

        const farmBoundary = [
            [-1.0894, 37.0071],
            [-1.0894, 37.0131],
            [-1.0934, 37.0131],
            [-1.0934, 37.0071]
        ];

        L.polygon(farmBoundary, {
            color: '#2E7D32',
            fillColor: '#4CAF50',
            fillOpacity: 0.45,
            weight: 2
        })
            .addTo(farmMap)
            .bindPopup('TwinFarm Basin — NDVI: 0.68');

        const invalidateMapSize = () => farmMap.invalidateSize();
        window.addEventListener('resize', invalidateMapSize);
        window.addEventListener('orientationchange', () => setTimeout(invalidateMapSize, 150));
        setTimeout(invalidateMapSize, 300);
    } catch (err) {
        console.warn('[TwinFarm] Leaflet map unavailable:', err);
    }
}

// ==================== PREDICTIONS ====================
function initializePredictions() {
    const ctx = document.getElementById('growth-chart').getContext('2d');
    growthChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Week 7', 'Week 8'],
            datasets: [{ label: 'Coriander Height (cm)', data: [3, 8, 15, 25, 38, 52, 68, 78], borderColor: '#4CAF50', tension: 0.4, fill: false }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { boxWidth: 12, font: { size: 11 } } } },
            scales: {
                x: { ticks: { maxRotation: 45, autoSkip: true } },
                y: { ticks: { maxTicksLimit: 6 } }
            }
        }
    });
    
    const simDays = document.getElementById('sim-days');
    if (simDays) {
        simDays.max = 30;
        simDays.value = 30;
        document.getElementById('days-value-display').textContent = '30 days';
        currentGrowthDays = 30;
    }

    document.getElementById('sim-temp').addEventListener('input', (e) => document.getElementById('temp-value-display').textContent = `${e.target.value}°C`);
    document.getElementById('sim-moisture').addEventListener('input', (e) => document.getElementById('moisture-value-display').textContent = `${e.target.value}%`);
    simDays?.addEventListener('input', (e) => {
        const days = parseInt(e.target.value, 10);
        document.getElementById('days-value-display').textContent = `${days} days`;
        currentGrowthDays = days;
        updateGrowthStages(days);
        update3DPlantGrowth(days);
    });
    document.getElementById('run-simulation-btn').addEventListener('click', runGrowthSimulation);
    document.querySelectorAll('.simulate-btn').forEach(btn => btn.addEventListener('click', runPredictionSimulation));

    updateGrowthStagesFromMl('vegetative');
    const dayLabel = document.getElementById('predictions-day-label');
    if (dayLabel) dayLabel.textContent = 'Day 30 of 30';
}

function updateGrowthStagesFromMl(stage) {
    const stageKey = String(stage || 'vegetative').toLowerCase();
    document.querySelectorAll('.growth-stage-indicator .stage-label').forEach((label) => {
        const labelStage = label.getAttribute('data-stage');
        label.classList.toggle('active', labelStage === stageKey);
    });
}

function updateGrowthStages(days) {
    let stage;
    if (days <= 7) stage = 'seed';
    else if (days <= 14) stage = 'germinating';
    else if (days <= 21) stage = 'seedling';
    else stage = 'vegetative';
    updateGrowthStagesFromMl(stage);
}

function runGrowthSimulation() {
    const temp = parseInt(document.getElementById('sim-temp').value);
    const moisture = parseInt(document.getElementById('sim-moisture').value);
    const days = parseInt(document.getElementById('sim-days').value);
    
    const tempFactor = Math.max(0.5, Math.min(1.2, 1 - Math.abs(temp - 23) / 20));
    const moistureFactor = Math.max(0.6, Math.min(1.1, moisture / 65));
    const growthRate = tempFactor * moistureFactor;
    
    const heights = [];
    for (let i = 1; i <= 8; i++) {
        heights.push(Math.min(85, Math.round(3 * i * growthRate * (1 + Math.random() * 0.1))));
    }
    
    growthChart.data.datasets[0].data = heights;
    growthChart.update();
    
    update3DPlantGrowth(days);
    updateGrowthStages(days);

    applyMlPredictionsToDashboard();
    showNotification('Simulation complete! Biomass and growth stage updated.');
}

function runPredictionSimulation(e) {
    const type = e.target.dataset.type;
    if (type === 'yield') {
        applyMlPredictionsToDashboard();
        showNotification('Biomass estimate refreshed from ML fusion model.');
    } else if (type === 'irrigation') {
        const amount = 800 + Math.random() * 800;
        const hours = 24 + Math.random() * 72;
        document.getElementById('irrigation-amount').textContent = Math.round(amount);
        document.getElementById('irrigation-time').textContent = `${Math.round(hours)} hours`;
    } else if (type === 'harvest') {
        const days = 30 + Math.random() * 60;
        document.getElementById('harvest-days').textContent = Math.round(days);
        document.getElementById('harvest-range').innerHTML = `<strong>${Math.round(days-5)}-${Math.round(days+5)} days</strong>`;
    }
    showNotification('Simulation updated!');
}

// ==================== CHATBOT ====================
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function initializeChatbot() {
    const sendBtn = document.getElementById('send-message-btn');
    const input = document.getElementById('chat-input');
    const messages = document.getElementById('chat-messages');
    const assistant = window.TwinFarmAssistant;
    let isReplying = false;

    function addMessage(text, isUser) {
        const div = document.createElement('div');
        div.className = `message ${isUser ? 'user-message' : 'bot-message'}`;
        const content = document.createElement('div');
        content.className = 'message-content';
        if (isUser) {
            content.textContent = text;
        } else {
            content.innerHTML = text;
        }
        div.appendChild(content);
        messages.appendChild(div);
        messages.scrollTop = messages.scrollHeight;
        return div;
    }

    function showTypingIndicator() {
        const div = document.createElement('div');
        div.className = 'message bot-message typing-indicator';
        div.innerHTML = '<div class="message-content"><span></span><span></span><span></span></div>';
        messages.appendChild(div);
        messages.scrollTop = messages.scrollHeight;
        return div;
    }

    function processInput() {
        const text = input.value.trim();
        if (!text || isReplying) return;

        addMessage(text, true);
        input.value = '';
        isReplying = true;
        sendBtn.disabled = true;

        const typing = showTypingIndicator();
        const delay = 400 + Math.min(text.length * 15, 600);

        setTimeout(() => {
            typing.remove();
            const reply = assistant ? assistant.answer(text) : 'Assistant is loading. Please refresh the page.';
            addMessage(reply, false);
            isReplying = false;
            sendBtn.disabled = false;
            input.focus();
        }, delay);
    }

    sendBtn.addEventListener('click', processInput);
    input.addEventListener('keypress', (e) => { if (e.key === 'Enter') processInput(); });
    document.querySelectorAll('.quick-question').forEach(btn => {
        btn.addEventListener('click', () => { input.value = btn.textContent; processInput(); });
    });
}

// ==================== AUTHENTICATION ====================
function getAuthToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY);
}

function setAuthToken(token) {
    if (token) {
        localStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
        localStorage.removeItem(AUTH_TOKEN_KEY);
    }
}

async function authRequest(path, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };
    const token = getAuthToken();
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`/api/auth${path}`, {
        ...options,
        headers
    });

    let data = {};
    try {
        data = await response.json();
    } catch {
        data = {};
    }

    if (!response.ok) {
        throw new Error(data.error || 'Something went wrong. Please try again.');
    }

    return data;
}

function setAuthError(elementId, message) {
    const el = document.getElementById(elementId);
    if (!el) return;
    if (message) {
        el.textContent = message;
        el.hidden = false;
    } else {
        el.textContent = '';
        el.hidden = true;
    }
}

function closeAuthModals() {
    document.getElementById('signin-modal').style.display = 'none';
    document.getElementById('signup-modal').style.display = 'none';
}

function openAuthModal(modalId) {
    setAuthError('signin-error', '');
    setAuthError('signup-error', '');
    document.getElementById(modalId).style.display = 'flex';
}

function setAuthSubmitting(formType, isSubmitting) {
    const button = document.getElementById(`${formType}-submit-btn`);
    if (!button) return;
    button.disabled = isSubmitting;
    button.textContent = isSubmitting
        ? (formType === 'signin' ? 'Signing In...' : 'Creating Account...')
        : (formType === 'signin' ? 'Sign In' : 'Create Account');
}

function initializeAuth() {
    const signinBtn = document.getElementById('signin-btn');
    const signupBtn = document.getElementById('signup-btn');
    const signinModal = document.getElementById('signin-modal');
    const signupModal = document.getElementById('signup-modal');

    document.querySelectorAll('.modal-close').forEach(btn => btn.onclick = closeAuthModals);
    window.onclick = (e) => { if (e.target.classList.contains('modal')) closeAuthModals(); };

    if (signinBtn) signinBtn.onclick = () => openAuthModal('signin-modal');
    if (signupBtn) signupBtn.onclick = () => openAuthModal('signup-modal');

    const switchToSignup = document.getElementById('switch-to-signup');
    const switchToSignin = document.getElementById('switch-to-signin');
    if (switchToSignup) switchToSignup.onclick = (e) => {
        e.preventDefault();
        openAuthModal('signup-modal');
        signinModal.style.display = 'none';
    };
    if (switchToSignin) switchToSignin.onclick = (e) => {
        e.preventDefault();
        openAuthModal('signin-modal');
        signupModal.style.display = 'none';
    };

    const signinForm = document.getElementById('signin-form');
    const signupForm = document.getElementById('signup-form');
    if (signinForm) signinForm.onsubmit = (e) => { e.preventDefault(); handleSignIn(); };
    if (signupForm) signupForm.onsubmit = (e) => { e.preventDefault(); handleSignUp(); };

    const demoSignin = document.getElementById('demo-signin');
    if (demoSignin) demoSignin.onclick = () => handleDemoSignIn();

    const signoutLink = document.getElementById('signout-link');
    if (signoutLink) signoutLink.onclick = (e) => {
        e.preventDefault();
        handleSignOut();
    };

    const userIndicator = document.getElementById('user-indicator');
    if (userIndicator) {
        userIndicator.addEventListener('click', (e) => {
            if (window.matchMedia('(max-width: 768px)').matches) {
                e.stopPropagation();
                userIndicator.classList.toggle('open');
            }
        });
        document.addEventListener('click', () => userIndicator.classList.remove('open'));
    }
}

async function restoreAuthSession() {
    if (!getAuthToken()) return;

    try {
        const data = await authRequest('/me');
        currentUser = data.user;
        updateUIForLoggedInUser(currentUser);
    } catch {
        setAuthToken(null);
        currentUser = null;
    }
}

async function handleSignIn() {
    const email = document.getElementById('signin-email').value.trim();
    const password = document.getElementById('signin-password').value;
    setAuthError('signin-error', '');

    if (!email || !password) {
        setAuthError('signin-error', 'Email and password are required.');
        return;
    }

    setAuthSubmitting('signin', true);
    try {
        const data = await authRequest('/signin', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        setAuthToken(data.token);
        currentUser = data.user;
        document.getElementById('signin-form').reset();
        closeAuthModals();
        updateUIForLoggedInUser(currentUser);
        showNotification(`Welcome back, ${currentUser.firstName}!`);
    } catch (error) {
        setAuthError('signin-error', error.message);
    } finally {
        setAuthSubmitting('signin', false);
    }
}

async function handleSignUp() {
    const firstName = document.getElementById('signup-firstname').value.trim();
    const lastName = document.getElementById('signup-lastname').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirm = document.getElementById('signup-confirm').value;
    const farmSize = document.getElementById('signup-farm-size').value;
    setAuthError('signup-error', '');

    if (!firstName || !lastName || !email || !password) {
        setAuthError('signup-error', 'Please fill in all required fields.');
        return;
    }
    if (password !== confirm) {
        setAuthError('signup-error', 'Passwords do not match.');
        return;
    }
    if (password.length < 6) {
        setAuthError('signup-error', 'Password must be at least 6 characters.');
        return;
    }

    setAuthSubmitting('signup', true);
    try {
        const data = await authRequest('/signup', {
            method: 'POST',
            body: JSON.stringify({ firstName, lastName, email, password, farmSize })
        });
        setAuthToken(data.token);
        currentUser = data.user;
        document.getElementById('signup-form').reset();
        closeAuthModals();
        updateUIForLoggedInUser(currentUser);
        showNotification(`Welcome to TwinFarm, ${currentUser.firstName}!`);
    } catch (error) {
        setAuthError('signup-error', error.message);
    } finally {
        setAuthSubmitting('signup', false);
    }
}

async function handleDemoSignIn() {
    document.getElementById('signin-email').value = 'demo@twinfarm.com';
    document.getElementById('signin-password').value = 'demo123';
    await handleSignIn();
}

async function handleSignOut() {
    try {
        await authRequest('/signout', { method: 'POST' });
    } catch {
        // Clear local session even if the server request fails.
    }

    setAuthToken(null);
    currentUser = null;
    const authBtns = document.getElementById('auth-buttons');
    const userIndicator = document.getElementById('user-indicator');
    document.body.classList.remove('logged-in');
    if (authBtns) authBtns.hidden = false;
    if (userIndicator) userIndicator.hidden = true;
    showNotification('You have been signed out.');
}

function updateUIForLoggedInUser(user) {
    const authBtns = document.getElementById('auth-buttons');
    const userIndicator = document.getElementById('user-indicator');
    document.body.classList.add('logged-in');
    if (authBtns) authBtns.hidden = true;
    if (userIndicator) {
        userIndicator.hidden = false;
        const userNameSpan = document.getElementById('user-name');
        if (userNameSpan) userNameSpan.textContent = user.firstName;
    }
}

// ==================== NAVIGATION ====================
function initializeNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.section');

    function scrollToSection(targetId) {
        const target = document.querySelector(targetId);
        if (target) {
            window.scrollTo({ top: target.offsetTop - 80, behavior: 'smooth' });
        }
    }

    function highlightNav() {
        let scrollPos = window.scrollY + 100;
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionId = section.getAttribute('id');
            if (scrollPos >= sectionTop && scrollPos < sectionTop + section.clientHeight) {
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${sectionId}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }

    window.addEventListener('scroll', highlightNav);

    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            scrollToSection(this.getAttribute('href'));
        });
    });

    document.querySelectorAll('.footer-links a[href^="#"]').forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href && href.length > 1) {
                e.preventDefault();
                scrollToSection(href);
            }
        });
    });
}

function initializeDemoButton() {
    const demoBtn = document.getElementById('view-demo-btn');
    if (demoBtn) {
        demoBtn.addEventListener('click', () => {
            const farmSection = document.getElementById('virtual-farm');
            if (farmSection) farmSection.scrollIntoView({ behavior: 'smooth' });
        });
    }
}

function showNotification(message) {
    const notif = document.getElementById('notification');
    if (!notif) return;
    notif.textContent = message;
    notif.style.display = 'block';
    setTimeout(() => notif.style.display = 'none', 3000);
}