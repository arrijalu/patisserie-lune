// TECHNIQUES USED AND NAMED IN CODE COMMENTS:
// - order-queue state machine: explicit states (waiting, claimed, assembling, cooking, plated, served, failed) with transitions, no boolean soup.
// - juice: particle bursts on serve, tweened pops for added ingredients, flash/shake on failure.

import { FIELD, RECIPES, SHIFT_DURATION, STATIONS } from './config.js';

/**
 * Order queue state machine constants.
 * Explicit states: WAITING -> CLAIMED -> ASSEMBLING -> COOKING -> PLATED -> SERVED / FAILED
 */
export const ORDER_STATE = {
  WAITING: 'waiting',
  CLAIMED: 'claimed',
  ASSEMBLING: 'assembling',
  COOKING: 'cooking',
  PLATED: 'plated',
  SERVED: 'served',
  FAILED: 'failed',
};

export const BAKING_STATE = {
  EMPTY: 'empty',
  BAKING: 'baking',
  READY: 'ready',
  BURNT: 'burnt',
};

export const EVENT_ADD_INGREDIENT = 1;
export const EVENT_BAKE_START = 2;
export const EVENT_BAKE_DONE = 4;
export const EVENT_SERVE_SUCCESS = 8;
export const EVENT_SERVE_FAIL = 16;
export const EVENT_SHIFT_END = 32;

