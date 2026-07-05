// ============ STATE ============
let currentShot = 0;
let photos = [null, null, null, null];
let selectedFrame = 'classic';
let selectedFilter = 'none';
let selectedFaceFilter = 'none';
let gallery = JSON.parse(localStorage.getItem('photoboothGallery') || '[]');

// PeerJS / WebRTC state
let peer = null;
let myPeerId = null;
let roomCode = null;
let conn = null; // Data connection for sync
let myStream = null;
let isHost = false;
let partnerConnected = false;

// Three.js + MediaPipe state
let faceMeshInstance = null;
let threeScene = null;
let threeRenderer = null;
let threeCamera = null;
let filterObject = null;

// ============ INITIALIZE ============
document.addEventListener('DOMContentLoaded', () => {
    createFloatingHearts();
    document.getElementById('stripDate').textContent = new Date().toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
    });
    renderGallery();
    initThreeScene();
});

// ============ FLOATING HEARTS ============
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

// ============ THREE.JS SETUP ============
function initThreeScene() {
    const canvas = document.getElementById('threeCanvas1');
    const container = document.getElementById('myCamera');

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    threeScene = scene;
    threeRenderer = renderer;
    threeCamera = camera;

    window.addEventListener('resize', () => {
        const newWidth = container.clientWidth;
        const newHeight = container.clientHeight;
        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(newWidth, newHeight);
    });

    animateThree();
}

function animateThree() {
    requestAnimationFrame(animateThree);
    if (threeRenderer && threeScene && threeCamera) {
        threeRenderer.render(threeScene, threeCamera);
    }
}

