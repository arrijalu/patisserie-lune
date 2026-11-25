// Boot, WebAudio procedural audio, game loop, and screenshot mode for Pâtisserie Lune
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_ADD_INGREDIENT, EVENT_BAKE_START, EVENT_BAKE_DONE, EVENT_SERVE_SUCCESS, EVENT_SERVE_FAIL, EVENT_SHIFT_END } from './world.js';
import { ACTION_ACT, ACTION_PAUSE, createInput } from './input.js';
import { createRenderer, SCREEN_TITLE, SCREEN_PLAY, SCREEN_SHIFT_END } from './render.js';
import { stageShot } from './shots.js';

// Catch runtime errors so automated runners catch issues
window.onerror = function (message, source, lineno, colno, error) {
  document.title = 'ERR: ' + message;
  console.error('Pâtisserie Lune Error:', message, source, lineno, colno, error);
};

const MAX_FRAME = 0.25;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);

// Procedural WebAudio setup (lazily initialized after first user gesture)
let audioCtx = null;
function initAudio() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) audioCtx = new AudioContext();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playSound(type) {
  try {
    initAudio();
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime;

    if (type === 'add') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === 'serve') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    } else if (type === 'fail') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.linearRampToValueAtTime(80, now + 0.3);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    }
  } catch {
    // Audio restriction fallbacks
  }
}

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage fallback
  }
}

function runShot(name) {
  console.log('RUNNING SHOT:', name);
  const scene = stageShot(name, world);
  renderer.draw(world.state, scene.screen, scene.best);
  window.__shotReady = true;
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  function announce(msg) {
    status.textContent = msg;
  }

  function startShift() {
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Shift started. Welcome to Pâtisserie Lune.');
  }

  function endShift() {
    screen = SCREEN_SHIFT_END;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(`Shift complete. Score ${world.state.score}. Best ${best}.`);
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_ACT && (screen === SCREEN_TITLE || screen === SCREEN_SHIFT_END)) {
      startShift();
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_TITLE;
      announce('Paused.');
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, 0, 0, null);
      return;
    }
    const pointer = input.pointer();
    const events = world.step(STEP, input.direction(), input.takeActions(), pointer);

    if (events & EVENT_SHIFT_END) endShift();
    if (events & (EVENT_ADD_INGREDIENT | EVENT_BAKE_START | EVENT_BAKE_DONE)) playSound('add');
    if (events & EVENT_SERVE_SUCCESS) playSound('serve');
    if (events & EVENT_SERVE_FAIL) playSound('fail');
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();

    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_TITLE;
      announce('Paused.');
    }
  });

  announce('Pâtisserie Lune. Press Space or Click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
