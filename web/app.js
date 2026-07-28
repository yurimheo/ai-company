import { classifyCommand, findPath, tileKey, WALKABLE_TILES } from "./engine.js";

const TILE = 30;
const MOVE_MS = 165;
const ROOM_HEIGHT = 5;
const CORRIDOR_HEIGHT = 3;

const STATUS = {
  완료: { color: "#74c7a4", label: "완료", short: "완료" },
  "진행 중": { color: "#e9bd58", label: "진행 중", short: "진행" },
  "승인 대기": { color: "#d87998", label: "승인 대기", short: "승인" },
  "연동 대기": { color: "#a794c6", label: "연동 대기", short: "연동" },
  대기: { color: "#c9bca3", label: "대기", short: "대기" },
};

const DEPARTMENTS = {
  vmware: {
    name: "VMware팀",
    short: "VMware",
    animal: "🐘",
    species: "elephant",
    code: "vSphere",
  },
  k8s: {
    name: "Kubernetes팀",
    short: "K8s",
    animal: "🐬",
    species: "dolphin",
    code: "Helm",
  },
  linux: {
    name: "Linux팀",
    short: "Linux",
    animal: "🐧",
    species: "penguin",
    code: "Tux",
  },
  trend: {
    name: "IT트렌드팀",
    short: "IT트렌드",
    animal: "🦊",
    species: "fox",
    code: "Radar",
  },
  brand: {
    name: "브랜드 분석팀",
    short: "브랜드",
    animal: "🦉",
    species: "owl",
    code: "Insight",
  },
  qa: {
    name: "검수팀",
    short: "검수",
    animal: "🦡",
    species: "meerkat",
    code: "Gatekeeper",
  },
  writer: {
    name: "기술노트 작성팀",
    short: "기술노트",
    animal: "🦫",
    species: "beaver",
    code: "Draft",
  },
  format: {
    name: "콘텐츠 정리팀",
    short: "콘텐츠 정리",
    animal: "🐿️",
    species: "squirrel",
    code: "Format",
  },
  review: {
    name: "성과리뷰팀",
    short: "성과리뷰",
    animal: "🐢",
    species: "turtle",
    code: "Pattern",
  },
  auto: {
    name: "자동화 운영팀",
    short: "자동화",
    animal: "🐜",
    species: "ant",
    code: "Cron",
  },
  secretary: {
    name: "비서실",
    short: "비서실",
    animal: "🐶",
    species: "dog",
    code: "Chief",
  },
  ceo: {
    name: "대표실",
    short: "대표실",
    animal: "👩🏻",
    species: "human",
    code: "CEO",
  },
};

const NEXT_ROOM = {
  vmware: "qa",
  k8s: "qa",
  linux: "qa",
  trend: "qa",
  brand: "qa",
  qa: "meeting",
  writer: "format",
  format: "auto",
  review: "secretary",
  auto: "secretary",
  secretary: "ceo",
};

const TEAM_ALIASES = Object.fromEntries(
  Object.entries(DEPARTMENTS)
    .filter(([id]) => id !== "ceo")
    .map(([id, department]) => [
      id,
      [department.name, department.short, department.code].filter(Boolean),
    ]),
);

const ROSTER = {
  vmware: [
    ["코끼리 몬티", "팀장", "vSphere"],
    ["코끼리 두리", "팀원", "VKS·Automation 릴리즈 추적"],
    ["코끼리 노아", "팀원", "vSphere·인프라 동향 조사"],
  ],
  k8s: [
    ["돌고래 파일럿", "팀장", "Helm"],
    ["돌고래 니모", "팀원", "공식 릴리즈·CNCF 추적"],
    ["돌고래 소나", "팀원", "매니페스트·명령어 검증"],
  ],
  linux: [
    ["펭귄 턱스", "팀장", "Tux"],
    ["펭귄 커널", "팀원", "배포판·커널 릴리즈 추적"],
    ["펭귄 쉘리", "팀원", "CLI 명령어 검증"],
  ],
  trend: [
    ["여우 스카우트", "팀장", "Radar"],
    ["여우 노즈", "팀원", "인프라·클라우드 동향 수집"],
    ["여우 클루", "팀원", "실무 적용점 도출"],
  ],
  brand: [
    ["올빼미 세이지", "팀장", "Insight"],
    ["올빼미 데이터", "팀원", "지표 분석"],
    ["올빼미 미러", "팀원", "페르소나 검증"],
  ],
  qa: [
    ["미어캣 보초", "팀장", "Gatekeeper"],
    ["미어캣 스캔", "팀원", "출처·버전 검사"],
    ["미어캣 톤", "팀원", "톤·금칙어 검수"],
  ],
  writer: [
    ["비버 빌더", "팀장", "Draft"],
    ["비버 로그", "팀원", "기술 검증"],
    ["비버 라인", "팀원", "문장·구조 다듬기"],
  ],
  format: [
    ["다람쥐 정돈", "팀장", "Format"],
    ["다람쥐 페이지", "팀원", "텍스트·노트 포맷팅"],
    ["다람쥐 카드", "팀원", "카드뉴스·표지"],
  ],
  review: [
    ["거북이 사려", "팀장", "Pattern"],
    ["거북이 넘버", "팀원", "지표 수집"],
    ["거북이 루프", "팀원", "패턴 정리"],
  ],
  auto: [
    ["개미 리트라이", "팀장", "Cron"],
    ["개미 워치", "팀원", "모니터링"],
  ],
  secretary: [
    ["강아지 브리프", "실장", "Chief"],
    ["강아지 노트", "팀원", "보고 취합"],
  ],
  ceo: [["유림", "대표", "최종 결정"]],
};

const STEPS = [
  { title: "전원 출근", icon: "☀", clock: "07:00", description: "31명의 직원과 대표가 출입구부터 각자 자리까지 걸어가요." },
  { title: "매일팀 가동", icon: "⌁", clock: "07:10", description: "VMware팀과 IT트렌드팀이 버튼 없이 매일 자동으로 시작해요." },
  { title: "각 10개 조사", icon: "✎", clock: "08:00", description: "VMware 이슈 10개와 AI 트렌드 10개를 공식·지정 출처에서 찾아요." },
  { title: "브랜드 분석", icon: "◉", clock: "09:40", description: "페르소나 적합성을 확인해요. 통계 미연동은 근거 없이 채우지 않아요." },
  { title: "검수", icon: "✓", clock: "10:30", description: "브랜드 기준, 출처, 제품 버전, 실행 검증 여부를 전수 검사해요." },
  { title: "TOP 3", icon: "★", clock: "11:30", description: "검수 통과안 가운데 TOP 3만 대표에게 올려요." },
  { title: "대표 승인", icon: "!", clock: "11:40", description: "대표가 승인·수정·보류·폐기 중 하나를 결정할 때까지 멈춰요.", approval: true },
  { title: "기술노트 작성", icon: "⌨", clock: "13:00", description: "승인된 1개만 기술노트와 카드뉴스 요약으로 작성해요." },
  { title: "콘텐츠 정리", icon: "▤", clock: "15:00", description: "Obsidian 노트와 카드뉴스 포맷으로 정리해요." },
  { title: "결과물 저장", icon: "▣", clock: "16:00", description: "원본을 건드리지 않고 지정 폴더에 결과물을 저장해요." },
  { title: "성과 기록", icon: "↗", clock: "17:00", description: "연동된 지표만 기록하고 다음 기획 반영점을 남겨요." },
  { title: "비서실 브리핑", icon: "☕", clock: "17:30", description: "완료·진행·승인 대기·막힌 것·결정할 것을 5줄로 보고해요." },
];

const NORTH_ROOMS = [
  ["vmware", 3],
  ["k8s", 3],
  ["linux", 3],
  ["trend", 3],
  ["brand", 3],
  ["qa", 3],
  ["writer", 3],
  ["format", 3],
];

const SOUTH_ROOMS = [
  ["entrance", 0, 5],
  ["ceo", 1, 5],
  ["lounge", 0, 5],
  ["meeting", 0, 8],
  ["review", 3, 5],
  ["auto", 2, 5],
  ["secretary", 2, 5],
];

const SPECIAL_ROOMS = {
  entrance: { name: "출입구", short: "출입구", animal: "✿", color: "#98bc8c" },
  lounge: { name: "라운지", short: "라운지", animal: "☕", color: "#d8aa82" },
  meeting: { name: "회의실", short: "회의실", animal: "✦", color: "#b99ac7" },
};

const roomColors = {
  vmware: "#adc6b8",
  k8s: "#a9cdd2",
  linux: "#b7bccb",
  trend: "#edbd8f",
  brand: "#c7b1d3",
  qa: "#d6bb95",
  writer: "#b7ce9d",
  format: "#e5b992",
  review: "#a9c8a5",
  auto: "#ddb293",
  secretary: "#e7c58d",
  ceo: "#e9b7a9",
  entrance: "#a9c696",
  lounge: "#d6ad86",
  meeting: "#bea6cc",
};

const grid = [];
const rooms = {};
const allRooms = [];
let gridWidth = 0;
let gridHeight = 0;

function makeRoom(id, desks, width) {
  const meta = DEPARTMENTS[id] || SPECIAL_ROOMS[id];
  return {
    id,
    name: meta.name,
    short: meta.short,
    animal: meta.animal,
    desks,
    w: width || Math.max(5, desks * 2 - 1),
    h: ROOM_HEIGHT,
    deskTiles: [],
    seatTiles: [],
    openTiles: [],
    meetingSeats: [],
    loungeSeats: [],
  };
}

