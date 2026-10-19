// Every user-visible string is a key. t("door.look") looks it up in the current
// language, falling back to the default language, then to "[key]" so a missing
// string is obvious on screen instead of blank.
export class I18n {
  constructor(tables = {}, language = 'en', fallback = 'en') {
    this.tables = tables;
    this.language = language;
    this.fallback = fallback;
  }

  add(language, strings) {
    this.tables[language] = { ...this.tables[language], ...strings };
  }

  has(key) {
    return key in (this.tables[this.language] ?? {}) || key in (this.tables[this.fallback] ?? {});
  }

  // {name} placeholders are filled from vars.
  t(key, vars = {}) {
    const text = this.tables[this.language]?.[key] ?? this.tables[this.fallback]?.[key];
    if (text === undefined) return `[${key}]`;
    return text.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? String(vars[name]) : m));
  }
}
