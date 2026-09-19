import { tool } from "ai";
import { z } from "zod";
import {
  setup,
  assign,
  createActor,
  type ActorRefFrom,
} from "xstate";

// --- Shared key ---

export type TopicId =
  | "intro-linear-motion"
  | "position"
  | "motion-and-rest"
  | "distance"
  | "displacement"
  | "average-speed"
  | "average-velocity";

// --- Structure 1: TopicContent — static, authored, shared across all sessions ---

type Misconception = {
  claim: string;
  correction: string;
  // The concrete scenario/question Arya poses so the student's own
  // prediction breaks against it, rather than being told the correction
  // outright.
  confrontationHook: string;
};

export type AssessmentOption = {
  id: string; // "A" | "B" | "C" | "D"
  label: string; // display text, e.g. "-6 m"
};

type AssessmentProblem = {
  problemText: string;
  options: AssessmentOption[];
  correctOptionId: string;
};

type TopicContent = {
  definition: string;
  unit?: { value: string };
  formula?: { words: string; expression?: string };
  assessments?: AssessmentProblem[];
  misconceptions?: Misconception[];
  notes?: string[];
};

type TopicNode = {
  id: TopicId;
  content: TopicContent;
  subtopics?: TopicNode[];
};

export const SYLLABUS: TopicNode[] = [
  {
    id: "intro-linear-motion",
    content: {
      definition:
        "When an object moves in a straight line it is called linear motion",
    },
  },
  {
    id: "position",
    content: {
      definition:
        "Distance and direction of the object from a reference point at a given moment is called position of that object",
      unit: { value: "m" },
      notes: [
        "Illustrate this using the textbook's recurring example of an athlete running along a number line — position marked as a signed number from an origin, with direction shown by the sign",
      ],
      assessments: [
        {
          problemText:
            "A running track is marked like a number line. The starting line is at 0, and the race goes from left to right, so right is the positive direction. An athlete is standing 6 m to the left of the starting line. What is her position, in metres?",
          options: [
            { id: "A", label: "-6 m" },
            { id: "B", label: "6 m" }, // sign error — right direction, forgot "left" is negative
            { id: "C", label: "0 m" }, // confused "6 m from start" with "at the start"
            { id: "D", label: "-12 m" }, // doubled the distance
          ],
          correctOptionId: "A",
        },
        {
          problemText:
            "A running track is marked like a number line. The starting line is at 0, and the race goes from left to right, so right is the positive direction. An athlete is standing 4 m to the right of the starting line. What is her position, in metres?",
          options: [
            { id: "A", label: "4 m" },
            { id: "B", label: "-4 m" }, // sign error
            { id: "C", label: "0 m" },
            { id: "D", label: "8 m" }, // doubled the distance
          ],
          correctOptionId: "A",
        },
      ],
    },
    subtopics: [
      {
        id: "motion-and-rest",
        content: {
          definition:
            "If the position of the object with respect to the reference point changes with time, the object is said to be in motion. On the other hand, the object is said to be at rest if its position with respect to the reference point does not change with time",
          notes: [
            "Illustrate this using the same athlete-on-a-number-line example — motion is the athlete's position on the track changing over time; rest is it staying fixed",
          ],
        },
      },
    ],
  },
  {
    id: "distance",
    content: {
      definition:
        "The total length of the path covered by an object while moving is called the distance travelled",
      unit: { value: "m" },
      notes: [
        "Illustrate this using the same athlete-on-a-number-line example — distance is the total length of the path the athlete actually runs, regardless of direction changes",
      ],
      assessments: [
        {
          problemText:
            "An athlete starts at the 0 m mark on a straight running track. She runs 10 m to the right, then turns around and runs 4 m back to the left. What total distance did she cover?",
          options: [
            { id: "A", label: "14 m" },
            { id: "B", label: "6 m" }, // computed net displacement (10-4) instead of total distance — the exact distance/displacement misconception
            { id: "C", label: "10 m" }, // only counted the first leg
            { id: "D", label: "4 m" }, // only counted the second leg
          ],
          correctOptionId: "A",
        },
      ],
    },
  },
  {
    id: "displacement",
    content: {
      definition:
        "Displacement is the net change in the position of an object between the two given instants of time",
      unit: { value: "m" },
      notes: [
        "A complete description of physical quantities like displacement requires specifying both a direction and its numerical value (with units)",
        "The numerical value (with units) of such a physical quantity is called its magnitude",
        "The direction of displacement is specified from the position at the first instant towards the position at the second instant",
        "Illustrate this using the same athlete-on-a-number-line example — displacement is the athlete's net change in position, from where she started to where she ends up",
      ],
      assessments: [
        {
          problemText:
            "An athlete starts at the 0 m mark on a straight track marked like a number line, with right as the positive direction. She runs to the 15 m mark, then turns around and runs back to the 6 m mark. What is her displacement, in metres?",
          options: [
            { id: "A", label: "6 m" },
            { id: "B", label: "24 m" }, // total distance (15 + 9) instead of net displacement — same misconception, mirrored
            { id: "C", label: "15 m" }, // only used the first leg's endpoint
            { id: "D", label: "9 m" }, // used the return leg's distance instead of the final position
          ],
          correctOptionId: "A",
        },
      ],
      misconceptions: [
        {
          claim: "distance and displacement are the same thing",
          correction:
            "displacement can be zero even when distance travelled is large",
          confrontationHook:
            "an athlete runs from the 0 m mark to the 10 m mark, then turns around and runs back to the 0 m mark — she's covered 20 m of distance, so what's her displacement?",
        },
      ],
    },
  },
  {
    id: "average-speed",
    content: {
      definition:
        "The average speed of an object is the total distance travelled divided by the time interval during which this distance is covered",
      unit: { value: "m/s" },
      formula: {
        words: "total distance divided by total time",
        expression: "v = s / t",
      },
      notes: ["Average speed has no direction — it is a scalar quantity"],
      assessments: [
        {
          problemText:
            "A train travels 300 m in 10 seconds, then travels 300 m in 30 seconds. What is its average speed, in metres per second?",
          options: [
            { id: "A", label: "15 m/s" },
            { id: "B", label: "20 m/s" }, // (30 + 10) / 2 — naive average of the two leg speeds, the topic's own documented misconception
            { id: "C", label: "30 m/s" }, // used only the first leg's speed
            { id: "D", label: "10 m/s" }, // used only the second leg's speed
          ],
          correctOptionId: "A",
        },
      ],
      misconceptions: [
        {
          claim:
            "average speed is the simple average of the speeds on each leg",
          correction: "it's total distance divided by total time",
          confrontationHook:
            "unequal-time legs, e.g. 30 m at 10 m/s then 30 m at 30 m/s",
        },
      ],
    },
  },
  {
    id: "average-velocity",
    content: {
      definition:
        "The average velocity of an object in a time interval is the change in the position (or displacement) divided by the time interval in which the change in position (or displacement) occur",
      unit: { value: "m/s" },
      formula: {
        words: "displacement divided by total time",
        expression: "v = d / t",
      },
      assessments: [
        {
          problemText:
            "An athlete starts at the 0 m mark on a straight track marked like a number line, with right as the positive direction. She runs to the 20 m mark, which takes 5 seconds, then turns around and runs back to the 8 m mark, which takes another 3 seconds. What is her average velocity for the whole trip, in metres per second?",
          options: [
            { id: "A", label: "1 m/s" },
            { id: "B", label: "4 m/s" }, // total distance (32 m) / total time — average speed instead of average velocity, the topic's own misconception
            { id: "C", label: "2.5 m/s" }, // first leg's displacement (20 m) divided by total time instead of net displacement
            { id: "D", label: "20 m/s" }, // just the first leg's endpoint, mistaking it for the answer
          ],
          correctOptionId: "A",
        },
      ],
      misconceptions: [
        {
          claim: "speed and velocity are the same thing",
          correction: "velocity has direction, speed doesn't",
          confrontationHook:
            "a runner completing a full lap has nonzero average speed but zero average velocity",
        },
      ],
    },
  },
];