function placeRow(specs, y) {
  let x = 1;
  const row = specs.map(([id, desks, width]) => {
    const room = makeRoom(id, desks, width);
    room.x = x;
    room.y = y;
    x += room.w + 3;
    return room;
  });
  return { row, end: x };
}

const northLayout = placeRow(NORTH_ROOMS, 1);
const corridorY = 7;
const southLayout = placeRow(SOUTH_ROOMS, corridorY + CORRIDOR_HEIGHT + 1);
gridWidth = Math.max(northLayout.end, southLayout.end) + 1;
gridHeight = southLayout.row[0].y + ROOM_HEIGHT + 5;

for (let y = 0; y < gridHeight; y += 1) {
  grid.push(new Array(gridWidth).fill("grass"));
}

for (let y = corridorY; y < corridorY + CORRIDOR_HEIGHT; y += 1) {
  for (let x = 0; x < gridWidth; x += 1) grid[y][x] = "corridor";
}

function setTile(x, y, type) {
  if (grid[y] && x >= 0 && x < gridWidth) grid[y][x] = type;
}

function isGoalTile(tile) {
  return ["chair", "meeting-chair", "lounge-chair"].includes(tile);
}

function furnishRoom(room, facing) {
  const { x, y, w, h } = room;
  room.facing = facing;

  for (let yy = y - 1; yy <= y + h; yy += 1) {
    for (let xx = x - 1; xx <= x + w; xx += 1) {
      const border = yy === y - 1 || yy === y + h || xx === x - 1 || xx === x + w;
      setTile(xx, yy, border ? "wall" : "floor");
    }
  }

  const doorX = x + Math.floor(w / 2);
  const doorY = facing === "down" ? y + h : y - 1;
  setTile(doorX, doorY, "door");
  room.door = { x: doorX, y: doorY };

  if (room.desks > 0) {
    const deskY = facing === "down" ? y + 1 : y + h - 2;
    const seatY = facing === "down" ? deskY + 1 : deskY - 1;
    const positions =
      room.desks === 1 ? [x + Math.floor(w / 2)] : Array.from({ length: room.desks }, (_, i) => x + i * 2);
    positions.forEach((deskX) => {
      setTile(deskX, deskY, "desk");
      setTile(deskX, seatY, "chair");
      room.deskTiles.push({ x: deskX, y: deskY });
      room.seatTiles.push({ x: deskX, y: seatY });
    });
  }

  if (room.id === "meeting") {
    const tableY = y + 2;
    for (let xx = x + 1; xx < x + w - 1; xx += 1) setTile(xx, tableY, "table");
    for (let xx = x + 1; xx < x + w - 1; xx += 1) {
      setTile(xx, tableY - 1, "meeting-chair");
      setTile(xx, tableY + 1, "meeting-chair");
      room.meetingSeats.push({ x: xx, y: tableY - 1 }, { x: xx, y: tableY + 1 });
    }
  }

  if (room.id === "lounge") {
    setTile(x, y + 1, "sofa");
    setTile(x + 1, y + 1, "sofa");
    setTile(x + w - 2, y + 1, "sofa");
    setTile(x + w - 1, y + 1, "sofa");
    setTile(x + 2, y + 3, "coffee-table");
    room.loungeSeats.push({ x: x, y: y + 2 }, { x: x + 1, y: y + 2 }, { x: x + w - 2, y: y + 2 }, { x: x + w - 1, y: y + 2 });
    room.loungeSeats.forEach((tile) => setTile(tile.x, tile.y, "lounge-chair"));
  }

  if (room.id === "entrance") {
    for (let xx = x + 1; xx < x + w - 1; xx += 1) setTile(xx, y + 2, "rug");
    setTile(x, y, "plant");
    setTile(x + w - 1, y, "plant");
    const outsideDoorY = y + h;
    setTile(doorX, outsideDoorY, "door");
    for (let yy = outsideDoorY + 1; yy < gridHeight; yy += 1) {
      setTile(doorX, yy, "plaza");
      if (yy === gridHeight - 1) {
        setTile(doorX - 1, yy, "plaza");
        setTile(doorX + 1, yy, "plaza");
      }
    }
  }

  if (room.id !== "entrance" && room.id !== "meeting" && room.id !== "lounge") {
    const plantX = facing === "down" ? x + w - 1 : x;
    const plantY = facing === "down" ? y + h - 1 : y;
    if (grid[plantY][plantX] === "floor") setTile(plantX, plantY, "plant");
  }

  for (let yy = y; yy < y + h; yy += 1) {
    for (let xx = x; xx < x + w; xx += 1) {
      if (WALKABLE_TILES.has(grid[yy][xx]) || isGoalTile(grid[yy][xx])) {
        room.openTiles.push({ x: xx, y: yy });
      }
    }
  }

  rooms[room.id] = room;
  allRooms.push(room);
}

northLayout.row.forEach((room) => furnishRoom(room, "down"));
southLayout.row.forEach((room) => furnishRoom(room, "up"));

const mapCanvas = document.getElementById("office-map");
const peopleCanvas = document.getElementById("office-people");
const mapContext = mapCanvas.getContext("2d");
const peopleContext = peopleCanvas.getContext("2d");
const mapStage = document.getElementById("map-stage");
const mapViewport = document.getElementById("map-viewport");

mapCanvas.width = gridWidth * TILE;
mapCanvas.height = gridHeight * TILE;
peopleCanvas.width = mapCanvas.width;
peopleCanvas.height = mapCanvas.height;
mapContext.imageSmoothingEnabled = false;
peopleContext.imageSmoothingEnabled = false;

const palette = {
  grass: "#7ea66f",
  grass2: "#86ad75",
  floor: "#efd9a9",
  floor2: "#f3e0b7",
  corridor: "#d7bf91",
  corridor2: "#dfc99f",
  wall: "#9c765c",
  wallTop: "#c69973",
  wallDark: "#74533f",
  door: "#b8784f",
  desk: "#a46d48",
  deskLight: "#c38a5f",
  chair: "#6f8b73",
  chairDark: "#4f6c57",
  table: "#875a43",
  sofa: "#d08b78",
  sofaDark: "#a8675b",
  rug: "#c8a6c9",
  outline: "#4d3a35",
};

function hash(x, y = 0) {
  let value = (x * 374761393 + y * 668265263) | 0;
  value = (value ^ (value >>> 13)) * 1274126177;
  return (value ^ (value >>> 16)) >>> 0;
}

