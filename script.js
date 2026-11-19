/**
 * CELESTIAL HORIZONS - DAY TO NIGHT SCROLL ENGINE
 * Pure Vanilla JavaScript & HTML5 Canvas
 */

// Helper color interpolation utilities
function hexToRgb(hex) {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpColor(c1, c2, t) {
  const rgb1 = typeof c1 === 'string' ? hexToRgb(c1) : c1;
  const rgb2 = typeof c2 === 'string' ? hexToRgb(c2) : c2;
  return rgbToHex(
    lerp(rgb1.r, rgb2.r, t),
    lerp(rgb1.g, rgb2.g, t),
    lerp(rgb1.b, rgb2.b, t)
  );
}

// Multi-stop gradient color palette based on scroll progress (0.0: Noon -> 1.0: Midnight)
const skyStops = {
  // 0.0: High Summer Noon
  0.0: {
    top: '#38bdf8', // Azure Sky
    mid: '#7dd3fc', // Light Blue
    bot: '#fef08a', // Warm Golden Sunshine Horizon
    distTop: '#93c5fd', distBot: '#bfdbfe',
    midTop: '#3b82f6', midBot: '#60a5fa',
    nearTop: '#1d4ed8', nearBot: '#2563eb',
    foreTop: '#1e3a8a', foreBot: '#0f172a'
  },
  // 0.35: Late Golden Afternoon
  0.35: {
    top: '#0284c7',
    mid: '#f59e0b',
    bot: '#fed7aa',
    distTop: '#818cf8', distBot: '#a5b4fc',
    midTop: '#4f46e5', midBot: '#6366f1',
    nearTop: '#312e81', nearBot: '#3730a3',
    foreTop: '#1e1b4b', foreBot: '#0f172a'
  },
  // 0.65: Sunset / Twilight (Vivid Crimson & Purple)
  0.65: {
    top: '#311042',
    mid: '#9a1b5d',
    bot: '#ea580c',
    distTop: '#581c87', distBot: '#7e22ce',
    midTop: '#3b0764', midBot: '#6b21a8',
    nearTop: '#240443', nearBot: '#4c1d95',
    foreTop: '#110224', foreBot: '#05010a'
  },
  // 1.0: Deep Midnight Obsidian / Black
  1.0: {
    top: '#020617', // Obsidian Black
    mid: '#090d16', // Deep Midnight
    bot: '#0f172a', // Dark Starry Horizon
    distTop: '#1e293b', distBot: '#0f172a',
    midTop: '#131b2e', midBot: '#0a0f1d',
    nearTop: '#0b1120', nearBot: '#060a12',
    foreTop: '#030712', foreBot: '#000000'
  }
};

function getInterpolatedPalette(p) {
  const keys = [0.0, 0.35, 0.65, 1.0];
  let i = 0;
  while (i < keys.length - 1 && p > keys[i + 1]) {
    i++;
  }
  const k1 = keys[i];
  const k2 = keys[Math.min(i + 1, keys.length - 1)];
  const span = k2 - k1 || 1;
  const localT = (p - k1) / span;

  const s1 = skyStops[k1];
  const s2 = skyStops[k2];

  return {
    top: lerpColor(s1.top, s2.top, localT),
    mid: lerpColor(s1.mid, s2.mid, localT),
    bot: lerpColor(s1.bot, s2.bot, localT),
    distTop: lerpColor(s1.distTop, s2.distTop, localT),
    distBot: lerpColor(s1.distBot, s2.distBot, localT),
    midTop: lerpColor(s1.midTop, s2.midTop, localT),
    midBot: lerpColor(s1.midBot, s2.midBot, localT),
    nearTop: lerpColor(s1.nearTop, s2.nearTop, localT),
    nearBot: lerpColor(s1.nearBot, s2.nearBot, localT),
    foreTop: lerpColor(s1.foreTop, s2.foreTop, localT),
    foreBot: lerpColor(s1.foreBot, s2.foreBot, localT),
  };
}

// DOM Elements
const skyCanvas = document.getElementById('sky-canvas');
const skyCtx = skyCanvas.getContext('2d');
const particlesCanvas = document.getElementById('particles-canvas');
const partCtx = particlesCanvas.getContext('2d');

const sunEl = document.getElementById('sun-element');
const moonEl = document.getElementById('moon-element');
const birdsLayer = document.getElementById('birds-layer');
const scrollMeter = document.getElementById('scroll-meter');
const progressPercent = document.getElementById('progress-percent');
const timeBadge = document.getElementById('time-badge');
const timeText = document.getElementById('time-text');
const soundBtn = document.getElementById('sound-btn');
const timeToggleBtn = document.getElementById('time-toggle-btn');

// Mountain layers for parallax
const layerDistant = document.querySelector('.layer-distant');
const layerMid = document.querySelector('.layer-mid');
const layerNear = document.querySelector('.layer-near');
const layerForeground = document.querySelector('.layer-foreground');

// Dynamic Starfield Generation
const STARS_COUNT = 320;
const stars = [];

function initStars() {
  stars.length = 0;
  const w = skyCanvas.width;
  const h = skyCanvas.height;
  for (let i = 0; i < STARS_COUNT; i++) {
    stars.push({
      x: Math.random() * w,
      y: Math.random() * (h * 0.75), // Upper 75% of sky
      size: Math.random() * 2 + 0.5,
      baseAlpha: Math.random() * 0.7 + 0.3,
      twinkleSpeed: Math.random() * 0.05 + 0.015,
      phase: Math.random() * Math.PI * 2
    });
  }
}

// Shooting Stars / Meteors
const meteors = [];
function spawnMeteor() {
  if (Math.random() < 0.02 && currentProgress > 0.6) {
    const w = skyCanvas.width;
    const h = skyCanvas.height;
    meteors.push({
      x: Math.random() * w * 0.8,
      y: Math.random() * h * 0.35,
      len: Math.random() * 90 + 50,
      speed: Math.random() * 12 + 10,
      angle: Math.PI / 4 + (Math.random() - 0.5) * 0.2,
      opacity: 1
    });
  }
}

// Night Fireflies
const FIREFLIES_COUNT = 45;
const fireflies = [];
function initFireflies() {
  fireflies.length = 0;
  const w = particlesCanvas.width;
  const h = particlesCanvas.height;
  for (let i = 0; i < FIREFLIES_COUNT; i++) {
    fireflies.push({
      x: Math.random() * w,
      y: h * 0.6 + Math.random() * (h * 0.4),
      baseX: Math.random() * w,
      baseY: h * 0.65 + Math.random() * (h * 0.3),
      size: Math.random() * 3 + 1.5,
      angle: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.03 + 0.01,
      range: Math.random() * 40 + 20
    });
  }
}

// Window sizing
function handleResize() {
  skyCanvas.width = window.innerWidth;
  skyCanvas.height = window.innerHeight;
  particlesCanvas.width = window.innerWidth;
  particlesCanvas.height = window.innerHeight;
  initStars();
  initFireflies();
}
window.addEventListener('resize', handleResize);
handleResize();

// Smooth Scroll State Tracking
let targetProgress = 0;
let currentProgress = 0;

function calculateScrollProgress() {
  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  if (maxScroll <= 0) return 0;
  return Math.max(0, Math.min(1, scrollTop / maxScroll));
}

window.addEventListener('scroll', () => {
  targetProgress = calculateScrollProgress();
}, { passive: true });

// Time of Day labels
function getTimeLabel(p) {
  if (p < 0.2) return 'High Summer Noon';
  if (p < 0.45) return 'Golden Afternoon';
  if (p < 0.68) return 'Sunset Twilight';
  if (p < 0.85) return 'Dusk Horizon';
  return 'Starry Midnight';
}

// Main Render Loop
let animFrameTime = 0;

function renderSky(palette, p) {
  const w = skyCanvas.width;
  const h = skyCanvas.height;

  // 1. Draw Sky Gradient
  const grad = skyCtx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, palette.top);
  grad.addColorStop(0.55, palette.mid);
  grad.addColorStop(1, palette.bot);
  skyCtx.fillStyle = grad;
  skyCtx.fillRect(0, 0, w, h);

  // 2. Daytime Sun Ambient Bloom
  if (p < 0.65) {
    const sunGlowAlpha = (1 - p / 0.65) * 0.45;
    const sunBloom = skyCtx.createRadialGradient(w * 0.5, h * 0.25, 20, w * 0.5, h * 0.25, h * 0.85);
    sunBloom.addColorStop(0, `rgba(254, 240, 138, ${sunGlowAlpha})`);
    sunBloom.addColorStop(0.5, `rgba(251, 146, 60, ${sunGlowAlpha * 0.4})`);
    sunBloom.addColorStop(1, 'transparent');
    skyCtx.fillStyle = sunBloom;
    skyCtx.fillRect(0, 0, w, h);
  }

  // 3. Stars Rendering (Fades in as progress exceeds 0.4)
  const starAlpha = Math.max(0, Math.min(1, (p - 0.4) / 0.5));
  if (starAlpha > 0) {
    skyCtx.save();
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      s.phase += s.twinkleSpeed;
      const twinkle = Math.sin(s.phase) * 0.35 + 0.65;
      const alpha = s.baseAlpha * twinkle * starAlpha;
      skyCtx.fillStyle = `rgba(248, 250, 252, ${alpha})`;
      skyCtx.beginPath();
      skyCtx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      skyCtx.fill();
    }

    // 4. Meteors
    spawnMeteor();
    for (let m = meteors.length - 1; m >= 0; m--) {
      const meteor = meteors[m];
      const tailX = meteor.x - Math.cos(meteor.angle) * meteor.len;
      const tailY = meteor.y - Math.sin(meteor.angle) * meteor.len;

      const mGrad = skyCtx.createLinearGradient(meteor.x, meteor.y, tailX, tailY);
      mGrad.addColorStop(0, `rgba(255, 255, 255, ${meteor.opacity * starAlpha})`);
      mGrad.addColorStop(1, 'transparent');

      skyCtx.strokeStyle = mGrad;
      skyCtx.lineWidth = 2;
      skyCtx.beginPath();
      skyCtx.moveTo(meteor.x, meteor.y);
      skyCtx.lineTo(tailX, tailY);
      skyCtx.stroke();

      meteor.x += Math.cos(meteor.angle) * meteor.speed;
      meteor.y += Math.sin(meteor.angle) * meteor.speed;
      meteor.opacity -= 0.02;
      if (meteor.opacity <= 0) meteors.splice(m, 1);
    }
    skyCtx.restore();
  }
}

