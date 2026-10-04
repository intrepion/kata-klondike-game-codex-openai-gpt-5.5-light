# Klondike

A dependency-free modern classic Klondike game. The shipped game runs from the static files in this repository and supports direct `file://` launch.

## Play

Open `index.html` directly in a browser, or serve the folder locally:

```sh
python3 -m http.server 41732 --bind 127.0.0.1
```

Then visit `http://127.0.0.1:41732/`.

## Controls

- Click or tap a card, then click or tap a highlighted legal destination.
- Drag a card or run to a highlighted legal destination.
- Double-click a card to auto-move it to a foundation when legal.
- Press `U` to undo, `H` for a hint, `N` for a new game, and `Escape` to clear selection.
- Use arrow keys to move focus through controls and cards.

## Checks

```sh
npm run check
```

The check suite runs syntax validation, model tests, a served browser test, and a direct `file://` browser launch test.