// --- Structure 2: TopicState — the machine's per-topic context shape ---
// Records only observed facts, written by server code, never self-reported.

type AssessmentResult = {
  problemText: string;
  correct: boolean;
};

type TopicState = {
  definitionPresented: boolean;
  unitPresented: boolean;
  formulaPresented: boolean;
  pendingAssessment: string | null;
  assessmentResults: AssessmentResult[];
};

// --- Plain helpers ---

export function findNode(nodes: TopicNode[], id: TopicId): TopicNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findNode(node.subtopics ?? [], id);
    if (found) return found;
  }
  return undefined;
}

// Every state in the machine is flat, so the actor's snapshot value is
// always a plain string already — this just names that string as what it is.
export function innermostTopic(value: string): TopicId | "syllabusComplete" {
  return value as TopicId | "syllabusComplete";
}

function initialTopics(): Record<TopicId, TopicState> {
  const empty = (): TopicState => ({
    definitionPresented: false,
    unitPresented: false,
    formulaPresented: false,
    pendingAssessment: null,
    assessmentResults: [],
  });
  return {
    "intro-linear-motion": empty(),
    position: empty(),
    "motion-and-rest": empty(),
    distance: empty(),
    displacement: empty(),
    "average-speed": empty(),
    "average-velocity": empty(),
  };
}

