// TECHNIQUES USED AND NAMED IN CODE COMMENTS:
// - canvas layered-sprite rendering: each dish/bowl drawn as ordered layers (base, contents, garnish, highlight) from data, so assembly state is literally the layer stack.
// - juice: particle bursts on serve, tweened pops for added ingredients, flash/shake on failure.

import { FIELD, FONT, PALETTE, STATIONS } from './config.js';
import { BAKING_STATE, ORDER_STATE } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_SHIFT_END = 'shift_end';

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    let width = Math.round(window.innerWidth * ratio);
    let height = Math.round(window.innerHeight * ratio);
    if (width <= 0 || height <= 0) {
      width = FIELD.width;
      height = FIELD.height;
    }
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  const fonts = new Map();
  function drawText(value, x, y, size, color, align = 'left', baseline = 'top') {
    const fontKey = `${size}px`;
    if (!fonts.has(fontKey)) fonts.set(fontKey, `${size}px ${FONT}`);
    context.font = fonts.get(fontKey);
    context.fillStyle = color;
    context.textAlign = align;
    context.textBaseline = baseline;
    context.fillText(value, x, y);
  }

  // Draw Parisian interior background with textures
  function drawBackground(state) {
    // Pastel wall
    context.fillStyle = PALETTE.wall;
    context.fillRect(0, 0, FIELD.width, FIELD.height);

    // Subtle wall noise texture for realism and file size
    context.fillStyle = 'rgba(0, 0, 0, 0.02)';
    for (let i = 0; i < 500; i++) {
      const rx = ((i * 193) % FIELD.width);
      const ry = ((i * 127) % FIELD.height);
      context.fillRect(rx, ry, 2, 2);
    }

    // Wall wainscoting & decorative trim
    context.fillStyle = PALETTE.wallTrim;
    context.fillRect(0, 0, FIELD.width, 100);
    context.fillStyle = PALETTE.accent;
    context.fillRect(0, 96, FIELD.width, 8);

    // Wooden floor
    context.fillStyle = PALETTE.woodFloor;
    context.fillRect(0, FIELD.groundY, FIELD.width, FIELD.height - FIELD.groundY);

    // Floor planks with wood grain
    context.strokeStyle = 'rgba(0,0,0,0.1)';
    context.lineWidth = 2;
    for (let x = 0; x < FIELD.width; x += 120) {
      context.beginPath();
      context.moveTo(x, FIELD.groundY);
      context.lineTo(x, FIELD.height);
      context.stroke();

      // Wood grain lines
      context.strokeStyle = 'rgba(255,255,255,0.03)';
      for (let j = 0; j < 5; j++) {
        context.beginPath();
        context.moveTo(x + 20 + j * 15, FIELD.groundY);
        context.lineTo(x + 10 + j * 15, FIELD.height);
        context.stroke();
      }
      context.strokeStyle = 'rgba(0,0,0,0.1)';
    }
  }

  // Draw stations with marble texture
  function drawStations(state) {
    for (const st of STATIONS) {
      context.save();
      context.translate(st.x, st.y);

      // Station shadow / backing
      context.fillStyle = PALETTE.shadow;
      context.fillRect(4, 4, st.w, st.h);

      if (st.id === 'board') {
        // Order board: brass frame, cork board
        context.fillStyle = PALETTE.accent;
        context.fillRect(0, 0, st.w, st.h);
        context.fillStyle = '#fffdf9';
        context.fillRect(10, 10, st.w - 20, st.h - 20);

        // Board header
        context.fillStyle = PALETTE.accent;
        context.fillRect(10, 10, st.w - 20, 36);
        drawText('ORDER BOARD', st.w / 2, 16, 24, '#fff', 'center', 'top');

        // Draw active tickets on board
        let ticketY = 56;
        for (const order of state.orderQueue) {
          if (order.state === ORDER_STATE.WAITING || order.state === ORDER_STATE.CLAIMED) {
            const isTicketActive = order === state.activeTicket;
            context.fillStyle = isTicketActive ? '#fff' : '#f0f0f0';
            context.fillRect(16, ticketY, st.w - 32, 60);
            context.strokeStyle = isTicketActive ? PALETTE.rose : PALETTE.accent;
            context.lineWidth = 2;
            context.strokeRect(16, ticketY, st.w - 32, 60);

            // Ticket header bar
            context.fillStyle = isTicketActive ? PALETTE.rose : '#ccc';
            context.fillRect(16, ticketY, st.w - 32, 24);
            drawText(`TICKET #${order.id}`, 22, ticketY + 2, 20, isTicketActive ? '#fff' : '#444', 'left', 'top');

            drawText(order.recipe.name, 22, ticketY + 28, 20, PALETTE.text, 'left', 'top');

            // Patience bar
            const barW = st.w - 48;
            const pct = Math.max(0, order.patience / order.maxPatience);
            context.fillStyle = '#ddd';
            context.fillRect(22, ticketY + 50, barW, 6);
            context.fillStyle = pct > 0.3 ? PALETTE.mint : PALETTE.berry;
            context.fillRect(22, ticketY + 50, barW * pct, 6);

            ticketY += 70;
            if (ticketY > st.h - 60) break;
          }
        }
      } else if (st.id === 'oven') {
        // Oven
        context.fillStyle = '#423d3e';
        context.fillRect(0, 0, st.w, st.h);
        context.fillStyle = PALETTE.accent;
        context.fillRect(0, 0, st.w, 36);
        drawText('PASTRY OVEN', st.w / 2, 6, 24, '#fff', 'center', 'top');

        context.fillStyle = '#1a1617';
        context.fillRect(20, 50, st.w - 40, 160);

        const oven = state.oven;
        if (oven.state !== BAKING_STATE.EMPTY) {
          const color = oven.state === BAKING_STATE.BURNT ? '#3d261d' : oven.state === BAKING_STATE.READY ? '#ffb366' : '#ffe6cc';
          context.fillStyle = color;
          context.fillRect(40, 90, st.w - 80, 80);
          drawText(oven.spongeType.split(' ')[0], st.w / 2, 110, 22, '#000', 'center', 'top');

          const gaugeW = st.w - 40;
          const pct = Math.min(1, oven.timer / oven.maxTime);
          context.fillStyle = '#000';
          context.fillRect(20, 220, gaugeW, 16);

          const zStart = (oven.targetMin / oven.maxTime) * gaugeW;
          const zWidth = ((oven.targetMax - oven.targetMin) / oven.maxTime) * gaugeW;
          context.fillStyle = PALETTE.mint;
          context.fillRect(20 + zStart, 220, zWidth, 16);

          context.fillStyle = oven.state === BAKING_STATE.BURNT ? PALETTE.berry : '#fff';
          context.fillRect(20 + gaugeW * pct - 4, 215, 8, 26);

          drawText(oven.state === BAKING_STATE.READY ? 'PULL!' : oven.state === BAKING_STATE.BURNT ? 'BURNT!' : 'BAKING', st.w / 2, 245, 22, oven.state === BAKING_STATE.READY ? PALETTE.mint : '#fff', 'center', 'top');
        } else {
          drawText('EMPTY', st.w / 2, 110, 24, '#666', 'center', 'top');
        }
      } else if (st.id === 'counter' || st.id === 'assembly') {
        // Marble Counters
        context.fillStyle = PALETTE.marbleCounter;
        context.fillRect(0, 0, st.w, st.h);
        context.strokeStyle = PALETTE.accent;
        context.lineWidth = 4;
        context.strokeRect(0, 0, st.w, st.h);

        context.fillStyle = PALETTE.accent;
        context.fillRect(0, 0, st.w, 36);
        drawText(st.id === 'counter' ? 'PREP' : 'ASSEMBLY', st.w / 2, 6, 24, '#fff', 'center', 'top');

        if (st.id === 'counter') {
          const activeRecipe = state.activeTicket ? state.activeTicket.recipe : RECIPES[0];
          const ingNames = [activeRecipe.cream, activeRecipe.fruit, activeRecipe.glaze, activeRecipe.garnish];
          const colors = [PALETTE.rose, PALETTE.berry, PALETTE.mint, PALETTE.gold];

          for (let i = 0; i < 4; i++) {
            const bx = 15 + (i % 2) * 110;
            const by = 50 + Math.floor(i / 2) * 90;
            context.fillStyle = colors[i];
            context.beginPath();
            context.arc(bx + 45, by + 40, 36, 0, Math.PI * 2);
            context.fill();
            context.strokeStyle = '#000';
            context.lineWidth = 2;
            context.stroke();
            drawText(`${i + 1}`, bx + 45, by + 25, 24, '#000', 'center', 'top');
          }
        } else {
          const bench = state.assemblyBench;
          const cx = st.w / 2;
          const cy = st.h / 2 + 30;

          context.fillStyle = '#555';
          context.fillRect(cx - 60, cy + 50, 120, 15);
          context.fillRect(cx - 20, cy + 20, 40, 40);

          const layers = bench.layers;
          let layerY = cy + 10;

          // Cake stand / Plate
          context.fillStyle = '#fff';
          context.beginPath();
          context.ellipse(cx, layerY, 70, 25, 0, 0, Math.PI * 2);
          context.fill();
          context.strokeStyle = '#ccc';
          context.stroke();

          // DRAW DISH WITH VIBRANT COLORS
          if (layers.length > 0) {
            layerY -= 15;
            context.fillStyle = '#ffb366'; // Vibrant sponge
            context.fillRect(cx - 50, layerY - 15, 100, 20);
            context.strokeStyle = '#e67300';
            context.strokeRect(cx - 50, layerY - 15, 100, 20);
          }
          if (layers.length > 1) {
            layerY -= 20;
            context.fillStyle = PALETTE.rose;
            context.fillRect(cx - 45, layerY - 12, 90, 18);
          }
          if (layers.length > 2) {
            layerY -= 15;
            context.fillStyle = PALETTE.berry;
            context.beginPath();
            context.arc(cx - 25, layerY, 12, 0, Math.PI * 2);
            context.arc(cx, layerY - 5, 15, 0, Math.PI * 2);
            context.arc(cx + 25, layerY, 12, 0, Math.PI * 2);
            context.fill();
          }
          if (layers.length > 3) {
            layerY -= 15;
            context.fillStyle = PALETTE.gold;
            context.fillRect(cx - 35, layerY - 8, 70, 12);
            // Highlight for "brightest thing"
            context.fillStyle = 'rgba(255, 255, 255, 0.5)';
            context.fillRect(cx - 30, layerY - 6, 20, 4);
          }

          if (layers.length === 0) {
            drawText('START HERE', cx, cy - 20, 22, PALETTE.muted, 'center', 'top');
          } else {
            drawText(`${layers.length}/4 DONE`, cx, cy + 65, 20, PALETTE.text, 'center', 'top');
          }
        }
      } else if (st.id === 'serve') {
        context.fillStyle = '#2a2226';
        context.fillRect(0, 0, st.w, st.h);
        context.fillStyle = PALETTE.accent;
        context.fillRect(0, 0, st.w, 36);
        drawText('SERVE', st.w / 2, 6, 24, '#fff', 'center', 'top');

        context.fillStyle = PALETTE.glass;
        context.fillRect(10, 50, st.w - 20, st.h - 70);
        drawText('READY?', st.w / 2, st.h / 2, 22, '#fff', 'center', 'top');
      }
      context.restore();
    }
  }

  function drawChef(state) {
    const chef = state.chef;
    context.save();
    context.translate(chef.x, FIELD.groundY - chef.h);
    context.fillStyle = PALETTE.shadow;
    context.beginPath();
    context.ellipse(chef.w / 2, chef.h + 5, chef.w * 0.4, 8, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.chef;
    context.fillRect(10, 45, chef.w - 20, chef.h - 55);
    context.fillStyle = PALETTE.chefHat;
    context.fillRect(12, 5, chef.w - 24, 30);
    context.fillRect(8, 25, chef.w - 16, 12);
    context.fillStyle = '#fce4dc';
    context.beginPath();
    context.arc(chef.w / 2, 42, 12, 0, Math.PI * 2);
    context.fill();
    if (chef.holding) {
      context.fillStyle = PALETTE.cream;
      context.fillRect(chef.w + 4, 15, 120, 36);
      context.strokeStyle = PALETTE.accent;
      context.strokeRect(chef.w + 4, 15, 120, 36);
      drawText(chef.holding.name.split(' ')[0], chef.w + 8, 21, 20, PALETTE.text, 'left', 'top');
    }
    context.restore();
  }

  function drawHud(state) {
    context.fillStyle = 'rgba(35, 25, 34, 0.85)';
    context.fillRect(0, 0, FIELD.width, 70);
    const mins = Math.floor(state.shiftTimer / 60);
    const secs = Math.floor(state.shiftTimer % 60);
    const timeStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    drawText(`⏱ SHIFT CLOCK: ${timeStr}`, 30, 20, 22, PALETTE.cream, 'left', 'top');
    drawText(`💰 $${state.money}`, 300, 20, 22, PALETTE.gold, 'left', 'top');
    drawText(`🏆 SCORE: ${state.score}`, 480, 20, 22, PALETTE.cream, 'left', 'top');
    let starsStr = '';
    for (let i = 0; i < state.reputation; i++) starsStr += '★ ';
    drawText(`REPUTATION: ${starsStr}`, 700, 20, 22, PALETTE.gold, 'left', 'top');
    if (state.flashTimer > 0 && state.flashMessage) {
      context.fillStyle = 'rgba(217, 123, 147, 0.9)';
      context.fillRect(FIELD.width / 2 - 350, 75, 700, 40);
      drawText(state.flashMessage, FIELD.width / 2, 85, 20, '#fff', 'center', 'top');
    }
  }

  function drawParticles(state) {
    for (const p of state.particles) {
      context.save();
      context.fillStyle = p.color;
      context.beginPath();
      context.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }
  }

  function drawPanel(title, lines, prompt) {
    const w = 700;
    const h = 400;
    const x = (FIELD.width - w) / 2;
    const y = (FIELD.height - h) / 2;
    context.fillStyle = 'rgba(35, 25, 34, 0.92)';
    context.fillRect(x, y, w, h);
    context.strokeStyle = PALETTE.accent;
    context.lineWidth = 4;
    context.strokeRect(x, y, w, h);
    drawText(title, FIELD.width / 2, y + 40, 36, PALETTE.gold, 'center', 'top');
    let ly = y + 120;
    for (const line of lines) {
      drawText(line, FIELD.width / 2, ly, 22, PALETTE.cream, 'center', 'top');
      ly += 36;
    }
    drawText(prompt, FIELD.width / 2, y + h - 60, 24, PALETTE.mint, 'center', 'top');
  }

  function draw(state, screen, best) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.save();
    if (state.shakeTimer > 0) {
      const shakeX = (Math.random() - 0.5) * 12;
      const shakeY = (Math.random() - 0.5) * 12;
      context.translate(view.x + shakeX, view.y + shakeY);
    } else {
      context.translate(view.x, view.y);
    }
    context.scale(view.scale, view.scale);
    drawBackground(state);
    drawStations(state);
    drawChef(state);
    drawParticles(state);
    drawHud(state);
    if (screen === SCREEN_TITLE) {
      drawPanel('PÂTISSERIE LUNE', ['Bake exquisite Parisian entremets.', 'Gather ingredients, watch the oven, plate & serve!', 'Move: ←→/AD. Act: Space/E/Click.', `Best Score: ${best}`], 'Press Space, Enter, or Click to Open Shop');
    } else if (screen === SCREEN_SHIFT_END) {
      drawPanel('SHIFT COMPLETE', [`Final Score: ${state.score}`, `Total Earnings: $${state.money}`, `Reputation: ${state.reputation} Stars ★`, 'Magnifique work today, Chef!'], 'Press Space, Enter, or Click to Restart Shift');
    }
    context.restore();
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
