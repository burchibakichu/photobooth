// State
let currentShot = 0;
let photos = [null, null, null, null];
let selectedFrame = 'classic';
let selectedFilter = 'none';
let selectedFaceFilter = 'none';
let streams = [null, null];
let gallery = JSON.parse(localStorage.getItem('photoboothGallery') || '[]');

// Three.js + MediaPipe state
let faceMesh1, faceMesh2;
let threeScenes = [null, null];
let threeRenderers = [null, null];
let threeCameras = [null, null];
let filterObjects = [null, null];
let isFaceFilterActive = false;

let cameraMode = 'dual';

// Set camera mode
function setCameraMode(mode) {
    cameraMode = mode;
    const cameraSection = document.querySelector('.camera-section');
    const dualBtn = document.getElementById('dualModeBtn');
    const singleBtn = document.getElementById('singleModeBtn');
    const hint = document.getElementById('modeHint');

    if (mode === 'single') {
        cameraSection.classList.add('single-camera');
        singleBtn.classList.add('active');
        dualBtn.classList.remove('active');
        hint.textContent = 'Perfect for one webcam — you both take turns posing!';

        // Stop camera 2 if running
        if (streams[1]) {
            streams[1].getTracks().forEach(track => track.stop());
            streams[1] = null;
            document.getElementById('video2').style.display = 'none';
            document.getElementById('placeholder2').style.display = 'flex';
        }

        // Update snap button to only need camera 1
        updateSnapButton();
        showToast('Single camera mode activated! 👤');
    } else {
        cameraSection.classList.remove('single-camera');
        dualBtn.classList.add('active');
        singleBtn.classList.remove('active');
        hint.textContent = 'Perfect for two webcams or when your together';
        updateSnapButton();
        showToast('Dual camera mode activated! 👥');
    }
}



// Initialize
document.addEventListener('DOMContentLoaded', () => {
    createFloatingHearts();
    document.getElementById('stripDate').textContent = new Date().toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
    });
    renderGallery();

    // Initialize Three.js scenes for both cameras
    initThreeScene(1);
    initThreeScene(2);
});

// Create floating hearts
function createFloatingHearts() {
    const container = document.getElementById('heartsBg');
    const hearts = ['💕', '💖', '💗', '💓', '💝'];
    for (let i = 0; i < 15; i++) {
        const heart = document.createElement('div');
        heart.className = 'heart-float';
        heart.textContent = hearts[Math.floor(Math.random() * hearts.length)];
        heart.style.left = Math.random() * 100 + '%';
        heart.style.animationDelay = Math.random() * 8 + 's';
        heart.style.animationDuration = (6 + Math.random() * 4) + 's';
        container.appendChild(heart);
    }
}

// Initialize Three.js scene
function initThreeScene(cameraNum) {
    const canvas = document.getElementById(`threeCanvas${cameraNum}`);
    const container = document.getElementById(`camera${cameraNum}`);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    threeScenes[cameraNum - 1] = scene;
    threeRenderers[cameraNum - 1] = renderer;
    threeCameras[cameraNum - 1] = camera;

    // Handle resize
    window.addEventListener('resize', () => {
        const newWidth = container.clientWidth;
        const newHeight = container.clientHeight;
        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(newWidth, newHeight);
    });

    animate(cameraNum);
}