// Single source of truth for what a topic requires — isTopicComplete,
// describeGap, and describeProgress all derive from this instead of each
// hand-encoding the same applicable/satisfied checks independently.
type Requirement = {
  applicable: boolean;
  satisfied: boolean;
  progressLine: string;
  gapText: string;
};

function requirements(content: TopicContent, state: TopicState): Requirement[] {
  const assessmentSolved = state.assessmentResults.some((r) => r.correct);
  return [
    {
      applicable: true,
      satisfied: state.definitionPresented,
      progressLine: `definition: ${state.definitionPresented ? "presented" : "not yet presented"}`,
      gapText: "the definition hasn't been presented yet",
    },
    {
      applicable: !!content.unit,
      satisfied: state.unitPresented,
      progressLine: `unit: ${content.unit ? (state.unitPresented ? "presented" : "not yet presented") : "Not Applicable"}`,
      gapText: "the SI unit hasn't been presented yet",
    },
    {
      applicable: !!content.formula,
      satisfied: state.formulaPresented,
      progressLine: `formula: ${content.formula ? (state.formulaPresented ? "presented" : "not yet presented") : "Not Applicable"}`,
      gapText: "the formula hasn't been presented yet",
    },
    {
      applicable: !!content.assessments?.length,
      satisfied: assessmentSolved,
      progressLine: `assessment: ${content.assessments?.length ? (assessmentSolved ? "answered correctly" : "not yet answered correctly") : "Not Applicable"}`,
      gapText: "no assessment problem has been answered correctly yet",
    },
  ];
}

function isTopicComplete(content: TopicContent, state: TopicState): boolean {
  return requirements(content, state).every((r) => !r.applicable || r.satisfied);
}

function describeGap(content: TopicContent, state: TopicState): string {
  return requirements(content, state)
    .filter((r) => r.applicable && !r.satisfied)
    .map((r) => r.gapText)
    .join("; ");
}

export function describeProgress(content: TopicContent, state: TopicState): string {
  return requirements(content, state)
    .map((r) => r.progressLine)
    .join("; ");
}

// --- XState machine ---

type MachineContext = { topics: Record<TopicId, TopicState> };

