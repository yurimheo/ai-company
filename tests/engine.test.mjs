import test from "node:test";
import assert from "node:assert/strict";
import { findPath, tileKey } from "../web/engine.js";

test("A* routes around walls and furniture", () => {
  const grid = [
    ["floor", "floor", "floor", "floor", "floor"],
    ["floor", "wall", "desk", "wall", "floor"],
    ["floor", "floor", "floor", "floor", "floor"],
  ];
  const path = findPath(grid, { x: 0, y: 0 }, { x: 4, y: 0 });
  assert.ok(path);
  assert.deepEqual(path[0], { x: 0, y: 0 });
  assert.deepEqual(path.at(-1), { x: 4, y: 0 });
  assert.equal(path.some((tile) => tile.x === 2 && tile.y === 1), false);
});

test("A* avoids a tile occupied by another employee", () => {
  const grid = [
    ["floor", "floor", "floor"],
    ["floor", "floor", "floor"],
    ["floor", "floor", "floor"],
  ];
  const occupied = new Set([tileKey(1, 0)]);
  const path = findPath(grid, { x: 0, y: 0 }, { x: 2, y: 0 }, occupied);
  assert.ok(path);
  assert.equal(path.some((tile) => tile.x === 1 && tile.y === 0), false);
});

test("the destination may be a non-walkable chair", () => {
  const grid = [["floor", "floor", "chair"]];
  const path = findPath(grid, { x: 0, y: 0 }, { x: 2, y: 0 });
  assert.deepEqual(path, [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 2, y: 0 },
  ]);
});
