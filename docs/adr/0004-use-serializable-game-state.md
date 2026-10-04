# Use Serializable Game State

The game will keep the current game, draw mode, deal seed, move count, timer baseline, and undo history in a serializable state that can be persisted locally. This adds model discipline up front, but it makes refresh recovery, reproducible deals, undo, and browser regression checks part of the same coherent state contract instead of separate UI conveniences.