// Animation loop
function animate(cameraNum) {
    requestAnimationFrame(() => animate(cameraNum));

    const renderer = threeRenderers[cameraNum - 1];
    const scene = threeScenes[cameraNum - 1];
    const camera = threeCameras[cameraNum - 1];

    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

// Create filter objects
function createFilterObject(filterType) {
    const group = new THREE.Group();

    switch (filterType) {
        case 'sunglasses':
            // 3D Sunglasses
            const lensGeom = new THREE.BoxGeometry(0.8, 0.3, 0.1);
            const lensMat = new THREE.MeshPhongMaterial({ 
                color: 0x111111, 
                transparent: true, 
                opacity: 0.8,
                shininess: 100
            });

            const leftLens = new THREE.Mesh(lensGeom, lensMat);
            leftLens.position.set(-0.5, 0, 0);

            const rightLens = new THREE.Mesh(lensGeom, lensMat);
            rightLens.position.set(0.5, 0, 0);

            // Bridge
            const bridgeGeom = new THREE.BoxGeometry(0.3, 0.05, 0.05);
            const bridgeMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
            const bridge = new THREE.Mesh(bridgeGeom, bridgeMat);
            bridge.position.set(0, 0.05, 0);

            // Frames
            const frameGeom = new THREE.TorusGeometry(0.45, 0.05, 8, 20);
            const frameMat = new THREE.MeshPhongMaterial({ color: 0xFFD700, shininess: 100 });

            const leftFrame = new THREE.Mesh(frameGeom, frameMat);
            leftFrame.position.set(-0.5, 0, 0);

            const rightFrame = new THREE.Mesh(frameGeom, frameMat);
            rightFrame.position.set(0.5, 0, 0);

            group.add(leftLens, rightLens, bridge, leftFrame, rightFrame);
            break;

        case 'dog':
            // Dog ears
            const earGeom = new THREE.ConeGeometry(0.3, 0.6, 4);
            const earMat = new THREE.MeshPhongMaterial({ color: 0x8B4513 });

            const leftEar = new THREE.Mesh(earGeom, earMat);
            leftEar.position.set(-0.6, 0.8, 0);
            leftEar.rotation.z = 0.3;

            const rightEar = new THREE.Mesh(earGeom, earMat);
            rightEar.position.set(0.6, 0.8, 0);
            rightEar.rotation.z = -0.3;

            // Dog nose
            const noseGeom = new THREE.SphereGeometry(0.15, 16, 16);
            const noseMat = new THREE.MeshPhongMaterial({ color: 0x000000 });
            const nose = new THREE.Mesh(noseGeom, noseMat);
            nose.position.set(0, -0.3, 0.2);

            // Tongue
            const tongueGeom = new THREE.BoxGeometry(0.15, 0.2, 0.05);
            const tongueMat = new THREE.MeshPhongMaterial({ color: 0xFF69B4 });
            const tongue = new THREE.Mesh(tongueGeom, tongueMat);
            tongue.position.set(0, -0.5, 0.1);
            tongue.rotation.x = 0.3;

            group.add(leftEar, rightEar, nose, tongue);
            break;

        case 'crown':
            // Crown
            const crownBaseGeom = new THREE.CylinderGeometry(0.6, 0.7, 0.3, 8);
            const crownMat = new THREE.MeshPhongMaterial({ 
                color: 0xFFD700, 
                shininess: 100,
                emissive: 0xFFD700,
                emissiveIntensity: 0.2
            });
            const crownBase = new THREE.Mesh(crownBaseGeom, crownMat);
            crownBase.position.set(0, 0.8, 0);

            // Crown points
            for (let i = 0; i < 5; i++) {
                const pointGeom = new THREE.ConeGeometry(0.1, 0.4, 4);
                const point = new THREE.Mesh(pointGeom, crownMat);
                const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
                point.position.set(
                    Math.cos(angle) * 0.5,
                    1.1,
                    Math.sin(angle) * 0.2
                );
                group.add(point);
            }

            // Jewels
            const jewelGeom = new THREE.SphereGeometry(0.08, 8, 8);
            const jewelMat = new THREE.MeshPhongMaterial({ 
                color: 0xFF0000, 
                shininess: 200,
                emissive: 0xFF0000,
                emissiveIntensity: 0.3
            });

            for (let i = 0; i < 3; i++) {
                const jewel = new THREE.Mesh(jewelGeom, jewelMat);
                jewel.position.set((i - 1) * 0.3, 0.8, 0.35);
                group.add(jewel);
            }

            group.add(crownBase);
            break;

        case 'hearts':
            // Floating hearts around face
            const heartShape = new THREE.Shape();
            heartShape.moveTo(0, 0);
            heartShape.bezierCurveTo(0, -0.1, -0.2, -0.2, -0.2, -0.3);
            heartShape.bezierCurveTo(-0.2, -0.5, 0, -0.6, 0, -0.7);
            heartShape.bezierCurveTo(0, -0.6, 0.2, -0.5, 0.2, -0.3);
            heartShape.bezierCurveTo(0.2, -0.2, 0, -0.1, 0, 0);

            const heartGeom = new THREE.ExtrudeGeometry(heartShape, { depth: 0.05, bevelEnabled: false });
            const heartMat = new THREE.MeshPhongMaterial({ 
                color: 0xFF69B4,
                emissive: 0xFF1493,
                emissiveIntensity: 0.2
            });

            for (let i = 0; i < 6; i++) {
                const heart = new THREE.Mesh(heartGeom, heartMat);
                const angle = (i / 6) * Math.PI * 2;
                heart.position.set(
                    Math.cos(angle) * 0.8,
                    Math.sin(angle) * 0.5 + 0.2,
                    0
                );
                heart.scale.set(0.3, 0.3, 0.3);
                heart.rotation.z = Math.PI;
                heart.userData = { 
                    originalY: heart.position.y,
                    speed: 0.02 + Math.random() * 0.02,
                    offset: Math.random() * Math.PI * 2
                };
                group.add(heart);
            }
            break;

        case 'cat':
            // Cat ears
            const catEarGeom = new THREE.ConeGeometry(0.25, 0.5, 3);
            const catEarMat = new THREE.MeshPhongMaterial({ color: 0xFF69B4 });

            const catLeftEar = new THREE.Mesh(catEarGeom, catEarMat);
            catLeftEar.position.set(-0.5, 0.9, 0);
            catLeftEar.rotation.z = 0.2;

            const catRightEar = new THREE.Mesh(catEarGeom, catEarMat);
            catRightEar.position.set(0.5, 0.9, 0);
            catRightEar.rotation.z = -0.2;

            // Whiskers
            const whiskerGeom = new THREE.BoxGeometry(0.4, 0.02, 0.02);
            const whiskerMat = new THREE.MeshPhongMaterial({ color: 0xFFFFFF });

            const whisker1 = new THREE.Mesh(whiskerGeom, whiskerMat);
            whisker1.position.set(-0.5, -0.2, 0.2);
            whisker1.rotation.z = 0.1;

            const whisker2 = new THREE.Mesh(whiskerGeom, whiskerMat);
            whisker2.position.set(0.5, -0.2, 0.2);
            whisker2.rotation.z = -0.1;

            // Nose
            const catNoseGeom = new THREE.SphereGeometry(0.08, 8, 8);
            const catNoseMat = new THREE.MeshPhongMaterial({ color: 0xFF69B4 });
            const catNose = new THREE.Mesh(catNoseGeom, catNoseMat);
            catNose.position.set(0, -0.25, 0.2);

            group.add(catLeftEar, catRightEar, whisker1, whisker2, catNose);
            break;

        case 'glasses3d':
            // 3D Round glasses
            const roundFrameGeom = new THREE.TorusGeometry(0.35, 0.04, 8, 24);
            const roundFrameMat = new THREE.MeshPhongMaterial({ 
                color: 0xFF1493, 
                shininess: 100 
            });

            const roundLeft = new THREE.Mesh(roundFrameGeom, roundFrameMat);
            roundLeft.position.set(-0.45, 0, 0);

            const roundRight = new THREE.Mesh(roundFrameGeom, roundFrameMat);
            roundRight.position.set(0.45, 0, 0);

            // Lenses
            const lensGeom2 = new THREE.CircleGeometry(0.32, 24);
            const lensMat2 = new THREE.MeshPhongMaterial({ 
                color: 0x87CEEB, 
                transparent: true, 
                opacity: 0.3,
                side: THREE.DoubleSide
            });

            const lensLeft = new THREE.Mesh(lensGeom2, lensMat2);
            lensLeft.position.set(-0.45, 0, 0);

            const lensRight = new THREE.Mesh(lensGeom2, lensMat2);
            lensRight.position.set(0.45, 0, 0);

            // Bridge
            const bridgeGeom2 = new THREE.BoxGeometry(0.25, 0.04, 0.04);
            const bridge2 = new THREE.Mesh(bridgeGeom2, roundFrameMat);
            bridge2.position.set(0, 0.05, 0);

            group.add(roundLeft, roundRight, lensLeft, lensRight, bridge2);
            break;

        case 'bunny':
            // Bunny ears (longer than cat)
            const bunnyEarGeom = new THREE.CylinderGeometry(0.08, 0.15, 0.8, 8);
            const bunnyEarMat = new THREE.MeshPhongMaterial({ color: 0xFFFFFF });
            const bunnyInnerMat = new THREE.MeshPhongMaterial({ color: 0xFFB6C1 });

            const bunnyLeftEar = new THREE.Mesh(bunnyEarGeom, bunnyEarMat);
            bunnyLeftEar.position.set(-0.4, 1.0, 0);
            bunnyLeftEar.rotation.z = 0.15;

            const bunnyRightEar = new THREE.Mesh(bunnyEarGeom, bunnyEarMat);
            bunnyRightEar.position.set(0.4, 1.0, 0);
            bunnyRightEar.rotation.z = -0.15;

            // Inner ear
            const innerEarGeom = new THREE.CylinderGeometry(0.04, 0.1, 0.6, 8);
            const bunnyLeftInner = new THREE.Mesh(innerEarGeom, bunnyInnerMat);
            bunnyLeftInner.position.set(-0.4, 1.0, 0.05);
            bunnyLeftInner.rotation.z = 0.15;

            const bunnyRightInner = new THREE.Mesh(innerEarGeom, bunnyInnerMat);
            bunnyRightInner.position.set(0.4, 1.0, 0.05);
            bunnyRightInner.rotation.z = -0.15;

            // Nose
            const bunnyNoseGeom = new THREE.SphereGeometry(0.06, 8, 8);
            const bunnyNoseMat = new THREE.MeshPhongMaterial({ color: 0xFFB6C1 });
            const bunnyNose = new THREE.Mesh(bunnyNoseGeom, bunnyNoseMat);
            bunnyNose.position.set(0, -0.3, 0.2);

            group.add(bunnyLeftEar, bunnyRightEar, bunnyLeftInner, bunnyRightInner, bunnyNose);
            break;
    }

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    group.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 2);
    group.add(directionalLight);

    return group;
}

