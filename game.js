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
    if (!canAutoFinish(game)) {
      game.state.status = "Auto-Finish is available only when tableau choices are exhausted.";
      return false;
    }
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

  function canAutoFinish(game) {
    for (const card of topMovableCards(game.state)) {
      const destinations = legalDestinations(game, card.id);
      if (destinations.some((destination) => destination.area === "tableau")) {
        return false;
      }
    }
    return game.state.tableau.every((pile) => pile.every((card) => card.faceUp));
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
    canAutoFinish,
    elapsedMs,
    isWon,
    cardColor,
    rankValue
  };
});

(function () {
  if (typeof document === "undefined" || !window.Klondike) return;

  const Klondike = window.Klondike;
  const storageKey = "klondike.savedGame.v1";
  const suitSymbols = { S: "♠", H: "♥", D: "♦", C: "♣" };
  const elements = {};
  let game = null;
  let selected = null;
  let hinted = null;
  let timerId = null;

  document.addEventListener("DOMContentLoaded", () => {
    cacheElements();
    game = loadGame();
    bindEvents();
    render();
    timerId = window.setInterval(renderTimer, 1000);
  });

  function cacheElements() {
    [
      "status",
      "draw-mode",
      "seed-entry",
      "new-game",
      "same-deal",
      "undo",
      "hint",
      "auto-finish",
      "moves",
      "timer",
      "stock",
      "waste",
      "foundations",
      "tableau",
      "win-panel",
      "win-summary",
      "win-new-game",
      "win-same-deal"
    ].forEach((id) => {
      elements[id] = document.getElementById(id);
    });
  }

  function bindEvents() {
    elements.stock.addEventListener("click", () => {
      selected = null;
      Klondike.draw(game);
      afterAction();
    });
    elements["new-game"].addEventListener("click", () => newGame(false));
    elements["same-deal"].addEventListener("click", () => newGame(true));
    elements["win-new-game"].addEventListener("click", () => newGame(false));
    elements["win-same-deal"].addEventListener("click", () => newGame(true));
    elements.undo.addEventListener("click", () => {
      selected = null;
      Klondike.undo(game);
      afterAction();
    });
    elements["draw-mode"].addEventListener("change", () => {
      if (game.state.moveCount > 0 && !window.confirm("Start a new game with this draw mode?")) {
        elements["draw-mode"].value = String(game.state.drawMode);
        return;
      }
      newGame(false);
    });
    elements.hint.addEventListener("click", showHint);
    elements["auto-finish"].addEventListener("click", () => {
      selected = null;
      hinted = null;
      Klondike.autoFinish(game);
      afterAction();
    });
    elements["seed-entry"].addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        newGame(true, elements["seed-entry"].value.trim());
      }
    });
    document.addEventListener("keydown", handleKeyboard);
  }

  function loadGame() {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) return Klondike.restoreGame(JSON.parse(raw));
    } catch {
      window.localStorage.removeItem(storageKey);
    }
    return Klondike.createGame();
  }

  function saveGame() {
    window.localStorage.setItem(storageKey, JSON.stringify(Klondike.serialize(game)));
  }

  function newGame(sameDeal, explicitSeed) {
    const hasProgress = game && game.state.moveCount > 0 && !game.state.wonAt;
    if (!sameDeal && hasProgress && !window.confirm("Start a new game and abandon this one?")) {
      return;
    }
    const seed = explicitSeed || (sameDeal && game ? game.state.seed : undefined);
    const drawMode = Number(elements["draw-mode"].value) === 3 ? 3 : 1;
    selected = null;
    hinted = null;
    game = Klondike.createGame({ seed, drawMode });
    afterAction();
  }

  function afterAction() {
    saveGame();
    render();
  }

  function render() {
    const state = game.state;
    elements.status.textContent = state.status || "";
    elements.moves.textContent = String(state.moveCount);
    elements["draw-mode"].value = String(state.drawMode);
    elements["seed-entry"].value = state.seed;
    renderTimer();
    renderStock();
    renderWaste();
    renderFoundations();
    renderTableau();
    renderWin();
    highlightLegalDestinations();
  }

  function renderTimer() {
    if (!game) return;
    elements.timer.textContent = formatTime(Klondike.elapsedMs(game.state));
  }

  function formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
  }

  function renderStock() {
    elements.stock.textContent = game.state.stock.length ? "" : "↻";
    elements.stock.classList.toggle("has-cards", game.state.stock.length > 0);
    elements.stock.setAttribute(
      "aria-label",
      game.state.stock.length ? `Stock, ${game.state.stock.length} cards` : "Recycle waste"
    );
  }

  function renderWaste() {
    elements.waste.innerHTML = "";
    const visible = game.state.waste.slice(-game.state.drawMode);
    visible.forEach((card, index) => {
      const isTop = index === visible.length - 1;
      elements.waste.append(cardButton(card, { disabled: !isTop }));
    });
  }

  function renderFoundations() {
    elements.foundations.innerHTML = "";
    Klondike.suits.forEach((suit, index) => {
      const pile = document.createElement("div");
      pile.className = "pile foundation-pile";
      pile.setAttribute("role", "button");
      pile.tabIndex = 0;
      pile.dataset.area = "foundation";
      pile.dataset.pileIndex = String(index);
      pile.setAttribute("aria-label", `${suitName(suit)} foundation`);
      pile.addEventListener("click", () => destinationClick({ area: "foundation", pileIndex: index }));
      pile.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          destinationClick({ area: "foundation", pileIndex: index });
        }
      });
      bindDropTarget(pile, { area: "foundation", pileIndex: index });
      const card = game.state.foundations[index].at(-1);
      if (card) pile.append(cardButton(card));
      else pile.textContent = suitSymbols[suit];
      elements.foundations.append(pile);
    });
  }

  function renderTableau() {
    elements.tableau.innerHTML = "";
    game.state.tableau.forEach((cards, pileIndex) => {
      const pile = document.createElement("div");
      pile.className = "pile tableau-pile";
      pile.setAttribute("role", "button");
      pile.tabIndex = 0;
      pile.dataset.area = "tableau";
      pile.dataset.pileIndex = String(pileIndex);
      pile.setAttribute("aria-label", `Tableau ${pileIndex + 1}`);
      pile.addEventListener("click", (event) => {
        if (event.target === pile) destinationClick({ area: "tableau", pileIndex });
      });
      pile.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          destinationClick({ area: "tableau", pileIndex });
        }
      });
      bindDropTarget(pile, { area: "tableau", pileIndex });
      let offset = 0;
      cards.forEach((card, cardIndex) => {
        const button = cardButton(card);
        button.style.top = `${offset}px`;
        button.dataset.pileIndex = String(pileIndex);
        button.dataset.cardIndex = String(cardIndex);
        pile.append(button);
        offset += card.faceUp
          ? cssPixelValue("--tableau-face-step")
          : cssPixelValue("--tableau-back-step");
      });
      elements.tableau.append(pile);
    });
  }

  function renderWin() {
    const won = Boolean(game.state.wonAt);
    elements["win-panel"].hidden = !won;
    if (won) {
      elements["win-summary"].textContent = `${game.state.moveCount} moves in ${formatTime(
        Klondike.elapsedMs(game.state)
      )}. Seed ${game.state.seed}.`;
    }
  }

  function cardButton(card, options = {}) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `card ${card.faceUp ? Klondike.cardColor(card) : "back"}`;
    button.dataset.cardId = card.id;
    button.disabled = options.disabled || !card.faceUp;
    if (!button.disabled && !options.nested) {
      button.draggable = true;
    }
    button.setAttribute("aria-label", card.faceUp ? `${rankName(card.rank)} of ${suitName(card.suit)}` : "Face-down card");
    if (selected === card.id) button.classList.add("selected");
    if (hinted === card.id) button.classList.add("hint");
    if (card.faceUp) {
      button.innerHTML = `<span class="rank">${card.rank}</span><span class="suit">${suitSymbols[card.suit]}</span>`;
    }
    if (!options.nested) {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        cardClick(card.id);
      });
      button.addEventListener("dblclick", (event) => {
        event.stopPropagation();
        Klondike.autoMove(game, card.id);
        selected = null;
        hinted = null;
        afterAction();
      });
      button.addEventListener("dragstart", (event) => {
        selected = card.id;
        hinted = null;
        button.classList.add("dragging");
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", card.id);
        window.requestAnimationFrame(render);
      });
      button.addEventListener("dragend", () => {
        document.querySelectorAll(".card.dragging").forEach((item) => item.classList.remove("dragging"));
      });
    }
    return button;
  }

  function cssPixelValue(name) {
    const probe = document.createElement("div");
    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
    probe.style.pointerEvents = "none";
    probe.style.height = `var(${name})`;
    document.body.append(probe);
    const pixels = probe.getBoundingClientRect().height;
    probe.remove();
    return pixels;
  }

  function cardClick(cardId) {
    if (selected === cardId) {
      selected = null;
      hinted = null;
      render();
      return;
    }
    if (selected) {
      const destination = destinationForCard(cardId);
      if (destination && Klondike.move(game, selected, destination)) {
        selected = null;
        hinted = null;
        afterAction();
        return;
      }
    }
    selected = cardId;
    hinted = null;
    render();
  }

  function destinationForCard(cardId) {
    for (let pileIndex = 0; pileIndex < game.state.tableau.length; pileIndex += 1) {
      if (game.state.tableau[pileIndex].some((card) => card.id === cardId)) {
        return { area: "tableau", pileIndex };
      }
    }
    for (let pileIndex = 0; pileIndex < game.state.foundations.length; pileIndex += 1) {
      if (game.state.foundations[pileIndex].some((card) => card.id === cardId)) {
        return { area: "foundation", pileIndex };
      }
    }
    return null;
  }

  function destinationClick(destination) {
    if (!selected) return;
    const moved = Klondike.move(game, selected, destination);
    if (!moved) flashReject(destination);
    selected = moved ? null : selected;
    hinted = null;
    afterAction();
  }

  function bindDropTarget(element, destination) {
    element.addEventListener("dragover", (event) => {
      if (!selected) return;
      const legal = Klondike.legalDestinations(game, selected).some(
        (item) => item.area === destination.area && item.pileIndex === destination.pileIndex
      );
      if (legal) {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      }
    });
    element.addEventListener("drop", (event) => {
      event.preventDefault();
      const cardId = event.dataTransfer.getData("text/plain") || selected;
      selected = cardId;
      destinationClick(destination);
    });
  }

  function highlightLegalDestinations() {
    document.querySelectorAll(".pile.legal").forEach((pile) => pile.classList.remove("legal"));
    if (!selected) return;
    Klondike.legalDestinations(game, selected).forEach((destination) => {
      const pile = document.querySelector(
        `.pile[data-area="${destination.area}"][data-pile-index="${destination.pileIndex}"]`
      );
      if (pile) pile.classList.add("legal");
    });
  }

  function flashReject(destination) {
    const pile = document.querySelector(
      `.pile[data-area="${destination.area}"][data-pile-index="${destination.pileIndex}"]`
    );
    if (!pile) return;
    pile.classList.remove("reject");
    void pile.offsetWidth;
    pile.classList.add("reject");
  }

  function showHint() {
    const next = Klondike.hint(game);
    if (!next) {
      selected = null;
      hinted = null;
      render();
      elements.status.textContent = "No legal hint available.";
      return;
    }
    selected = null;
    hinted = next.cardId;
    render();
    elements.status.textContent = `Hint: move ${readableCard(next.cardId)}.`;
  }

  function handleKeyboard(event) {
    const target = event.target;
    const editing = target && ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName);
    if (editing) return;
    if (event.key === "Escape") {
      selected = null;
      hinted = null;
      render();
      return;
    }
    if (event.key.toLowerCase() === "u") {
      selected = null;
      hinted = null;
      Klondike.undo(game);
      afterAction();
      return;
    }
    if (event.key.toLowerCase() === "h") {
      showHint();
      return;
    }
    if (event.key.toLowerCase() === "n") {
      newGame(false);
      return;
    }
    if (["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(event.key)) {
      moveFocus(event.key);
    }
  }

  function moveFocus(key) {
    const focusables = Array.from(
      document.querySelectorAll("button:not(:disabled), input:not(:disabled), select:not(:disabled)")
    );
    const current = focusables.indexOf(document.activeElement);
    const direction = key === "ArrowLeft" || key === "ArrowUp" ? -1 : 1;
    const nextIndex = current < 0 ? 0 : (current + direction + focusables.length) % focusables.length;
    focusables[nextIndex].focus();
  }

  function rankName(rank) {
    return { A: "Ace", J: "Jack", Q: "Queen", K: "King" }[rank] || rank;
  }

  function readableCard(cardId) {
    const card = [...game.state.waste, ...game.state.tableau.flat(), ...game.state.foundations.flat()].find(
      (item) => item.id === cardId
    );
    return card ? `${rankName(card.rank)} of ${suitName(card.suit)}` : cardId;
  }

  function suitName(suit) {
    return { S: "spades", H: "hearts", D: "diamonds", C: "clubs" }[suit];
  }

  window.addEventListener("beforeunload", () => {
    if (timerId) window.clearInterval(timerId);
  });
})();
