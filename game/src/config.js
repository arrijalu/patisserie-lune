// Pâtisserie Lune Configuration & Constants
export const FIELD = { width: 1280, height: 720, groundY: 610 };
export const STEP = 1 / 60;
export const FONT = 'system-ui, -apple-system, sans-serif';

export const PALETTE = {
  backdrop: '#231922',
  wall: '#f7f0ed',
  wallTrim: '#e3d2cc',
  marbleCounter: '#ece5e2',
  marbleVein: '#d5c5be',
  woodFloor: '#3d2b27',
  chef: '#d97b93',
  chefHat: '#ffffff',
  accent: '#a67c37', // darker brass for contrast
  gold: '#ffcc33', // brighter gold
  text: '#1a1417', // darker text for contrast
  muted: '#827179',
  rose: '#ff85a2', // more saturated rose
  mint: '#7ed9a7', // more saturated mint
  cream: '#ffffff', // pure white for highlights
  chocolate: '#5c3a21',
  matcha: '#6da373', // more saturated matcha
  berry: '#ff2e4d', // more saturated berry
  glass: 'rgba(255, 255, 255, 0.4)',
  shadow: 'rgba(0, 0, 0, 0.2)',
};

export const STATIONS = [
  { id: 'board', name: 'Order Board', x: 40, y: 140, w: 260, h: 260 },
  { id: 'oven', name: 'Oven', x: 340, y: 180, w: 200, h: 280 },
  { id: 'counter', name: 'Prep Counter', x: 580, y: 220, w: 240, h: 240 },
  { id: 'assembly', name: 'Assembly Bench', x: 860, y: 220, w: 240, h: 240 },
  { id: 'serve', name: 'Service Window', x: 1140, y: 180, w: 120, h: 280 },
];

export const RECIPES = [
  {
    name: 'Lune Classique',
    sponge: 'Almond Sponge',
    cream: 'Vanilla Bean Cream',
    fruit: 'Strawberry',
    glaze: 'Mirror Glaze',
    garnish: 'Gold Leaf',
    color: '#e8a5b8',
  },
  {
    name: 'Tartelette Vert',
    sponge: 'Matcha Cake',
    cream: 'Pistachio Cream',
    fruit: 'Fig Slices',
    glaze: 'Matcha Glaze',
    garnish: 'Powdered Sugar',
    color: '#a8d5be',
  },
  {
    name: 'Choc Royale',
    sponge: 'Choc Biscuit',
    cream: 'Chocolate Ganache',
    fruit: 'Blueberry',
    glaze: 'Dark Glaze',
    garnish: 'Cocoa Dust',
    color: '#5c3a21',
  },
  {
    name: 'Citron Meringue',
    sponge: 'Genoise',
    cream: 'Lemon Curd',
    fruit: 'Raspberry',
    glaze: 'Sugar Glaze',
    garnish: 'Gold Leaf',
    color: '#f4d35e',
  },
];

export const SHIFT_DURATION = 120; // seconds per shift
export const BEST_KEY = 'patisserie-lune.best';
