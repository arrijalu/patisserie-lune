// Deterministic screenshot staging for Pâtisserie Lune
import { SCREEN_PLAY } from './render.js';
import { STEP } from './config.js';

export function stageShot(name, world) {
  world.reset();

  // Helper to advance time by seconds
  const advance = (seconds) => {
    const frames = Math.ceil(seconds / STEP);
    for (let i = 0; i < frames; i++) {
      world.step(STEP, 0, 0, null);
    }
  };

  if (name === 'board') {
    // board - kitchen wide shot: stations, the cook, the order board with 2-3 live tickets
    advance(5.0); // let some time pass for tickets
    world.state.chef.x = 420;
    world.state.chef.targetX = 420;
    return { screen: SCREEN_PLAY, best: 250 };
  } else if (name === 'counter') {
    // counter - ingredients laid out on the counter, bowls ready, one ticket picked up
    world.claimNextOrder();
    advance(2.0);
    world.interactStation('counter', 1); // pick up cream
    world.state.chef.x = 680;
    world.state.chef.targetX = 680;
    return { screen: SCREEN_PLAY, best: 350 };
  } else if (name === 'assembly') {
    // assembly - a dish MID-ASSEMBLY: some components placed, the next one being added
    world.claimNextOrder();
    // Manually push layers to simulate progress
    world.state.assemblyBench.layers.push('sponge', 'cream', 'fruit');
    world.state.chef.holding = { type: 'glaze', name: 'Mirror Glaze', quality: 'perfect' };
    world.state.chef.x = 940;
    world.state.chef.targetX = 940;
    advance(1.0);
    return { screen: SCREEN_PLAY, best: 450 };
  } else if (name === 'serve') {
    // serve - a finished plate ready to serve, ticket matched, timer running
    world.claimNextOrder();
    world.state.assemblyBench.layers.push('sponge', 'cream', 'fruit', 'glaze');
    world.state.chef.x = 1180;
    world.state.chef.targetX = 1180;
    advance(1.0);
    return { screen: SCREEN_PLAY, best: 550 };
  }

  return { screen: SCREEN_PLAY, best: 100 };
}