// ============ FILTER OBJECTS ============
function createFilterObject(filterType) {
    const group = new THREE.Group();

    switch (filterType) {
        case 'sunglasses':
            const lensGeom = new THREE.BoxGeometry(0.8, 0.3, 0.1);
            const lensMat = new THREE.MeshPhongMaterial({ color: 0x111111, transparent: true, opacity: 0.8, shininess: 100 });
            const leftLens = new THREE.Mesh(lensGeom, lensMat);
            leftLens.position.set(-0.5, 0, 0);
            const rightLens = new THREE.Mesh(lensGeom, lensMat);
            rightLens.position.set(0.5, 0, 0);
            const bridgeGeom = new THREE.BoxGeometry(0.3, 0.05, 0.05);
            const bridgeMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
            const bridge = new THREE.Mesh(bridgeGeom, bridgeMat);
            bridge.position.set(0, 0.05, 0);
            const frameGeom = new THREE.TorusGeometry(0.45, 0.05, 8, 20);
            const frameMat = new THREE.MeshPhongMaterial({ color: 0xFFD700, shininess: 100 });
            const leftFrame = new THREE.Mesh(frameGeom, frameMat);
            leftFrame.position.set(-0.5, 0, 0);
            const rightFrame = new THREE.Mesh(frameGeom, frameMat);
            rightFrame.position.set(0.5, 0, 0);
            group.add(leftLens, rightLens, bridge, leftFrame, rightFrame);
            break;

        case 'dog':
            const earGeom = new THREE.ConeGeometry(0.3, 0.6, 4);
            const earMat = new THREE.MeshPhongMaterial({ color: 0x8B4513 });
            const leftEar = new THREE.Mesh(earGeom, earMat);
            leftEar.position.set(-0.6, 0.8, 0);
            leftEar.rotation.z = 0.3;
            const rightEar = new THREE.Mesh(earGeom, earMat);
            rightEar.position.set(0.6, 0.8, 0);
            rightEar.rotation.z = -0.3;
            const noseGeom = new THREE.SphereGeometry(0.15, 16, 16);
            const noseMat = new THREE.MeshPhongMaterial({ color: 0x000000 });
            const nose = new THREE.Mesh(noseGeom, noseMat);
            nose.position.set(0, -0.3, 0.2);
            const tongueGeom = new THREE.BoxGeometry(0.15, 0.2, 0.05);
            const tongueMat = new THREE.MeshPhongMaterial({ color: 0xFF69B4 });
            const tongue = new THREE.Mesh(tongueGeom, tongueMat);
            tongue.position.set(0, -0.5, 0.1);
            tongue.rotation.x = 0.3;
            group.add(leftEar, rightEar, nose, tongue);
            break;

        case 'crown':
            const crownBaseGeom = new THREE.CylinderGeometry(0.6, 0.7, 0.3, 8);
            const crownMat = new THREE.MeshPhongMaterial({ color: 0xFFD700, shininess: 100, emissive: 0xFFD700, emissiveIntensity: 0.2 });
            const crownBase = new THREE.Mesh(crownBaseGeom, crownMat);
            crownBase.position.set(0, 0.8, 0);
            for (let i = 0; i < 5; i++) {
                const pointGeom = new THREE.ConeGeometry(0.1, 0.4, 4);
                const point = new THREE.Mesh(pointGeom, crownMat);
                const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
                point.position.set(Math.cos(angle) * 0.5, 1.1, Math.sin(angle) * 0.2);
                group.add(point);
            }
            const jewelGeom = new THREE.SphereGeometry(0.08, 8, 8);
            const jewelMat = new THREE.MeshPhongMaterial({ color: 0xFF0000, shininess: 200, emissive: 0xFF0000, emissiveIntensity: 0.3 });
            for (let i = 0; i < 3; i++) {
                const jewel = new THREE.Mesh(jewelGeom, jewelMat);
                jewel.position.set((i - 1) * 0.3, 0.8, 0.35);
                group.add(jewel);
            }
            group.add(crownBase);
            break;

        case 'hearts':
            const heartShape = new THREE.Shape();
            heartShape.moveTo(0, 0);
            heartShape.bezierCurveTo(0, -0.1, -0.2, -0.2, -0.2, -0.3);
            heartShape.bezierCurveTo(-0.2, -0.5, 0, -0.6, 0, -0.7);
            heartShape.bezierCurveTo(0, -0.6, 0.2, -0.5, 0.2, -0.3);
            heartShape.bezierCurveTo(0.2, -0.2, 0, -0.1, 0, 0);
            const heartGeom = new THREE.ExtrudeGeometry(heartShape, { depth: 0.05, bevelEnabled: false });
            const heartMat = new THREE.MeshPhongMaterial({ color: 0xFF69B4, emissive: 0xFF1493, emissiveIntensity: 0.2 });
            for (let i = 0; i < 6; i++) {
                const heart = new THREE.Mesh(heartGeom, heartMat);
                const angle = (i / 6) * Math.PI * 2;
                heart.position.set(Math.cos(angle) * 0.8, Math.sin(angle) * 0.5 + 0.2, 0);
                heart.scale.set(0.3, 0.3, 0.3);
                heart.rotation.z = Math.PI;
                heart.userData = { originalY: heart.position.y, speed: 0.02 + Math.random() * 0.02, offset: Math.random() * Math.PI * 2 };
                group.add(heart);
            }
            break;

        case 'cat':
            const catEarGeom = new THREE.ConeGeometry(0.25, 0.5, 3);
            const catEarMat = new THREE.MeshPhongMaterial({ color: 0xFF69B4 });
            const catLeftEar = new THREE.Mesh(catEarGeom, catEarMat);
            catLeftEar.position.set(-0.5, 0.9, 0);
            catLeftEar.rotation.z = 0.2;
            const catRightEar = new THREE.Mesh(catEarGeom, catEarMat);
            catRightEar.position.set(0.5, 0.9, 0);
            catRightEar.rotation.z = -0.2;
            const whiskerGeom = new THREE.BoxGeometry(0.4, 0.02, 0.02);
            const whiskerMat = new THREE.MeshPhongMaterial({ color: 0xFFFFFF });
            const whisker1 = new THREE.Mesh(whiskerGeom, whiskerMat);
            whisker1.position.set(-0.5, -0.2, 0.2);
            whisker1.rotation.z = 0.1;
            const whisker2 = new THREE.Mesh(whiskerGeom, whiskerMat);
            whisker2.position.set(0.5, -0.2, 0.2);
            whisker2.rotation.z = -0.1;
            const catNoseGeom = new THREE.SphereGeometry(0.08, 8, 8);
            const catNoseMat = new THREE.MeshPhongMaterial({ color: 0xFF69B4 });
            const catNose = new THREE.Mesh(catNoseGeom, catNoseMat);
            catNose.position.set(0, -0.25, 0.2);
            group.add(catLeftEar, catRightEar, whisker1, whisker2, catNose);
            break;

        case 'glasses3d':
            const roundFrameGeom = new THREE.TorusGeometry(0.35, 0.04, 8, 24);
            const roundFrameMat = new THREE.MeshPhongMaterial({ color: 0xFF1493, shininess: 100 });
            const roundLeft = new THREE.Mesh(roundFrameGeom, roundFrameMat);
            roundLeft.position.set(-0.45, 0, 0);
            const roundRight = new THREE.Mesh(roundFrameGeom, roundFrameMat);
            roundRight.position.set(0.45, 0, 0);
            const lensGeom2 = new THREE.CircleGeometry(0.32, 24);
            const lensMat2 = new THREE.MeshPhongMaterial({ color: 0x87CEEB, transparent: true, opacity: 0.3, side: THREE.DoubleSide });
            const lensLeft = new THREE.Mesh(lensGeom2, lensMat2);
            lensLeft.position.set(-0.45, 0, 0);
            const lensRight = new THREE.Mesh(lensGeom2, lensMat2);
            lensRight.position.set(0.45, 0, 0);
            const bridgeGeom2 = new THREE.BoxGeometry(0.25, 0.04, 0.04);
            const bridge2 = new THREE.Mesh(bridgeGeom2, roundFrameMat);
            bridge2.position.set(0, 0.05, 0);
            group.add(roundLeft, roundRight, lensLeft, lensRight, bridge2);
            break;

        case 'bunny':
            const bunnyEarGeom = new THREE.CylinderGeometry(0.08, 0.15, 0.8, 8);
            const bunnyEarMat = new THREE.MeshPhongMaterial({ color: 0xFFFFFF });
            const bunnyInnerMat = new THREE.MeshPhongMaterial({ color: 0xFFB6C1 });
            const bunnyLeftEar = new THREE.Mesh(bunnyEarGeom, bunnyEarMat);
            bunnyLeftEar.position.set(-0.4, 1.0, 0);
            bunnyLeftEar.rotation.z = 0.15;
            const bunnyRightEar = new THREE.Mesh(bunnyEarGeom, bunnyEarMat);
            bunnyRightEar.position.set(0.4, 1.0, 0);
            bunnyRightEar.rotation.z = -0.15;
            const innerEarGeom = new THREE.CylinderGeometry(0.04, 0.1, 0.6, 8);
            const bunnyLeftInner = new THREE.Mesh(innerEarGeom, bunnyInnerMat);
            bunnyLeftInner.position.set(-0.4, 1.0, 0.05);
            bunnyLeftInner.rotation.z = 0.15;
            const bunnyRightInner = new THREE.Mesh(innerEarGeom, bunnyInnerMat);
            bunnyRightInner.position.set(0.4, 1.0, 0.05);
            bunnyRightInner.rotation.z = -0.15;
            const bunnyNoseGeom = new THREE.SphereGeometry(0.06, 8, 8);
            const bunnyNoseMat = new THREE.MeshPhongMaterial({ color: 0xFFB6C1 });
            const bunnyNose = new THREE.Mesh(bunnyNoseGeom, bunnyNoseMat);
            bunnyNose.position.set(0, -0.3, 0.2);
            group.add(bunnyLeftEar, bunnyRightEar, bunnyLeftInner, bunnyRightInner, bunnyNose);
            break;
    }

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    group.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 2);
    group.add(directionalLight);

    return group;
}

