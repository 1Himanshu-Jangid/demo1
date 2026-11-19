/**
 * FOUR SEASONS - DYNAMIC SCROLL & PARTICLE ENGINE
 * Spring • Summer • Autumn (Fall) • Winter
 * Pure Vanilla JavaScript & HTML5 Canvas
 */

// Color interpolation utilities
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

// Four Season Sky Color Stops across Scroll Progress (0.00 -> 1.00)
const seasonStops = {
  // 0.00 - 0.25: Spring (Pastel Turquoise, Blossom Pink & Warm Morning Gold)
  0.0: {
    top: '#38bdf8', // Morning sky
    mid: '#f472b6', // Cherry blossom pink haze
    bot: '#fef08a', // Soft golden dawn
    accent: '#ec4899',
    tagBg: 'rgba(236, 72, 153, 0.18)',
    tagText: '#be185d',
    cardBg: 'rgba(255, 255, 255, 0.75)',
    cardBorder: 'rgba(255, 255, 255, 0.88)',
    cardShadow: '0 20px 45px -15px rgba(236, 72, 153, 0.22)',
    textMain: '#0f172a',
    textMuted: '#334155'
  },
  // 0.33: Summer (Radiant Azure, Cerulean & Golden Sun Zenith)
  0.33: {
    top: '#0284c7', // Deep vivid azure
    mid: '#38bdf8', // Cerulean blue
    bot: '#fde047', // Warm solar gold
    accent: '#f59e0b',
    tagBg: 'rgba(245, 158, 11, 0.18)',
    tagText: '#b45309',
    cardBg: 'rgba(255, 255, 255, 0.75)',
    cardBorder: 'rgba(255, 255, 255, 0.88)',
    cardShadow: '0 20px 45px -15px rgba(245, 158, 11, 0.25)',
    textMain: '#0f172a',
    textMuted: '#334155'
  },
  // 0.66: Autumn / Fall (Deep Wine, Fiery Crimson & Harvest Amber)
  0.66: {
    top: '#4a044e', // Deep wine violet
    mid: '#c2410c', // Fiery burnt orange
    bot: '#f59e0b', // Harvest golden amber
    accent: '#ea580c',
    tagBg: 'rgba(234, 88, 12, 0.22)',
    tagText: '#9a3412',
    cardBg: 'rgba(255, 247, 237, 0.82)',
    cardBorder: 'rgba(254, 215, 170, 0.6)',
    cardShadow: '0 20px 45px -15px rgba(234, 88, 12, 0.3)',
    textMain: '#1c1917',
    textMuted: '#44403c'
  },
  // 1.00: Winter (Glacial Sapphire, Frosty Indigo & Arctic Aurora)
  1.0: {
    top: '#020617', // Midnight obsidian
    mid: '#0f172a', // Deep arctic indigo
    bot: '#1e293b', // Frosty twilight horizon
    accent: '#38bdf8',
    tagBg: 'rgba(56, 189, 248, 0.22)',
    tagText: '#7dd3fc',
    cardBg: 'rgba(15, 23, 42, 0.82)',
    cardBorder: 'rgba(148, 163, 184, 0.3)',
    cardShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
    textMain: '#f8fafc',
    textMuted: '#cbd5e1'
  }
};

function getInterpolatedSeason(p) {
  const keys = [0.0, 0.33, 0.66, 1.0];
  let i = 0;
  while (i < keys.length - 1 && p > keys[i + 1]) {
    i++;
  }
  const k1 = keys[i];
  const k2 = keys[Math.min(i + 1, keys.length - 1)];
  const span = k2 - k1 || 1;
  const localT = (p - k1) / span;

  const s1 = seasonStops[k1];
  const s2 = seasonStops[k2];

  return {
    top: lerpColor(s1.top, s2.top, localT),
    mid: lerpColor(s1.mid, s2.mid, localT),
    bot: lerpColor(s1.bot, s2.bot, localT),
    accent: lerpColor(s1.accent, s2.accent, localT),
    tagBg: s2.tagBg,
    tagText: s2.tagText,
    cardBg: s2.cardBg,
    cardBorder: s2.cardBorder,
    cardShadow: s2.cardShadow,
    textMain: s2.textMain,
    textMuted: s2.textMuted
  };
}

