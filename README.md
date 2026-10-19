# Elite Prompter

A teleprompter that follows your voice. It scrolls as you speak, waits when you go off script, and lights up the next words (the Return Cue) so you can pick up where you left off.

Live app: https://obidanncrew-glitch.github.io/elite-prompter

- `index.html`: the app (one file, built from `src/`)
- `src/engine.js`: the matching logic that follows the speaker
- `src/ui.html`: the page, with `/*ENGINE*/` where the engine is inlined
- `tests/matcher.test.js`: run `node tests/matcher.test.js` to see how sample speech is followed

Voice-follow uses the browser's speech recognition: Chrome or Edge on a laptop or Android, or Safari on iPhone, with an internet connection.