type MachineEvent =
  | { type: "DEFINITION_PRESENTED" }
  | { type: "UNIT_PRESENTED" }
  | { type: "FORMULA_PRESENTED" }
  | { type: "ASSESSMENT_POSED"; problemText: string }
  | { type: "ASSESSMENT_ANSWERED"; problemText: string; correct: boolean }
  | { type: "ADVANCE" };

function evidenceHandlers(topicId: TopicId) {
  return {
    DEFINITION_PRESENTED: {
      actions: { type: "setTopicField" as const, params: { topicId, field: "definitionPresented" as const, value: true as const } },
    },
    UNIT_PRESENTED: {
      actions: { type: "setTopicField" as const, params: { topicId, field: "unitPresented" as const, value: true as const } },
    },
    FORMULA_PRESENTED: {
      actions: { type: "setTopicField" as const, params: { topicId, field: "formulaPresented" as const, value: true as const } },
    },
    ASSESSMENT_POSED: {
      actions: {
        type: "setTopicField" as const,
        params: ({ event }: { event: MachineEvent & { type: "ASSESSMENT_POSED" } }) => ({
          topicId,
          field: "pendingAssessment" as const,
          value: event.problemText,
        }),
      },
    },
    ASSESSMENT_ANSWERED: {
      actions: {
        type: "recordAssessment" as const,
        params: ({ event }: { event: MachineEvent & { type: "ASSESSMENT_ANSWERED" } }) => ({
          topicId,
          problemText: event.problemText,
          correct: event.correct,
        }),
      },
    },
  };
}

const syllabusMachine = setup({
  types: {} as { context: MachineContext; events: MachineEvent },
  guards: {
    topicComplete: ({ context }: { context: MachineContext }, params: { topicId: TopicId }) =>
      isTopicComplete(findNode(SYLLABUS, params.topicId)!.content, context.topics[params.topicId]),
  },
  actions: {
    // Handles the four evidence events that each just flip a single field —
    // ASSESSMENT_ANSWERED needs its own action below since it changes two
    // fields together (clear pendingAssessment, append to assessmentResults).
    setTopicField: assign(
      (
        { context },
        params:
          | { topicId: TopicId; field: "definitionPresented" | "unitPresented" | "formulaPresented"; value: true }
          | { topicId: TopicId; field: "pendingAssessment"; value: string },
      ) => ({
        topics: {
          ...context.topics,
          [params.topicId]: { ...context.topics[params.topicId], [params.field]: params.value },
        },
      }),
    ),
    recordAssessment: assign(({ context }, params: { topicId: TopicId; problemText: string; correct: boolean }) => ({
      topics: {
        ...context.topics,
        [params.topicId]: {
          ...context.topics[params.topicId],
          // MCQ is one-shot — always clear pendingAssessment once answered,
          // right or wrong. No retry to preserve state for.
          pendingAssessment: null,
          assessmentResults: [...context.topics[params.topicId].assessmentResults, { problemText: params.problemText, correct: params.correct }],
        },
      },
    })),
  },
}).createMachine({
  id: "syllabus",
  context: { topics: initialTopics() },
  initial: "intro-linear-motion",
  states: {
    "intro-linear-motion": {
      on: {
        ...evidenceHandlers("intro-linear-motion"),
        ADVANCE: { guard: { type: "topicComplete", params: { topicId: "intro-linear-motion" } }, target: "position" },
      },
    },
    position: {
      on: {
        ...evidenceHandlers("position"),
        ADVANCE: { guard: { type: "topicComplete", params: { topicId: "position" } }, target: "motion-and-rest" },
      },
    },
    "motion-and-rest": {
      on: {
        ...evidenceHandlers("motion-and-rest"),
        ADVANCE: { guard: { type: "topicComplete", params: { topicId: "motion-and-rest" } }, target: "distance" },
      },
    },
    distance: {
      on: {
        ...evidenceHandlers("distance"),
        ADVANCE: { guard: { type: "topicComplete", params: { topicId: "distance" } }, target: "displacement" },
      },
    },
    displacement: {
      on: {
        ...evidenceHandlers("displacement"),
        ADVANCE: { guard: { type: "topicComplete", params: { topicId: "displacement" } }, target: "average-speed" },
      },
    },
    "average-speed": {
      on: {
        ...evidenceHandlers("average-speed"),
        ADVANCE: { guard: { type: "topicComplete", params: { topicId: "average-speed" } }, target: "average-velocity" },
      },
    },
    "average-velocity": {
      on: {
        ...evidenceHandlers("average-velocity"),
        ADVANCE: { guard: { type: "topicComplete", params: { topicId: "average-velocity" } }, target: "syllabusComplete" },
      },
    },
    syllabusComplete: { type: "final" },
  },
});