// DOM Elements
const skyCanvas = document.getElementById('sky-canvas');
const skyCtx = skyCanvas.getContext('2d', { alpha: false });

const particlesCanvas = document.getElementById('season-particles-canvas');
const partCtx = particlesCanvas.getContext('2d');

const frostOverlay = document.getElementById('frost-overlay');
const birdsLayer = document.getElementById('birds-layer');
const scrollMeter = document.getElementById('scroll-meter');
const progressPercent = document.getElementById('progress-percent');
const seasonBadge = document.getElementById('season-badge');
const seasonText = document.getElementById('season-text');
const brandIcon = document.getElementById('brand-icon');
const soundBtn = document.getElementById('sound-btn');
const viewModeBtn = document.getElementById('view-mode-btn');
const seasonTabs = document.querySelectorAll('.season-tab');

// View mode toggle
if (viewModeBtn) {
  viewModeBtn.addEventListener('click', () => {
    document.body.classList.toggle('clean-view');
    const isClean = document.body.classList.contains('clean-view');
    viewModeBtn.querySelector('.btn-label').textContent = isClean ? 'Show' : 'View';
  });
}

// Window sizing
function handleResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  skyCanvas.width = w;
  skyCanvas.height = h;
  particlesCanvas.width = w;
  particlesCanvas.height = h;
  initParticles();
}
window.addEventListener('resize', handleResize);

// ==========================================================================
// FOUR SEASONS PARTICLE SYSTEM: PETALS, SUN MOTES, LEAVES, SNOWFLAKES
// ==========================================================================

const PETALS_COUNT = 45;      // Spring Cherry Petals
const MOTES_COUNT = 55;       // Summer Golden Motes
const LEAVES_COUNT = 50;      // Autumn Swirling Foliage
const SNOW_COUNT = 140;       // Winter Snowflakes

const springPetals = [];
const summerMotes = [];
const autumnLeaves = [];
const winterSnow = [];

function initParticles() {
  const w = particlesCanvas.width || window.innerWidth;
  const h = particlesCanvas.height || window.innerHeight;

  // 1. Spring Petals (drifting gently diagonally)
  springPetals.length = 0;
  for (let i = 0; i < PETALS_COUNT; i++) {
    springPetals.push({
      x: Math.random() * w,
      y: Math.random() * h,
      size: Math.random() * 8 + 6,
      speedX: Math.random() * 1.5 + 0.8,
      speedY: Math.random() * 1.2 + 0.5,
      angle: Math.random() * Math.PI * 2,
      spinSpeed: (Math.random() - 0.5) * 0.04,
      color: Math.random() > 0.4 ? 'rgba(251, 207, 232, 0.85)' : 'rgba(244, 114, 182, 0.85)'
    });
  }

  // 2. Summer Sun Motes (floating glowing golden pollen)
  summerMotes.length = 0;
  for (let i = 0; i < MOTES_COUNT; i++) {
    summerMotes.push({
      x: Math.random() * w,
      y: Math.random() * h,
      size: Math.random() * 3.5 + 1.5,
      speedX: (Math.random() - 0.5) * 0.6,
      speedY: -Math.random() * 0.8 - 0.2, // Float upward
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: Math.random() * 0.05 + 0.02
    });
  }

  // 3. Autumn Swirling Leaves (maple & oak shapes)
  autumnLeaves.length = 0;
  const autumnColors = [
    'rgba(234, 88, 12, 0.9)',  // Burnt orange
    'rgba(194, 65, 12, 0.9)',  // Russet
    'rgba(245, 158, 11, 0.9)', // Amber
    'rgba(185, 28, 28, 0.9)'   // Crimson
  ];
  for (let i = 0; i < LEAVES_COUNT; i++) {
    autumnLeaves.push({
      x: Math.random() * w,
      y: Math.random() * h,
      size: Math.random() * 14 + 10,
      speedX: Math.random() * 2.2 + 1.2,
      speedY: Math.random() * 1.8 + 0.8,
      angle: Math.random() * Math.PI * 2,
      spinSpeed: (Math.random() - 0.5) * 0.06,
      sway: Math.random() * Math.PI * 2,
      color: autumnColors[Math.floor(Math.random() * autumnColors.length)]
    });
  }

  // 4. Winter Snowflakes (multi-depth crystalline snow)
  winterSnow.length = 0;
  for (let i = 0; i < SNOW_COUNT; i++) {
    winterSnow.push({
      x: Math.random() * w,
      y: Math.random() * h,
      radius: Math.random() * 3.2 + 0.8,
      speedY: Math.random() * 1.8 + 0.6,
      speedX: Math.random() * 0.8 - 0.4,
      sway: Math.random() * Math.PI * 2,
      swaySpeed: Math.random() * 0.03 + 0.01,
      alpha: Math.random() * 0.7 + 0.3
    });
  }
}