function updateFilterAnimation(filterType, group, time) {
    if (filterType === 'hearts') {
        group.children.forEach((child) => {
            if (child.userData && child.userData.speed) {
                child.position.y = child.userData.originalY + Math.sin(time * child.userData.speed + child.userData.offset) * 0.1;
                child.rotation.y += 0.01;
            }
        });
    }
}

// ============ PEERJS / WEBRTC ============
function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 5; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

async function createRoom() {
    roomCode = generateRoomCode();
    isHost = true;

    showToast('Creating room...');

    // Initialize PeerJS
    peer = new Peer(roomCode, {
        host: '0.peerjs.com',
        port: 443,
        path: '/',
        secure: true
    });

    peer.on('open', (id) => {
        myPeerId = id;
        console.log('Host peer ID:', id);
        showRoomUI();
        updateStatus('waiting', 'Waiting for partner...');
        showToast(`Room created! Code: ${roomCode}`);
    });

    peer.on('connection', (connection) => {
        conn = connection;
        setupDataConnection();
    });

    peer.on('call', async (call) => {
        call.answer(myStream);
        call.on('stream', (remoteStream) => {
            document.getElementById('partnerVideo').srcObject = remoteStream;
            document.getElementById('partnerPlaceholder').style.display = 'none';
            document.getElementById('partnerVideo').style.display = 'block';
            partnerConnected = true;
            updateStatus('connected', 'Connected! 💕');
            updateSnapButton();
        });
    });

    peer.on('error', (err) => {
        console.error('PeerJS error:', err);
        showToast('Connection error. Try again.');
    });

    // Start local camera
    await startLocalCamera();
}

