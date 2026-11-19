/**
 * CELESTIAL HORIZONS - DAY TO NIGHT SCROLL ENGINE
 * Pure Vanilla JavaScript & HTML5 Canvas
 * Optimized for 60/120+ FPS Silky-Smooth Scrolling
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
  // 0.0: High Summer Noon (Bright Azure & Golden Horizon)
  0.0: {
    top: '#38bdf8',
    mid: '#7dd3fc',
    bot: '#fef08a',
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
  // 0.65: Sunset / Twilight (Vivid Crimson & Royal Violet)
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
    bot: '#0f172a', // Starry Horizon
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
const skyCtx = skyCanvas.getContext('2d', { alpha: false });

const sunEl = document.getElementById('sun-element');
const moonEl = document.getElementById('moon-element');
const birdsLayer = document.getElementById('birds-layer');
const scrollMeter = document.getElementById('scroll-meter');
const progressPercent = document.getElementById('progress-percent');
const timeBadge = document.getElementById('time-badge');
const timeText = document.getElementById('time-text');
const soundBtn = document.getElementById('sound-btn');
const timeToggleBtn = document.getElementById('time-toggle-btn');

// Direct SVG Stop Element references for zero-layout-shift instant recoloring
const stopDistTop = document.querySelector('.stop-distant-top');
const stopDistBot = document.querySelector('.stop-distant-bot');
const stopMidTop  = document.querySelector('.stop-mid-top');
const stopMidBot  = document.querySelector('.stop-mid-bot');
const stopNearTop = document.querySelector('.stop-near-top');
const stopNearBot = document.querySelector('.stop-near-bot');
const stopForeTop = document.querySelector('.stop-fore-top');
const stopForeBot = document.querySelector('.stop-fore-bot');

// Dynamic Starfield Generation (No green dots - pure crisp white/cyan cosmic stars)
const STARS_COUNT = 320;
const stars = [];

function initStars() {
  stars.length = 0;
  const w = skyCanvas.width;
  const h = skyCanvas.height;
  for (let i = 0; i < STARS_COUNT; i++) {
    stars.push({
      x: Math.random() * w,
      y: Math.random() * (h * 0.72), // Upper 72% of sky
      size: Math.random() * 1.8 + 0.6,
      baseAlpha: Math.random() * 0.7 + 0.3,
      twinkleSpeed: Math.random() * 0.04 + 0.015,
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
      len: Math.random() * 80 + 40,
      speed: Math.random() * 12 + 10,
      angle: Math.PI / 4 + (Math.random() - 0.5) * 0.2,
      opacity: 1
    });
  }
}

// Window sizing
function handleResize() {
  skyCanvas.width = window.innerWidth;
  skyCanvas.height = window.innerHeight;
  initStars();
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

function renderSky(palette, p) {
  const w = skyCanvas.width;
  const h = skyCanvas.height;

  // 1. Draw Sky Gradient
  const grad = skyCtx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, palette.top);
  grad.addColorStop(0.52, palette.mid);
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

  // 3. Stars Rendering (Fades in smoothly as progress exceeds 0.4)
  const starAlpha = Math.max(0, Math.min(1, (p - 0.4) / 0.45));
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
      meteor.opacity -= 0.025;
      if (meteor.opacity <= 0) meteors.splice(m, 1);
    }
    skyCtx.restore();
  }
}

function updateCelestialPositions(p) {
  // SUN BEHAVIOR:
  // Starts centered in the upper sky. As user scrolls, the Sun smoothly moves UPWARD,
  // scaling down slightly and disappearing into the sky as twilight arrives.
  const sunY = -p * 550;
  const sunScale = Math.max(0.65, 1 - p * 0.45);
  const sunOpacity = Math.max(0, Math.min(1, (0.62 - p) / 0.35));
  sunEl.style.transform = `translate3d(0, ${sunY}px, 0) scale(${sunScale})`;
  sunEl.style.opacity = sunOpacity.toFixed(3);

  // MOON BEHAVIOR:
  // Moon enters smoothly from below and glides up into the night firmament.
  const moonStartProgress = 0.35;
  const moonProgress = Math.max(0, Math.min(1, (p - moonStartProgress) / (1 - moonStartProgress)));
  const moonY = lerp(380, 0, Math.pow(moonProgress, 0.85));
  const moonOpacity = Math.max(0, Math.min(1, (p - 0.45) / 0.35));
  moonEl.style.transform = `translate3d(0, ${moonY}px, 0) scale(${lerp(0.8, 1.0, moonProgress)})`;
  moonEl.style.opacity = moonOpacity.toFixed(3);

  // BIRDS BEHAVIOR:
  // Birds soar gently in the daytime breeze, fading out at dusk
  const birdOpacity = Math.max(0, Math.min(1, (0.55 - p) / 0.3));
  birdsLayer.style.opacity = birdOpacity.toFixed(3);

  // NOTE: Mountains remain firmly anchored at the bottom (NO downward movement on scroll).
}

let lastThemeNight = null;

function updateThemeVariables(palette, p) {
  // Directly update SVG Mountain gradient stops (zero layout reflow)
  if (stopDistTop) stopDistTop.setAttribute('stop-color', palette.distTop);
  if (stopDistBot) stopDistBot.setAttribute('stop-color', palette.distBot);
  if (stopMidTop)  stopMidTop.setAttribute('stop-color', palette.midTop);
  if (stopMidBot)  stopMidBot.setAttribute('stop-color', palette.midBot);
  if (stopNearTop) stopNearTop.setAttribute('stop-color', palette.nearTop);
  if (stopNearBot) stopNearBot.setAttribute('stop-color', palette.nearBot);
  if (stopForeTop) stopForeTop.setAttribute('stop-color', palette.foreTop);
  if (stopForeBot) stopForeBot.setAttribute('stop-color', palette.foreBot);

  // Card & HUD Theme Transitions
  const isNight = p > 0.55;
  if (isNight !== lastThemeNight) {
    lastThemeNight = isNight;
    const root = document.documentElement;
    if (isNight) {
      root.style.setProperty('--card-bg', 'rgba(15, 23, 42, 0.82)');
      root.style.setProperty('--card-border', 'rgba(148, 163, 184, 0.3)');
      root.style.setProperty('--card-shadow', '0 25px 50px -12px rgba(0, 0, 0, 0.7)');
      root.style.setProperty('--text-main', '#f8fafc');
      root.style.setProperty('--text-muted', '#cbd5e1');
      root.style.setProperty('--tag-bg', 'rgba(99, 102, 241, 0.25)');
      root.style.setProperty('--tag-text', '#a5b4fc');
      root.style.setProperty('--accent-color', '#818cf8');
    } else {
      root.style.setProperty('--card-bg', 'rgba(255, 255, 255, 0.75)');
      root.style.setProperty('--card-border', 'rgba(255, 255, 255, 0.88)');
      root.style.setProperty('--card-shadow', '0 20px 40px -15px rgba(234, 88, 12, 0.15)');
      root.style.setProperty('--text-main', '#0f172a');
      root.style.setProperty('--text-muted', '#334155');
      root.style.setProperty('--tag-bg', 'rgba(245, 158, 11, 0.18)');
      root.style.setProperty('--tag-text', '#b45309');
      root.style.setProperty('--accent-color', '#f59e0b');
    }
  }

  // Update HUD elements
  const percentText = Math.round(p * 100) + '%';
  progressPercent.textContent = percentText;
  scrollMeter.style.width = percentText;
  timeText.textContent = getTimeLabel(p);
}

// High-precision frame timing for silky buttery scroll interpolation
let lastFrameTime = performance.now();

function tick(timestamp) {
  const dt = Math.min(32, timestamp - lastFrameTime) / 1000;
  lastFrameTime = timestamp;

  // Frame-rate independent exponential smoothing (snappy & buttery smooth)
  const damping = 1 - Math.exp(-14 * dt);
  currentProgress += (targetProgress - currentProgress) * damping;
  if (Math.abs(currentProgress - targetProgress) < 0.0002) {
    currentProgress = targetProgress;
  }

  const palette = getInterpolatedPalette(currentProgress);

  renderSky(palette, currentProgress);
  updateCelestialPositions(currentProgress);
  updateThemeVariables(palette, currentProgress);

  requestAnimationFrame(tick);
}

requestAnimationFrame(tick);

// Interactive Quick-Shift Button (Smooth Jump between Day and Night)
timeToggleBtn.addEventListener('click', () => {
  if (currentProgress < 0.5) {
    const nightSec = document.getElementById('sec-night');
    nightSec.scrollIntoView({ behavior: 'smooth' });
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
});

// Ambient Procedural Soundscape with Web Audio API (Day Birds/Wind -> Night Crickets)
let audioCtx = null;
let soundPlaying = false;
let masterGain = null;

function initAudio() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  audioCtx = new AudioContext();

  masterGain = audioCtx.createGain();
  masterGain.gain.setValueAtTime(0.12, audioCtx.currentTime);
  masterGain.connect(audioCtx.destination);

  // Soft Mountain Wind (Pink Noise)
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

  // Periodic Daytime Bird Calls & Night Cricket Trills
  setInterval(() => {
    if (!soundPlaying || !audioCtx) return;
    const p = currentProgress;

    if (p < 0.4 && Math.random() < 0.4) {
      playChirp();
    } else if (p > 0.6 && Math.random() < 0.5) {
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
