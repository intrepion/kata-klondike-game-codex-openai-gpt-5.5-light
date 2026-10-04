const test = require("node:test");
const assert = require("node:assert/strict");
const Klondike = require("../game.js");

test("creates a reproducible deal from a deal seed", () => {
  const first = Klondike.createGame({ seed: "OWL-001", drawMode: 1 });
  const second = Klondike.createGame({ seed: "OWL-001", drawMode: 1 });

  assert.equal(first.state.seed, "OWL-001");
  assert.deepEqual(
    first.state.tableau.map((pile) => pile.map((card) => card.id)),
    second.state.tableau.map((pile) => pile.map((card) => card.id))
  );
  assert.equal(first.state.stock.length, 24);
  assert.deepEqual(
    first.state.tableau.map((pile) => pile.length),
    [1, 2, 3, 4, 5, 6, 7]
  );
});

test("draws one or three cards according to draw mode and only exposes the top waste card", () => {
  const drawOne = Klondike.createGame({ seed: "DRAW-1", drawMode: 1 });
  const drawThree = Klondike.createGame({ seed: "DRAW-3", drawMode: 3 });

  Klondike.draw(drawOne, 1000);
  Klondike.draw(drawThree, 1000);

  assert.equal(drawOne.state.waste.length, 1);
  assert.equal(drawThree.state.waste.length, 3);
  assert.equal(drawThree.state.waste.at(-1).faceUp, true);
});

test("recycles waste back into stock when stock is empty", () => {
  const game = Klondike.createGame({ seed: "RECYCLE", drawMode: 3 });
  while (game.state.stock.length) {
    Klondike.draw(game, 1000);
  }
  const wasteIds = game.state.waste.map((card) => card.id);

  Klondike.draw(game, 1000);

  assert.equal(game.state.waste.length, 0);
  assert.equal(game.state.stock.length, wasteIds.length);
  assert.equal(game.state.stock.every((card) => !card.faceUp), true);
});

test("allows only a king or king-led run onto an empty tableau", () => {
  const game = Klondike.createGame({ seed: "EMPTY", drawMode: 1 });
  game.state.tableau = [
    [],
    [{ id: "KC", suit: "C", rank: "K", faceUp: true }],
    [{ id: "QS", suit: "S", rank: "Q", faceUp: true }],
    [],
    [],
    [],
    []
  ];
  game.state.stock = [];
  game.state.waste = [];

  assert.equal(Klondike.move(game, "QS", { area: "tableau", pileIndex: 0 }, 1000), false);
  assert.equal(Klondike.move(game, "KC", { area: "tableau", pileIndex: 0 }, 1000), true);
});

test("reveals the next face-down tableau card as part of an undoable move", () => {
  const game = Klondike.createGame({ seed: "REVEAL", drawMode: 1 });
  game.state.tableau = [
    [
      { id: "9C", suit: "C", rank: "9", faceUp: false },
      { id: "8H", suit: "H", rank: "8", faceUp: true }
    ],
    [{ id: "9S", suit: "S", rank: "9", faceUp: true }],
    [],
    [],
    [],
    [],
    []
  ];
  game.state.stock = [];
  game.state.waste = [];

  assert.equal(Klondike.move(game, "8H", { area: "tableau", pileIndex: 1 }, 1000), true);
  assert.equal(game.state.tableau[0][0].faceUp, true);
  assert.equal(Klondike.undo(game), true);
  assert.equal(game.state.tableau[0][0].faceUp, false);
});
