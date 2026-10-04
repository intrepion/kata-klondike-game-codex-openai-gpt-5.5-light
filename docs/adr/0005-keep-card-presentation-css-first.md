# Keep Card Presentation CSS-First

Card faces will be rendered with CSS and text suit symbols, and interaction feedback will use lightweight highlights, status text, and non-blocking rejection animation. This avoids asset loading complexity in direct `file://` play, keeps cards accessible and testable, and preserves fast table interaction without modal interruptions or sound preferences in the first implementation.