function renderFireflies(p) {
  partCtx.clearRect(0, 0, particlesCanvas.width, particlesCanvas.height);
  const flyAlpha = Math.max(0, Math.min(1, (p - 0.6) / 0.35));
  if (flyAlpha <= 0) return;

  partCtx.save();
  for (let f of fireflies) {
    f.angle += f.speed;
    f.x = f.baseX + Math.cos(f.angle) * f.range;
    f.y = f.baseY + Math.sin(f.angle * 1.5) * (f.range * 0.6);

    const glow = Math.sin(f.angle * 2.5) * 0.4 + 0.6;
    const radial = partCtx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.size * 3.5);
    radial.addColorStop(0, `rgba(167, 243, 208, ${glow * flyAlpha})`);
    radial.addColorStop(0.4, `rgba(52, 211, 153, ${glow * 0.6 * flyAlpha})`);
    radial.addColorStop(1, 'transparent');

    partCtx.fillStyle = radial;
    partCtx.beginPath();
    partCtx.arc(f.x, f.y, f.size * 3.5, 0, Math.PI * 2);
    partCtx.fill();
  }
  partCtx.restore();
}

function updateCelestialPositions(p) {
  // SUN BEHAVIOR:
  // Starts centered at 25% height.
  // As user scrolls, the Sun moves UPWARD and slightly arches left/right,
  // scaling down slightly and disappearing smoothly above the viewport into dusk.
  // Sun reaches 0 opacity by p = ~0.65.
  const sunY = -p * 550; // Translates upward up to -550px
  const sunScale = Math.max(0.65, 1 - p * 0.45);
  const sunOpacity = Math.max(0, Math.min(1, (0.6 - p) / 0.35));
  sunEl.style.transform = `translate3d(0, ${sunY}px, 0) scale(${sunScale})`;
  sunEl.style.opacity = sunOpacity.toFixed(3);

  // MOON BEHAVIOR:
  // Moon starts below or off-view (p < 0.4), then glides smoothly UPWARD into the firmament.
  // Reaches its peak position around p = 0.9 - 1.0.
  const moonStartProgress = 0.35;
  const moonProgress = Math.max(0, Math.min(1, (p - moonStartProgress) / (1 - moonStartProgress)));
  // Moon translates from 400px down to 0px
  const moonY = lerp(380, 0, Math.pow(moonProgress, 0.85));
  const moonOpacity = Math.max(0, Math.min(1, (p - 0.45) / 0.35));
  moonEl.style.transform = `translate3d(0, ${moonY}px, 0) scale(${lerp(0.8, 1.0, moonProgress)})`;
  moonEl.style.opacity = moonOpacity.toFixed(3);

  // BIRDS BEHAVIOR:
  // Birds soar during day, fade out completely as twilight arrives
  const birdOpacity = Math.max(0, Math.min(1, (0.55 - p) / 0.3));
  birdsLayer.style.opacity = birdOpacity.toFixed(3);

  // PARALLAX MOUNTAINS:
  // Gentle vertical depth shifting on scroll
  const scrollOffset = window.scrollY || 0;
  layerDistant.style.transform = `translate3d(0, ${scrollOffset * 0.04}px, 0)`;
  layerMid.style.transform = `translate3d(0, ${scrollOffset * 0.07}px, 0)`;
  layerNear.style.transform = `translate3d(0, ${scrollOffset * 0.11}px, 0)`;
  layerForeground.style.transform = `translate3d(0, ${scrollOffset * 0.15}px, 0)`;
}

