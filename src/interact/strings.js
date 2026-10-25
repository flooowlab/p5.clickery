/**
 * The built-in English texts: the default answers (`default.interact`, `default.look`, `default.use`,
 * `default.combine`), the hover labels (`ui.use_on`, `ui.use_item`) and the verb names (`verb.*`). A game
 * adds them for you; override any key in your own `strings`.
 * @type {Object<string, string>}
 */
export const defaultStrings = {
  'default.interact': "That won't do anything.",
  'default.look': 'Nothing special.',
  'default.use': "I can't use that.",
  'default.combine': "Those don't go together.",
  'ui.use_on': 'Use {item} with {target}',
  'ui.use_item': 'Use {item} with...',
  'verb.interact': 'Use',
  'verb.look': 'Look at',
  'verb.use': 'Use',
  'verb.walk': 'Walk to',
};
