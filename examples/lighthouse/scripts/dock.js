// Scripts for the dock. A script file exports a function that receives the game's
// services and returns { objectId: { onInteract, onLook, onUse, ... } }.
export default ({ scene }) => ({
  sign: {
    onLook: (c) => c.say('sign.look'),
    onInteract: (c) => c.say('sign.read'),
  },

  'oil-can': {
    onLook: (c) => c.say('oil-can.look'),
    async onInteract(c) {
      c.inventory.give('oil-can');
      c.setEnabled('oil-can', false); // no longer in the room; saved with the game
      await c.say('oil-can.got');
    },
  },

  door: {
    onLook: (c) => c.say('door.look'),
    onInteract: () => scene.goTo('hall'),
  },
});