function updateThemeVariables(palette, p) {
  const root = document.documentElement;

  // Update SVG Mountain dynamic stops
  root.style.setProperty('--dist-top', palette.distTop);
  root.style.setProperty('--dist-bot', palette.distBot);
  root.style.setProperty('--mid-top', palette.midTop);
  root.style.setProperty('--mid-bot', palette.midBot);
  root.style.setProperty('--near-top', palette.nearTop);
  root.style.setProperty('--near-bot', palette.nearBot);
  root.style.setProperty('--fore-top', palette.foreTop);
  root.style.setProperty('--fore-bot', palette.foreBot);

  // Card glassmorphic theme transitions
  if (p > 0.55) {
    // Night Mode Theme
    const nightT = (p - 0.55) / 0.45;
    root.style.setProperty('--card-bg', `rgba(15, 23, 42, ${lerp(0.75, 0.88, nightT)})`);
    root.style.setProperty('--card-border', `rgba(148, 163, 184, ${lerp(0.2, 0.35, nightT)})`);
    root.style.setProperty('--card-shadow', '0 25px 50px -12px rgba(0, 0, 0, 0.7)');
    root.style.setProperty('--text-main', '#f8fafc');
    root.style.setProperty('--text-muted', '#cbd5e1');
    root.style.setProperty('--tag-bg', 'rgba(99, 102, 241, 0.25)');
    root.style.setProperty('--tag-text', '#a5b4fc');
    root.style.setProperty('--accent-color', '#818cf8');
  } else {
    // Day Mode Theme
    root.style.setProperty('--card-bg', 'rgba(255, 255, 255, 0.72)');
    root.style.setProperty('--card-border', 'rgba(255, 255, 255, 0.85)');
    root.style.setProperty('--card-shadow', '0 20px 40px -15px rgba(234, 88, 12, 0.15)');
    root.style.setProperty('--text-main', '#0f172a');
    root.style.setProperty('--text-muted', '#334155');
    root.style.setProperty('--tag-bg', 'rgba(245, 158, 11, 0.18)');
    root.style.setProperty('--tag-text', '#b45309');
    root.style.setProperty('--accent-color', '#f59e0b');
  }

  // Update HUD
  const percentText = Math.round(p * 100) + '%';
  progressPercent.textContent = percentText;
  scrollMeter.style.width = percentText;
  timeText.textContent = getTimeLabel(p);
}

