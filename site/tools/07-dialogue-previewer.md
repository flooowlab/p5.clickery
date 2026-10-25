---
title: Dialogue previewer
status: available
summary: Play a Markdown or Twine conversation in a page, without starting the game, and find the parts that can never be reached.
open: tools/dialogue/
openLabel: Open the previewer
---
Conversations are easiest to write when you can run them straight away. The previewer is a page that runs in your browser: edit a conversation on the left, play it on the right.

- **Formats:** the library's Markdown, Twee 3 text and Twison JSON, detected from the text. (For Ink, compile with the [Ink compiler](ink-compiler.html) and try it in the game; the previewer says so.)
- **Play:** the lines appear as a transcript, with speakers and tags, and the choices are buttons (or the number keys). *Restart* begins again.
- **Variables:** type starting values as JSON, for example `{"gold": 7}`, to test a branch that depends on them, and watch the variables change after every line.
- **Start at:** begin a Markdown conversation at any section.
- **Errors:** a mistake shows the line or passage it is on, as soon as you stop typing.
- **Checks:** sections or passages that nothing leads to; variables a condition reads but nothing sets (and so need a starting value); and variables that are set but never read. A table lists every section with its line count and how it ends.
- **Open file…** loads a file from your disk. Your text is kept in the browser between visits.

It uses the same code as `game.talk`, so a conversation that plays here plays in the game.
