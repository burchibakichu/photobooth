// State
let currentShot = 0;
let photos = [null, null, null, null];
let selectedFrame = 'classic';
let selectedFilter = 'none';
let streams = [null, null];
let gallery = JSON.parse(localStorage.getItem('photoboothGallery') || '[]');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    createFloatingHearts();
    document.getElementById('stripDate').textContent = new Date().toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
    });
    renderGallery();
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

// Start camera
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

        updateSnapButton();
    } catch (err) {
        showToast('Could not access camera. Please allow camera permissions.');
        console.error('Camera error:', err);
    }
}

function updateSnapButton() {
    const btn = document.getElementById('snapBtn');
    btn.disabled = !(streams[0] || streams[1]);
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

    const width = 800;
    const height = 300;
    canvas.width = width;
    canvas.height = height;

    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, width, height);

    if (video1.readyState >= 2) {
        ctx.drawImage(video1, 0, 0, width / 2, height);
    } else {
        ctx.fillStyle = '#e0e0e0';
        ctx.fillRect(0, 0, width / 2, height);
    }

    if (video2.readyState >= 2) {
        ctx.drawImage(video2, width / 2, 0, width / 2, height);
    } else {
        ctx.fillStyle = '#e0e0e0';
        ctx.fillRect(width / 2, 0, width / 2, height);
    }

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

// Select frame
function selectFrame(frame) {
    selectedFrame = frame;
    document.querySelectorAll('.frame-option').forEach(el => el.classList.remove('selected'));
    document.querySelector(`[data-frame="${frame}"]`).classList.add('selected');
    
    const strip = document.getElementById('photoStrip');
    strip.className = `photo-strip frame-${frame}`;
}

// Select filter
function selectFilter(filter) {
    selectedFilter = filter;
    document.querySelectorAll('.filter-option').forEach(el => el.classList.remove('selected'));
    document.querySelector(`[data-filter="${filter}"]`).classList.add('selected');
}

// Reset strip
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

// Download strip
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

// Download individual photos
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

// Save to gallery
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

// Render gallery
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

// Modal
function openModal(src) {
    document.getElementById('modalImage').src = src;
    document.getElementById('imageModal').classList.add('active');
}

function closeModal() {
    document.getElementById('imageModal').classList.remove('active');
}

// Toast
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// Keyboard shortcut
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && currentShot < 4) {
        e.preventDefault();
        takePhoto();
    }
});