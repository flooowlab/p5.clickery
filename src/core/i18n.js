/**
 * Text keys and translations. Every word the player reads is a key: `t('door.look')` looks it up
 * in the current language, falls back to the default language, and then to `[door.look]`, so a
 * missing string is obvious on screen instead of blank. A game has one: `game.i18n`.
 *
 * @example
 * game.i18n.add('en', { 'door.look': 'A heavy door.', hello: 'Hello, {name}!' });
 * game.i18n.t('door.look');              // 'A heavy door.'
 * game.i18n.t('hello', { name: 'Ada' }); // 'Hello, Ada!'
 * game.i18n.t('oops');                   // '[oops]'
 * game.i18n.language = 'it';             // switch language; missing keys fall back to 'en'
 *
 * @param {Object<string, Object<string,string>>} [tables] Strings by language.
 * @param {string} [language='en'] The current language.
 * @param {string} [fallback='en'] The language used for keys missing from the current one.
 */
export class I18n {
  constructor(tables = {}, language = 'en', fallback = 'en') {
    /** The strings by language: `{ en: { key: text } }`. @type {Object<string, Object<string,string>>} */
    this.tables = tables;
    /** The current language. Change it to switch. @type {string} */
    this.language = language;
    /** The language to fall back on. @type {string} */
    this.fallback = fallback;
  }

  /**
   * Adds strings to a language, keeping the ones already there.
   * @param {string} language
   * @param {Object<string,string>} strings Keys and their text.
   */
  add(language, strings) {
    this.tables[language] = { ...this.tables[language], ...strings };
  }

  /**
   * Asks whether a key has text, in the current or the fallback language.
   * @param {string} key
   * @returns {boolean}
   */
  has(key) {
    return key in (this.tables[this.language] ?? {}) || key in (this.tables[this.fallback] ?? {});
  }

  /**
   * Looks up a key. `{name}` placeholders are filled from `vars`.
   * @param {string} key
   * @param {Object} [vars] Values for placeholders.
   * @returns {string} The text, or `[key]` when there is none.
   */
  t(key, vars = {}) {
    const text = this.tables[this.language]?.[key] ?? this.tables[this.fallback]?.[key];
    if (text === undefined) return `[${key}]`;
    return text.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? String(vars[name]) : m));
  }
}