// Update filter animation (for floating effects)
function updateFilterAnimation(filterType, group, time) {
    if (filterType === 'hearts') {
        group.children.forEach((child, i) => {
            if (child.userData && child.userData.speed) {
                child.position.y = child.userData.originalY + 
                    Math.sin(time * child.userData.speed + child.userData.offset) * 0.1;
                child.rotation.y += 0.01;
            }
        });
    }
}

// Start camera with MediaPipe
async function startCamera(num) {
    try {
        const video = document.getElementById(`video${num}`);
        const placeholder = document.getElementById(`placeholder${num}`);

        const constraints = {
            video: { 
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'user'
            },
            audio: false
        };

        if (num === 2) {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(d => d.kind === 'videoinput');
            if (videoDevices.length > 1) {
                constraints.video.deviceId = { exact: videoDevices[1].deviceId };
            }
        }

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streams[num - 1] = stream;
        video.srcObject = stream;
        placeholder.style.display = 'none';
        video.style.display = 'block';

        // Initialize MediaPipe face mesh for this camera
        await initFaceMesh(num, video);

        updateSnapButton();
    } catch (err) {
        showToast('Could not access camera. Please allow camera permissions.');
        console.error('Camera error:', err);
    }
}

// Initialize MediaPipe Face Mesh
async function initFaceMesh(cameraNum, videoElement) {
    const faceMesh = new FaceMesh({
        locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
        }
    });

    faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });

    faceMesh.onResults((results) => {
        onFaceMeshResults(cameraNum, results);
    });

    if (cameraNum === 1) {
        faceMesh1 = faceMesh;
    } else {
        faceMesh2 = faceMesh;
    }

    // Start processing frames
    const camera = new Camera(videoElement, {
        onFrame: async () => {
            await faceMesh.send({ image: videoElement });
        },
        width: 640,
        height: 480
    });

    camera.start();
}