// Particle Rendering Loop
function renderSeasonalParticles(p) {
  const w = particlesCanvas.width;
  const h = particlesCanvas.height;
  partCtx.clearRect(0, 0, w, h);

  // 1. Spring Weight: peaks around 0.0 - 0.20
  const springWeight = Math.max(0, 1 - Math.abs(p - 0.1) / 0.22);
  if (springWeight > 0.01) {
    partCtx.save();
    for (let petal of springPetals) {
      petal.x += petal.speedX;
      petal.y += petal.speedY;
      petal.angle += petal.spinSpeed;
      if (petal.x > w + 20) petal.x = -20;
      if (petal.y > h + 20) petal.y = -20;

      partCtx.save();
      partCtx.translate(petal.x, petal.y);
      partCtx.rotate(petal.angle);
      partCtx.globalAlpha = springWeight;
      partCtx.fillStyle = petal.color;
      partCtx.beginPath();
      // Elliptical petal shape
      partCtx.ellipse(0, 0, petal.size, petal.size * 0.55, 0, 0, Math.PI * 2);
      partCtx.fill();
      partCtx.restore();
    }
    partCtx.restore();
  }

  // 2. Summer Weight: peaks around 0.33
  const summerWeight = Math.max(0, 1 - Math.abs(p - 0.33) / 0.2);
  if (summerWeight > 0.01) {
    partCtx.save();
    for (let mote of summerMotes) {
      mote.x += mote.speedX;
      mote.y += mote.speedY;
      mote.pulse += mote.pulseSpeed;
      if (mote.y < -20) { mote.y = h + 10; mote.x = Math.random() * w; }

      const glow = Math.sin(mote.pulse) * 0.35 + 0.65;
      const rad = partCtx.createRadialGradient(mote.x, mote.y, 0, mote.x, mote.y, mote.size * 2.5);
      rad.addColorStop(0, `rgba(254, 240, 138, ${glow * summerWeight * 0.9})`);
      rad.addColorStop(0.5, `rgba(245, 158, 11, ${glow * summerWeight * 0.4})`);
      rad.addColorStop(1, 'transparent');

      partCtx.fillStyle = rad;
      partCtx.beginPath();
      partCtx.arc(mote.x, mote.y, mote.size * 2.5, 0, Math.PI * 2);
      partCtx.fill();
    }
    partCtx.restore();
  }

  // 3. Autumn Weight: peaks around 0.66
  const autumnWeight = Math.max(0, 1 - Math.abs(p - 0.66) / 0.22);
  if (autumnWeight > 0.01) {
    partCtx.save();
    for (let leaf of autumnLeaves) {
      leaf.sway += 0.03;
      leaf.x += leaf.speedX + Math.sin(leaf.sway) * 1.2;
      leaf.y += leaf.speedY;
      leaf.angle += leaf.spinSpeed;
      if (leaf.x > w + 30) leaf.x = -30;
      if (leaf.y > h + 30) leaf.y = -30;

      partCtx.save();
      partCtx.translate(leaf.x, leaf.y);
      partCtx.rotate(leaf.angle);
      partCtx.globalAlpha = autumnWeight;
      partCtx.fillStyle = leaf.color;
      // Stylized diamond/leaf shape
      partCtx.beginPath();
      partCtx.moveTo(0, -leaf.size);
      partCtx.quadraticCurveTo(leaf.size * 0.6, 0, 0, leaf.size);
      partCtx.quadraticCurveTo(-leaf.size * 0.6, 0, 0, -leaf.size);
      partCtx.fill();
      partCtx.restore();
    }
    partCtx.restore();
  }

  // 4. Winter Weight: peaks around 0.85 - 1.00
  const winterWeight = Math.max(0, Math.min(1, (p - 0.72) / 0.24));
  if (winterWeight > 0.01) {
    partCtx.save();
    for (let flake of winterSnow) {
      flake.sway += flake.swaySpeed;
      flake.x += flake.speedX + Math.sin(flake.sway) * 0.8;
      flake.y += flake.speedY;
      if (flake.y > h + 10) { flake.y = -10; flake.x = Math.random() * w; }

      partCtx.fillStyle = `rgba(255, 255, 255, ${flake.alpha * winterWeight})`;
      partCtx.beginPath();
      partCtx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);
      partCtx.fill();
    }
    partCtx.restore();
  }
}

