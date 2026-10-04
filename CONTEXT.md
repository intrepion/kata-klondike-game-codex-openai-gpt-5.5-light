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

**Recycle**:
The act of turning the waste back into the stock after the stock is empty.
_Avoid_: Reset stock, reshuffle

**Waste**:
The face-up pile receiving cards drawn from the stock, with only its exposed cards available by rule.
_Avoid_: Discard pile, drawn cards

**Top Waste Card**:
The only waste card currently eligible to move under the active draw mode.
_Avoid_: Active discard, available waste

**Foundation**:
One of four suit-specific piles built upward from ace to king.
_Avoid_: Home pile, goal pile

**Tableau**:
The seven working piles where cards are built downward in alternating colors.
_Avoid_: Board, columns

**Empty Tableau**:
A tableau pile containing no cards and accepting only a king or a run starting with a king.
_Avoid_: Empty column, open space

**Build**:
A legal descending alternating-color sequence in the tableau.
_Avoid_: Stack, chain

**Run**:
A movable face-up sequence of tableau cards that already forms a valid build.
_Avoid_: Stack, group

**Card Face**:
The visible rank and suit presentation of a card.
_Avoid_: Card art, card image

**Reveal**:
The automatic flip of the next face-down tableau card after the last face-up card leaves that pile.
_Avoid_: Turn over, expose

**Draw Mode**:
The selected rule for moving cards from the stock to the waste, either draw one or draw three.
_Avoid_: Difficulty, variant

**Move**:
A legal state transition made by the player or by an explicit helper action.
_Avoid_: Action, turn

**Undo**:
The reversal of the most recent move in the current game.
_Avoid_: Back, rewind

**Restart**:
The act of abandoning the current game state and beginning again from a fresh deal or the same deal seed.
_Avoid_: Reset, redeal

**Auto-Move**:
A helper move that sends an eligible card to a foundation without the player choosing that foundation manually.
_Avoid_: Auto-play, complete

**Auto-Finish**:
A helper state where the game repeatedly moves safely eligible cards to foundations after no meaningful tableau choices remain.
_Avoid_: Auto-complete, solver

**Saved Game**:
The locally persisted current game, including enough state to continue after a refresh.
_Avoid_: Save file, checkpoint

**Timer**:
The elapsed play time for a game, starting with the first player move.
_Avoid_: Clock, stopwatch

**Hint**:
A non-mutating suggestion for a legal or useful move.
_Avoid_: Help, solver

**Legal Destination**:
A pile that can accept the currently selected or dragged card or run.
_Avoid_: Drop zone, target

**Rejection Feedback**:
A brief non-blocking response to an attempted illegal move.
_Avoid_: Error, invalid-move alert

**Keyboard Play**:
Player interaction with cards and piles through keyboard focus and commands rather than pointer dragging.
_Avoid_: Keyboard shortcuts, accessibility mode

**Same Deal**:
A restart that reuses the current deal seed.
_Avoid_: Replay, retry

**Scripted Interaction Path**:
A deterministic browser exercise that proves a specific sequence of visible game interactions works.
_Avoid_: Smoke test, demo

**Win**:
The state where all cards are in the four foundations.
_Avoid_: Complete, solved
