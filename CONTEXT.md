# Klondike Game

This context defines the card-game language for a modern classic Klondike solitaire game. It exists so rules, tests, UI labels, and future design notes use the same terms.

## Language

**Klondike**:
The solitaire game built from one shuffled 52-card deck, seven tableau piles, a stock, a waste, and four foundations.
_Avoid_: Solitaire, patience

**Game**:
A single playable attempt from an initial deal until a win, restart, or abandoned state.
_Avoid_: Session, round

**Deal**:
The initial distribution of cards into the tableau and stock.
_Avoid_: Setup, layout

**Deal Seed**:
A reproducible identifier for a shuffled deal.
_Avoid_: Game id, shuffle code

**Stock**:
The face-down pile that supplies cards to the waste.
_Avoid_: Deck, draw pile

**Waste**:
The face-up pile receiving cards drawn from the stock, with only its exposed cards available by rule.
_Avoid_: Discard pile, drawn cards

**Foundation**:
One of four suit-specific piles built upward from ace to king.
_Avoid_: Home pile, goal pile

**Tableau**:
The seven working piles where cards are built downward in alternating colors.
_Avoid_: Board, columns

**Build**:
A legal descending alternating-color sequence in the tableau.
_Avoid_: Stack, chain

**Run**:
A movable face-up sequence of tableau cards that already forms a valid build.
_Avoid_: Stack, group

**Draw Mode**:
The selected rule for moving cards from the stock to the waste, either draw one or draw three.
_Avoid_: Difficulty, variant

**Move**:
A legal state transition made by the player or by an explicit helper action.
_Avoid_: Action, turn

**Undo**:
The reversal of the most recent move in the current game.
_Avoid_: Back, rewind

**Auto-Move**:
A helper move that sends an eligible card to a foundation without the player choosing that foundation manually.
_Avoid_: Auto-play, complete

**Hint**:
A non-mutating suggestion for a legal or useful move.
_Avoid_: Help, solver

**Win**:
The state where all cards are in the four foundations.
_Avoid_: Complete, solved
