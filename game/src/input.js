// Keyboard and mouse input for Pâtisserie Lune
export const ACTION_ACT = 1;
export const ACTION_PAUSE = 2;
export const ACTION_SLOT_1 = 4;
export const ACTION_SLOT_2 = 8;
export const ACTION_SLOT_3 = 16;
export const ACTION_SLOT_4 = 32;

const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const ACT = new Set(['Space', 'Enter', 'KeyE']);
const PAUSE = new Set(['KeyP', 'Escape']);
const S1 = new Set(['Digit1', 'Numpad1']);
const S2 = new Set(['Digit2', 'Numpad2']);
const S3 = new Set(['Digit3', 'Numpad3']);
const S4 = new Set(['Digit4', 'Numpad4']);

export function createInput(target) {
  let left = false;
  let right = false;
  let actions = 0;
  let pointer = { x: 640, y: 360, down: false, clicked: false, dragging: false, dragX: 0, dragY: 0 };

  window.addEventListener('keydown', (event) => {
    if (LEFT.has(event.code)) left = true;
    else if (RIGHT.has(event.code)) right = true;
    else if (ACT.has(event.code)) { if (!event.repeat) actions |= ACTION_ACT; }
    else if (PAUSE.has(event.code)) { if (!event.repeat) actions |= ACTION_PAUSE; }
    else if (S1.has(event.code)) { if (!event.repeat) actions |= ACTION_SLOT_1; }
    else if (S2.has(event.code)) { if (!event.repeat) actions |= ACTION_SLOT_2; }
    else if (S3.has(event.code)) { if (!event.repeat) actions |= ACTION_SLOT_3; }
    else if (S4.has(event.code)) { if (!event.repeat) actions |= ACTION_SLOT_4; }
    else return;
    event.preventDefault();
  });

  window.addEventListener('keyup', (event) => {
    if (LEFT.has(event.code)) left = false;
    else if (RIGHT.has(event.code)) right = false;
  });

  window.addEventListener('blur', () => {
    left = false;
    right = false;
    pointer.down = false;
    pointer.dragging = false;
  });

  target.addEventListener('pointerdown', (event) => {
    const rect = target.getBoundingClientRect();
    const scale = target.width / rect.width;
    pointer.x = (event.clientX - rect.left) * scale;
    pointer.y = (event.clientY - rect.top) * scale;
    pointer.down = true;
    pointer.clicked = true;
    actions |= ACTION_ACT;
  });

  target.addEventListener('pointermove', (event) => {
    const rect = target.getBoundingClientRect();
    const scale = target.width / rect.width;
    pointer.x = (event.clientX - rect.left) * scale;
    pointer.y = (event.clientY - rect.top) * scale;
    if (pointer.down) {
      pointer.dragging = true;
      pointer.dragX = pointer.x;
      pointer.dragY = pointer.y;
    }
  });

  window.addEventListener('pointerup', () => {
    pointer.down = false;
    pointer.dragging = false;
  });

  return {
    direction() {
      return (right ? 1 : 0) - (left ? 1 : 0);
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    pointer() {
      const clicked = pointer.clicked;
      pointer.clicked = false;
      return {
        x: pointer.x,
        y: pointer.y,
        down: pointer.down,
        clicked,
        dragging: pointer.dragging,
      };
    },
  };
}