// Handle face mesh results
function onFaceMeshResults(cameraNum, results) {
    const scene = threeScenes[cameraNum - 1];
    const renderer = threeRenderers[cameraNum - 1];
    const camera = threeCameras[cameraNum - 1];

    if (!scene || !renderer || !camera) return;

    // Clear previous filter objects
    if (filterObjects[cameraNum - 1]) {
        scene.remove(filterObjects[cameraNum - 1]);
    }

    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        const landmarks = results.multiFaceLandmarks[0];

        if (selectedFaceFilter !== 'none') {
            // Create filter object
            const filterGroup = createFilterObject(selectedFaceFilter);

            // Position based on face landmarks
            // Landmark 1 is nose tip, 10 is forehead, 152 is chin
            const noseTip = landmarks[1];
            const forehead = landmarks[10];
            const leftEye = landmarks[33];
            const rightEye = landmarks[263];

            // Calculate face position and scale
            const faceWidth = Math.abs(rightEye.x - leftEye.x);
            const faceHeight = Math.abs(forehead.y - landmarks[152].y);

            // Convert MediaPipe normalized coords to Three.js world coords
            // MediaPipe: x [0,1] left-to-right, y [0,1] top-to-bottom
            // Three.js: x [-1,1] left-to-right, y [-1,1] bottom-to-top
            const x = (noseTip.x - 0.5) * 10;
            const y = -(noseTip.y - 0.5) * 10;
            const z = 0;

            filterGroup.position.set(x, y, z);

            // Scale based on face size
            const scale = faceWidth * 8;
            filterGroup.scale.set(scale, scale, scale);

            // Rotate based on face angle
            const eyeMidpoint = {
                x: (leftEye.x + rightEye.x) / 2,
                y: (leftEye.y + rightEye.y) / 2
            };
            const faceAngle = Math.atan2(
                rightEye.y - leftEye.y,
                rightEye.x - leftEye.x
            );
            filterGroup.rotation.z = -faceAngle;

            // Adjust Y position based on filter type
            switch (selectedFaceFilter) {
                case 'sunglasses':
                case 'glasses3d':
                    filterGroup.position.y = -(landmarks[33].y - 0.5) * 10;
                    break;
                case 'dog':
                case 'cat':
                case 'bunny':
                    filterGroup.position.y = y + 0.3;
                    break;
                case 'crown':
                    filterGroup.position.y = y + 0.8;
                    break;
                case 'hearts':
                    filterGroup.position.y = y;
                    break;
            }

            // Update animation
            updateFilterAnimation(selectedFaceFilter, filterGroup, Date.now() * 0.001);

            scene.add(filterGroup);
            filterObjects[cameraNum - 1] = filterGroup;
        }
    }
}

