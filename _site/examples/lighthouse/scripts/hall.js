export default (game, dialogue) => ({
  'door-out': {
    onLook: (c) => c.say('door-out.look'),
    onInteract: () => game.goTo('dock', 'fromHall'),
  },

  keeper: {
    onLook: (c) => c.say('keeper.look'),
    // An Ink story. Its variables are saved with the game, and its EXTERNAL functions
    // giveItem() and setFlag() hand over the matches and set "keeperMet".
    onInteract: () => game.talk(dialogue.keeper),
  },

  stairs: {
    onLook: (c) => c.say('stairs.look'),
    onInteract(c) {
      if (!game.flag('keeperMet')) return c.say('stairs.blocked');
      return game.goTo('lamp-room');
    },
  },
});