// Sky Rendering
function renderSky(palette, p) {
  const w = skyCanvas.width;
  const h = skyCanvas.height;

  const grad = skyCtx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, palette.top);
  grad.addColorStop(0.52, palette.mid);
  grad.addColorStop(1, palette.bot);
  skyCtx.fillStyle = grad;
  skyCtx.fillRect(0, 0, w, h);

  // Winter corner frost opacity
  const winterT = Math.max(0, Math.min(1, (p - 0.75) / 0.25));
  if (frostOverlay) {
    frostOverlay.style.opacity = winterT.toFixed(2);
  }

  // Birds layer: visible in Spring and Summer, hides in Autumn/Winter
  if (birdsLayer) {
    const birdAlpha = Math.max(0, Math.min(1, (0.55 - p) / 0.25));
    birdsLayer.style.opacity = birdAlpha.toFixed(2);
  }
}

// Season Info Helper
function getSeasonInfo(p) {
  if (p < 0.25) {
    return { name: 'Spring Awakening', icon: '🌸', tabIdx: 0 };
  } else if (p < 0.52) {
    return { name: 'Summer Radiance', icon: '☀️', tabIdx: 1 };
  } else if (p < 0.76) {
    return { name: 'Autumn Harvest', icon: '🍂', tabIdx: 2 };
  } else {
    return { name: 'Winter Stillness', icon: '❄️', tabIdx: 3 };
  }
}

function updateThemeVariables(palette, p) {
  const sInfo = getSeasonInfo(p);

  // Update HUD
  seasonText.textContent = sInfo.name;
  brandIcon.textContent = sInfo.icon;
  const percentText = Math.round(p * 100) + '%';
  progressPercent.textContent = percentText;
  scrollMeter.style.width = percentText;

  // Update active season tab
  seasonTabs.forEach((tab, idx) => {
    tab.classList.toggle('active', idx === sInfo.tabIdx);
  });

  // Dynamic root styles
  const root = document.documentElement;
  root.style.setProperty('--accent-color', palette.accent);
  root.style.setProperty('--tag-bg', palette.tagBg);
  root.style.setProperty('--tag-text', palette.tagText);
  root.style.setProperty('--card-bg', palette.cardBg);
  root.style.setProperty('--card-border', palette.cardBorder);
  root.style.setProperty('--card-shadow', palette.cardShadow);
  root.style.setProperty('--text-main', palette.textMain);
  root.style.setProperty('--text-muted', palette.textMuted);
}