// --- Backend-maintained, in-memory, session-scoped ---
// No external store, so this is bounded with an idle TTL rather than left to
// grow forever — every access sweeps out entries nobody has touched recently.

const SESSION_IDLE_TTL_MS = 60 * 60 * 1000;

type SessionEntry = { actor: ActorRefFrom<typeof syllabusMachine>; lastTouched: number };
const sessionStore = new Map<string, SessionEntry>();

export function getOrCreateActor(sessionId: string) {
  const now = Date.now();
  for (const [id, entry] of sessionStore) {
    if (now - entry.lastTouched > SESSION_IDLE_TTL_MS) sessionStore.delete(id);
  }

  let entry = sessionStore.get(sessionId);
  if (!entry) {
    entry = { actor: createActor(syllabusMachine).start(), lastTouched: now };
    sessionStore.set(sessionId, entry);
  } else {
    entry.lastTouched = now;
  }
  return entry.actor;
}

// --- Verification tools ---

// Tools re-derive the live topic from the actor on every execution rather
// than closing over a value captured once when makeTools() was called —
// stepCountIs(5) lets advanceTopic run mid-turn, and a stale captured topic
// would read one topic's content while actor.send() (routed by XState to
// whichever state is actually current) writes into a different topic's
// ledger.
export function makeTools(actor: ActorRefFrom<typeof syllabusMachine>) {
  const presentFact = tool({
    description:
      "Present the canonical definition, unit, or formula for the current topic. Shown to the student as its " +
      "own styled card, not inline text — don't also say the same statement yourself, and don't write a sentence " +
      "that grammatically continues into it, since it renders as a separate block.",
    inputSchema: z.object({ fact: z.enum(["definition", "unit", "formula"]) }),
    execute: async ({ fact }) => {
      const activeTopic = innermostTopic(actor.getSnapshot().value);
      if (activeTopic === "syllabusComplete") return { error: "The syllabus is already complete." };
      const node = findNode(SYLLABUS, activeTopic)!;
      if (fact === "definition") {
        actor.send({ type: "DEFINITION_PRESENTED" });
        return { fact, definition: node.content.definition };
      }
      if (fact === "unit") {
        if (!node.content.unit) return { error: "This topic has no unit." };
        actor.send({ type: "UNIT_PRESENTED" });
        return { fact, unit: node.content.unit.value };
      }
      if (!node.content.formula) return { error: "This topic has no formula." };
      actor.send({ type: "FORMULA_PRESENTED" });
      return { fact, words: node.content.formula.words, expression: node.content.formula.expression };
    },
  });

  const getAssessmentProblem = tool({
    description:
      "Fetch the assessment problem to pose to the student for the current topic. The question and its answer " +
      "options are shown directly to the student as clickable choices — you don't need to relay the options " +
      "yourself, just introduce the question naturally.",
    inputSchema: z.object({}),
    execute: async () => {
      const activeTopic = innermostTopic(actor.getSnapshot().value);
      if (activeTopic === "syllabusComplete") return { error: "The syllabus is already complete." };
      const state = actor.getSnapshot().context.topics[activeTopic];
      const node = findNode(SYLLABUS, activeTopic)!;
      const problem = state.pendingAssessment
        ? node.content.assessments!.find((a) => a.problemText === state.pendingAssessment)!
        : node.content.assessments?.[Math.floor(Math.random() * (node.content.assessments?.length ?? 0))];
      if (!problem) return { error: "This topic has no assessment." };
      if (!state.pendingAssessment) actor.send({ type: "ASSESSMENT_POSED", problemText: problem.problemText });
      return { problemText: problem.problemText, options: problem.options };
      // correctOptionId stays server-side — never sent to the model. The
      // student's answer never comes back through this tool at all — see
      // handleMcqAnswer below, reached through a dedicated route.
    },
  });

  const advanceTopic = tool({
    description:
      "Attempt to move on to the next topic in the syllabus. Only succeeds if the " +
      "current topic's requirements (definition, unit, formula, and a correctly " +
      "solved assessment, where applicable) have already been presented in this conversation.",
    inputSchema: z.object({}),
    execute: async () => {
      const before = innermostTopic(actor.getSnapshot().value);
      if (before === "syllabusComplete") return { success: false, reason: "syllabus already complete" };
      actor.send({ type: "ADVANCE" });
      const snapshot = actor.getSnapshot();
      const after = innermostTopic(snapshot.value);
      if (after === before) {
        const node = findNode(SYLLABUS, before)!;
        return { success: false, reason: describeGap(node.content, snapshot.context.topics[before]) };
      }
      return { success: true, nextTopic: after };
    },
  });

  return { presentFact, getAssessmentProblem, advanceTopic };
}