// Animation loop
function tick(timestamp) {
  animFrameTime = timestamp;

  // Smooth lerp for scroll physics
  currentProgress = lerp(currentProgress, targetProgress, 0.08);
  if (Math.abs(currentProgress - targetProgress) < 0.0005) {
    currentProgress = targetProgress;
  }

  const palette = getInterpolatedPalette(currentProgress);

  renderSky(palette, currentProgress);
  renderFireflies(currentProgress);
  updateCelestialPositions(currentProgress);
  updateThemeVariables(palette, currentProgress);

  requestAnimationFrame(tick);
}

requestAnimationFrame(tick);

// Interactive Quick-Shift Button (Jumps between Day and Night)
timeToggleBtn.addEventListener('click', () => {
  if (currentProgress < 0.5) {
    // Scroll to Night
    const nightSec = document.getElementById('sec-night');
    nightSec.scrollIntoView({ behavior: 'smooth' });
  } else {
    // Scroll to Day
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
});

// Ambient Procedural Soundscape with Web Audio API (Day Birds/Wind -> Night Crickets)
let audioCtx = null;
let soundPlaying = false;
let masterGain = null;
let dayGain = null;
let nightGain = null;

function initAudio() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  audioCtx = new AudioContext();

  masterGain = audioCtx.createGain();
  masterGain.gain.setValueAtTime(0.12, audioCtx.currentTime);
  masterGain.connect(audioCtx.destination);

  // Day Ambient Gain
  dayGain = audioCtx.createGain();
  dayGain.connect(masterGain);

  // Night Ambient Gain
  nightGain = audioCtx.createGain();
  nightGain.connect(masterGain);

  // 1. Gentle Mountain Wind Synth (Pink Noise)
  const bufferSize = audioCtx.sampleRate * 2;
  const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
    b6 = white * 0.115926;
  }

  const whiteNoise = audioCtx.createBufferSource();
  whiteNoise.buffer = noiseBuffer;
  whiteNoise.loop = true;

  const windFilter = audioCtx.createBiquadFilter();
  windFilter.type = 'lowpass';
  windFilter.frequency.setValueAtTime(320, audioCtx.currentTime);

  whiteNoise.connect(windFilter);
  windFilter.connect(masterGain);
  whiteNoise.start();

  // 2. Periodic Synthetic Daytime Birds & Night Crickets Timer
  setInterval(() => {
    if (!soundPlaying || !audioCtx) return;
    const p = currentProgress;

    if (p < 0.4 && Math.random() < 0.4) {
      // Play brief high-pitched day chirp
      playChirp();
    } else if (p > 0.6 && Math.random() < 0.5) {
      // Play gentle cricket trill
      playCricket();
    }
  }, 1200);
}

