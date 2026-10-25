---
title: The Lighthouse
summary: A complete small game: three rooms, a puzzle, an Ink conversation, a skippable ending, save and load.
shows: How a bigger game is organised with modules: data files, one script file per room, the game's logic in its own module. It is also the integration test.
---
Find a way to light the lamp. Click to walk and act, right-click or hold to look, and press the keys the game tells you for saving and loading.

Unlike the other examples this one is split into files: the rooms are JSON files, each object has its own script, and the game's logic lives in a module that runs without p5, which is how the test plays it from start to finish. Read it on GitHub to see how a larger game fits together.