// --- MCQ answer — a separate, non-model-facing path. The student's choice
// goes straight from a UI click to here, with no model in the data path to
// persuade or fabricate a claim through. ---

export async function handleMcqAnswer(sessionId: string, optionId: string) {
  const actor = getOrCreateActor(sessionId);
  const activeTopic = innermostTopic(actor.getSnapshot().value);
  if (activeTopic === "syllabusComplete") return { error: "syllabus already complete" };
  const state = actor.getSnapshot().context.topics[activeTopic];
  if (!state.pendingAssessment) return { error: "No assessment is currently posed." };
  const problem = findNode(SYLLABUS, activeTopic)!.content.assessments!.find(
    (a) => a.problemText === state.pendingAssessment,
  )!;
  const correct = optionId === problem.correctOptionId;
  actor.send({ type: "ASSESSMENT_ANSWERED", problemText: state.pendingAssessment, correct });
  return { correct };
}

// --- Per-turn status block — everything the model needs to know about
// where it is and what's already verified, built fresh from the ledger
// every request. Appended as a trailing message, not the system prompt —
// see the "Prompt caching" note in syllabus-design.md for why. ---

export function buildStatusBlock(activeTopic: TopicId, actor: ActorRefFrom<typeof syllabusMachine>): string {
  const node = findNode(SYLLABUS, activeTopic)!;
  const state = actor.getSnapshot().context.topics[activeTopic];
  return [
    `You are currently teaching: ${activeTopic}.`,
    `Definition: ${node.content.definition}`,
    `Unit: ${node.content.unit ? node.content.unit.value : "Not Applicable"}`,
    `Formula: ${
      node.content.formula
        ? `${node.content.formula.words}${node.content.formula.expression ? ` (${node.content.formula.expression})` : ""}`
        : "Not Applicable"
    }`,
    node.content.notes?.length ? `Notes:\n${node.content.notes.map((n) => `- ${n}`).join("\n")}` : null,
    node.content.misconceptions?.length
      ? `Misconception to watch for:\n${node.content.misconceptions
          .map((m) => `- Claim: "${m.claim}". Correction: ${m.correction}. Confrontation: ${m.confrontationHook}`)
          .join("\n")}`
      : null,
    `Progress so far on this topic: ${describeProgress(node.content, state)}`,
  ]
    .filter(Boolean)
    .join("\n");
}