function playChirp() {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const chirpGain = audioCtx.createGain();
  const now = audioCtx.currentTime;

  osc.type = 'sine';
  osc.frequency.setValueAtTime(2400 + Math.random() * 600, now);
  osc.frequency.exponentialRampToValueAtTime(3200 + Math.random() * 500, now + 0.08);
  osc.frequency.exponentialRampToValueAtTime(2100, now + 0.16);

  chirpGain.gain.setValueAtTime(0, now);
  chirpGain.gain.linearRampToValueAtTime(0.04, now + 0.03);
  chirpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

  osc.connect(chirpGain);
  chirpGain.connect(masterGain);
  osc.start(now);
  osc.stop(now + 0.18);
}

function playCricket() {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const cGain = audioCtx.createGain();
  const now = audioCtx.currentTime;

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(4500, now);

  cGain.gain.setValueAtTime(0, now);
  cGain.gain.linearRampToValueAtTime(0.02, now + 0.02);
  cGain.gain.exponentialRampToValueAtTime(0.0005, now + 0.12);

  osc.connect(cGain);
  cGain.connect(masterGain);
  osc.start(now);
  osc.stop(now + 0.13);
}

soundBtn.addEventListener('click', () => {
  if (!audioCtx) {
    initAudio();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  soundPlaying = !soundPlaying;
  if (soundPlaying) {
    masterGain.gain.setTargetAtTime(0.15, audioCtx.currentTime, 0.2);
    soundBtn.querySelector('.btn-icon').textContent = '🔊';
    soundBtn.classList.add('active');
  } else {
    masterGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.1);
    soundBtn.querySelector('.btn-icon').textContent = '🔇';
    soundBtn.classList.remove('active');
  }
});
