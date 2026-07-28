export const WALKABLE_TILES = new Set(["floor", "corridor", "door", "plaza", "rug"]);

export function tileKey(x, y) {
  return `${x},${y}`;
}

export function manhattan(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function findPath(grid, start, goal, occupied = new Set()) {
  const height = grid.length;
  const width = grid[0]?.length ?? 0;
  const startKey = tileKey(start.x, start.y);
  const goalKey = tileKey(goal.x, goal.y);

  function canEnter(x, y) {
    if (x < 0 || y < 0 || x >= width || y >= height) return false;
    const key = tileKey(x, y);
    if (key === startKey || key === goalKey) return true;
    return WALKABLE_TILES.has(grid[y][x]) && !occupied.has(key);
  }

  const open = [{ ...start, g: 0, f: manhattan(start, goal), parent: null }];
  const best = new Map([[startKey, 0]]);
  const closed = new Set();
  let guard = 0;

  while (open.length && guard < width * height * 8) {
    guard += 1;
    let bestIndex = 0;
    for (let i = 1; i < open.length; i += 1) {
      if (open[i].f < open[bestIndex].f) bestIndex = i;
    }

    const current = open.splice(bestIndex, 1)[0];
    const currentKey = tileKey(current.x, current.y);
    if (currentKey === goalKey) {
      const path = [];
      let node = current;
      while (node) {
        path.unshift({ x: node.x, y: node.y });
        node = node.parent;
      }
      return path;
    }
    if (closed.has(currentKey)) continue;
    closed.add(currentKey);

    const neighbors = [
      { x: current.x + 1, y: current.y },
      { x: current.x - 1, y: current.y },
      { x: current.x, y: current.y + 1 },
      { x: current.x, y: current.y - 1 },
    ];

    for (const next of neighbors) {
      const key = tileKey(next.x, next.y);
      if (closed.has(key) || !canEnter(next.x, next.y)) continue;
      const g = current.g + 1;
      if (!best.has(key) || g < best.get(key)) {
        best.set(key, g);
        open.push({
          ...next,
          g,
          f: g + manhattan(next, goal),
          parent: current,
        });
      }
    }
  }

  return null;
}

export function classifyCommand(rawCommand, teamAliases = {}) {
  const command = rawCommand.trim();
  const teamId = Object.entries(teamAliases).find(([, aliases]) =>
    aliases.some((alias) => command.includes(alias)),
  )?.[0];

  if (teamId && command.includes("회의")) return { type: "team-meeting", teamId };
  if (teamId && (command.includes("일") || command.includes("업무") || command.includes("시작"))) {
    return { type: "team-work", teamId };
  }
  if (teamId && (command.includes("뭐해") || command.includes("현황"))) {
    return { type: "team-report", teamId };
  }
  if (command.includes("현황") || command.includes("브리핑")) return { type: "status-report" };
  if (command.includes("왜 늦") || command.includes("병목")) return { type: "bottleneck" };
  if (command.includes("회의")) return { type: "leaders-meeting" };
  if (command.includes("집중")) return { type: "focus" };
  if (command.includes("승인")) return { type: "approve" };
  if (command.includes("다음")) return { type: "next" };
  return { type: "unknown" };
}
