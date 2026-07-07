import * as THREE from 'three';

// ============ إعداد المشهد ============
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // لون السماء
scene.fog = new THREE.Fog(0x87CEEB, 30, 80);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 8, 15);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// ============ إضاءة ============
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
sunLight.position.set(15, 20, 10);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 1024;
sunLight.shadow.mapSize.height = 1024;
sunLight.shadow.camera.near = 0.5;
sunLight.shadow.camera.far = 100;
sunLight.shadow.camera.left = -20;
sunLight.shadow.camera.right = 20;
sunLight.shadow.camera.top = 20;
sunLight.shadow.camera.bottom = -20;
scene.add(sunLight);

// ============ أرضية ============
const groundGeometry = new THREE.PlaneGeometry(50, 50);
const groundMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x4CAF50,
    roughness: 0.8,
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// شبكة على الأرض للتأثير البصري
const gridHelper = new THREE.GridHelper(50, 50, 0xffffff, 0xffffff);
gridHelper.material.opacity = 0.1;
gridHelper.material.transparent = true;
scene.add(gridHelper);

// ============ اللاعب (شخصية) ============
const playerGroup = new THREE.Group();

// جسم اللاعب
const bodyGeometry = new THREE.CapsuleGeometry(0.5, 1, 4, 8);
const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x3498db });
const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
body.position.y = 1;
body.castShadow = true;
playerGroup.add(body);

// رأس اللاعب
const headGeometry = new THREE.SphereGeometry(0.4, 16, 16);
const headMaterial = new THREE.MeshStandardMaterial({ color: 0xFFDBB4 });
const head = new THREE.Mesh(headGeometry, headMaterial);
head.position.y = 1.9;
head.castShadow = true;
playerGroup.add(head);

// قبعة
const hatGeometry = new THREE.CylinderGeometry(0.3, 0.4, 0.3, 8);
const hatMaterial = new THREE.MeshStandardMaterial({ color: 0xE74C3C });
const hat = new THREE.Mesh(hatGeometry, hatMaterial);
hat.position.y = 2.2;
hat.castShadow = true;
playerGroup.add(hat);

playerGroup.position.set(0, 0, 0);
scene.add(playerGroup);

// ============ مكعبات للتجميع ============
const collectibles = [];
const collectibleGeometry = new THREE.OctahedronGeometry(0.4);
const collectibleMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xFFD700,
    emissive: 0xFFD700,
    emissiveIntensity: 0.3,
    metalness: 0.5,
    roughness: 0.2,
});

for (let i = 0; i < 15; i++) {
    const collectible = new THREE.Mesh(collectibleGeometry, collectibleMaterial);
    collectible.position.set(
        (Math.random() - 0.5) * 20,
        0.5,
        (Math.random() - 0.5) * 20
    );
    collectible.castShadow = true;
    collectible.userData = { collected: false, floatOffset: Math.random() * Math.PI * 2 };
    scene.add(collectible);
    collectibles.push(collectible);
}

// ============ أشجار للزينة ============
function createTree(x, z) {
    const treeGroup = new THREE.Group();
    
    const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.3, 2, 8);
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = 1;
    trunk.castShadow = true;
    treeGroup.add(trunk);
    
    const leavesGeometry = new THREE.ConeGeometry(0.8, 1.5, 8);
    const leavesMaterial = new THREE.MeshStandardMaterial({ color: 0x2E7D32 });
    const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
    leaves.position.y = 2.5;
    leaves.castShadow = true;
    treeGroup.add(leaves);
    
    treeGroup.position.set(x, 0, z);
    scene.add(treeGroup);
}

// زرع أشجار عشوائية
for (let i = 0; i < 20; i++) {
    createTree(
        (Math.random() - 0.5) * 40,
        (Math.random() - 0.5) * 40
    );
}

// ============ حالة اللعبة ============
let score = 0;
const scoreDisplay = document.getElementById('score');
const keys = {};
const playerSpeed = 0.15;

// ============ التحكم ============
window.addEventListener('keydown', (e) => { keys[e.key.toLowerCase()] = true; });
window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

// تحكم باللمس للجوال
let touchActive = false;
let touchDirection = { x: 0, y: 0 };

window.addEventListener('touchstart', (e) => {
    e.preventDefault();
    touchActive = true;
});

window.addEventListener('touchend', () => {
    touchActive = false;
    touchDirection = { x: 0, y: 0 };
});

window.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!touchActive) return;
    const touch = e.touches[0];
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    touchDirection.x = (touch.clientX - centerX) / centerX;
    touchDirection.y = (touch.clientY - centerY) / centerY;
});

// ============ تتبع الكاميرا ============
function updateCamera() {
    const targetX = playerGroup.position.x;
    const targetZ = playerGroup.position.z;
    camera.position.x += (targetX - camera.position.x) * 0.05;
    camera.position.z += (targetZ + 15 - camera.position.z) * 0.05;
    camera.lookAt(targetX, 0, targetZ);
}

// ============ حلقة اللعبة ============
function animate() {
    requestAnimationFrame(animate);
    
    // حركة اللاعب
    let moveX = 0;
    let moveZ = 0;
    
    if (keys['arrowup'] || keys['w']) moveZ = -playerSpeed;
    if (keys['arrowdown'] || keys['s']) moveZ = playerSpeed;
    if (keys['arrowleft'] || keys['a']) moveX = -playerSpeed;
    if (keys['arrowright'] || keys['d']) moveX = playerSpeed;
    
    // حركة باللمس
    if (touchActive) {
        moveX = touchDirection.x * playerSpeed;
        moveZ = touchDirection.y * playerSpeed;
    }
    
    playerGroup.position.x += moveX;
    playerGroup.position.z += moveZ;
    
    // حدود العالم
    playerGroup.position.x = Math.max(-23, Math.min(23, playerGroup.position.x));
    playerGroup.position.z = Math.max(-23, Math.min(23, playerGroup.position.z));
    
    // تدوير اللاعب باتجاه الحركة
    if (moveX !== 0 || moveZ !== 0) {
        const angle = Math.atan2(moveX, moveZ);
        playerGroup.rotation.y += (angle - playerGroup.rotation.y) * 0.2;
    }
    
    // تحديث المكعبات
    const now = Date.now() * 0.001;
    collectibles.forEach((c) => {
        if (!c.userData.collected) {
            c.rotation.y += 0.02;
            c.position.y = 0.5 + Math.sin(now * 3 + c.userData.floatOffset) * 0.2;
            
            // فحص الاصطدام
            const dist = playerGroup.position.distanceTo(c.position);
            if (dist < 1.5) {
                c.userData.collected = true;
                c.visible = false;
                score += 10;
                scoreDisplay.textContent = score;
                
                // إعادة ظهور بعد فترة
                setTimeout(() => {
                    c.userData.collected = false;
                    c.visible = true;
                    c.position.set(
                        (Math.random() - 0.5) * 20,
                        0.5,
                        (Math.random() - 0.5) * 20
                    );
                }, 3000);
            }
        }
    });
    
    updateCamera();
    renderer.render(scene, camera);
}

// ============ تكبير النافذة ============
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ============ بدء اللعبة ============
animate();
