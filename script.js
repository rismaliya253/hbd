let blowCount = 0;
const flame = document.getElementById('flame');
const message = document.getElementById('wishMessage');
const micStatus = document.getElementById('micStatus');
const fireParticlesContainer = document.getElementById('fireParticles');
const smokePuffElement = document.getElementById('smokePuff'); // Dapatkan elemen asap

let audioContext;
let analyser;
let micSource;
let isExtinguished = false;
let blowDetectedTimer; // Untuk melacak durasi tiupan
const BLOW_THRESHOLD_VOLUME = 90; // Volume minimum untuk dianggap tiupan
const SUSTAINED_BLOW_DURATION = 700; // Durasi tiupan (ms) agar api padam
const PARTICLE_EMIT_INTERVAL = 55; // Interval emisi partikel saat ditiup (ms)
let particleInterval; // Variabel untuk menyimpan interval emisi partikel

async function initMic() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStatus.textContent = "🎤 Microphone is active. Blow to extinguish!";
        detectBlow(stream);
    } catch (err) {
        micStatus.textContent = "🚫 Microphone access denied. Please allow microphone access to blow the candle.";
        console.error("Error accessing microphone:", err);
    }
}

function createFireParticle() {
    const particle = document.createElement('div');
    particle.classList.add('fire-particle');
    // Posisi awal partikel di sekitar dasar api
    const startX = Math.random() * 10 - 5; // -5 to 5
    const startY = Math.random() * 5; // 0 to 5
    particle.style.left = `${50 + startX / 15 * 100}%`; // Konversi ke % relatif
    particle.style.top = `${-15 + startY}px`;
    particle.style.width = `${Math.random() * 5 + 3}px`;
    particle.style.height = `${Math.random() * 8 + 5}px`;

    // Arah "terbang" partikel saat ditiup
    const dx = (Math.random() - 0.5) * 60; // -30 to 30px horizontal displacement
    const dy = - (Math.random() * 40 + 30); // -30 to -70px vertical displacement
    particle.style.setProperty('--dx', `${dx}px`);
    particle.style.setProperty('--dy', `${dy}px`);

    fireParticlesContainer.appendChild(particle);

    // Hapus partikel setelah animasinya selesai
    particle.addEventListener('animationend', () => {
        particle.remove();
    });
}

function emitParticles() {
    // Stop any existing interval before starting a new one
    clearInterval(particleInterval);
    particleInterval = setInterval(createFireParticle, PARTICLE_EMIT_INTERVAL);
}

function stopEmittingParticles() {
    clearInterval(particleInterval);
}

function detectBlow(stream) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    micSource = audioContext.createMediaStreamSource(stream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256; // Ukuran FFT yang lebih kecil untuk respons lebih cepat
    analyser.smoothingTimeConstant = 0.7; // Agak lebih responsif

    micSource.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    function analyze() {
        if (isExtinguished) {
            // Pastikan untuk memutuskan semua koneksi audio jika lilin padam
            if (micSource) micSource.disconnect();
            if (analyser) analyser.disconnect();
            if (audioContext) audioContext.close();
            return;
        }

        analyser.getByteFrequencyData(dataArray);
        const volume = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length;

        if (volume > BLOW_THRESHOLD_VOLUME) {
            // Tiupan terdeteksi
            if (!flame.classList.contains('blowing')) {
                flame.classList.add('blowing'); // Aktifkan animasi "tertiup"
                emitParticles(); // Mulai memancarkan partikel
                // Mulai timer untuk memadamkan api jika tiupan berlanjut
                blowDetectedTimer = setTimeout(() => {
                    extinguishFlame();
                }, SUSTAINED_BLOW_DURATION);
            }
        } else {
            // Tidak ada tiupan atau tiupan berhenti
            if (flame.classList.contains('blowing')) {
                flame.classList.remove('blowing'); // Nonaktifkan animasi "tertiup"
                stopEmittingParticles(); // Hentikan emisi partikel
                clearTimeout(blowDetectedTimer); // Hapus timer pemadaman
            }
        }

        requestAnimationFrame(analyze);
    }

    analyze();
}

function extinguishFlame() {
    if (isExtinguished) return; // Mencegah pemadaman ganda

    flame.classList.remove('blowing'); // Pastikan animasi blowing dihapus
    flame.classList.add('extinguished'); // Aktifkan kelas padam
    isExtinguished = true;

    stopEmittingParticles(); // Hentikan partikel sepenuhnya

    // Tampilkan pesan
    message.classList.remove('hidden');
    message.textContent = "Hore! Lilinnya padam! ";

    // Putar lagu ulang tahun
    const birthdaySong = document.getElementById('birthdaySong');
    birthdaySong.play().catch((error) => {
        console.warn("Autoplay prevented:", error);
    });

    // Animasi asap
    smokePuffElement.style.opacity = 1;
    smokePuffElement.style.animation = 'smoke-rise 1s forwards ease-out';

    // Putuskan koneksi mikrofon setelah padam
    if (micSource) micSource.disconnect();
    if (analyser) analyser.disconnect();
    if (audioContext) audioContext.close();
}


window.onload = initMic;