function shade(hex, amount) {
  const raw = hex.replace("#", "");
  const number = parseInt(raw, 16);
  const r = Math.max(0, Math.min(255, (number >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((number >> 8) & 255) + amount));
  const b = Math.max(0, Math.min(255, (number & 255) + amount));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function pixelRect(context, x, y, w, h, color) {
  context.fillStyle = color;
  context.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function drawTile(x, y, type) {
  const px = x * TILE;
  const py = y * TILE;
  const checker = (x + y) % 2 === 0;
  const h = hash(x, y);

  if (type === "grass") {
    pixelRect(mapContext, px, py, TILE, TILE, checker ? palette.grass : palette.grass2);
    if (h % 7 === 0) {
      pixelRect(mapContext, px + 7, py + 8, 2, 4, "#5f8c59");
      pixelRect(mapContext, px + 13, py + 18, 2, 3, "#67955e");
    }
    if (h % 31 === 0) {
      pixelRect(mapContext, px + 19, py + 8, 3, 3, "#f4d984");
      pixelRect(mapContext, px + 21, py + 10, 2, 2, "#fff1b4");
    }
    return;
  }

  if (type === "floor" || type === "chair" || type === "meeting-chair" || type === "lounge-chair") {
    pixelRect(mapContext, px, py, TILE, TILE, checker ? palette.floor : palette.floor2);
    pixelRect(mapContext, px, py + TILE - 2, TILE, 2, "rgba(104,70,42,.12)");
  } else if (type === "corridor") {
    pixelRect(mapContext, px, py, TILE, TILE, checker ? palette.corridor : palette.corridor2);
    pixelRect(mapContext, px + 14, py, 1, TILE, "rgba(118,78,49,.11)");
  } else if (type === "plaza") {
    pixelRect(mapContext, px, py, TILE, TILE, checker ? "#cdbb94" : "#d7c5a0");
    pixelRect(mapContext, px + 3, py + 14, 24, 2, "rgba(103,78,55,.16)");
  } else if (type === "wall") {
    pixelRect(mapContext, px, py, TILE, TILE, palette.wall);
    pixelRect(mapContext, px, py, TILE, 7, palette.wallTop);
    pixelRect(mapContext, px, py + TILE - 5, TILE, 5, palette.wallDark);
    if (h % 3 === 0) pixelRect(mapContext, px + 14, py + 7, 2, 18, shade(palette.wall, -12));
  } else if (type === "door") {
    pixelRect(mapContext, px, py, TILE, TILE, palette.floor);
    pixelRect(mapContext, px + 2, py + 2, 5, TILE - 4, palette.door);
    pixelRect(mapContext, px + 7, py + 2, 2, TILE - 4, shade(palette.door, 24));
    pixelRect(mapContext, px + 2, py + 2, TILE - 4, 3, shade(palette.door, 28));
  } else if (type === "desk") {
    pixelRect(mapContext, px, py, TILE, TILE, palette.floor);
    pixelRect(mapContext, px + 1, py + 4, TILE - 2, 16, palette.desk);
    pixelRect(mapContext, px + 2, py + 4, TILE - 4, 4, palette.deskLight);
    pixelRect(mapContext, px + 7, py, 16, 10, "#4d4640");
    pixelRect(mapContext, px + 9, py + 2, 12, 6, "#88c7c7");
    pixelRect(mapContext, px + 12, py + 10, 6, 2, "#4d4640");
    pixelRect(mapContext, px + 6, py + 14, 18, 4, "#e8e0cd");
    pixelRect(mapContext, px + 4, py + 21, 4, 8, shade(palette.desk, -20));
    pixelRect(mapContext, px + 22, py + 21, 4, 8, shade(palette.desk, -20));
    return;
  } else if (type === "table" || type === "coffee-table") {
    pixelRect(mapContext, px, py, TILE, TILE, palette.floor);
    const inset = type === "coffee-table" ? 6 : 2;
    pixelRect(mapContext, px + inset, py + 5, TILE - inset * 2, 19, palette.table);
    pixelRect(mapContext, px + inset + 2, py + 6, TILE - inset * 2 - 4, 4, shade(palette.table, 24));
    pixelRect(mapContext, px + inset + 3, py + 24, 4, 5, shade(palette.table, -22));
    pixelRect(mapContext, px + TILE - inset - 7, py + 24, 4, 5, shade(palette.table, -22));
    return;
  } else if (type === "sofa") {
    pixelRect(mapContext, px, py, TILE, TILE, palette.floor);
    pixelRect(mapContext, px + 2, py + 5, TILE - 4, 22, palette.sofaDark);
    pixelRect(mapContext, px + 5, py + 4, TILE - 10, 17, palette.sofa);
    pixelRect(mapContext, px + 5, py + 6, TILE - 10, 4, shade(palette.sofa, 22));
    pixelRect(mapContext, px + 14, py + 8, 2, 13, palette.sofaDark);
    return;
  } else if (type === "plant") {
    pixelRect(mapContext, px, py, TILE, TILE, palette.floor);
    pixelRect(mapContext, px + 9, py + 18, 13, 10, "#b46e4d");
    pixelRect(mapContext, px + 7, py + 7, 8, 12, "#5f965f");
    pixelRect(mapContext, px + 14, py + 3, 8, 16, "#77ad67");
    pixelRect(mapContext, px + 19, py + 9, 6, 11, "#508251");
    return;
  } else if (type === "rug") {
    pixelRect(mapContext, px, py, TILE, TILE, palette.rug);
    pixelRect(mapContext, px + 2, py + 2, TILE - 4, TILE - 4, shade(palette.rug, 20));
    if (checker) pixelRect(mapContext, px + 11, py + 11, 8, 8, "#e9d6e4");
  }

  if (type === "chair" || type === "meeting-chair" || type === "lounge-chair") {
    const color = type === "meeting-chair" ? "#8a789c" : type === "lounge-chair" ? "#c8796f" : palette.chair;
    pixelRect(mapContext, px + 6, py + 8, 18, 16, shade(color, -20));
    pixelRect(mapContext, px + 8, py + 8, 14, 11, color);
    pixelRect(mapContext, px + 8, py + 20, 4, 7, shade(color, -30));
    pixelRect(mapContext, px + 18, py + 20, 4, 7, shade(color, -30));
  }
}

function drawRoomSigns() {
  mapContext.textAlign = "center";
  mapContext.textBaseline = "middle";
  mapContext.font = '700 10px "A2z", "Galmuri9", sans-serif';
  for (const room of allRooms) {
    const signY = room.facing === "down" ? room.y * TILE + 2 : (room.y + room.h - 1) * TILE + 20;
    const signX = (room.x + room.w / 2) * TILE;
    const signWidth = Math.min(room.w * TILE - 12, 86);
    const signColor = roomColors[room.id] || "#c8b28d";
    pixelRect(mapContext, signX - signWidth / 2, signY, signWidth, 14, shade(signColor, 9));
    pixelRect(mapContext, signX - signWidth / 2, signY, signWidth, 2, shade(signColor, -22));
    mapContext.fillStyle = "#4b3b37";
    const icon = DEPARTMENTS[room.id]?.animal || SPECIAL_ROOMS[room.id]?.animal || "";
    mapContext.fillText(`${icon} ${room.short}`, signX, signY + 8, signWidth - 5);
  }
}

function drawMap() {
  mapContext.clearRect(0, 0, mapCanvas.width, mapCanvas.height);
  for (let y = 0; y < gridHeight; y += 1) {
    for (let x = 0; x < gridWidth; x += 1) drawTile(x, y, grid[y][x]);
  }
  drawRoomSigns();
}

const people = [];
let personCounter = 0;

for (const [departmentId, entries] of Object.entries(ROSTER)) {
  const room = rooms[departmentId];
  entries.forEach(([name, role, detail], index) => {
    const home = room.seatTiles[index] || room.seatTiles[0];
    const id = `staff-${personCounter}`;
    people.push({
      id,
      name,
      role,
      detail,
      departmentId,
      department: DEPARTMENTS[departmentId].name,
      species: DEPARTMENTS[departmentId].species,
      emoji: DEPARTMENTS[departmentId].animal,
      home: { ...home },
      tile: { ...home },
      previousTile: { ...home },
      path: [],
      destination: null,
      moveStartedAt: 0,
      waitTicks: 0,
      status: "대기",
      previousStatus: "대기",
      animation: null,
      onArrival: null,
      selected: false,
      screen: { x: 0, y: 0 },
      paletteIndex: personCounter % 6,
      visible: false,
      speech: "",
    });
    personCounter += 1;
  });
}

const day = {
  started: false,
  step: 0,
  decision: null,
  focus: false,
  finished: false,
};

let zoom = 1;
let selectedPerson = null;
let rosterFilter = "전체";
let autoAdvanceTimer = null;
let dialogueTimer = null;
let companyState = null;
let selectedCandidateId = null;
let localBridge = ["localhost", "127.0.0.1"].includes(window.location.hostname);
const manualWorkTimers = new Map();

function occupiedTiles(excludeId) {
  return new Set(
    people
      .filter((person) => person.visible && person.id !== excludeId)
      .map((person) => tileKey(person.tile.x, person.tile.y)),
  );
}

function freeDestination(room, preferred, excludeId) {
  const occupied = occupiedTiles(excludeId);
  const choices = preferred?.length ? preferred : room.openTiles;
  const free = choices.filter((tile) => !occupied.has(tileKey(tile.x, tile.y)));
  if (free.length) return free[Math.floor(Math.random() * free.length)];
  return choices[0] || room.door;
}

function routePerson(person, destination, onArrival = null) {
  const occupied = occupiedTiles(person.id);
  const path =
    findPath(grid, person.tile, destination, occupied) ||
    findPath(grid, person.tile, destination, new Set());
  person.destination = { ...destination };
  person.path = path?.length > 1 ? path.slice(1) : [];
  person.waitTicks = 0;
  person.onArrival = onArrival;
  if (!person.path.length && onArrival) {
    person.onArrival = null;
    onArrival(person);
  }
}

function routeHome(person, onArrival = null) {
  routePerson(person, person.home, onArrival);
}

function setStatus(person, status, options = {}) {
  person.previousStatus = person.status;
  person.status = status;
  if (options.animation !== undefined) person.animation = options.animation;
  if (options.home) routeHome(person, options.onArrival);
  refreshStatusUI();
}

function team(id) {
  return people.filter((person) => person.departmentId === id);
}

function setTeamStatus(id, status, options = {}) {
  team(id).forEach((person) => setStatus(person, status, options));
}

function sendPeopleToRoom(group, roomId, status, animation = null, returnDelay = 0) {
  const room = rooms[roomId];
  const preferred =
    roomId === "meeting"
      ? room.meetingSeats
      : roomId === "lounge"
        ? room.loungeSeats
        : room.openTiles.filter((tile) => WALKABLE_TILES.has(grid[tile.y][tile.x]));

  group.forEach((person, index) => {
    const available = preferred.filter((tile) => {
      const reservedByEarlier = group.slice(0, index).some((other) => other.destination && tileKey(other.destination.x, other.destination.y) === tileKey(tile.x, tile.y));
      return !reservedByEarlier;
    });
    const destination = freeDestination(room, available, person.id);
    setStatus(person, status, { animation: null });
    routePerson(person, destination, () => {
      person.animation = animation;
      if (returnDelay > 0) {
        window.setTimeout(() => {
          person.animation = null;
          routeHome(person, () => setStatus(person, "대기"));
        }, returnDelay + index * 120);
      }
    });
  });
}

function clearAutoAdvance() {
  if (autoAdvanceTimer) window.clearTimeout(autoAdvanceTimer);
  autoAdvanceTimer = null;
}

function scheduleAutoAdvance() {
  clearAutoAdvance();
  if (!day.started || day.step === 7 || day.step >= 12) return;
  const delay = day.step === 6 ? 12_000 : [5, 9, 10].includes(day.step) ? 5200 : 3600;
  autoAdvanceTimer = window.setTimeout(() => {
    if (!day.started || day.step === 7 || day.step >= 12) return;
    applyStage(day.step + 1);
  }, delay);
}

function meetingLine(person, departmentId, leadersMeeting = false) {
  const department = DEPARTMENTS[departmentId];
  const topCandidate = companyState?.approvalCandidates?.[0];
  if (departmentId === "qa" && topCandidate) {
    if (person.detail.includes("출처")) {
      return `${topCandidate.source} 원문과 ${topCandidate.productVersion || "제품·버전"}을 확인했어요. 남은 확인은 ${topCandidate.verificationNeeded}`;
    }
    if (person.detail.includes("톤")) {
      return `대표님이 판단할 핵심 행동은 “${topCandidate.practicalAction}”이에요. ${topCandidate.contentAngle}로 기획했어요.`;
    }
    return `TOP 1은 ${topCandidate.score}점의 “${topCandidate.title}”이에요. 선정 근거는 ${topCandidate.reason}`;
  }
  if (leadersMeeting) {
    return `${department.short}은 현재 ${person.status} 상태예요. ${person.detail} 기준으로 다음 행동을 준비할게요.`;
  }
  if (person.role === "팀장" || person.role === "실장") {
    return `${department.code} 기준으로 오늘 할 일과 반려 기준을 먼저 맞출게요.`;
  }
  return `${person.detail} 맡을게요. 확인한 결과는 한 줄로 공유하겠습니다.`;
}

function runMeeting(group, label, leadersMeeting = false) {
  const meetingRoom = rooms.meeting;
  const savedStatuses = new Map(group.map((person) => [person.id, person.status]));
  const outsideOccupants = occupiedTiles();
  group.forEach((person) => outsideOccupants.delete(tileKey(person.tile.x, person.tile.y)));
  const freeSeats = meetingRoom.meetingSeats.filter(
    (seat) => !outsideOccupants.has(tileKey(seat.x, seat.y)),
  );
  let arrived = 0;
  let startedTalking = false;

  brief(`${label} 구성원 ${group.length}명이 회의실로 이동 중이에요.`);
  logActivity(`${label} 회의를 소집했어요.`);

  const startConversation = () => {
    if (startedTalking) return;
    startedTalking = true;
    brief(`${label} 회의를 시작해요. 한 명씩 순서대로 보고합니다.`);
    group.forEach((person, index) => {
      window.setTimeout(() => {
        group.forEach((member) => {
          member.animation = member === person ? "talk" : "sit";
        });
        const line = meetingLine(person, person.departmentId, leadersMeeting);
        showDialogue(person, line, 1400);
        brief(`${person.name}: “${line}”`);
        logActivity(`${person.name} 보고: ${line}`);
      }, index * 1500);
    });

    window.setTimeout(
      () => {
        group.forEach((person) => {
          person.animation = null;
          person.status = savedStatuses.get(person.id) || "대기";
          routeHome(person);
        });
        refreshStatusUI();
        brief(`${label} 회의가 끝났어요. 전원이 원래 자리로 복귀합니다.`);
        logActivity(`${label} 회의를 마쳤어요.`);
      },
      group.length * 1500 + 1200,
    );
  };

  group.forEach((person, index) => {
    const destination =
      freeSeats[index] ||
      freeDestination(meetingRoom, meetingRoom.meetingSeats, person.id);
    setStatus(person, "진행 중", { animation: null });
    routePerson(person, destination, () => {
      person.animation = "sit";
      arrived += 1;
      if (arrived === group.length) startConversation();
    });
  });
}

function callTeamMeeting(id) {
  runMeeting(team(id), DEPARTMENTS[id].name, false);
}

function assignTeamWork(id) {
  const members = team(id);
  const department = DEPARTMENTS[id];
  if (!members.length) return;

  if (manualWorkTimers.has(id)) {
    window.clearTimeout(manualWorkTimers.get(id));
  }

  members.forEach((person) => {
    person.animation = null;
    setStatus(person, "진행 중");
    routeHome(person);
  });
  brief(`${department.name}에 업무를 지시했어요. ${members.length}명 모두 자리에서 타이핑을 시작합니다.`);
  logActivity(`${department.name}: 대표 직접 업무 지시.`);

  const timer = window.setTimeout(() => {
    const destinationRoom = NEXT_ROOM[id] || "ceo";
    sendPeopleToRoom(members, destinationRoom, "완료", "talk", 2800);
    brief(`${department.name}이 업무를 마치고 ${rooms[destinationRoom].name}에 결과를 전달하러 이동해요.`);
    logActivity(`${department.name}: 업무 완료, ${rooms[destinationRoom].name} 전달.`);
    manualWorkTimers.delete(id);
  }, 6500);
  manualWorkTimers.set(id, timer);
}

function moveTick() {
  const occupied = new Set(
    people.filter((person) => person.visible).map((person) => tileKey(person.tile.x, person.tile.y)),
  );
  for (const person of people) {
    if (!person.visible) continue;
    if (!person.path.length) continue;
    const next = person.path[0];
    const nextKey = tileKey(next.x, next.y);
    if (occupied.has(nextKey)) {
      person.waitTicks += 1;
      if (person.waitTicks >= 3 && person.destination) {
        const reroute = findPath(grid, person.tile, person.destination, occupiedTiles(person.id));
        if (reroute?.length > 1) person.path = reroute.slice(1);
        person.waitTicks = 0;
      }
      continue;
    }

    occupied.delete(tileKey(person.tile.x, person.tile.y));
    occupied.add(nextKey);
    person.previousTile = { ...person.tile };
    person.tile = { ...next };
    person.path.shift();
    person.moveStartedAt = performance.now();
    person.waitTicks = 0;

    if (!person.path.length && person.onArrival) {
      const callback = person.onArrival;
      person.onArrival = null;
      callback(person);
    }
  }
}

window.setInterval(moveTick, MOVE_MS);

const spriteColors = {
  elephant: { body: "#a9b8bd", accent: "#81969d" },
  dolphin: { body: "#68aebd", accent: "#3f899c" },
  penguin: { body: "#41484e", accent: "#f4eee0" },
  fox: { body: "#dc8a55", accent: "#f0c39a" },
  owl: { body: "#9a765d", accent: "#d4b58c" },
  meerkat: { body: "#b9956e", accent: "#7d634e" },
  beaver: { body: "#87634f", accent: "#b38a6c" },
  squirrel: { body: "#c37d50", accent: "#e3ae74" },
  turtle: { body: "#79a372", accent: "#4f7c56" },
  ant: { body: "#ad675a", accent: "#774a46" },
  dog: { body: "#d7a45f", accent: "#936b45" },
};

const scarfColors = ["#d87998", "#6aa9b8", "#e2b64f", "#806fa3", "#67946d", "#d87961"];

function drawStatusMarker(context, person, cx, cy, moving) {
  const color = STATUS[person.status].color;
  context.globalAlpha = moving ? 0.8 : 1;
  pixelRect(context, cx - 10, cy + 10, 20, 3, color);
  pixelRect(context, cx - 7, cy + 13, 14, 2, shade(color, -30));
  context.globalAlpha = 1;
}

function drawAnimal(context, person, cx, cy, animation, now) {
  const color = spriteColors[person.species];
  const scarf = scarfColors[person.paletteIndex];
  const phase = Math.floor(now / 180) % 2;
  const walk = animation === "walk";
  const type = animation === "type";
  const talk = animation === "talk";
  const sit = !walk && !type && !talk;
  const bounce = walk || talk ? (phase ? -2 : 0) : 0;
  const x = Math.round(cx);
  const y = Math.round(cy + bounce);
  const outline = "#4c3935";

  drawStatusMarker(context, person, x, y, walk);

  if (person.species === "turtle") {
    pixelRect(context, x - 9, y - 4, 18, 13, outline);
    pixelRect(context, x - 7, y - 3, 14, 10, color.accent);
    pixelRect(context, x + 7, y - 2, 7, 7, color.body);
    pixelRect(context, x + 11, y, 2, 2, "#302b29");
  } else if (person.species === "ant") {
    pixelRect(context, x - 7, y - 9, 14, 14, outline);
    pixelRect(context, x - 5, y - 8, 10, 10, color.body);
    pixelRect(context, x - 6, y + 2, 12, 9, color.accent);
    pixelRect(context, x - 7, y - 14, 2, 6, outline);
    pixelRect(context, x + 5, y - 14, 2, 6, outline);
    pixelRect(context, x - 10, y - 15, 5, 2, outline);
    pixelRect(context, x + 5, y - 15, 5, 2, outline);
    pixelRect(context, x - 2, y - 4, 2, 2, "#fff1d7");
    pixelRect(context, x + 3, y - 4, 2, 2, "#fff1d7");
  } else {
    if (person.species === "fox" || person.species === "squirrel") {
      pixelRect(context, x - 9, y - 14, 6, 7, outline);
      pixelRect(context, x + 3, y - 14, 6, 7, outline);
      pixelRect(context, x - 7, y - 13, 4, 7, color.body);
      pixelRect(context, x + 3, y - 13, 4, 7, color.body);
    } else if (person.species === "elephant") {
      pixelRect(context, x - 12, y - 8, 7, 12, outline);
      pixelRect(context, x + 5, y - 8, 7, 12, outline);
      pixelRect(context, x - 10, y - 7, 6, 10, color.accent);
      pixelRect(context, x + 4, y - 7, 6, 10, color.accent);
    } else if (person.species === "dog") {
      pixelRect(context, x - 10, y - 10, 6, 12, outline);
      pixelRect(context, x + 4, y - 10, 6, 12, outline);
      pixelRect(context, x - 8, y - 9, 5, 10, color.accent);
      pixelRect(context, x + 3, y - 9, 5, 10, color.accent);
    } else if (person.species === "owl") {
      pixelRect(context, x - 10, y - 12, 7, 8, outline);
      pixelRect(context, x + 3, y - 12, 7, 8, outline);
    } else {
      pixelRect(context, x - 9, y - 11, 5, 6, outline);
      pixelRect(context, x + 4, y - 11, 5, 6, outline);
      pixelRect(context, x - 7, y - 10, 4, 5, color.body);
      pixelRect(context, x + 3, y - 10, 4, 5, color.body);
    }

    pixelRect(context, x - 9, y - 10, 18, 15, outline);
    pixelRect(context, x - 7, y - 9, 14, 13, color.body);

    if (person.species === "penguin") {
      pixelRect(context, x - 4, y - 6, 8, 9, color.accent);
      pixelRect(context, x - 1, y - 2, 4, 2, "#e1a44f");
    } else if (person.species === "dolphin") {
      pixelRect(context, x + 7, y - 4, 7, 4, color.body);
      pixelRect(context, x - 3, y + 2, 6, 3, "#a9d5d8");
    } else if (person.species === "elephant") {
      pixelRect(context, x - 2, y, 5, 9, color.body);
      pixelRect(context, x, y + 6, 5, 3, color.accent);
    } else if (person.species === "owl") {
      pixelRect(context, x - 6, y - 6, 5, 5, "#f2dfad");
      pixelRect(context, x + 1, y - 6, 5, 5, "#f2dfad");
      pixelRect(context, x - 4, y - 4, 2, 2, "#332d2a");
      pixelRect(context, x + 3, y - 4, 2, 2, "#332d2a");
    } else if (person.species === "beaver") {
      pixelRect(context, x - 3, y, 3, 3, "#f6ead6");
      pixelRect(context, x + 1, y, 3, 3, "#f6ead6");
    }

    if (person.species !== "owl") {
      pixelRect(context, x - 4, y - 5, 2, 2, "#302a28");
      pixelRect(context, x + 3, y - 5, 2, 2, "#302a28");
    }

    if (person.species === "squirrel") {
      pixelRect(context, x + 7, y - 2, 7, 13, outline);
      pixelRect(context, x + 8, y - 1, 5, 11, color.accent);
    } else if (person.species === "fox") {
      pixelRect(context, x + 8, y + 2, 7, 5, outline);
      pixelRect(context, x + 8, y + 3, 6, 3, color.body);
    } else if (person.species === "beaver") {
      pixelRect(context, x + 8, y + 4, 7, 7, "#5f473d");
    }

    pixelRect(context, x - 7, y + 4, 14, sit ? 7 : 9, outline);
    pixelRect(context, x - 5, y + 4, 10, sit ? 5 : 8, color.accent);
    pixelRect(context, x - 5, y + 4, 10, 2, scarf);

    if (!sit) {
      const legOffset = walk && phase ? 2 : 0;
      pixelRect(context, x - 5 - legOffset, y + 12, 4, 5, outline);
      pixelRect(context, x + 1 + legOffset, y + 12, 4, 5, outline);
    }
  }

  if (type) {
    pixelRect(context, x - 13, y + 9, 26, 4, "#e9d8b7");
    const keyOffset = phase ? 2 : -2;
    pixelRect(context, x - 7 + keyOffset, y + 6, 4, 3, scarf);
    pixelRect(context, x + 3 - keyOffset, y + 6, 4, 3, scarf);
  }

  if (talk) {
    pixelRect(context, x + 8, y - 18, 14, 10, "#fffaf0");
    pixelRect(context, x + 10, y - 8, 3, 3, "#fffaf0");
    pixelRect(context, x + 11, y - 14, 2, 2, "#7c6a62");
    pixelRect(context, x + 15, y - 14, 2, 2, "#7c6a62");
    pixelRect(context, x + 19, y - 14, 2, 2, "#7c6a62");
  } else if (person.status === "승인 대기" && !walk) {
    pixelRect(context, x + 7, y - 17, 8, 10, "#fff3f6");
    peopleContext.fillStyle = "#c45e83";
    peopleContext.font = "900 9px ui-monospace";
    peopleContext.fillText("!", x + 10, y - 9);
  } else if (person.status === "연동 대기" && !walk) {
    pixelRect(context, x + 8, y - 16, 12, 8, "#f3edfa");
    peopleContext.fillStyle = "#806da6";
    peopleContext.font = "900 7px ui-monospace";
    peopleContext.fillText("…", x + 10, y - 10);
  }
}

function drawHuman(context, person, cx, cy, animation, now) {
  const phase = Math.floor(now / 180) % 2;
  const walk = animation === "walk";
  const bounce = walk && phase ? -2 : 0;
  const x = Math.round(cx);
  const y = Math.round(cy + bounce);
  drawStatusMarker(context, person, x, y, walk);
  pixelRect(context, x - 8, y - 11, 16, 13, "#4d3733");
  pixelRect(context, x - 6, y - 8, 12, 10, "#efc6a2");
  pixelRect(context, x - 7, y - 11, 14, 5, "#49332f");
  pixelRect(context, x - 4, y - 4, 2, 2, "#3b302d");
  pixelRect(context, x + 3, y - 4, 2, 2, "#3b302d");
  pixelRect(context, x - 7, y + 2, 14, 11, "#d87998");
  pixelRect(context, x - 5, y + 3, 10, 3, "#f0a9bd");
  if (!walk) {
    pixelRect(context, x - 5, y + 12, 10, 3, "#5f7b77");
  } else {
    pixelRect(context, x - 6 - (phase ? 1 : 0), y + 12, 4, 5, "#4e625f");
    pixelRect(context, x + 2 + (phase ? 1 : 0), y + 12, 4, 5, "#4e625f");
  }
  if (animation === "type") {
    pixelRect(context, x - 12, y + 8, 24, 4, "#ebd7b3");
    pixelRect(context, x - 6, y + 6, 4, 3, "#d87998");
    pixelRect(context, x + 3, y + 6, 4, 3, "#d87998");
  }
}

function personAnimation(person, now) {
  const transitioning = now - person.moveStartedAt < MOVE_MS;
  if (person.path.length || transitioning) return "walk";
  if (person.animation) return person.animation;
  if (person.status === "진행 중") return "type";
  if (person.status === "완료") return "talk";
  return "sit";
}

function drawPeople(now) {
  peopleContext.clearRect(0, 0, peopleCanvas.width, peopleCanvas.height);
  for (const person of people) {
    if (!person.visible) continue;
    const progress = Math.min(1, Math.max(0, (now - person.moveStartedAt) / MOVE_MS));
    const from = person.previousTile || person.tile;
    const tileX = from.x + (person.tile.x - from.x) * progress;
    const tileY = from.y + (person.tile.y - from.y) * progress;
    const cx = tileX * TILE + TILE / 2;
    const cy = tileY * TILE + TILE / 2 + 1;
    person.screen = { x: cx, y: cy };
    const animation = personAnimation(person, now);
    if (person.species === "human") drawHuman(peopleContext, person, cx, cy, animation, now);
    else drawAnimal(peopleContext, person, cx, cy, animation, now);

    if (person.selected) {
      peopleContext.strokeStyle = "#fff8cd";
      peopleContext.lineWidth = 2;
      peopleContext.strokeRect(Math.round(cx - 13), Math.round(cy - 17), 26, 34);
    }
  }
  requestAnimationFrame(drawPeople);
}

function returnEveryoneHome() {
  people.forEach((person) => {
    person.animation = null;
    routeHome(person);
  });
}

function resetStatuses() {
  people.forEach((person) => setStatus(person, "대기"));
}

function handoff(fromId, targetRoomId, nextTeamId) {
  const group = team(fromId);
  sendPeopleToRoom(group, targetRoomId, "완료", "talk", 2600);
  if (nextTeamId) setTeamStatus(nextTeamId, "진행 중", { home: true });
}

function applyStage(step) {
  day.step = step;
  day.focus = false;
  const activeTeams = ["vmware", "trend"];
  const activePeople = activeTeams.flatMap(team);

  if (step === 1) {
    resetStatuses();
    returnEveryoneHome();
    brief("전원 출근 완료예요. 정해진 매일 업무를 자동으로 확인할게요.");
    logActivity("31명 직원과 대표가 출근했어요.");
  } else if (step === 2) {
    activeTeams.forEach((id) => setTeamStatus(id, "진행 중", { home: true }));
    document.getElementById("vmware-job-state").textContent = "자동 조사";
    document.getElementById("trend-job-state").textContent = "자동 조사";
    showDialogue(team("vmware")[0], "William Lam과 Broadcom 공식 소스를 나눠 확인할게요.");
    brief("VMware팀과 IT트렌드팀이 매일 업무를 자동으로 시작했어요.");
    logActivity("VMware 이슈 조사와 AI 트렌드 조사를 자동 시작했어요.");
  } else if (step === 3) {
    activeTeams.forEach((id) => setTeamStatus(id, "진행 중", { home: true }));
    showDialogue(team("trend")[0], "AI 공식 소스에서 오늘의 트렌드 10개를 선별 중이에요.");
    brief("VMware팀은 최신 이슈 10개, IT트렌드팀은 AI 트렌드 10개를 조사 중이에요.");
    logActivity("각 팀이 10개씩 수집하고 출처·최신성을 확인 중이에요.");
  } else if (step === 4) {
    setTeamStatus("brand", "진행 중", { home: true });
    showDialogue(team("brand")[0], "두 팀의 20개 안건을 실무 가치와 중복 여부로 정리할게요.");
    brief("브랜드 분석팀이 20개 안건의 중복과 실무 적용 가능성을 확인해요.");
    logActivity("브랜드 분석팀이 후보의 우선순위를 정리 중이에요.");
  } else if (step === 5) {
    activeTeams.forEach((id) => setTeamStatus(id, "완료"));
    sendPeopleToRoom(
      [team("vmware")[0], team("trend")[0]],
      "qa",
      "완료",
      "talk",
      2600,
    );
    setTeamStatus("brand", "완료");
    setTeamStatus("qa", "진행 중", { home: true });
    showDialogue(team("qa")[0], "링크·게시일·공식 출처를 확인한 뒤 TOP 3만 올릴게요.");
    brief("검수팀이 출처·버전·실행 검증·금칙어를 전수 검사 중이에요.");
    logActivity("VMware팀과 IT트렌드팀 결과를 검수팀에 전달했어요.");
  } else if (step === 6) {
    setTeamStatus("qa", "완료");
    runMeeting(team("qa"), "검수팀 TOP 3 선정", false);
    brief("검수 통과안 가운데 TOP 3를 정리했어요. 곧 대표 승인 대기로 전환할게요.");
    logActivity("검수팀이 TOP 3를 선정했어요.");
  } else if (step === 7) {
    const attendees = [team("vmware")[0], team("trend")[0], team("qa")[0]];
    sendPeopleToRoom(attendees, "meeting", "승인 대기", "sit", 0);
    setStatus(team("ceo")[0], "대기", { home: true });
    const topCandidate = companyState?.approvalCandidates?.[0];
    const approvalMessage = topCandidate
      ? `20개를 전수 평가했어요. TOP 1은 ${topCandidate.score}점의 “${topCandidate.title}”이고, 오늘 행동은 “${topCandidate.practicalAction}”입니다.`
      : "20개 전수 평가가 끝나면 점수 근거와 오늘 행동이 포함된 TOP 3만 올릴게요.";
    showDialogue(team("qa")[0], approvalMessage, 5600);
    brief(
      topCandidate
        ? "TOP 3 결재 브리프가 준비됐어요. 결론·오늘 행동·버전·점수·남은 확인사항을 읽고 한 건만 결정해 주세요."
        : "편집회의 결과를 기다리고 있어요. 검수된 TOP 3가 오기 전에는 승인할 수 없습니다.",
    );
    logActivity("대표 승인 대기. AI 파이프라인을 멈췄어요.");
  } else if (step === 8) {
    activePeople.concat(team("qa")).forEach((person) => {
      person.animation = null;
      setStatus(person, "대기");
      routeHome(person);
    });
    setTeamStatus("writer", "진행 중", { home: true });
    brief("승인된 1개만 기술노트로 작성 중이에요.");
    logActivity("기술노트 작성팀이 승인안 집필을 시작했어요.");
  } else if (step === 9) {
    handoff("writer", "format", "format");
    brief("콘텐츠 정리팀이 Obsidian 원고와 카드뉴스 포맷을 구성 중이에요.");
    logActivity("원고를 콘텐츠 정리팀에 전달했어요.");
  } else if (step === 10) {
    handoff("format", "auto", "auto");
    brief("자동화 운영팀이 복제본 기준으로 결과물 저장 상태를 확인해요.");
    logActivity("기술노트와 카드뉴스 원고 저장 단계를 시작했어요.");
  } else if (step === 11) {
    setTeamStatus("auto", "완료");
    setTeamStatus("review", "연동 대기", { home: true });
    brief("성과리뷰팀은 게시 전이라 수치를 만들지 않고 연동 대기로 기록했어요.");
    logActivity("성과 지표 없음: 추정 없이 연동 대기로 남겼어요.");
  } else if (step === 12) {
    setTeamStatus("secretary", "진행 중", { home: true });
    window.setTimeout(() => setTeamStatus("secretary", "완료"), 1800);
    brief("오늘 완료: 원고 준비. 승인 처리: 완료. 막힌 것: 게시 성과 미연동. 다음 대표 결정은 없어요.");
    logActivity("비서실 최종 브리핑이 도착했어요.");
    day.finished = true;
  }

  refreshStageUI();
  refreshStatusUI();
  scheduleAutoAdvance();
}

function startDay() {
  clearAutoAdvance();
  day.started = true;
  day.finished = false;
  day.decision = null;
  applyStage(1);
}

function nextStep() {
  if (!day.started) return;
  clearAutoAdvance();
  if (day.step === 7 && !day.decision) {
    brief("대표 승인 전에는 기술노트 작성으로 넘어갈 수 없어요.");
    return;
  }
  if (day.step >= 12) {
    day.started = false;
    day.finished = false;
    day.step = 0;
    day.decision = null;
    resetStatuses();
    returnEveryoneHome();
    refreshStageUI();
    brief("새 업무일을 시작할 준비가 됐어요.");
    logActivity("업무일을 초기화했어요.");
    return;
  }
  applyStage(day.step + 1);
}

async function handleDecision(decision) {
  if (day.step !== 7) {
    brief("현재는 대표 승인 단계가 아니에요.");
    return;
  }
  if (!selectedCandidateId) {
    brief("결정할 TOP 3 안건을 먼저 선택해 주세요.");
    return;
  }

  document.querySelectorAll("[data-decision]").forEach((button) => {
    button.disabled = true;
  });
  day.decision = decision;
  const candidate = companyState?.approvalCandidates?.find(
    (item) => item.id === selectedCandidateId,
  );
  logActivity(`대표 결정: ${decision} · ${candidate?.title || selectedCandidateId}.`);

  if (localBridge) {
    try {
      if (decision === "승인") {
        brief(
          `“${candidate?.title}” 원문을 다시 읽고 있어요. 기술노트 작성팀이 초안·검증 체크리스트·카드뉴스 문구까지 작성합니다.`,
        );
        document.getElementById("approval-summary").textContent =
          "승인안 집필 중 · 원문 대조와 구조화가 끝날 때까지 잠시만 기다려 주세요.";
      } else {
        brief(`${decision} 결정을 기록하고 후속 팀에 전달하고 있어요.`);
      }
      const response = await fetch("/api/approval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, candidateId: selectedCandidateId }),
      });
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || `HTTP ${response.status}`);
      }
      companyState = await response.json();
      renderCompanyState(companyState);
      logActivity("대표 결정을 03_성과기록 폴더에 저장했어요.");
      if (companyState.status === "writer_failed") {
        day.decision = null;
        const reason =
          companyState.errors?.at(-1) || "기술노트 작성 결과를 검증하지 못했어요.";
        brief(`승인은 기록했지만 초안은 만들지 못했어요. 자동 진행을 멈췄습니다: ${reason}`);
        logActivity(`기술노트 작성 실패: ${reason}`);
        refreshStageUI();
        return;
      }
    } catch (error) {
      day.decision = null;
      brief(`옵시디언 기록에 실패했어요: ${error.message}`);
      refreshStageUI();
      return;
    }
  }

  if (decision === "승인") {
    brief("승인 처리했어요. 기술노트 작성팀으로 넘깁니다.");
    applyStage(8);
  } else if (decision === "수정 요청") {
    day.decision = null;
    brief("수정 요청을 검수팀에 전달했어요. 수정 후 TOP 3를 다시 올릴게요.");
    applyStage(5);
  } else if (decision === "보류") {
    day.decision = null;
    brief("보류로 기록했어요. 파이프라인은 대표 승인 단계에서 계속 멈춰 있어요.");
  } else if (decision === "폐기") {
    clearAutoAdvance();
    day.started = false;
    day.step = 0;
    resetStatuses();
    returnEveryoneHome();
    brief("오늘 안은 폐기했고 결정 기록은 옵시디언에 남겼어요.");
    refreshStageUI();
  }
}