// Select face filter
function selectFaceFilter(filter) {
    selectedFaceFilter = filter;
    document.querySelectorAll('.face-filter-option').forEach(el => el.classList.remove('selected'));
    document.querySelector(`[data-filter="${filter}"]`).classList.add('selected');

    if (filter !== 'none') {
        showToast(`Face filter activated: ${filter}! 🎭`);
    } else {
        showToast('Face filter removed');
    }
}

function updateSnapButton() {
    const btn = document.getElementById('snapBtn');
    if (cameraMode === 'single') {
        btn.disabled = !streams[0];
    } else {
        btn.disabled = !(streams[0] || streams[1]);
    }
}

// Take photo with countdown
async function takePhoto() {
    if (currentShot >= 4) {
        showToast('Strip complete! Download or reset to start over.');
        return;
    }

    const countdown1 = document.getElementById('countdown1');
    const countdown2 = document.getElementById('countdown2');
    const countNum1 = document.getElementById('countNum1');
    const countNum2 = document.getElementById('countNum2');

    countdown1.classList.add('active');
    countdown2.classList.add('active');

    for (let i = 3; i > 0; i--) {
        countNum1.textContent = i;
        countNum2.textContent = i;
        countNum1.style.animation = 'none';
        countNum2.style.animation = 'none';
        countNum1.offsetHeight;
        countNum2.offsetHeight;
        countNum1.style.animation = 'countPulse 0.8s ease-out';
        countNum2.style.animation = 'countPulse 0.8s ease-out';
        await sleep(1000);
    }

    countdown1.classList.remove('active');
    countdown2.classList.remove('active');

    document.getElementById('flash1').classList.add('flash');
    document.getElementById('flash2').classList.add('flash');
    setTimeout(() => {
        document.getElementById('flash1').classList.remove('flash');
        document.getElementById('flash2').classList.remove('flash');
    }, 300);

    await capturePhoto();
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function capturePhoto() {
    const canvas = document.getElementById('processCanvas');
    const ctx = canvas.getContext('2d');
    const video1 = document.getElementById('video1');
    const video2 = document.getElementById('video2');
    const threeCanvas1 = document.getElementById('threeCanvas1');
    const threeCanvas2 = document.getElementById('threeCanvas2');

    let width, height;

    if (cameraMode === 'single') {
        // Single camera: full width photo
        width = 600;
        height = 450;
        canvas.width = width;
        canvas.height = height;

        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, width, height);

        // Draw video 1 (full frame)
        if (video1.readyState >= 2) {
            ctx.drawImage(video1, 0, 0, width, height);

            // Draw Three.js overlay for camera 1 if active
            if (selectedFaceFilter !== 'none' && threeCanvas1) {
                ctx.drawImage(threeCanvas1, 0, 0, width, height);
            }
        } else {
            ctx.fillStyle = '#e0e0e0';
            ctx.fillRect(0, 0, width, height);
        }
    } else {
        // Dual camera: split screen
        width = 800;
        height = 300;
        canvas.width = width;
        canvas.height = height;

        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, width, height);

        // Draw video 1 (left half)
        if (video1.readyState >= 2) {
            ctx.drawImage(video1, 0, 0, width / 2, height);

            if (selectedFaceFilter !== 'none' && threeCanvas1) {
                ctx.drawImage(threeCanvas1, 0, 0, width / 2, height);
            }
        } else {
            ctx.fillStyle = '#e0e0e0';
            ctx.fillRect(0, 0, width / 2, height);
        }

        // Draw video 2 (right half)
        if (video2.readyState >= 2) {
            ctx.drawImage(video2, width / 2, 0, width / 2, height);

            if (selectedFaceFilter !== 'none' && threeCanvas2) {
                ctx.drawImage(threeCanvas2, width / 2, 0, width / 2, height);
            }
        } else {
            ctx.fillStyle = '#e0e0e0';
            ctx.fillRect(width / 2, 0, width / 2, height);
        }

        // Divider line
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(width / 2, 0);
        ctx.lineTo(width / 2, height);
        ctx.stroke();
    }

    applyCanvasFilter(ctx, canvas);

    const dataUrl = canvas.toDataURL('image/png');
    photos[currentShot] = dataUrl;

    const slot = document.getElementById(`slot${currentShot + 1}`);
    slot.innerHTML = `<img src="${dataUrl}" alt="Shot ${currentShot + 1}">`;

    currentShot++;
    document.getElementById('currentShot').textContent = currentShot;
    const dots = document.querySelectorAll('.shot-counter .dot');
    dots[currentShot - 1].classList.add('taken');

    if (currentShot === 4) {
        document.getElementById('downloadBtn').disabled = false;
        showToast('Photo strip complete! 🎉');
    } else {
        showToast(`Shot ${currentShot} captured! 📸`);
    }
}

