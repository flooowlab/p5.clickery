export default ({ scene, dialogue, newKeeperConversation }) => ({
  'door-out': {
    onLook: (c) => c.say('door-out.look'),
    onInteract: () => scene.goTo('dock', 'fromHall'),
  },

  keeper: {
    onLook: (c) => c.say('keeper.look'),
    // The conversation is an Ink story; it can hand over the matches and set flags.
    onInteract: async () => { await dialogue.play(newKeeperConversation()); },
  },

  stairs: {
    onLook: (c) => c.say('stairs.look'),
    async onInteract(c) {
      if (!c.state.get('flags.keeperMet', false)) return c.say('stairs.blocked');
      return scene.goTo('lamp-room');
    },
  },
});
