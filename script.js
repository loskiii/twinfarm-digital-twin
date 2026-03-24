// TwinFarm - Complete Application with Realistic 3D Visualization
// Collins Omollo | Backend & FIWARE Integration

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

// ==================== GLOBAL VARIABLES ====================
let currentUser = null;
let scene, camera, renderer, labelRenderer, controls;
let fields = [];
let fieldMeshes = [];
let corianderPlants = [];
let currentCropHealth = [0.85, 0.65, 0.92, 0.48, 0.78, 0.72];
let growthChart = null;
let currentGrowthDays = 45;
let animationId = null;
let sunLight;

// Demo user accounts
const demoUsers = [
    { email: "demo@twinfarm.com", password: "demo123", firstName: "Demo", lastName: "Farmer", farmSize: "medium" },
    { email: "farmer@example.com", password: "farmer123", firstName: "John", lastName: "Kamau", farmSize: "small" }
];

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
function initializeMobileMenu() {
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const navLinks = document.getElementById('nav-links');
    
    if (mobileBtn && navLinks) {
        mobileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            navLinks.classList.toggle('show');
            
            const icon = mobileBtn.querySelector('i');
            if (navLinks.classList.contains('show')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-times');
            } else {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });
        
        document.addEventListener('click', (e) => {
            if (!navLinks.contains(e.target) && !mobileBtn.contains(e.target)) {
                navLinks.classList.remove('show');
                const icon = mobileBtn.querySelector('i');
                if (icon) {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            }
        });
        
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('show');
                const icon = mobileBtn.querySelector('i');
                if (icon) {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            });
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
    initializeDemoButton();
    initializeMobileMenu(); // Mobile menu toggle
    
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
    container.appendChild(renderer.domElement);
    
    // CSS2 Renderer for labels
    labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(container.clientWidth, container.clientHeight);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0px';
    labelRenderer.domElement.style.left = '0px';
    labelRenderer.domElement.style.pointerEvents = 'none';
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
    }
    animate();
    
    // Raycaster for field selection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    
    renderer.domElement.addEventListener('click', (event) => {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(fieldMeshes);
        
        if (intersects.length > 0) {
            const hit = intersects[0];
            const fieldIdx = hit.object.userData.index;
            if (fieldIdx !== undefined) {
                showFieldInfo(fieldData[fieldIdx], fieldIdx);
            }
        }
    });
    
    window.addEventListener('resize', () => {
        const width = container.clientWidth;
        const height = container.clientHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
        labelRenderer.setSize(width, height);
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
    document.getElementById('field-yield').textContent = `${(5 + field.health * 4).toFixed(1)} tons/ha`;
    document.getElementById('field-water').textContent = `${Math.round(800 + field.health * 500)} L/day`;
    
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

// ==================== DASHBOARD ====================
function initializeDashboard() {
    updateDashboardValues();
    setInterval(updateDashboardValues, 8000);
    initializeWeatherChart();
}

function updateDashboardValues() {
    const mock = window.MockData;
    if (!mock) return;
    
    const soilMoisture = mock.getSensorReading('soilMoisture');
    const temperature = mock.getSensorReading('temperature');
    const health = mock.getFieldHealth('field-a');
    
    document.getElementById('soil-moisture-value').textContent = `${Math.round(soilMoisture)}%`;
    document.getElementById('soil-moisture-fill').style.width = `${soilMoisture}%`;
    document.getElementById('soil-status').textContent = soilMoisture > 60 ? 'Optimal for coriander' : soilMoisture > 40 ? 'Moderate - consider irrigation' : 'Low - irrigation needed';
    
    document.getElementById('crop-health-value').textContent = `${(health * 10).toFixed(1)}/10`;
    document.getElementById('health-fill').style.width = `${health * 100}%`;
    document.getElementById('health-status').textContent = health > 0.7 ? 'Good condition' : health > 0.4 ? 'Monitor closely' : 'Needs attention';
    
    document.getElementById('soil-temp-value').textContent = `${Math.round(temperature)}°C`;
    document.getElementById('temp-fill').style.width = `${((temperature - 15) / 20) * 100}%`;
    document.getElementById('temp-status').textContent = (temperature >= 18 && temperature <= 28) ? 'Ideal for coriander' : 'Suboptimal';
    
    const daysSincePlanting = mock.getDaysSince('2025-01-15');
    const growthStages = ['Germination', 'Seedling', 'Vegetative', 'Flowering', 'Maturation'];
    const stageIndex = Math.min(Math.floor(daysSincePlanting / 25), 4);
    document.getElementById('growth-stage-value').textContent = growthStages[stageIndex];
    document.getElementById('days-to-harvest').textContent = Math.max(0, 120 - daysSincePlanting);
}

function initializeWeatherChart() {
    const container = document.getElementById('weather-chart');
    if (!container) return;
    container.innerHTML = '<canvas id="weather-canvas" style="height:200px; width:100%"></canvas>';
    const ctx = document.getElementById('weather-canvas').getContext('2d');
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['6AM', '9AM', '12PM', '3PM', '6PM', '9PM'],
            datasets: [
                { label: 'Temperature (°C)', data: [18, 22, 26, 28, 24, 20], borderColor: '#FF9800', tension: 0.4, fill: false },
                { label: 'Humidity (%)', data: [75, 68, 55, 52, 60, 70], borderColor: '#2196F3', tension: 0.4, fill: false }
            ]
        },
        options: { responsive: true, maintainAspectRatio: true }
    });
}