async function joinRoom() {
    const input = document.getElementById('roomCodeInput');
    roomCode = input.value.trim().toUpperCase();

    if (!roomCode || roomCode.length < 4) {
        showToast('Please enter a valid room code');
        return;
    }

    isHost = false;
    showToast('Joining room...');

    // Initialize PeerJS with random ID
    peer = new Peer({
        host: '0.peerjs.com',
        port: 443,
        path: '/',
        secure: true
    });

    peer.on('open', async (id) => {
        myPeerId = id;
        console.log('Joiner peer ID:', id);

        // Start local camera first
        await startLocalCamera();

        // Connect to host
        conn = peer.connect(roomCode);
        setupDataConnection();

        // Call host
        const call = peer.call(roomCode, myStream);
        call.on('stream', (remoteStream) => {
            document.getElementById('partnerVideo').srcObject = remoteStream;
            document.getElementById('partnerPlaceholder').style.display = 'none';
            document.getElementById('partnerVideo').style.display = 'block';
            partnerConnected = true;
            updateStatus('connected', 'Connected! 💕');
            updateSnapButton();
        });

        call.on('error', (err) => {
            console.error('Call error:', err);
            showToast('Failed to connect video. Check room code.');
        });

        showRoomUI();
        updateStatus('connecting', 'Connecting...');
    });

    peer.on('error', (err) => {
        console.error('PeerJS error:', err);
        showToast('Connection error. Check room code and try again.');
    });
}

function setupDataConnection() {
    conn.on('open', () => {
        console.log('Data connection opened');
        partnerConnected = true;
        updateStatus('connected', 'Connected! 💕');
        updateSnapButton();
    });

    conn.on('data', (data) => {
        handlePeerData(data);
    });

    conn.on('close', () => {
        partnerConnected = false;
        updateStatus('disconnected', 'Partner disconnected');
        updateSnapButton();
        showToast('Partner left the room');
    });

    conn.on('error', (err) => {
        console.error('Data connection error:', err);
    });
}

function handlePeerData(data) {
    switch (data.type) {
        case 'countdown':
            startLocalCountdown();
            break;
        case 'flash':
            triggerLocalFlash();
            break;
        case 'filter':
            // Optional: sync filters
            break;
    }
}

function sendToPeer(data) {
    if (conn && conn.open) {
        conn.send(data);
    }
}

// ============ CAMERA ============
async function startLocalCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
            audio: false
        });

        myStream = stream;
        const video = document.getElementById('myVideo');
        video.srcObject = stream;
        document.getElementById('myPlaceholder').style.display = 'none';
        video.style.display = 'block';

        // Initialize MediaPipe
        await initFaceMesh(stream);

        updateSnapButton();
    } catch (err) {
        console.error('Camera error:', err);
        showToast('Could not access camera. Please allow permissions.');
    }
}

// ============ MEDIAPIPE FACE MESH ============
async function initFaceMesh(videoElement) {
    const faceMesh = new FaceMesh({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
    });

    faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });

    faceMesh.onResults((results) => {
        onFaceMeshResults(results);
    });

    faceMeshInstance = faceMesh;

    // Process frames
    const camera = new Camera(videoElement, {
        onFrame: async () => {
            await faceMesh.send({ image: videoElement });
        },
        width: 640,
        height: 480
    });

    camera.start();
}