export function createWorld(random) {
  const chef = {
    x: 640,
    y: FIELD.groundY - 120,
    w: 60,
    h: 120,
    speed: 480,
    targetX: 640,
    currentStation: 'counter',
    holding: null, // item in hand
  };

  const oven = {
    state: BAKING_STATE.EMPTY,
    spongeType: null,
    timer: 0,
    maxTime: 6.0,
    targetMin: 3.6, // 60% is green zone start
    targetMax: 5.2, // 86% is green zone end
    quality: 'raw', // 'raw', 'perfect', 'burnt'
  };

  const assemblyBench = {
    orderId: null,
    layers: [], // stack of layers added so far: ['sponge', 'cream', 'fruit', 'glaze', 'garnish']
    pipingProgress: 0, // 0 to 1 when dragging piping bag
    isPiping: false,
    quality: 'perfect',
  };

  const orderQueue = [];
  let nextOrderId = 1;

  const state = {
    chef,
    oven,
    assemblyBench,
    orderQueue,
    score: 0,
    money: 150,
    reputation: 3, // 1 to 5 stars
    shiftTimer: SHIFT_DURATION,
    shiftEnded: false,
    orderSpawnTimer: 2.0,
    activeTicket: null,
    events: 0,
    particles: [], // juice particles
    flashMessage: '',
    flashTimer: 0,
    shakeTimer: 0,
  };

  function spawnOrder() {
    if (orderQueue.filter(o => o.state !== ORDER_STATE.SERVED && o.state !== ORDER_STATE.FAILED).length >= 3) {
      return;
    }
    const recipeIndex = Math.floor(random() * RECIPES.length);
    const recipe = RECIPES[recipeIndex];
    const newOrder = {
      id: nextOrderId++,
      recipe,
      state: ORDER_STATE.WAITING,
      patience: 35.0, // seconds
      maxPatience: 35.0,
      claimed: false,
      platedDish: null,
    };
    orderQueue.push(newOrder);
  }

  function reset() {
    chef.x = 640;
    chef.targetX = 640;
    chef.holding = null;
    chef.currentStation = 'counter';
    oven.state = BAKING_STATE.EMPTY;
    oven.timer = 0;
    assemblyBench.orderId = null;
    assemblyBench.layers = [];
    assemblyBench.pipingProgress = 0;
    orderQueue.length = 0;
    nextOrderId = 1;
    state.score = 0;
    state.money = 150;
    state.reputation = 3;
    state.shiftTimer = SHIFT_DURATION;
    state.shiftEnded = false;
    state.orderSpawnTimer = 1.0;
    state.activeTicket = null;
    state.events = 0;
    state.particles = [];
    state.flashMessage = 'Shift Started! Welcome to Pâtisserie Lune';
    state.flashTimer = 3.0;
    state.shakeTimer = 0;

    // Pre-spawn 2 orders for crisp setup
    spawnOrder();
    spawnOrder();
  }

  function addJuiceParticle(x, y, color) {
    for (let i = 0; i < 8; i++) {
      const angle = random() * Math.PI * 2;
      const speed = 60 + random() * 120;
      state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40,
        color,
        life: 0.6,
        maxLife: 0.6,
        size: 4 + random() * 6,
      });
    }
  }

  function claimNextOrder() {
    const next = orderQueue.find(o => o.state === ORDER_STATE.WAITING);
    if (next) {
      next.state = ORDER_STATE.CLAIMED;
      state.activeTicket = next;
      assemblyBench.orderId = next.id;
      assemblyBench.layers = [];
      state.flashMessage = `Preparing: ${next.recipe.name}`;
      state.flashTimer = 2.0;
    }
  }

  function interactStation(stationId, slot = 1) {
    let events = 0;
    if (stationId === 'board') {
      if (!state.activeTicket) {
        claimNextOrder();
      }
    } else if (stationId === 'oven') {
      if (oven.state === BAKING_STATE.EMPTY) {
        // Start baking sponge for active ticket or selected slot
        const recipe = state.activeTicket ? state.activeTicket.recipe : RECIPES[(slot - 1) % RECIPES.length];
        oven.spongeType = recipe.sponge;
        oven.state = BAKING_STATE.BAKING;
        oven.timer = 0;
        events |= EVENT_BAKE_START;
        state.flashMessage = `Baking ${recipe.sponge}... Watch the timer!`;
        state.flashTimer = 2.0;
      } else if (oven.state === BAKING_STATE.BAKING || oven.state === BAKING_STATE.READY || oven.state === BAKING_STATE.BURNT) {
        // Pull from oven
        let quality = 'perfect';
        if (oven.timer < oven.targetMin) quality = 'raw';
        else if (oven.timer > oven.targetMax) quality = 'burnt';

        chef.holding = { type: 'sponge', name: oven.spongeType, quality };
        oven.state = BAKING_STATE.EMPTY;
        events |= EVENT_BAKE_DONE;
        if (quality === 'burnt') {
          state.shakeTimer = 0.4;
          state.flashMessage = 'Burnt sponge! Too long in the oven!';
          state.flashTimer = 2.0;
        } else if (quality === 'raw') {
          state.flashMessage = 'Underbaked! Pulled too early!';
          state.flashTimer = 2.0;
        } else {
          state.flashMessage = 'Perfect golden sponge pulled from oven!';
          state.flashTimer = 2.0;
        }
      }
    } else if (stationId === 'counter') {
      if (!state.activeTicket) claimNextOrder();
      if (state.activeTicket) {
        const recipe = state.activeTicket.recipe;
        // Ingredients slot selection: 1=cream, 2=fruit, 3=glaze, 4=garnish
        const ingredientTypes = [
          { type: 'cream', name: recipe.cream },
          { type: 'fruit', name: recipe.fruit },
          { type: 'glaze', name: recipe.glaze },
          { type: 'garnish', name: recipe.garnish },
        ];
        const ing = ingredientTypes[(slot - 1) % ingredientTypes.length];
        chef.holding = { type: ing.type, name: ing.name, quality: 'perfect' };
        events |= EVENT_ADD_INGREDIENT;
        state.flashMessage = `Picked up: ${ing.name}`;
        state.flashTimer = 1.5;
      }
    } else if (stationId === 'assembly') {
      if (chef.holding) {
        const item = chef.holding;
        // Add to assembly layers if valid order
        if (!assemblyBench.layers.includes(item.type)) {
          assemblyBench.layers.push(item.type);
          if (item.quality === 'burnt') assemblyBench.quality = 'burnt';
          addJuiceParticle(820 + 110, 220 + 110, PALETTE.cream);
          events |= EVENT_ADD_INGREDIENT;
          state.flashMessage = `Added ${item.name} to entremets!`;
          state.flashTimer = 1.5;
          chef.holding = null;
        }
      }
    } else if (stationId === 'serve') {
      if (state.activeTicket && assemblyBench.layers.length >= 3) {
        // Complete and serve dish
        const ticket = state.activeTicket;
        const quality = assemblyBench.quality;
        let payout = 35;
        if (quality === 'perfect') {
          payout = 50;
          state.score += 100;
          state.reputation = Math.min(5, state.reputation + 1);
          ticket.state = ORDER_STATE.SERVED;
          addJuiceParticle(1080 + 70, 180 + 130, PALETTE.gold);
          events |= EVENT_SERVE_SUCCESS;
          state.flashMessage = `⭐ Magnifique! Served ${ticket.recipe.name} +$${payout}`;
        } else {
          payout = 15;
          state.score += 30;
          ticket.state = ORDER_STATE.FAILED;
          state.shakeTimer = 0.3;
          events |= EVENT_SERVE_FAIL;
          state.flashMessage = `Overbaked dish served... Earned only $${payout}`;
        }
        state.money += payout;
        state.flashTimer = 2.5;
        state.activeTicket = null;
        assemblyBench.orderId = null;
        assemblyBench.layers = [];
        assemblyBench.quality = 'perfect';
      }
    }
    return events;
  }

  function step(dt, inputDir, actionFlags, pointer) {
    let events = 0;

    // Flash and shake timers
    if (state.flashTimer > 0) state.flashTimer -= dt;
    if (state.shakeTimer > 0) state.shakeTimer -= dt;

    // Shift clock
    if (!state.shiftEnded) {
      state.shiftTimer -= dt;
      if (state.shiftTimer <= 0) {
        state.shiftTimer = 0;
        state.shiftEnded = true;
        events |= EVENT_SHIFT_END;
      }
    }

    // Update particles (juice)
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 200 * dt; // gravity
      p.life -= dt;
      if (p.life <= 0) state.particles.splice(i, 1);
    }

    // Spawn new orders periodically
    if (!state.shiftEnded) {
      state.orderSpawnTimer -= dt;
      if (state.orderSpawnTimer <= 0) {
        spawnOrder();
        state.orderSpawnTimer = 12.0 + random() * 6.0;
      }
    }

    // Order patience decay
    for (const order of orderQueue) {
      if (order.state !== ORDER_STATE.SERVED && order.state !== ORDER_STATE.FAILED) {
        order.patience -= dt;
        if (order.patience <= 0) {
          order.patience = 0;
          order.state = ORDER_STATE.FAILED;
          state.reputation = Math.max(1, state.reputation - 1);
          state.shakeTimer = 0.4;
          events |= EVENT_SERVE_FAIL;
          state.flashMessage = `Customer left angry! Ticket #${order.id} expired!`;
          state.flashTimer = 2.5;
          if (state.activeTicket === order) {
            state.activeTicket = null;
            assemblyBench.layers = [];
          }
        }
      }
    }

    // Oven step
    if (oven.state === BAKING_STATE.BAKING) {
      oven.timer += dt;
      if (oven.timer > oven.targetMax + 2.0) {
        oven.state = BAKING_STATE.BURNT;
        oven.quality = 'burnt';
      } else if (oven.timer >= oven.targetMin && oven.timer <= oven.targetMax) {
        oven.state = BAKING_STATE.READY;
        oven.quality = 'perfect';
      }
    }

    // Chef movement
    if (inputDir !== 0) {
      chef.x += inputDir * chef.speed * dt;
      chef.x = Math.max(120, Math.min(FIELD.width - 120, chef.x));
      chef.targetX = chef.x;
    } else if (Math.abs(chef.x - chef.targetX) > 4) {
      const dir = Math.sign(chef.targetX - chef.x);
      chef.x += dir * chef.speed * dt;
    }

    // Check station proximity
    let closestStation = 'counter';
    let minDistance = 9999;
    for (const st of STATIONS) {
      const dist = Math.abs(chef.x - (st.x + st.w / 2));
      if (dist < minDistance) {
        minDistance = dist;
        closestStation = st.id;
      }
    }
    chef.currentStation = closestStation;

    // Handle mouse click / station selection
    if (pointer && pointer.clicked) {
      for (const st of STATIONS) {
        if (pointer.x >= st.x && pointer.x <= st.x + st.w && pointer.y >= st.y && pointer.y <= st.y + st.h) {
          chef.targetX = st.x + st.w / 2;
          events |= interactStation(st.id, 1);
          break;
        }
      }
    }

    // Handle keyboard actions
    if (actionFlags) {
      let slot = 1;
      if (actionFlags & 4) slot = 1;
      else if (actionFlags & 8) slot = 2;
      else if (actionFlags & 16) slot = 3;
      else if (actionFlags & 32) slot = 4;

      if (actionFlags & 1) { // E or Space action on current station
        events |= interactStation(chef.currentStation, slot);
      } else if (actionFlags & (4 | 8 | 16 | 32)) {
        events |= interactStation('counter', slot);
      }
    }

    state.events = events;
    return events;
  }

  reset();
  return { state, reset, step, interactStation, spawnOrder, claimNextOrder };
}