// ==================== MAPS ====================
function initializeMaps() {
    const mapContainer = document.getElementById('farm-map');
    if (!mapContainer) return;
    
    const farmMap = L.map('farm-map').setView([-1.2921, 36.8219], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(farmMap);
    
    const ndviCanvas = document.createElement('canvas');
    ndviCanvas.width = 800;
    ndviCanvas.height = 800;
    const ctx = ndviCanvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 800, 800);
    grad.addColorStop(0, '#F44336');
    grad.addColorStop(0.3, '#FF9800');
    grad.addColorStop(0.6, '#FFC107');
    grad.addColorStop(1, '#4CAF50');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 800, 800);
    L.imageOverlay(ndviCanvas.toDataURL(), [[-1.3021, 36.8119], [-1.2821, 36.8319]], { opacity: 0.6 }).addTo(farmMap);
    
    const fieldMarkers = [
        { lat: -1.2921, lng: 36.8219, name: "North Field", ndvi: 0.78 },
        { lat: -1.2881, lng: 36.8259, name: "East Field", ndvi: 0.52 },
        { lat: -1.2961, lng: 36.8179, name: "South Field", ndvi: 0.85 },
        { lat: -1.2901, lng: 36.8139, name: "West Field", ndvi: 0.35 },
        { lat: -1.2941, lng: 36.8299, name: "Central Field", ndvi: 0.68 }
    ];
    
    fieldMarkers.forEach(m => {
        const color = m.ndvi > 0.6 ? '#4CAF50' : m.ndvi > 0.4 ? '#FF9800' : '#F44336';
        L.marker([m.lat, m.lng], { icon: L.divIcon({ html: `<div style="background:${color};width:16px;height:16px;border-radius:50%;border:2px solid white;"></div>`, iconSize: [16,16] }) })
            .addTo(farmMap)
            .bindPopup(`<b>${m.name}</b><br>NDVI: ${m.ndvi}<br>Health: ${m.ndvi > 0.6 ? 'Good' : m.ndvi > 0.4 ? 'Moderate' : 'Poor'}`);
    });
    
    const avgNdvi = fieldMarkers.reduce((s, m) => s + m.ndvi, 0) / fieldMarkers.length;
    document.getElementById('avg-ndvi').textContent = avgNdvi.toFixed(2);
    document.getElementById('map-update-time').textContent = new Date().toLocaleTimeString();
    setInterval(() => document.getElementById('map-update-time').textContent = new Date().toLocaleTimeString(), 30000);
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
        options: { responsive: true, maintainAspectRatio: true }
    });
    
    document.getElementById('sim-temp').addEventListener('input', (e) => document.getElementById('temp-value-display').textContent = `${e.target.value}°C`);
    document.getElementById('sim-moisture').addEventListener('input', (e) => document.getElementById('moisture-value-display').textContent = `${e.target.value}%`);
    document.getElementById('sim-days').addEventListener('input', (e) => {
        const days = parseInt(e.target.value);
        document.getElementById('days-value-display').textContent = `${days} days`;
        currentGrowthDays = days;
        updateGrowthStages(days);
        update3DPlantGrowth(days);
    });
    document.getElementById('run-simulation-btn').addEventListener('click', runGrowthSimulation);
    document.querySelectorAll('.simulate-btn').forEach(btn => btn.addEventListener('click', runPredictionSimulation));
}

