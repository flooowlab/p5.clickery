import { firstLook } from '../../../src/index.js';

// The puzzle: the lamp needs oil first, then a flame.
export default (game) => ({
  'stairs-down': {
    onLook: (c) => c.say('stairs-down.look'),
    onInteract: () => game.goTo('hall', 'fromLamp'),
  },

  window: {
    onLook: (c) => c.say('window.look'),
  },

  lamp: {
    async onLook(c) {
      if (await firstLook(c, () => c.say('lamp.look.first'))) return;
      await c.say('lamp.look');
    },

    onInteract: (c) => c.say(game.flag('lampLit') ? 'lamp.glows' : 'lamp.cold'),

    onUse(c) {
      if (c.item === 'oil-can') {
        if (game.flag('lampFilled')) return c.say('lamp.already-filled');
        game.take('oil-can');
        game.flag('lampFilled', true);
        return c.say('lamp.filled');
      }

      if (c.item === 'matches') {
        if (!game.flag('lampFilled')) return c.say('lamp.nothing-to-burn');
        game.take('matches');
        game.flag('lampLit', true);
        // The ending is a cutscene: input is locked, and the player can skip it.
        return game.cutscene(async (cs) => {
          await game.say('lamp.lit');
          await cs.wait(800);
          await game.say('ending.boat');
          game.flag('ending', true);
          await game.say('ending.the-end');
        });
      }

      return false; // any other item: the default "I can't use that"
    },
  },
});