// Smooth Scroll State Tracking
let targetProgress = 0;
let currentProgress = 0;

function calculateScrollProgress() {
  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  if (maxScroll <= 0) return 0;
  return Math.max(0, Math.min(1, scrollTop / maxScroll));
}

function onScrollUpdate() {
  targetProgress = calculateScrollProgress();
}

window.addEventListener('scroll', onScrollUpdate, { passive: true });
window.addEventListener('wheel', onScrollUpdate, { passive: true });
window.addEventListener('touchmove', onScrollUpdate, { passive: true });

// Keyboard navigation
window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown' || e.key === 'PageDown' || (e.key === ' ' && !e.target.matches('input, textarea, button'))) {
    window.scrollBy({ top: 350, behavior: 'smooth' });
  } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
    window.scrollBy({ top: -350, behavior: 'smooth' });
  }
});

// Season tab click navigation
seasonTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const targetId = tab.getAttribute('data-target');
    const targetEl = document.getElementById(targetId);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth' });
    }
  });
});

// High-precision animation loop
let lastFrameTime = performance.now();

function tick(timestamp) {
  const dt = Math.min(32, timestamp - lastFrameTime) / 1000;
  lastFrameTime = timestamp;

  // Smooth exponential damping
  const damping = 1 - Math.exp(-16 * dt);
  currentProgress += (targetProgress - currentProgress) * damping;
  if (Math.abs(currentProgress - targetProgress) < 0.0002) {
    currentProgress = targetProgress;
  }

  const palette = getInterpolatedSeason(currentProgress);

  renderSky(palette, currentProgress);
  renderSeasonalParticles(currentProgress);
  updateThemeVariables(palette, currentProgress);

  requestAnimationFrame(tick);
}

// Initialize
handleResize();
requestAnimationFrame(tick);

// ==========================================================================
// PROCEDURAL SEASONAL SOUNDSCAPE (SPRING BIRDS -> SUMMER CICADA -> AUTUMN WIND -> WINTER CHIMES)
// ==========================================================================

let audioCtx = null;
let soundPlaying = false;
let masterGain = null;

function initAudio() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  audioCtx = new AudioContext();

  masterGain = audioCtx.createGain();
  masterGain.gain.setValueAtTime(0.12, audioCtx.currentTime);
  masterGain.connect(audioCtx.destination);

  // Soft Wind Synthesizer
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

  // Periodic Seasonal sound effects timer
  setInterval(() => {
    if (!soundPlaying || !audioCtx) return;
    const p = currentProgress;

    if (p < 0.28 && Math.random() < 0.45) {
      // Spring Songbird
      playBirdChirp();
    } else if (p >= 0.28 && p < 0.55 && Math.random() < 0.4) {
      // Summer Cicada trill
      playSummerCicada();
    } else if (p >= 0.75 && Math.random() < 0.45) {
      // Winter Ice Chime
      playWinterChime();
    }
  }, 1400);
}

function playBirdChirp() {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const now = audioCtx.currentTime;

  osc.type = 'sine';
  osc.frequency.setValueAtTime(2600 + Math.random() * 600, now);
  osc.frequency.exponentialRampToValueAtTime(3400 + Math.random() * 400, now + 0.07);
  osc.frequency.exponentialRampToValueAtTime(2200, now + 0.15);

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.04, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(now);
  osc.stop(now + 0.16);
}

function playSummerCicada() {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const now = audioCtx.currentTime;

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(4200, now);

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.02, now + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.15);

  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(now);
  osc.stop(now + 0.16);
}

function playWinterChime() {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const now = audioCtx.currentTime;

  osc.type = 'sine';
  const freqs = [1567.98, 1760.00, 2093.00, 2349.32];
  const f = freqs[Math.floor(Math.random() * freqs.length)];
  osc.frequency.setValueAtTime(f, now);

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.035, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(now);
  osc.stop(now + 0.56);
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