function renderCompanyState(state) {
  companyState = state;
  const candidates = state?.approvalCandidates || [];
  const container = document.getElementById("approval-candidates");
  container.replaceChildren();

  if (!candidates.length) {
    const placeholder = document.createElement("div");
    placeholder.className = "candidate-placeholder";
    if (state?.status === "researching") {
      placeholder.textContent = `현재 ${state.phase || "공식 소스 조사"} 중이에요…`;
    } else if (state?.status === "editorial_failed") {
      placeholder.textContent = `편집회의가 검수 기준을 통과하지 못해 TOP 3를 올리지 않았어요. ${state.errors?.at(-1) || ""}`;
    } else if (state?.status === "writer_failed") {
      placeholder.textContent = `승인안 집필이 검증 단계에서 멈췄어요. ${state.errors?.at(-1) || ""}`;
    } else {
      placeholder.textContent = "표시할 승인 후보가 아직 없어요.";
    }
    container.append(placeholder);
  } else {
    if (!candidates.some((candidate) => candidate.id === selectedCandidateId)) {
      selectedCandidateId = candidates[0].id;
    }
    candidates.forEach((candidate, index) => {
      const card = document.createElement("article");
      card.className = "candidate-card";
      const input = document.createElement("input");
      input.type = "radio";
      input.name = "approval-candidate";
      input.value = candidate.id;
      input.id = `candidate-${candidate.id}`;
      input.checked = candidate.id === selectedCandidateId;
      input.addEventListener("change", () => {
        selectedCandidateId = candidate.id;
        document.getElementById("approval-summary").textContent =
          `선택: ${candidate.team} ${index + 1}번 · 이 안건에 대한 결정을 기록합니다.`;
      });
      const copy = document.createElement("label");
      copy.htmlFor = input.id;
      const topline = document.createElement("div");
      topline.className = "candidate-topline";
      const rank = document.createElement("span");
      rank.className = "candidate-rank";
      rank.textContent = `TOP ${candidate.selectionRank || index + 1}`;
      const teamName = document.createElement("span");
      teamName.className = "candidate-team";
      teamName.textContent = candidate.team;
      const score = document.createElement("b");
      score.className = "candidate-score";
      score.textContent = `${candidate.score}/100`;
      topline.append(rank, teamName, score);
      const title = document.createElement("strong");
      title.className = "candidate-title";
      title.textContent = candidate.title;
      const conclusion = document.createElement("p");
      conclusion.className = "candidate-conclusion";
      conclusion.textContent = candidate.summary;
      const moreHint = document.createElement("span");
      moreHint.className = "candidate-more";
      moreHint.textContent = "선택하면 판단 근거와 오늘 행동을 펼쳐볼 수 있어요.";
      const details = document.createElement("dl");
      details.className = "candidate-brief";
      [
        ["왜 지금", candidate.whyNow],
        ["오늘 행동", candidate.practicalAction],
        ["기획 각도", candidate.contentAngle],
        ["제품·버전", candidate.productVersion],
      ].forEach(([term, description]) => {
        if (!description) return;
        const dt = document.createElement("dt");
        const dd = document.createElement("dd");
        dt.textContent = term;
        dd.textContent = description;
        details.append(dt, dd);
      });
      const scores = candidate.scoreBreakdown || {};
      const scoreBreakdown = document.createElement("div");
      scoreBreakdown.className = "candidate-breakdown";
      scoreBreakdown.textContent =
        `브랜드 ${scores.brandFit ?? "–"}/25 · 시급성 ${scores.urgency ?? "–"}/20 · 근거 ${scores.evidence ?? "–"}/20 · 실행 ${scores.actionability ?? "–"}/20 · 차별성 ${scores.differentiation ?? "–"}/15`;
      const qa = document.createElement("p");
      qa.className = "candidate-qa";
      qa.textContent = `검수 통과 · ${candidate.reason}`;
      const verification = document.createElement("p");
      verification.className = "candidate-verification";
      verification.textContent = `승인 후 확인 · ${candidate.verificationNeeded}`;
      const source = document.createElement("small");
      source.className = "candidate-source";
      source.textContent = `${candidate.source} · ${candidate.published}`;
      const link = document.createElement("a");
      link.href = candidate.url;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.textContent = "공식 원문 확인 ↗";
      copy.append(
        topline,
        title,
        conclusion,
        moreHint,
        details,
        scoreBreakdown,
        qa,
        verification,
        source,
        link,
      );
      card.append(input, copy);
      container.append(card);
    });
  }

  const notes = document.getElementById("vault-notes");
  notes.replaceChildren();
  if (state?.notes?.length) {
    const heading = document.createElement("strong");
    heading.textContent = "옵시디언 기록";
    notes.append(heading);
    state.notes.forEach((note) => {
      const line = document.createElement("div");
      line.textContent = `↳ ${note}`;
      notes.append(line);
    });
  }

  document.getElementById("vmware-job-state").textContent =
    state?.counts?.vmware ? `${state.counts.vmware}개 완료` : "조사 중";
  document.getElementById("trend-job-state").textContent =
    state?.counts?.trend ? `${state.counts.trend}개 완료` : "조사 중";
  if (state?.status === "writer_failed") {
    document.getElementById("approval-summary").textContent =
      "집필 실패 · 불완전한 초안을 저장하지 않고 승인 단계에서 멈췄습니다.";
  } else if (state?.status === "editorial_failed") {
    document.getElementById("approval-summary").textContent =
      "검수 실패 · 어설픈 후보를 대신 올리지 않고 편집회의를 멈췄습니다.";
  } else if (candidates.length) {
    document.getElementById("approval-summary").textContent =
      `20개 전수 평가 → 검수 통과 TOP ${candidates.length} · 한 안건만 결정하면 후속 작성은 직원들이 처리합니다.`;
  }
  refreshStageUI();
}

