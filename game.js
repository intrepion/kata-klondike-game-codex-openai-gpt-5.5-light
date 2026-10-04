(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.Klondike = api;
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  const suits = ["S", "H", "D", "C"];
  const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  const redSuits = new Set(["H", "D"]);

  function cardId(suit, rank) {
    return `${rank}${suit}`;
  }

  function cardColor(card) {
    return redSuits.has(card.suit) ? "red" : "black";
  }

  function rankValue(rank) {
    return ranks.indexOf(rank) + 1;
  }

  function createDeck() {
    return suits.flatMap((suit) =>
      ranks.map((rank) => ({ id: cardId(suit, rank), suit, rank, faceUp: false }))
    );
  }

  function hashSeed(seed) {
    const text = String(seed || "KLONDIKE");
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function seededRandom(seed) {
    let state = hashSeed(seed);
    return function next() {
      state += 0x6d2b79f5;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(deck, seed) {
    const random = seededRandom(seed);
    const cards = deck.map(cloneCard);
    for (let index = cards.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      [cards[index], cards[swapIndex]] = [cards[swapIndex], cards[index]];
    }
    return cards;
  }

  function cloneCard(card) {
    return { id: card.id, suit: card.suit, rank: card.rank, faceUp: Boolean(card.faceUp) };
  }

  function clonePile(pile) {
    return pile.map(cloneCard);
  }

  function cloneState(state) {
    return {
      seed: state.seed,
      drawMode: state.drawMode,
      stock: clonePile(state.stock),
      waste: clonePile(state.waste),
      foundations: state.foundations.map(clonePile),
      tableau: state.tableau.map(clonePile),
      moveCount: state.moveCount,
      startedAt: state.startedAt,
      elapsedBeforeStart: state.elapsedBeforeStart,
      wonAt: state.wonAt,
      status: state.status || ""
    };
  }

  function snapshotForUndo(state) {
    const snapshot = cloneState(state);
    delete snapshot.status;
    return snapshot;
  }

  function createGame(options = {}) {
    const seed = String(options.seed || generateSeed());
    const drawMode = options.drawMode === 3 ? 3 : 1;
    const deck = shuffle(createDeck(), seed);
    const tableau = Array.from({ length: 7 }, (_, pileIndex) => {
      const pile = [];
      for (let cardIndex = 0; cardIndex <= pileIndex; cardIndex += 1) {
        const card = deck.shift();
        card.faceUp = cardIndex === pileIndex;
        pile.push(card);
      }
      return pile;
    });

    return {
      state: {
        seed,
        drawMode,
        stock: deck,
        waste: [],
        foundations: [[], [], [], []],
        tableau,
        moveCount: 0,
        startedAt: null,
        elapsedBeforeStart: 0,
        wonAt: null,
        status: "New deal ready."
      },
      undoStack: []
    };
  }

  function generateSeed() {
    return Math.random().toString(36).slice(2, 8).toUpperCase();
  }

  function restoreGame(saved) {
    if (!saved || !saved.state) {
      return createGame();
    }
    return {
      state: cloneState(saved.state),
      undoStack: Array.isArray(saved.undoStack) ? saved.undoStack.map(cloneState) : []
    };
  }

  function serialize(game) {
    return {
      state: cloneState(game.state),
      undoStack: game.undoStack.map(cloneState)
    };
  }

  function ensureStarted(state, now = Date.now()) {
    if (!state.startedAt) {
      state.startedAt = now;
    }
  }

  function topCard(pile) {
    return pile[pile.length - 1] || null;
  }

  function foundationIndexForSuit(suit) {
    return suits.indexOf(suit);
  }

  function canPlaceOnFoundation(card, foundation) {
    if (!card || !card.faceUp) return false;
    const targetRank = foundation.length + 1;
    return rankValue(card.rank) === targetRank;
  }

  function canPlaceOnTableau(cards, pile) {
    const first = cards[0];
    if (!first || !first.faceUp) return false;
    if (pile.length === 0) return first.rank === "K";
    const destination = topCard(pile);
    return (
      destination.faceUp &&
      cardColor(destination) !== cardColor(first) &&
      rankValue(destination.rank) === rankValue(first.rank) + 1
    );
  }

  function isRun(cards) {
    if (!cards.length || cards.some((card) => !card.faceUp)) return false;
    for (let index = 1; index < cards.length; index += 1) {
      const previous = cards[index - 1];
      const current = cards[index];
      if (cardColor(previous) === cardColor(current)) return false;
      if (rankValue(previous.rank) !== rankValue(current.rank) + 1) return false;
    }
    return true;
  }

  function findCard(state, cardIdToFind) {
    const wasteIndex = state.waste.findIndex((card) => card.id === cardIdToFind);
    if (wasteIndex >= 0) return { area: "waste", pileIndex: 0, cardIndex: wasteIndex };

    for (let pileIndex = 0; pileIndex < state.tableau.length; pileIndex += 1) {
      const cardIndex = state.tableau[pileIndex].findIndex((card) => card.id === cardIdToFind);
      if (cardIndex >= 0) return { area: "tableau", pileIndex, cardIndex };
    }

    for (let pileIndex = 0; pileIndex < state.foundations.length; pileIndex += 1) {
      const cardIndex = state.foundations[pileIndex].findIndex((card) => card.id === cardIdToFind);
      if (cardIndex >= 0) return { area: "foundation", pileIndex, cardIndex };
    }

    return null;
  }

  function sourceCards(state, source) {
    if (source.area === "waste") {
      if (source.cardIndex !== state.waste.length - 1) return [];
      return [state.waste[source.cardIndex]];
    }
    if (source.area === "foundation") {
      const pile = state.foundations[source.pileIndex];
      if (source.cardIndex !== pile.length - 1) return [];
      return [pile[source.cardIndex]];
    }
    if (source.area === "tableau") {
      const pile = state.tableau[source.pileIndex];
      return pile.slice(source.cardIndex);
    }
    return [];
  }

  function legalDestinations(game, cardIdToMove) {
    const source = findCard(game.state, cardIdToMove);
    if (!source) return [];
    const cards = sourceCards(game.state, source);
    if (!isRun(cards)) return [];
    const destinations = [];

    if (cards.length === 1) {
      const card = cards[0];
      game.state.foundations.forEach((foundation, index) => {
        if (foundationIndexForSuit(card.suit) === index && canPlaceOnFoundation(card, foundation)) {
          destinations.push({ area: "foundation", pileIndex: index });
        }
      });
    }

    game.state.tableau.forEach((pile, index) => {
      if (source.area === "tableau" && source.pileIndex === index) return;
      if (canPlaceOnTableau(cards, pile)) {
        destinations.push({ area: "tableau", pileIndex: index });
      }
    });

    return destinations;
  }

  function applyMove(game, mutator, status, now = Date.now()) {
    game.undoStack.push(snapshotForUndo(game.state));
    ensureStarted(game.state, now);
    mutator();
    game.state.moveCount += 1;
    game.state.status = status;
    if (isWon(game.state)) {
      game.state.wonAt = now;
      game.state.status = "Win complete.";
    }
    return true;
  }

  function draw(game, now) {
    const state = game.state;
    if (state.stock.length === 0 && state.waste.length === 0) {
      state.status = "No stock cards to draw.";
      return false;
    }
    return applyMove(
      game,
      () => {
        if (state.stock.length === 0) {
          state.stock = state.waste.reverse().map((card) => ({ ...card, faceUp: false }));
          state.waste = [];
          state.status = "Waste recycled.";
          return;
        }
        const count = Math.min(state.drawMode, state.stock.length);
        for (let index = 0; index < count; index += 1) {
          const card = state.stock.pop();
          card.faceUp = true;
          state.waste.push(card);
        }
      },
      state.stock.length === 0 ? "Waste recycled." : "Card drawn.",
      now
    );
  }

  function move(game, cardIdToMove, destination, now) {
    const state = game.state;
    const source = findCard(state, cardIdToMove);
    if (!source) return reject(state, "Card not found.");
    const cards = sourceCards(state, source);
    if (!isRun(cards)) return reject(state, "That card cannot move.");
    const legal = legalDestinations(game, cardIdToMove).some(
      (item) => item.area === destination.area && item.pileIndex === destination.pileIndex
    );
    if (!legal) return reject(state, "Illegal move.");

    return applyMove(
      game,
      () => {
        removeSourceCards(state, source, cards.length);
        if (destination.area === "foundation") {
          state.foundations[destination.pileIndex].push(...cards);
        } else {
          state.tableau[destination.pileIndex].push(...cards);
        }
        revealTableauSource(state, source);
      },
      "Move complete.",
      now
    );
  }

  function removeSourceCards(state, source, count) {
    if (source.area === "waste") {
      state.waste.splice(source.cardIndex, count);
    } else if (source.area === "foundation") {
      state.foundations[source.pileIndex].splice(source.cardIndex, count);
    } else {
      state.tableau[source.pileIndex].splice(source.cardIndex, count);
    }
  }

  function revealTableauSource(state, source) {
    if (source.area !== "tableau") return;
    const pile = state.tableau[source.pileIndex];
    const card = topCard(pile);
    if (card && !card.faceUp) {
      card.faceUp = true;
    }
  }

  function reject(state, message) {
    state.status = message;
    return false;
  }

  function undo(game) {
    const previous = game.undoStack.pop();
    if (!previous) {
      game.state.status = "Nothing to undo.";
      return false;
    }
    game.state = cloneState(previous);
    game.state.status = "Move undone.";
    return true;
  }

  function restart(options = {}) {
    return createGame(options);
  }

  function elapsedMs(state, now = Date.now()) {
    if (!state.startedAt) return state.elapsedBeforeStart;
    const end = state.wonAt || now;
    return state.elapsedBeforeStart + Math.max(0, end - state.startedAt);
  }

  function isWon(state) {
    return state.foundations.every((foundation) => foundation.length === 13);
  }

  function hint(game) {
    const candidates = [];
    for (const card of topMovableCards(game.state)) {
      for (const destination of legalDestinations(game, card.id)) {
        const priority = destination.area === "foundation" ? 0 : card.rank === "K" ? 2 : 1;
        candidates.push({ cardId: card.id, destination, priority });
      }
    }
    candidates.sort((a, b) => a.priority - b.priority);
    return candidates[0] || null;
  }

  function topMovableCards(state) {
    const cards = [];
    const waste = topCard(state.waste);
    if (waste) cards.push(waste);
    state.tableau.forEach((pile) => {
      pile.forEach((card) => {
        if (card.faceUp) cards.push(card);
      });
    });
    return cards;
  }

  function autoMove(game, cardIdToMove, now) {
    const source = findCard(game.state, cardIdToMove);
    if (!source) return false;
    const cards = sourceCards(game.state, source);
    if (cards.length !== 1) return reject(game.state, "Only one card can auto-move.");
    const destination = legalDestinations(game, cardIdToMove).find(
      (item) => item.area === "foundation"
    );
    if (!destination) return reject(game.state, "No foundation move available.");
    return move(game, cardIdToMove, destination, now);
  }

  function autoFinish(game, now) {
    let moved = false;
    let next = hint(game);
    while (next && next.destination.area === "foundation") {
      autoMove(game, next.cardId, now);
      moved = true;
      next = hint(game);
    }
    if (!moved) {
      game.state.status = "No safe auto-finish available.";
    }
    return moved;
  }

  return {
    suits,
    ranks,
    createGame,
    restoreGame,
    serialize,
    draw,
    move,
    undo,
    restart,
    legalDestinations,
    hint,
    autoMove,
    autoFinish,
    elapsedMs,
    isWon,
    cardColor,
    rankValue
  };
});