function applyCanvasFilter(ctx, canvas) {
    const filterMap = {
        'none': 'none',
        'grayscale': 'grayscale(100%)',
        'sepia': 'sepia(100%)',
        'warm': 'saturate(1.3) brightness(1.1) contrast(0.9)',
        'cool': 'hue-rotate(180deg) saturate(0.8)',
        'soft': 'brightness(1.15) contrast(0.85) saturate(0.9)',
        'dramatic': 'contrast(1.4) saturate(1.2)',
        'retro': 'sepia(0.4) contrast(1.1) saturate(1.3)',
        'glow': 'brightness(1.2) saturate(1.1)',
        'noir': 'grayscale(100%) contrast(1.5) brightness(0.9)'
    };

    if (selectedFilter !== 'none') {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        switch (selectedFilter) {
            case 'grayscale':
                for (let i = 0; i < data.length; i += 4) {
                    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
                    data[i] = gray;
                    data[i + 1] = gray;
                    data[i + 2] = gray;
                }
                break;
            case 'sepia':
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i], g = data[i + 1], b = data[i + 2];
                    data[i] = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);
                    data[i + 1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168);
                    data[i + 2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131);
                }
                break;
            case 'warm':
                for (let i = 0; i < data.length; i += 4) {
                    data[i] = Math.min(255, data[i] * 1.1);
                    data[i + 1] = Math.min(255, data[i + 1] * 1.05);
                }
                break;
            case 'cool':
                for (let i = 0; i < data.length; i += 4) {
                    data[i + 2] = Math.min(255, data[i + 2] * 1.15);
                }
                break;
            case 'soft':
                for (let i = 0; i < data.length; i += 4) {
                    data[i] = Math.min(255, data[i] * 1.1);
                    data[i + 1] = Math.min(255, data[i + 1] * 1.1);
                    data[i + 2] = Math.min(255, data[i + 2] * 1.1);
                }
                break;
            case 'dramatic':
                for (let i = 0; i < data.length; i += 4) {
                    data[i] = Math.min(255, (data[i] - 128) * 1.4 + 128);
                    data[i + 1] = Math.min(255, (data[i + 1] - 128) * 1.4 + 128);
                    data[i + 2] = Math.min(255, (data[i + 2] - 128) * 1.4 + 128);
                }
                break;
            case 'retro':
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i], g = data[i + 1], b = data[i + 2];
                    data[i] = Math.min(255, r * 0.9 + g * 0.2 + b * 0.1);
                    data[i + 1] = Math.min(255, r * 0.1 + g * 0.9 + b * 0.1);
                    data[i + 2] = Math.min(255, r * 0.1 + g * 0.2 + b * 0.9);
                }
                break;
            case 'glow':
                for (let i = 0; i < data.length; i += 4) {
                    data[i] = Math.min(255, data[i] * 1.15);
                    data[i + 1] = Math.min(255, data[i + 1] * 1.15);
                    data[i + 2] = Math.min(255, data[i + 2] * 1.15);
                }
                break;
            case 'noir':
                for (let i = 0; i < data.length; i += 4) {
                    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
                    const val = (gray - 128) * 1.5 + 128;
                    data[i] = val;
                    data[i + 1] = val;
                    data[i + 2] = val;
                }
                break;
        }
        ctx.putImageData(imageData, 0, 0);
    }
}