function onFaceMeshResults(results) {
    if (!threeScene) return;

    if (filterObject) {
        threeScene.remove(filterObject);
        filterObject = null;
    }

    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0 && selectedFaceFilter !== 'none') {
        const landmarks = results.multiFaceLandmarks[0];
        const filterGroup = createFilterObject(selectedFaceFilter);

        const noseTip = landmarks[1];
        const leftEye = landmarks[33];
        const rightEye = landmarks[263];

        const faceWidth = Math.abs(rightEye.x - leftEye.x);
        const x = (noseTip.x - 0.5) * 10;
        const y = -(noseTip.y - 0.5) * 10;

        filterGroup.position.set(x, y, 0);
        const scale = faceWidth * 8;
        filterGroup.scale.set(scale, scale, scale);

        const faceAngle = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);
        filterGroup.rotation.z = -faceAngle;

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

        updateFilterAnimation(selectedFaceFilter, filterGroup, Date.now() * 0.001);

        threeScene.add(filterGroup);
        filterObject = filterGroup;
    }
}

// ============ UI FUNCTIONS ============
function showRoomUI() {
    document.getElementById('roomSection').style.display = 'none';
    document.getElementById('connectedRoom').style.display = 'block';
    document.getElementById('displayRoomCode').textContent = roomCode;
}

function updateStatus(status, text) {
    const dot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');

    dot.className = 'status-dot';
    if (status === 'connected') dot.classList.add('connected');
    else if (status === 'connecting' || status === 'waiting') dot.classList.add('connecting');

    statusText.textContent = text;
}

function copyRoomCode() {
    navigator.clipboard.writeText(roomCode).then(() => {
        showToast('Room code copied! 📋');
    });
}

function leaveRoom() {
    if (conn) conn.close();
    if (peer) peer.destroy();
    if (myStream) myStream.getTracks().forEach(t => t.stop());

    // Reset UI
    document.getElementById('roomSection').style.display = 'flex';
    document.getElementById('connectedRoom').style.display = 'none';
    document.getElementById('roomCodeInput').value = '';

    // Reset video elements
    document.getElementById('myVideo').style.display = 'none';
    document.getElementById('myPlaceholder').style.display = 'flex';
    document.getElementById('partnerVideo').style.display = 'none';
    document.getElementById('partnerPlaceholder').style.display = 'flex';

    partnerConnected = false;
    myStream = null;
    conn = null;
    peer = null;

    showToast('Left room');
}

function updateSnapButton() {
    const btn = document.getElementById('snapBtn');
    // Enable if local camera is ready AND partner is connected
    btn.disabled = !(myStream && partnerConnected);
}

// ============ PHOTO CAPTURE ============
async function takePhoto() {
    if (currentShot >= 4) {
        showToast('Strip complete! Download or reset.');
        return;
    }

    // Send countdown signal to peer
    sendToPeer({ type: 'countdown' });

    // Start local countdown
    await startLocalCountdown();
}

async function startLocalCountdown() {
    const myCountdown = document.getElementById('myCountdown');
    const partnerCountdown = document.getElementById('partnerCountdown');
    const myCountNum = document.getElementById('myCountNum');
    const partnerCountNum = document.getElementById('partnerCountNum');

    myCountdown.classList.add('active');
    partnerCountdown.classList.add('active');

    for (let i = 3; i > 0; i--) {
        myCountNum.textContent = i;
        partnerCountNum.textContent = i;
        myCountNum.style.animation = 'none';
        partnerCountNum.style.animation = 'none';
        myCountNum.offsetHeight;
        partnerCountNum.offsetHeight;
        myCountNum.style.animation = 'countPulse 0.8s ease-out';
        partnerCountNum.style.animation = 'countPulse 0.8s ease-out';
        await sleep(1000);
    }

    myCountdown.classList.remove('active');
    partnerCountdown.classList.remove('active');

    // Flash
    document.getElementById('myFlash').classList.add('flash');
    document.getElementById('partnerFlash').classList.add('flash');
    setTimeout(() => {
        document.getElementById('myFlash').classList.remove('flash');
        document.getElementById('partnerFlash').classList.remove('flash');
    }, 300);

    // Send flash signal
    sendToPeer({ type: 'flash' });

    await capturePhoto();
}

