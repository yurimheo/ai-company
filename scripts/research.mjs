import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const VAULT_ROOT = path.resolve(process.env.AI_COMPANY_VAULT || PROJECT_ROOT);
const STATE_DIR = path.join(VAULT_ROOT, ".company");
const STATE_FILE = path.join(STATE_DIR, "state.json");
const IDEA_DIR = path.join(VAULT_ROOT, "01_아이디어");
const NOTE_DIR = path.join(VAULT_ROOT, "02_기술노트");
const REVIEW_DIR = path.join(VAULT_ROOT, "03_성과기록");

const VMWARE_SOURCES = [
  { name: "William Lam", url: "https://williamlam.com/feed", official: false },
  {
    name: "VMware Cloud Foundation Blog",
    url: "https://blogs.vmware.com/cloud-foundation/feed/",
    official: true,
  },
];

const AI_TREND_SOURCES = [
  { name: "OpenAI News", url: "https://openai.com/news/rss.xml", official: true },
  {
    name: "Google AI",
    url: "https://blog.google/innovation-and-ai/technology/ai/rss/",
    official: true,
  },
  { name: "NVIDIA Blog", url: "https://blogs.nvidia.com/feed/", official: true },
  {
    name: "AWS Machine Learning Blog",
    url: "https://aws.amazon.com/blogs/machine-learning/feed/",
    official: true,
  },
  { name: "CNCF Blog", url: "https://www.cncf.io/feed/", official: true },
];

const ISSUE_WORDS =
  /\b(bug|issue|error|fail|failure|fix|patch|update|upgrade|known|security|deprecat|unsupported|workaround|cve)\b/i;
const AI_WORDS =
  /\b(ai|artificial intelligence|model|agent|gpu|machine learning|inference|llm|cloud|foundation model|copilot)\b/i;

function today() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function nowKst() {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date());
}

function decodeEntities(value = "") {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, number) => String.fromCodePoint(Number(number)))
    .replace(/\s+/g, " ")
    .trim();
}

function tagValue(block, tags) {
  for (const tag of tags) {
    const match = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"));
    if (match) return decodeEntities(match[1]);
  }
  return "";
}

function atomLink(block) {
  const match = block.match(/<link[^>]+href=["']([^"']+)["'][^>]*>/i);
  return match?.[1] || "";
}

function parseFeed(xml, source) {
  const blocks = [
    ...(xml.match(/<item\b[\s\S]*?<\/item>/gi) || []),
    ...(xml.match(/<entry\b[\s\S]*?<\/entry>/gi) || []),
  ];
  return blocks
    .map((block) => {
      const title = tagValue(block, ["title"]);
      const url = tagValue(block, ["link", "guid"]) || atomLink(block);
      const published = tagValue(block, ["pubDate", "published", "updated", "dc:date"]);
      const summary = tagValue(block, ["description", "summary", "content"]);
      const timestamp = Date.parse(published) || 0;
      return {
        title,
        url,
        published: published || "날짜 미확인",
        timestamp,
        summary: summary.slice(0, 260),
        source: source.name,
        official: source.official,
      };
    })
    .filter((item) => item.title && item.url);
}

async function fetchFeed(source) {
  const response = await fetch(source.url, {
    headers: {
      Accept: "application/rss+xml, application/atom+xml, text/xml;q=0.9, */*;q=0.8",
      "User-Agent": "YURIM-AI-COMPANY/1.0",
    },
    signal: AbortSignal.timeout(18_000),
  });
  if (!response.ok) throw new Error(`${source.name}: HTTP ${response.status}`);
  return parseFeed(await response.text(), source);
}

async function collect(sources) {
  const settled = await Promise.allSettled(sources.map(fetchFeed));
  const items = settled.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
  const errors = settled
    .filter((result) => result.status === "rejected")
    .map((result) => result.reason?.message || "피드 수집 실패");
  const unique = [...new Map(items.map((item) => [item.url, item])).values()];
  return { items: unique, errors };
}

function scoreVmware(item) {
  const haystack = `${item.title} ${item.summary}`;
  return (ISSUE_WORDS.test(haystack) ? 55 : 20) + (item.official ? 25 : 18) + Math.min(20, item.timestamp / 1e12);
}

function scoreAi(item) {
  const haystack = `${item.title} ${item.summary}`;
  return (AI_WORDS.test(haystack) ? 45 : 12) + (item.official ? 30 : 15) + Math.min(25, item.timestamp / 1e12);
}