function selectFrame(frame) {
    selectedFrame = frame;
    document.querySelectorAll('.frame-option').forEach(el => el.classList.remove('selected'));
    document.querySelector(`[data-frame="${frame}"]`).classList.add('selected');

    const strip = document.getElementById('photoStrip');
    strip.className = `photo-strip frame-${frame}`;
}

function selectFilter(filter) {
    selectedFilter = filter;
    document.querySelectorAll('.filter-option').forEach(el => el.classList.remove('selected'));
    document.querySelector(`[data-filter="${filter}"]`).classList.add('selected');
}

function resetStrip() {
    currentShot = 0;
    photos = [null, null, null, null];
    document.getElementById('currentShot').textContent = '0';
    document.querySelectorAll('.shot-counter .dot').forEach(d => d.classList.remove('taken'));
    document.getElementById('downloadBtn').disabled = false;

    for (let i = 1; i <= 4; i++) {
        document.getElementById(`slot${i}`).innerHTML = `<div class="empty-slot">${i}</div>`;
    }

    showToast('Strip reset! Ready for new photos 📸');
}

async function downloadStrip() {
    const canvas = document.getElementById('processCanvas');
    const ctx = canvas.getContext('2d');

    const stripWidth = 600;
    const photoHeight = cameraMode === 'single' ? 300 : 200;
    const padding = 30;
    const footerHeight = 80;
    const stripHeight = padding * 2 + photoHeight * 4 + 30 + footerHeight;

    canvas.width = stripWidth;
    canvas.height = stripHeight;

    const frameColors = {
        'classic': '#FFF8F0',
        'pink': '#FFE4E1',
        'blue': '#E0F4FF',
        'peach': '#FFE5CC',
        'lavender': '#E6E6FA',
        'mint': '#E0F2E9',
        'dark': '#2C2C2C',
        'rainbow': null,
        'stars': '#1a1a2e',
        'vintage': '#F5E6D3',
        'sakura': '#FFEEF5'
    };

    if (selectedFrame === 'rainbow') {
        const gradient = ctx.createLinearGradient(0, 0, 0, stripHeight);
        gradient.addColorStop(0, '#FFB6C1');
        gradient.addColorStop(0.33, '#FFDAB9');
        gradient.addColorStop(0.66, '#B8E6D4');
        gradient.addColorStop(1, '#A8D8EA');
        ctx.fillStyle = gradient;
    } else {
        ctx.fillStyle = frameColors[selectedFrame] || '#FFF8F0';
    }
    ctx.fillRect(0, 0, stripWidth, stripHeight);

    const photoWidth = stripWidth - padding * 2;
    const gap = 10;

    for (let i = 0; i < 4; i++) {
        const y = padding + i * (photoHeight + gap);

        if (photos[i]) {
            const img = new Image();
            img.src = photos[i];
            await new Promise(resolve => {
                img.onload = () => {
                    ctx.drawImage(img, padding, y, photoWidth, photoHeight);
                    resolve();
                };
                img.onerror = resolve;
            });
        } else {
            ctx.fillStyle = '#e0e0e0';
            ctx.fillRect(padding, y, photoWidth, photoHeight);
        }

        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.lineWidth = 1;
        ctx.strokeRect(padding, y, photoWidth, photoHeight);
    }

    const footerY = padding + 4 * (photoHeight + gap) + 10;
    const isDark = ['dark', 'stars'].includes(selectedFrame);
    ctx.fillStyle = isDark ? '#fff' : '#888';
    ctx.font = '300 14px Poppins, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(new Date().toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
    }), stripWidth / 2, footerY + 20);

    ctx.fillStyle = isDark ? '#FFB6C1' : '#FF8FAB';
    ctx.font = '24px Pacifico, cursive';
    ctx.fillText('You + Me 💕', stripWidth / 2, footerY + 50);

    const link = document.createElement('a');
    link.download = `our-photobooth-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();

    saveToGallery(canvas.toDataURL('image/png'));
    showToast('Strip downloaded! 💾');
}

function downloadIndividual() {
    photos.forEach((photo, index) => {
        if (photo) {
            const link = document.createElement('a');
            link.download = `our-photo-${index + 1}-${Date.now()}.png`;
            link.href = photo;
            link.click();
        }
    });
    showToast('Individual photos downloaded! 📥');
}

function saveToGallery(dataUrl) {
    const item = {
        id: Date.now(),
        image: dataUrl,
        date: new Date().toISOString(),
        frame: selectedFrame
    };
    gallery.unshift(item);
    if (gallery.length > 20) gallery = gallery.slice(0, 20);
    localStorage.setItem('photoboothGallery', JSON.stringify(gallery));
    renderGallery();
}

function renderGallery() {
    const grid = document.getElementById('galleryGrid');
    if (gallery.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #ccc; padding: 40px;">No photos yet. Take some! 📸</p>';
        return;
    }

    grid.innerHTML = gallery.map(item => `
        <div class="gallery-item" onclick="openModal('${item.image}')">
            <img src="${item.image}" alt="Photo">
            <div class="gallery-overlay">
                ${new Date(item.date).toLocaleDateString()}
            </div>
        </div>
    `).join('');
}

function openModal(src) {
    document.getElementById('modalImage').src = src;
    document.getElementById('imageModal').classList.add('active');
}

function closeModal() {
    document.getElementById('imageModal').classList.remove('active');
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && currentShot < 4) {
        e.preventDefault();
        takePhoto();
    }
});