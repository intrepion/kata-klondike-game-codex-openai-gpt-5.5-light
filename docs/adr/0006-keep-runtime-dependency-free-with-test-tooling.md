# Keep Runtime Dependency-Free With Test Tooling

The shipped game will stay dependency-free and inspectable through separate `index.html`, `styles.css`, and `game.js` files, while development may use npm tooling for checks and Playwright browser verification. This keeps direct `file://` play simple without confusing dependency-free runtime delivery with an absence of evidence-producing test tools.