async function connectVaultAndResearch() {
  const chip = document.getElementById("vault-connection");
  if (!localBridge) {
    chip.classList.remove("checking");
    chip.classList.add("offline");
    chip.innerHTML = "<i></i> PAGES 데모";
    document.getElementById("approval-summary").textContent =
      "GitHub Pages는 로컬 파일을 쓸 수 없어요. run-local.command로 연 로컬 콘솔에서 실제 조사·승인을 사용할 수 있습니다.";
    renderCompanyState({ status: "public_demo", approvalCandidates: [], notes: [] });
    return;
  }

  try {
    const response = await fetch("/api/morning-run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ force: false }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    chip.classList.remove("checking", "offline");
    chip.innerHTML = "<i></i> VAULT 연결";
    renderCompanyState(await response.json());
    logActivity("오늘의 두 팀 리서치를 옵시디언 01_아이디어에 저장했어요.");
  } catch (error) {
    chip.classList.remove("checking");
    chip.classList.add("offline");
    chip.innerHTML = "<i></i> 연결 실패";
    document.getElementById("approval-summary").textContent =
      `로컬 연결 실패: ${error.message}. run-local.command로 콘솔을 다시 열어 주세요.`;
    renderCompanyState({ status: "error", approvalCandidates: [], notes: [] });
  }
}

function startAttendanceAnimation() {
  const entranceX = rooms.entrance.x + Math.floor(rooms.entrance.w / 2);
  const entranceTile = { x: entranceX, y: gridHeight - 1 };
  let index = 0;

  people.forEach((person) => {
    person.visible = false;
    person.path = [];
    person.animation = null;
  });
  brief("페이지가 열렸어요. 전 직원이 출입구부터 차례로 출근합니다.");
  logActivity("전원 출근 애니메이션을 시작했어요.");

  const spawnNext = () => {
    if (index >= people.length) {
      window.setTimeout(startDay, 2200);
      return;
    }
    if (occupiedTiles().has(tileKey(entranceTile.x, entranceTile.y))) {
      window.setTimeout(spawnNext, 90);
      return;
    }
    const person = people[index];
    person.tile = { ...entranceTile };
    person.previousTile = { ...entranceTile };
    person.visible = true;
    routeHome(person, () => {
      person.animation = "sit";
    });
    index += 1;
    if (index === 1 || index % 8 === 0 || index === people.length) {
      showDialogue(
        person,
        index === people.length
          ? `전원 ${people.length}명 출근했어요. 이제 아침 업무를 시작할게요!`
          : `${index}/${people.length}명 출근 중이에요. 제 자리로 갈게요!`,
        950,
      );
    }
    window.setTimeout(spawnNext, 220);
  };
  spawnNext();
}

function secretaryVisit(message, logMessage) {
  const secretary = team("secretary")[0];
  const savedStatus = secretary.status;
  const target = freeDestination(
    rooms.ceo,
    rooms.ceo.openTiles.filter((tile) => WALKABLE_TILES.has(grid[tile.y][tile.x])),
    secretary.id,
  );
  setStatus(secretary, "진행 중", { animation: null });
  routePerson(secretary, target, () => {
    secretary.animation = "talk";
    brief(message);
    logActivity(logMessage);
    window.setTimeout(() => {
      secretary.animation = null;
      secretary.status = savedStatus;
      routeHome(secretary);
      refreshStatusUI();
    }, 3000);
  });
}

function statusReport() {
  const inProgress = people.filter((person) => person.status === "진행 중").length;
  const waitingApproval = people.filter((person) => person.status === "승인 대기").length;
  const blocked = people.filter((person) => person.status === "연동 대기").length;
  const current = day.step ? `${day.step}단계 ${STEPS[day.step - 1].title}` : "업무 준비";
  secretaryVisit(
    `현재 ${current}. 진행 중 ${inProgress}명, 승인 대기 ${waitingApproval}명, 연동 대기 ${blocked}명이에요.`,
    "강아지 브리프가 대표실에서 현황을 보고했어요.",
  );
}

function reportBottleneck() {
  let message;
  if (day.step === 7 && !day.decision) {
    message = "원인은 하나예요 — 대표님 결재 대기입니다. 승인만 주시면 기술노트 작성으로 넘어갑니다.";
  } else if (people.some((person) => person.status === "연동 대기")) {
    message = "외부 연동이 병목이에요. 계정 통계가 없어 브랜드·성과 지표를 자동 수집할 수 없어요.";
  } else if (day.started && day.step < 12) {
    message = `${STEPS[day.step - 1].title} 단계가 정상 진행 중이에요. 지연은 없습니다.`;
  } else {
    message = "지연 없습니다. 대표의 다음 지시를 기다리고 있어요.";
  }
  secretaryVisit(message, "강아지 브리프가 현재 병목을 보고했어요.");
}

function callMeeting() {
  const leaders = Object.keys(ROSTER)
    .filter((id) => id !== "ceo")
    .map((id) => team(id)[0])
    .filter(Boolean);
  runMeeting(leaders, "팀장 전원", true);
}

function focusMode() {
  day.focus = true;
  people.forEach((person) => {
    person.animation = null;
    routeHome(person);
  });
  brief("집중 모드예요. 자율 행동을 중단하고 전원이 자리로 복귀합니다.");
  logActivity("집중 모드를 켰어요.");
}

function teamReport(id) {
  const members = team(id);
  const counts = members.reduce((acc, person) => {
    acc[person.status] = (acc[person.status] || 0) + 1;
    return acc;
  }, {});
  const summary = Object.entries(counts)
    .map(([status, count]) => `${status} ${count}명`)
    .join(", ");
  brief(`${DEPARTMENTS[id].name}: ${summary}. 팀장 ${members[0].name}이 현재 상황을 확인했어요.`);
  logActivity(`${DEPARTMENTS[id].name} 개별 현황을 조회했어요.`);
}

function handleCommand(raw) {
  const command = raw.trim();
  if (!command) return;
  logActivity(`대표 지시: “${command}”`);
  const action = classifyCommand(command, TEAM_ALIASES);
  if (action.type === "team-meeting") callTeamMeeting(action.teamId);
  else if (action.type === "team-work") assignTeamWork(action.teamId);
  else if (action.type === "team-report") teamReport(action.teamId);
  else if (action.type === "status-report") statusReport();
  else if (action.type === "bottleneck") reportBottleneck();
  else if (action.type === "leaders-meeting") callMeeting();
  else if (action.type === "focus") focusMode();
  else if (action.type === "approve") handleDecision("승인");
  else if (action.type === "next") nextStep();
  else {
    brief(
      "인식할 수 있는 지시는 ‘VMware팀 회의 소집’, ‘Linux팀 업무 시작’, ‘현황 보고’, ‘왜 늦어져?’, ‘팀장 회의’, ‘집중 모드’, ‘승인할게’예요.",
    );
  }
}

function brief(message) {
  document.getElementById("secretary-bubble").textContent = message;
}

function showDialogue(person, message, duration = 2400) {
  const bubble = document.getElementById("map-dialogue");
  person.speech = message;
  person.animation = "talk";
  document.getElementById("dialogue-avatar").textContent = person.emoji;
  document.getElementById("dialogue-speaker").textContent = person.name;
  document.getElementById("dialogue-text").textContent = message;
  bubble.hidden = false;
  if (dialogueTimer) window.clearTimeout(dialogueTimer);
  dialogueTimer = window.setTimeout(() => {
    if (person.speech === message) {
      person.speech = "";
      if (person.status !== "완료") person.animation = null;
    }
    bubble.hidden = true;
  }, duration);
}

function logActivity(message) {
  const log = document.getElementById("activity-log");
  const item = document.createElement("li");
  const time = document.createElement("time");
  const text = document.createElement("span");
  time.textContent = document.getElementById("office-clock").textContent;
  text.textContent = message;
  item.append(time, text);
  log.prepend(item);
  while (log.children.length > 18) log.lastElementChild.remove();
}

function refreshStageUI() {
  const current = day.step ? STEPS[day.step - 1] : null;
  document.getElementById("step-badge").textContent = current ? `${day.step} / 12` : "준비";
  document.getElementById("stage-icon").textContent = current?.icon || "☀";
  document.getElementById("stage-title").textContent = current?.title || "자동 출근을 준비하고 있어요";
  document.getElementById("stage-description").textContent =
    current?.description || "페이지를 열면 전원이 출근하고 아침 조사를 자동으로 시작해요.";
  document.getElementById("office-clock").textContent = current?.clock || "07:00";
  document.getElementById("office-state").textContent =
    day.step === 7 && !day.decision ? "대표 승인 대기" : day.finished ? "오늘 업무 완료" : current?.title || "업무 준비";
  document.getElementById("clock-dot").classList.toggle("waiting", day.step === 7 && !day.decision);

  document.querySelectorAll("#pipeline li").forEach((item, index) => {
    item.classList.toggle("done", day.step > index + 1);
    item.classList.toggle("current", day.step === index + 1);
  });

  const approvalReady =
    day.step === 7 &&
    Boolean(companyState?.approvalCandidates?.length) &&
    (localBridge || companyState?.status === "public_demo");
  document.getElementById("approval-box").classList.toggle("ready", approvalReady);
  document.querySelectorAll("[data-decision]").forEach((button) => {
    button.disabled = !approvalReady;
  });
}

function statusCounts() {
  return people.reduce((acc, person) => {
    acc[person.status] = (acc[person.status] || 0) + 1;
    return acc;
  }, {});
}

function refreshStatusUI() {
  const counts = statusCounts();
  document.querySelectorAll("[data-status-count]").forEach((element) => {
    element.textContent = counts[element.dataset.statusCount] || 0;
  });
  renderRoster();
}

function renderRoster() {
  const list = document.getElementById("roster-list");
  list.replaceChildren();
  const filtered = rosterFilter === "전체" ? people : people.filter((person) => person.status === rosterFilter);
  filtered.forEach((person) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "roster-person";
    item.style.setProperty("--status-color", STATUS[person.status].color);
    item.innerHTML = `
      <span class="roster-avatar" aria-hidden="true">${person.emoji}</span>
      <span>
        <strong>${person.name}</strong>
        <small>${person.department} · ${person.role}</small>
      </span>
      <span class="roster-state">${STATUS[person.status].short}</span>
    `;
    item.addEventListener("click", () => showPerson(person));
    list.append(item);
  });
  document.getElementById("people-count").textContent = filtered.length;
}