function rank(items, scorer, limit = 10) {
  return items
    .map((item) => ({ ...item, score: Math.round(scorer(item)) }))
    .sort((a, b) => b.score - a.score || b.timestamp - a.timestamp)
    .slice(0, limit)
    .map((item, index) => ({ ...item, rank: index + 1 }));
}

function markdownReport({ date, team, purpose, items, errors }) {
  const lines = [
    "---",
    `date: ${date}`,
    `team: ${team}`,
    "status: 조사 완료",
    "source_policy: 공식 문서 및 지정 소스 우선",
    "---",
    "",
    `# ${date} ${team} 아침 리서치`,
    "",
    `> ${purpose}`,
    "",
    `- 실행 시각: ${nowKst()}`,
    `- 수집 결과: ${items.length}개`,
    `- 수집 실패: ${errors.length ? errors.join(" / ") : "없음"}`,
    "",
  ];

  items.forEach((item) => {
    lines.push(
      `## ${item.rank}. ${item.title}`,
      "",
      `- 출처: ${item.source}${item.official ? " · 공식" : " · 지정 블로그"}`,
      `- 게시일: ${item.published}`,
      `- 점수: ${item.score}`,
      `- 링크: ${item.url}`,
      `- 요약: ${item.summary || "피드 요약 없음 — 원문 확인 필요"}`,
      "",
    );
  });
  return `${lines.join("\n")}\n`;
}

function approvalCandidate(item, teamId, index) {
  return {
    id: `${teamId}-${index + 1}`,
    teamId,
    team: teamId === "vmware" ? "VMware팀" : "IT트렌드팀",
    title: item.title,
    source: item.source,
    url: item.url,
    published: item.published,
    score: item.score,
    summary: item.summary,
    reason:
      teamId === "vmware"
        ? "버그·업그레이드·운영 이슈 가능성과 공식성 기준 상위 후보"
        : "최신성·공식성·실무 적용 가능성 기준 상위 후보",
  };
}

async function ensureFolders() {
  await Promise.all(
    [STATE_DIR, IDEA_DIR, NOTE_DIR, REVIEW_DIR].map((directory) =>
      mkdir(directory, { recursive: true }),
    ),
  );
}

export async function readCompanyState() {
  await ensureFolders();
  try {
    return JSON.parse(await readFile(STATE_FILE, "utf8"));
  } catch {
    return {
      date: today(),
      status: "not_started",
      connected: true,
      approvalCandidates: [],
      notes: [],
    };
  }
}

