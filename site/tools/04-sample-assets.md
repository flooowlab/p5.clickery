---
title: Placeholder assets
status: available
summary: Scripts that generate a sample room picture and small sound effects, so examples need no downloaded art.
---
Two small scripts in the repository write the placeholder assets the examples use. They are handy when you want something to test with before you have your own.

```text
node tools/make-sample-room.mjs     # writes tools/editor/sample-room.png, a flat-colour room for the editor
node tools/make-example-audio.mjs   # writes short WAV sounds into examples/assets/audio
```

The room picture has flat colours on purpose, which is what the editor's wand likes. The sounds are synthesised from sine waves, so there is nothing to license.