function showPerson(person, event = null) {
  people.forEach((candidate) => {
    candidate.selected = candidate.id === person.id;
  });
  selectedPerson = person;
  const popover = document.getElementById("person-popover");
  document.getElementById("popover-avatar").textContent = person.emoji;
  document.getElementById("popover-name").textContent = person.name;
  document.getElementById("popover-role").textContent = `${person.department} · ${person.role} · ${person.detail}`;
  document.getElementById("popover-status").textContent = `${person.status} · ${personAnimation(person, performance.now()) === "walk" ? "목적지로 이동 중" : "현재 자리에서 업무 중"}`;
  const left = event ? Math.min(window.innerWidth - 250, event.clientX + 12) : Math.max(12, window.innerWidth - 270);
  const top = event ? Math.min(window.innerHeight - 130, event.clientY + 12) : 126;
  popover.style.left = `${Math.max(8, left)}px`;
  popover.style.top = `${Math.max(8, top)}px`;
  popover.hidden = false;
}

function closePopover() {
  people.forEach((person) => {
    person.selected = false;
  });
  selectedPerson = null;
  document.getElementById("person-popover").hidden = true;
}

function setupUI() {
  const pipeline = document.getElementById("pipeline");
  STEPS.forEach((step, index) => {
    const item = document.createElement("li");
    item.dataset.step = String(index + 1).padStart(2, "0");
    item.textContent = step.title;
    if (step.approval) item.classList.add("approval");
    pipeline.append(item);
  });

  const legend = document.getElementById("status-legend");
  Object.entries(STATUS).forEach(([key, value]) => {
    const item = document.createElement("span");
    item.className = "legend-item";
    item.style.setProperty("--status-color", value.color);
    item.innerHTML = `<i class="legend-dot"></i>${value.label}<b class="legend-count" data-status-count="${key}">0</b>`;
    legend.append(item);
  });

  const filters = document.getElementById("roster-filters");
  ["전체", ...Object.keys(STATUS)].forEach((filter) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `filter-chip${filter === "전체" ? " active" : ""}`;
    button.textContent = filter;
    button.addEventListener("click", () => {
      rosterFilter = filter;
      filters.querySelectorAll("button").forEach((candidate) => candidate.classList.toggle("active", candidate === button));
      renderRoster();
    });
    filters.append(button);
  });

  document.querySelectorAll("[data-decision]").forEach((button) => {
    button.addEventListener("click", () => handleDecision(button.dataset.decision));
  });
  document.querySelector(".popover-close").addEventListener("click", closePopover);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closePopover();
  });
}

