// Sound with the Web Audio API: music that crossfades, sound effects, voice,
// and four volume buses (master, music, sfx, voice) driven by Settings.
//
//   const audio = new AudioManager({ settings });          // browser: makes its own AudioContext
//   audio.register({ theme: 'audio/theme.ogg', click: 'audio/click.wav' });
//   await audio.loadAll();
//   audio.unlockOnGesture();                               // browsers start audio after a first click
//   audio.playMusic('theme');                              // crossfades from whatever is playing
//   audio.playSfx('click');
//   audio.attach(core.events, { sfx: { 'inventory:add': 'pickup' } });
//
// `context` can be any AudioContext-like object (tests pass a fake).
export class AudioManager {
  sounds = new Map(); // id -> { url, buffer }
  #music = null;
  #warned = new Set();

  constructor({ context = new globalThis.AudioContext(), settings = null, loadBuffer = null } = {}) {
    this.context = context;
    this.settings = settings;
    this.loadBuffer = loadBuffer ?? ((url) => this.#fetchBuffer(url));
    this.master = context.createGain();
    this.master.connect(context.destination);
    this.buses = {};
    for (const name of ['music', 'sfx', 'voice']) {
      this.buses[name] = context.createGain();
      this.buses[name].connect(this.master);
    }
    this.applyVolumes();
    this.stopListening = settings?.onChange(() => this.applyVolumes()) ?? (() => {});
  }

  get musicId() {
    return this.#music && !this.#music.fading ? this.#music.id : null;
  }

  applyVolumes() {
    const s = this.settings;
    const set = (gain, value) => gain.gain.setValueAtTime(value, this.context.currentTime);
    set(this.master, s?.get('masterVolume') ?? 1);
    set(this.buses.music, s?.get('musicVolume') ?? 1);
    set(this.buses.sfx, s?.get('sfxVolume') ?? 1);
    set(this.buses.voice, s?.get('voiceVolume') ?? 1);
  }

  // ---- loading ----

  register(map) {
    for (const [id, url] of Object.entries(map)) this.sounds.set(id, { url, buffer: null });
  }

  async load(id) {
    const sound = this.#sound(id);
    sound.buffer ??= await this.loadBuffer(sound.url);
    return sound.buffer;
  }

  loadAll() {
    return Promise.all([...this.sounds.keys()].map((id) => this.load(id)));
  }

  // Browsers only start audio after a click or key press.
  unlock() {
    return this.context.state === 'running' ? Promise.resolve() : this.context.resume();
  }

  unlockOnGesture(target = globalThis) {
    const go = () => {
      this.unlock();
      for (const type of ['pointerdown', 'keydown', 'touchend']) target.removeEventListener(type, go);
    };
    for (const type of ['pointerdown', 'keydown', 'touchend']) target.addEventListener(type, go);
  }

  // ---- playing ----

  // Plays a loaded sound once (or looping). Returns { stop() }, or null if it is not loaded yet.
  playSfx(id, options = {}) {
    return this.#play(id, 'sfx', options);
  }

  playVoice(id, options = {}) {
    return this.#play(id, 'voice', options);
  }

  // Starts a music track, fading the old one out and the new one in over fadeMs.
  // Asking for the track that is already playing does nothing.
  playMusic(id, { fadeMs = 1000, loop = true, volume = 1 } = {}) {
    if (this.#music?.id === id && !this.#music.fading) return this.#music;
    const buffer = this.#loaded(id);
    if (!buffer) return null;
    const now = this.context.currentTime;
    const fade = fadeMs / 1000;
    this.#fadeOutMusic(fade);
    const track = this.#startSource(buffer, this.buses.music, { loop, volume, initial: fade > 0 ? 0 : volume });
    track.id = id;
    track.fading = false;
    if (fade > 0) track.gain.gain.linearRampToValueAtTime(volume, now + fade);
    this.#music = track;
    return track;
  }

  stopMusic(fadeMs = 1000) {
    this.#fadeOutMusic(fadeMs / 1000);
    this.#music = null;
  }

  // ---- wiring to the game ----

  // room:enter -> the room's `music` field (omitted: keep playing, null: silence);
  // dialogue:tag sfx:<id> -> that sound; `sfx` maps an event name to a sound id, or to a
  // function (eventData) => id | { id, volume } | null.
  attach(events, { roomMusic = true, dialogueSfx = true, sfx = {}, fadeMs = 1000 } = {}) {
    const offs = [];
    if (roomMusic) {
      offs.push(events.on('room:enter', ({ room }) => {
        if (room.music === undefined) return;
        if (room.music === null) this.stopMusic(fadeMs);
        else this.playMusic(room.music, { fadeMs });
      }));
    }
    if (dialogueSfx) {
      offs.push(events.on('dialogue:tag', ({ key, value }) => { if (key === 'sfx') this.playSfx(value); }));
    }
    for (const [event, sound] of Object.entries(sfx)) {
      offs.push(events.on(event, (data) => {
        const pick = typeof sound === 'function' ? sound(data) : sound;
        if (!pick) return;
        if (typeof pick === 'string') this.playSfx(pick);
        else this.playSfx(pick.id, { volume: pick.volume });
      }));
    }
    return () => offs.forEach((off) => off());
  }

  dispose() {
    this.stopListening();
    this.stopMusic(0);
    this.context.close?.();
  }

  // ---- internals ----

  #sound(id) {
    const sound = this.sounds.get(id);
    if (!sound) throw new Error(`unknown sound "${id}" (register it first)`);
    return sound;
  }

  // The decoded buffer, or null (with one console warning) when the sound is unknown or not
  // loaded yet. A missing sound must never break the game, so playing it is just silent.
  #loaded(id) {
    const sound = this.sounds.get(id);
    if (sound?.buffer) return sound.buffer;
    if (!this.#warned.has(id)) {
      this.#warned.add(id);
      console.warn(sound
        ? `sound "${id}" is not loaded yet: await audio.load("${id}") or audio.loadAll() first`
        : `unknown sound "${id}": register it with audio.register({ ${id}: 'file' }); playing nothing`);
    }
    return null;
  }

  #play(id, bus, { volume = 1, loop = false } = {}) {
    const buffer = this.#loaded(id);
    if (!buffer) return null;
    const track = this.#startSource(buffer, this.buses[bus], { loop, volume });
    return { stop: () => track.source.stop(this.context.currentTime) };
  }

  #startSource(buffer, bus, { loop, volume, initial = volume }) {
    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    source.buffer = buffer;
    source.loop = loop;
    gain.gain.setValueAtTime(initial, this.context.currentTime);
    source.connect(gain);
    gain.connect(bus);
    source.onended = () => { source.disconnect?.(); gain.disconnect?.(); };
    source.start(this.context.currentTime);
    return { source, gain };
  }

  #fadeOutMusic(seconds) {
    const old = this.#music;
    if (!old || old.fading) return;
    old.fading = true;
    const now = this.context.currentTime;
    const g = old.gain.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(0, now + seconds);
    old.source.stop(now + seconds);
  }

  async #fetchBuffer(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`could not load ${url}: ${response.status}`);
    return this.context.decodeAudioData(await response.arrayBuffer());
  }
}