export async function runMorningResearch({ force = false } = {}) {
  await ensureFolders();
  const date = today();
  const previous = await readCompanyState();
  if (
    !force &&
    previous.date === date &&
    !["not_started", "researching", "error"].includes(previous.status)
  ) {
    return previous;
  }

  const running = {
    date,
    connected: true,
    status: "researching",
    startedAt: nowKst(),
    approvalCandidates: [],
    notes: [],
  };
  await writeFile(STATE_FILE, JSON.stringify(running, null, 2), "utf8");

  const [vmwareRaw, aiRaw] = await Promise.all([
    collect(VMWARE_SOURCES),
    collect(AI_TREND_SOURCES),
  ]);
  const vmware = rank(vmwareRaw.items, scoreVmware, 10);
  const aiTrends = rank(aiRaw.items, scoreAi, 10);
  const dailyIdeaDir = path.join(IDEA_DIR, date);
  await mkdir(dailyIdeaDir, { recursive: true });

  const vmwarePath = path.join(dailyIdeaDir, "VMware팀-리서치.md");
  const aiPath = path.join(dailyIdeaDir, "IT트렌드팀-리서치.md");
  await writeFile(
    vmwarePath,
    markdownReport({
      date,
      team: "VMware팀",
      purpose: "William Lam과 VMware/Broadcom 공식 소스에서 최신 버그·이슈·업그레이드 점검 후보 10개를 찾습니다.",
      items: vmware,
      errors: vmwareRaw.errors,
    }),
    "utf8",
  );
  await writeFile(
    aiPath,
    markdownReport({
      date,
      team: "IT트렌드팀",
      purpose: "공식 AI·클라우드 소스에서 오늘 확인할 AI 트렌드 10개를 찾습니다.",
      items: aiTrends,
      errors: aiRaw.errors,
    }),
    "utf8",
  );

  const candidates = [
    ...vmware.slice(0, 2).map((item, index) => approvalCandidate(item, "vmware", index)),
    ...aiTrends.slice(0, 1).map((item, index) => approvalCandidate(item, "trend", index)),
  ];
  const state = {
    date,
    connected: true,
    status: "approval_pending",
    startedAt: running.startedAt,
    completedAt: nowKst(),
    counts: { vmware: vmware.length, trend: aiTrends.length },
    teams: {
      vmware: "완료",
      trend: "완료",
      k8s: "업무 미지정",
      linux: "업무 미지정",
    },
    approvalCandidates: candidates,
    notes: [
      path.relative(VAULT_ROOT, vmwarePath),
      path.relative(VAULT_ROOT, aiPath),
    ],
    errors: [...vmwareRaw.errors, ...aiRaw.errors],
  };
  await writeFile(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
  return state;
}

export async function recordDecision({ decision, candidateId }) {
  await ensureFolders();
  const state = await readCompanyState();
  const candidate = state.approvalCandidates?.find((item) => item.id === candidateId);
  if (decision === "승인" && !candidate) {
    throw new Error("승인할 후보를 먼저 선택해 주세요.");
  }

  const date = today();
  const decisionPath = path.join(REVIEW_DIR, `${date}-대표결정.md`);
  const decisionText = [
    "---",
    `date: ${date}`,
    `decision: ${decision}`,
    `candidate_id: ${candidateId || "없음"}`,
    "---",
    "",
    `# ${date} 대표 결정`,
    "",
    `- 결정: ${decision}`,
    `- 후보: ${candidate?.title || "선택 없음"}`,
    `- 팀: ${candidate?.team || "해당 없음"}`,
    `- 원문: ${candidate?.url || "해당 없음"}`,
    `- 기록 시각: ${nowKst()}`,
    "",
  ].join("\n");
  await writeFile(decisionPath, decisionText, "utf8");

  let draftPath = null;
  if (decision === "승인") {
    const safeId = candidate.id.replace(/[^a-z0-9-]/gi, "-");
    draftPath = path.join(NOTE_DIR, `${date}-${safeId}-기술노트.md`);
    await writeFile(
      draftPath,
      [
        "---",
        `date: ${date}`,
        `team: ${candidate.team}`,
        "status: 초안 완료",
        `source: ${candidate.url}`,
        "verification: 원문 추가 검증 필요",
        "---",
        "",
        `# ${candidate.title}`,
        "",
        "> 대표 승인 완료. 기술노트 작성팀이 승인된 이 후보만 초안으로 정리했습니다.",
        "",
        "## 한눈에 보기",
        "",
        candidate.summary || "RSS 요약이 없어 원문을 직접 확인해야 합니다.",
        "",
        "## 문제 상황",
        "",
        candidate.teamId === "vmware"
          ? "VMware/VCF 운영 환경에 영향을 줄 수 있는 변경·버그·업그레이드 이슈 후보입니다."
          : "현재 AI 업무 방식이나 인프라 선택에 영향을 줄 수 있는 최신 동향 후보입니다.",
        "",
        "## 선정 이유",
        "",
        candidate.reason,
        "",
        "## 원문",
        "",
        `- ${candidate.source}: ${candidate.url}`,
        "",
        "## 실무 확인 체크리스트",
        "",
        "- [ ] 원문 전체 내용과 적용 버전 확인",
        "- [ ] 우리 환경에 해당하는 조건 구분",
        "- [ ] 재현 또는 적용 절차 검증",
        "- [ ] 검증 완료 뒤 게시용 문장으로 다듬기",
        "",
      ].join("\n"),
      "utf8",
    );
  }

  const nextState = {
    ...state,
    status:
      decision === "승인"
        ? "approved"
        : decision === "수정 요청"
          ? "revision_requested"
          : decision === "보류"
            ? "held"
            : "discarded",
    decision,
    selectedCandidateId: candidateId || null,
    decidedAt: nowKst(),
    notes: [
      ...(state.notes || []),
      path.relative(VAULT_ROOT, decisionPath),
      ...(draftPath ? [path.relative(VAULT_ROOT, draftPath)] : []),
    ],
  };
  await writeFile(STATE_FILE, JSON.stringify(nextState, null, 2), "utf8");
  return nextState;
}

export const vaultInfo = {
  root: VAULT_ROOT,
  stateFile: STATE_FILE,
  today,
};