function applyZoom() {
  const width = mapCanvas.width * zoom;
  const height = mapCanvas.height * zoom;
  [mapCanvas, peopleCanvas].forEach((canvas) => {
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
  });
  mapStage.style.width = `${width}px`;
  mapStage.style.height = `${height}px`;
  document.getElementById("zoom-label").textContent = `${Math.round(zoom * 100)}%`;
}

function fitZoom() {
  const availableWidth = Math.max(280, mapViewport.clientWidth - 2);
  const availableHeight = Math.max(360, mapViewport.clientHeight - 2);
  zoom = Math.min(1.3, Math.max(0.32, Math.min(availableWidth / mapCanvas.width, availableHeight / mapCanvas.height)));
  applyZoom();
}

function setupMapControls() {
  document.getElementById("zoom-in").addEventListener("click", () => {
    zoom = Math.min(2, zoom * 1.18);
    applyZoom();
  });
  document.getElementById("zoom-out").addEventListener("click", () => {
    zoom = Math.max(0.28, zoom / 1.18);
    applyZoom();
  });
  document.getElementById("zoom-fit").addEventListener("click", fitZoom);
  window.addEventListener("resize", fitZoom);
  peopleCanvas.addEventListener("click", (event) => {
    const rect = peopleCanvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * peopleCanvas.width;
    const y = ((event.clientY - rect.top) / rect.height) * peopleCanvas.height;
    let nearest = null;
    let nearestDistance = Infinity;
    for (const person of people) {
      if (!person.visible) continue;
      const distance = Math.hypot(person.screen.x - x, person.screen.y - y);
      if (distance < nearestDistance && distance < 19) {
        nearest = person;
        nearestDistance = distance;
      }
    }
    if (nearest) showPerson(nearest, event);
    else closePopover();
  });
}

drawMap();
if (document.fonts?.ready) {
  document.fonts.ready.then(drawMap);
}
setupUI();
setupMapControls();
refreshStageUI();
refreshStatusUI();
requestAnimationFrame(drawPeople);
requestAnimationFrame(() => fitZoom());
connectVaultAndResearch();
startAttendanceAnimation();