function triggerLocalFlash() {
    document.getElementById('myFlash').classList.add('flash');
    document.getElementById('partnerFlash').classList.add('flash');
    setTimeout(() => {
        document.getElementById('myFlash').classList.remove('flash');
        document.getElementById('partnerFlash').classList.remove('flash');
    }, 300);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function capturePhoto() {
    const canvas = document.getElementById('processCanvas');
    const ctx = canvas.getContext('2d');
    const myVideo = document.getElementById('myVideo');
    const partnerVideo = document.getElementById('partnerVideo');
    const threeCanvas = document.getElementById('threeCanvas1');

    const width = 800;
    const height = 300;
    canvas.width = width;
    canvas.height = height;

    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, width, height);

    // Draw my video (left half)
    if (myVideo.readyState >= 2) {
        ctx.drawImage(myVideo, 0, 0, width / 2, height);
        if (selectedFaceFilter !== 'none' && threeCanvas) {
            ctx.drawImage(threeCanvas, 0, 0, width / 2, height);
        }
    } else {
        ctx.fillStyle = '#e0e0e0';
        ctx.fillRect(0, 0, width / 2, height);
    }

    // Draw partner video (right half)
    if (partnerVideo.readyState >= 2) {
        ctx.drawImage(partnerVideo, width / 2, 0, width / 2, height);
    } else {
        ctx.fillStyle = '#e0e0e0';
        ctx.fillRect(width / 2, 0, width / 2, height);
    }

    // Divider
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.stroke();

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
    if (selectedFilter === 'none') return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    switch (selectedFilter) {
        case 'grayscale':
            for (let i = 0; i < data.length; i += 4) {
                const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
                data[i] = gray; data[i + 1] = gray; data[i + 2] = gray;
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
                data[i] = val; data[i + 1] = val; data[i + 2] = val;
            }
            break;
    }
    ctx.putImageData(imageData, 0, 0);
}

// ============ SELECTORS ============
function selectFaceFilter(filter) {
    selectedFaceFilter = filter;
    document.querySelectorAll('.face-filter-option').forEach(el => el.classList.remove('selected'));
    document.querySelector(`[data-filter="${filter}"]`).classList.add('selected');
    showToast(filter === 'none' ? 'Filter removed' : `Filter: ${filter} 🎭`);
}

function selectFrame(frame) {
    selectedFrame = frame;
    document.querySelectorAll('.frame-option').forEach(el => el.classList.remove('selected'));
    document.querySelector(`[data-frame="${frame}"]`).classList.add('selected');
    document.getElementById('photoStrip').className = `photo-strip frame-${frame}`;
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
    document.getElementById('downloadBtn').disabled = true;

    for (let i = 1; i <= 4; i++) {
        document.getElementById(`slot${i}`).innerHTML = `<div class="empty-slot">${i}</div>`;
    }

    showToast('Strip reset! Ready for new photos 📸');
}

// ============ DOWNLOAD ============
async function downloadStrip() {
    const canvas = document.getElementById('processCanvas');
    const ctx = canvas.getContext('2d');

    const stripWidth = 600;
    const photoHeight = 200;
    const padding = 30;
    const footerHeight = 80;
    const stripHeight = padding * 2 + photoHeight * 4 + 30 + footerHeight;

    canvas.width = stripWidth;
    canvas.height = stripHeight;

    const frameColors = {
        'classic': '#FFF8F0', 'pink': '#FFE4E1', 'blue': '#E0F4FF',
        'peach': '#FFE5CC', 'lavender': '#E6E6FA', 'mint': '#E0F2E9',
        'dark': '#2C2C2C', 'rainbow': null, 'stars': '#1a1a2e',
        'vintage': '#F5E6D3', 'sakura': '#FFEEF5'
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
                img.onload = () => { ctx.drawImage(img, padding, y, photoWidth, photoHeight); resolve(); };
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
    ctx.fillText(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), stripWidth / 2, footerY + 20);

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
    const item = { id: Date.now(), image: dataUrl, date: new Date().toISOString(), frame: selectedFrame };
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
            <div class="gallery-overlay">${new Date(item.date).toLocaleDateString()}</div>
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

// Keyboard shortcut
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && currentShot < 4 && partnerConnected) {
        e.preventDefault();
        takePhoto();
    }
});