function updateGrowthStages(days) {
    const stages = document.querySelectorAll('.stage-label');
    if (!stages.length) return;
    const stageDays = [7, 20, 40, 25, 28];
    let cumulative = 0;
    stages.forEach((stage, idx) => {
        cumulative += stageDays[idx];
        if (days >= cumulative - stageDays[idx] && days < cumulative) {
            stage.classList.add('active');
        } else {
            stage.classList.remove('active');
        }
    });
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
    
    const predictedYield = (6 + (tempFactor + moistureFactor) * 2).toFixed(1);
    document.getElementById('yield-prediction').textContent = predictedYield;
    showNotification(`Simulation complete! Predicted yield: ${predictedYield} tons/ha`);
}

function runPredictionSimulation(e) {
    const type = e.target.dataset.type;
    if (type === 'yield') {
        const newYield = (6 + Math.random() * 4).toFixed(1);
        document.getElementById('yield-prediction').textContent = newYield;
        document.getElementById('yield-confidence').style.width = `${75 + Math.random() * 20}%`;
        document.getElementById('yield-confidence-text').textContent = `${75 + Math.floor(Math.random() * 20)}%`;
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
function initializeChatbot() {
    const sendBtn = document.getElementById('send-message-btn');
    const input = document.getElementById('chat-input');
    const messages = document.getElementById('chat-messages');
    
    const responses = {
        "soil moisture": "Coriander prefers soil moisture between 60-75%. Our dashboard shows real-time readings for each field.",
        "irrigation": "Based on soil moisture readings, the system recommends irrigating when moisture drops below 55%. Check the Irrigation Prediction card.",
        "yield": "Yield predictions are calculated using NDVI data, soil conditions, and weather forecasts. Current prediction: 8.2 tons/ha.",
        "ndvi": "NDVI (Normalized Difference Vegetation Index) measures crop health from satellite imagery. Values above 0.6 indicate healthy coriander.",
        "harvest": "Coriander is typically ready for harvest 90-120 days after planting. Check your field's specific days-to-harvest on the Dashboard.",
        "fertilizer": "Coriander benefits from balanced NPK fertilizer. Apply during early vegetative stage for best results.",
        "temperature": "Coriander grows best between 18-28°C. Our sensors track soil temperature in real-time.",
        "3d": "Our 3D farm uses realistic terrain, dynamic shadows, and detailed coriander plant models. Drag to rotate, scroll to zoom!",
        "demo": "Click 'Use Demo Account' on the sign-in modal. Demo credentials: demo@twinfarm.com / demo123",
        "default": "I'm your coriander farming assistant. Ask about soil moisture, irrigation, yield predictions, NDVI, harvest timing, or the 3D farm!"
    };
    
    function addMessage(text, isUser) {
        const div = document.createElement('div');
        div.className = `message ${isUser ? 'user-message' : 'bot-message'}`;
        div.innerHTML = `<div class="message-content">${text}</div>`;
        messages.appendChild(div);
        messages.scrollTop = messages.scrollHeight;
    }
    
    function processInput() {
        const text = input.value.trim();
        if (!text) return;
        addMessage(text, true);
        input.value = '';
        
        setTimeout(() => {
            let reply = responses.default;
            for (let key in responses) {
                if (text.toLowerCase().includes(key)) { reply = responses[key]; break; }
            }
            addMessage(reply, false);
        }, 500);
    }
    
    sendBtn.addEventListener('click', processInput);
    input.addEventListener('keypress', (e) => { if (e.key === 'Enter') processInput(); });
    document.querySelectorAll('.quick-question').forEach(btn => {
        btn.addEventListener('click', () => { input.value = btn.textContent; processInput(); });
    });
}

// ==================== AUTHENTICATION ====================
function initializeAuth() {
    const signinBtn = document.getElementById('signin-btn');
    const signupBtn = document.getElementById('signup-btn');
    const signinModal = document.getElementById('signin-modal');
    const signupModal = document.getElementById('signup-modal');
    
    document.querySelectorAll('.modal-close').forEach(btn => btn.onclick = () => { signinModal.style.display = 'none'; signupModal.style.display = 'none'; });
    window.onclick = (e) => { if (e.target.classList.contains('modal')) { e.target.style.display = 'none'; } };
    
    if (signinBtn) signinBtn.onclick = () => signinModal.style.display = 'flex';
    if (signupBtn) signupBtn.onclick = () => signupModal.style.display = 'flex';
    
    const switchToSignup = document.getElementById('switch-to-signup');
    const switchToSignin = document.getElementById('switch-to-signin');
    if (switchToSignup) switchToSignup.onclick = (e) => { e.preventDefault(); signinModal.style.display = 'none'; signupModal.style.display = 'flex'; };
    if (switchToSignin) switchToSignin.onclick = (e) => { e.preventDefault(); signupModal.style.display = 'none'; signinModal.style.display = 'flex'; };
    
    const signinForm = document.getElementById('signin-form');
    const signupForm = document.getElementById('signup-form');
    if (signinForm) signinForm.onsubmit = (e) => { e.preventDefault(); handleSignIn(); };
    if (signupForm) signupForm.onsubmit = (e) => { e.preventDefault(); handleSignUp(); };
    
    const demoSignin = document.getElementById('demo-signin');
    if (demoSignin) demoSignin.onclick = () => handleDemoSignIn();
    
    const signoutLink = document.getElementById('signout-link');
    if (signoutLink) signoutLink.onclick = () => handleSignOut();
}

function handleSignIn() {
    const email = document.getElementById('signin-email').value;
    const password = document.getElementById('signin-password').value;
    const user = demoUsers.find(u => u.email === email && u.password === password);
    if (user) {
        currentUser = user;
        document.getElementById('signin-modal').style.display = 'none';
        updateUIForLoggedInUser(user);
        showNotification(`Welcome back, ${user.firstName}!`);
    } else {
        alert('Invalid credentials. Try demo@twinfarm.com / demo123');
    }
}

function handleSignUp() {
    const firstName = document.getElementById('signup-firstname').value;
    const lastName = document.getElementById('signup-lastname').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const confirm = document.getElementById('signup-confirm').value;
    if (password !== confirm) { alert('Passwords do not match'); return; }
    const newUser = { email, password, firstName, lastName, farmSize: document.getElementById('signup-farm-size').value };
    demoUsers.push(newUser);
    currentUser = newUser;
    document.getElementById('signup-modal').style.display = 'none';
    updateUIForLoggedInUser(newUser);
    showNotification(`Welcome to TwinFarm, ${firstName}!`);
}

function handleDemoSignIn() {
    currentUser = demoUsers[0];
    document.getElementById('signin-modal').style.display = 'none';
    updateUIForLoggedInUser(currentUser);
    showNotification('Welcome to the TwinFarm Demo! Explore the realistic 3D farm.');
}

function handleSignOut() {
    currentUser = null;
    const authBtns = document.getElementById('auth-buttons');
    const userIndicator = document.getElementById('user-indicator');
    if (authBtns) authBtns.style.display = 'flex';
    if (userIndicator) userIndicator.style.display = 'none';
    showNotification('You have been signed out.');
}

function updateUIForLoggedInUser(user) {
    const authBtns = document.getElementById('auth-buttons');
    const userIndicator = document.getElementById('user-indicator');
    if (authBtns) authBtns.style.display = 'none';
    if (userIndicator) {
        userIndicator.style.display = 'flex';
        const userNameSpan = document.getElementById('user-name');
        if (userNameSpan) userNameSpan.textContent = user.firstName;
    }
}

// ==================== NAVIGATION ====================
function initializeNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.section');
    
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
            const targetId = this.getAttribute('href');
            const target = document.querySelector(targetId);
            if (target) {
                window.scrollTo({ top: target.offsetTop - 80, behavior: 'smooth' });
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