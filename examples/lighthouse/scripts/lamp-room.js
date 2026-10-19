import { firstLook } from '../../../src/index.js';

// The puzzle: the lamp needs oil first, then a flame.
export default ({ scene }) => ({
  'stairs-down': {
    onLook: (c) => c.say('stairs-down.look'),
    onInteract: () => scene.goTo('hall', 'fromLamp'),
  },

  window: {
    onLook: (c) => c.say('window.look'),
  },

  lamp: {
    async onLook(c) {
      if (await firstLook(c, () => c.say('lamp.look.first'))) return;
      await c.say('lamp.look');
    },

    onInteract: (c) => c.say(c.state.get('flags.lampLit', false) ? 'lamp.glows' : 'lamp.cold'),

    async onUse(c) {
      const filled = c.state.get('flags.lampFilled', false);

      if (c.item === 'oil-can') {
        if (filled) return c.say('lamp.already-filled');
        c.inventory.remove('oil-can');
        c.state.set('flags.lampFilled', true);
        return c.say('lamp.filled');
      }

      if (c.item === 'matches') {
        if (!filled) return c.say('lamp.nothing-to-burn');
        c.inventory.remove('matches');
        c.state.set('flags.lampLit', true);
        // The ending is a cutscene: input is locked, and the player can skip it.
        return c.cutscenes.run(async (cs) => {
          await c.say('lamp.lit');
          await cs.wait(800);
          await c.say('ending.boat');
          c.state.set('flags.ending', true);
          await c.say('ending.the-end');
        });
      }

      return false; // any other item: the default "I can't use that"
    },
  },
});
