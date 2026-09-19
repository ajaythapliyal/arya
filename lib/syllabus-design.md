# Syllabus design notes — Motion

Working notes for two related things: (1) the misconception research behind `arya-instructions.ts`, and (2) the in-progress per-session state model for tracking whether a student has actually learned each topic. This file is not read by the app or sent to the model — it's a record for future work, so design decisions and research don't have to be redone from scratch.

Scope: strictly the 7 topics in `CURRENT SYLLABUS` (intro to linear motion, position, motion and rest, distance travelled, displacement, average speed, average velocity) — not the fuller NCERT Motion chapter (which also covers circular motion, acceleration, equations of motion — out of scope for now) and not other chapters (Force and Laws of Motion, Gravitation, etc.).

## Misconceptions research

### Currently in `ARYA_INSTRUCTIONS`

1. **"Distance and displacement are the same thing"** — displacement can be zero on a round trip even when distance is large (topic: displacement). Research found only ~42.86%–43% of students properly distinguish these pre-intervention.
2. **"Average speed is the simple average of the speeds on each leg of a journey"** — it's total distance ÷ total time, only matching the simple average when equal time is spent at each speed (topic: average-speed). Well-documented, specific calculation error.
3. **Confusing speed with velocity** — scalar vs. vector (topics: average-speed, average-velocity).

### Verified, ready to add (not yet in the prompt — added once, then reverted per request)

5. **"Displacement is always positive"** — students over-apply distance's always-positive property onto displacement, not grasping its signed/directional nature (topic: displacement). Confirmed at the right age level via CK-12 (a K-12 platform, not university), a dedicated "Class 9" explainer on distance vs. displacement, and a paper titled around a school-level "lesson package."
6. **Circular-track runner example** — a runner completing a full lap has nonzero average speed but zero average velocity, since displacement returns to zero (topic: average-velocity). Independently confirmed across multiple sources after the primary paper (ResearchGate) returned a 403. One source flagged the distinction as "critical for high school, less so for middle school" — resolved: CBSE Class 9 = US 9th grade = high school (freshman year), not middle school, so this is at the right level.

### Explicitly researched and skipped

7. **"An object at rest has no forces acting on it" / "no motion means no force is acting"** (topic: motion-and-rest). This is the _most_ consistently documented misconception across every search pass run for this topic (including the strictest freshman/K-12-targeted pass) — over 50% of students in one study, confirmed across elementary/middle/high school worldwide. **Skipped anyway**, because fully correcting it requires balanced-forces / Newton's-first-law content from the "Force and Laws of Motion" chapter, which is explicitly out of scope for Arya's current syllabus. Revisit if/when that chapter gets built.

### Removed after re-verification

8. **"Rest and motion are fixed properties of an object"** (topics: position, motion-and-rest). Was in the prompt as misconception #1 with the claim it was "confirmed as occurring in elementary, middle, and high school students worldwide" — that claim doesn't hold up under a fresh, more targeted search pass. Every study found that specifically documents a rest/motion-relativity misconception (Ramadas et al.'s "Alternative Conceptions in Galilean Relativity," N=77–111; the 2025 Inventory of Galilean Transformation paper) tested university/undergraduate physics students, not K-12 or Class 9 populations, and the misconceptions they document (frames bound to concrete objects, "real vs. apparent" motion, Galilean graph-transformation errors) are more advanced than the simple claim in our prompt. NCERT itself introduces "rest and motion are relative" as the chapter's opening concept, not as a correction to a prior belief — consistent with this being new information a 14–15-year-old hasn't formed a wrong belief about yet, rather than a documented pre-existing misconception the way distance-vs-displacement is. **Dropped from `ARYA_INSTRUCTIONS`**; the underlying idea is still taught, just not framed as confronting a misconception.

### Topics confirmed to have no topic-specific misconception

- **Introduction to linear motion** — searched repeatedly (3 separate passes, including a strict freshman/K-12-targeted one). Nothing topic-specific found; everything that surfaced was force-related (out of scope, see #7) or generic definitional content, not a documented false belief.
- **Position** — no distinct misconception found; the "needs a reference point" insight is taught as plain content in the definition, not as a misconception to confront (see #8 above for why).
- **Motion and rest** — after #8 was dropped, this topic now has no remaining topic-specific misconception either.

### New leads, not yet confirmed — needs more digging before use

- **"Ego-centered reference frame"** and **"position-velocity undiscriminated"** (topic: position) — specific, formally-named misconception categories (likely from an FCI-style taxonomy), found via a freshman/K-12-targeted search. Not usable yet: the source was flagged as university-level despite the targeted query, and there isn't enough detail from what was found to write an actual confrontation example.

### Found, but doesn't fit our format / out of scope

- **"Uniform motion" vs. "uniform acceleration" confusion** (topic: average-speed) — "uniform motion" is literally in the topic's name, so this is a real risk, but it isn't a _false belief to confront_ the way the others are — it's a term-clash with "acceleration," a concept not taught in our current scope. Different shape of problem than the rest of this list.
- **85% of 9th-grade students explaining a vertically-thrown ball's motion via decreasing upward force** — a precisely grade-matched, striking statistic, but about projectile/force-based reasoning, entirely outside our 6-topic syllabus.

### Methodology note

Searches were run in three passes with increasingly strict targeting: (1) general physics-education-research search, (2) CBSE/NCERT and age-14-15-targeted search, (3) explicit "freshman/9th grade/K-12" targeted search. The third pass mostly _reconfirmed_ the second pass's findings rather than overturning them — but even with explicit K-12 framing in the query, a large share of results still surfaced university-level sources. Query-level targeting helps but doesn't substitute for checking each individual source's actual studied population.

## State model (design in progress)

Goal: track, within a single session only (no cross-session persistence), whether a student has actually worked through what each topic requires before moving on — not self-reported by Arya, derived from deterministic checks against pre-authored content. LLM-based verification is deferred; deterministic checks only for now.

Two structures, kept separate on purpose:

- **`TopicContent`** — static, authored syllabus content (definition, unit, formula, assessment problems with known-correct answers, misconceptions). Shared across all sessions.
- **`TopicState`** — per-session, mutable, derived from deterministic checks against the conversation (e.g. was the unit mentioned, was the formula mentioned, was an assessment posed and answered correctly). Not self-reported by the model.

Misconceptions are scoped to the topic they belong to (nested inside `TopicContent`), not a separate flat list — each one lives under exactly one topic, picked as wherever its confrontation naturally lands, rather than duplicated across topics it loosely touches.

Topics can have subtopics (e.g. motion-and-rest under position) — modeled as a recursive `TopicNode` tree instead of a flat `Record<TopicId, TopicContent>`, so that syllabus order is expressed directly in array position rather than living only in the system prompt's prose. `TopicState`/`StudentState` stay flat and keyed by `TopicId` regardless of nesting depth — verification doesn't need to know about tree shape.

```ts
// --- Shared key ---

type TopicId =
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
  confrontationHook: string; // the concrete scenario/question Arya poses so the
  // student's own prediction breaks against it, rather
  // than being told the correction outright
};

type AssessmentOption = {
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
  unit?: { value: string; regex: RegExp };
  formula?: { words: string; expression?: string; keywords: RegExp[] };
  assessments?: AssessmentProblem[];
  misconceptions?: Misconception[];
  notes?: string[];
};

type TopicNode = {
  id: TopicId;
  content: TopicContent;
  subtopics?: TopicNode[];
};

const SYLLABUS: TopicNode[] = [
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
      unit: { value: "m", regex: /\bm(etre)?s?\b/i },
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
      unit: { value: "m", regex: /\bm(etre)?s?\b/i },
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
      unit: { value: "m", regex: /\bm(etre)?s?\b/i },
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
      unit: { value: "m/s", regex: /\bm\/s\b|\bmetres? per second\b/i },
      formula: {
        words: "total distance divided by total time",
        expression: "v = s / t",
        keywords: [/distance/i, /time/i, /(divide|divided|÷|\/|over)/i],
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
      unit: { value: "m/s", regex: /\bm\/s\b|\bmetres? per second\b/i },
      formula: {
        words: "displacement divided by total time",
        expression: "v = d / t",
        keywords: [/displacement/i, /time/i, /(divide|divided|÷|\/|over)/i],
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
// Records only observed facts. Nothing here encodes whether a fact is
// "applicable" to a topic (e.g. whether it even has a unit) — that's
// answered by checking TopicContent, not by nullable fields here.

type AssessmentResult = {
  problemText: string; // which AssessmentProblem this was
  correct: boolean;
};

type TopicState = {
  definitionPresented: boolean;
  unitPresented: boolean;
  formulaPresented: boolean;
  pendingAssessment: string | null; // problemText of the currently-posed assessment, if any
  assessmentResults: AssessmentResult[]; // append-only log of attempts
};

// --- Plain helpers reused by both the machine's guard and the server's
// post-generation evidence extraction ---

function findNode(nodes: TopicNode[], id: TopicId): TopicNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findNode(node.subtopics ?? [], id);
    if (found) return found;
  }
  return undefined;
}

// Nested states (see the machine below) produce nested snapshot values,
// e.g. { position: "motion-and-rest" } instead of a flat string — this
// drills down to the actual leaf TopicId, or "syllabusComplete" once done.
function innermostTopic(value: string | Record<string, unknown>): TopicId | "syllabusComplete" {
  if (typeof value === "string") return value as TopicId | "syllabusComplete";
  const key = Object.keys(value)[0];
  return innermostTopic(value[key] as string | Record<string, unknown>);
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

function isTopicComplete(content: TopicContent, state: TopicState): boolean {
  if (!state.definitionPresented) return false;
  if (content.unit && !state.unitPresented) return false;
  if (content.formula && !state.formulaPresented) return false;
  if (content.assessments?.length && !state.assessmentResults.some((r) => r.correct)) return false;
  return true;
  // Definition is no longer excluded the way it used to be: presentFact
  // (see "Verification tools") guarantees the canonical text is shown
  // verbatim, so there's no free-form-paraphrase-judgment problem left to
  // defer. Misconception confrontation was never included here at all —
  // see the note below on why it isn't part of the verification layer.
}

function describeGap(content: TopicContent, state: TopicState): string {
  const gaps: string[] = [];
  if (!state.definitionPresented) gaps.push("the definition hasn't been presented yet");
  if (content.unit && !state.unitPresented) gaps.push("the SI unit hasn't been presented yet");
  if (content.formula && !state.formulaPresented) gaps.push("the formula hasn't been presented yet");
  if (content.assessments?.length && !state.assessmentResults.some((r) => r.correct)) {
    gaps.push("no assessment problem has been answered correctly yet");
  }
  return gaps.join("; ");
}
```

Misconceptions are deliberately not part of the verification layer at all — no `misconceptionsConfronted` field, no tracking event, nothing gating `isTopicComplete`. They still live exactly where they always did, as authored content on `TopicContent.misconceptions`, and reach Arya through the dynamic prompt injection (see "Content scoping" below) — `claim`, `correction`, and `confrontationHook` are all still there, still per-topic. What's removed is the pretense of verifying whether a misconception was actually confronted: that tracking was never fully wired to anything that could detect it in the first place (no tool, no check, ever specified how `MISCONCEPTION_CONFRONTED` would get sent), so keeping it in `TopicState` gave a false impression of rigor the system never had. Misconceptions are teaching guidance now, not a verified requirement — consistent with the completion-criteria instruction, which never asked for them to gate anything either.

## Order enforcement: XState machine + `advanceTopic` tool call

Adopted design (not a plain-function alternative) — [XState](https://stately.ai/docs/xstate) v5. Note: `xstate` isn't yet a dependency in this project, and this hasn't been verified against an installed copy; treat as design-ready, not implementation-verified.

Two review-driven choices worth calling out, since they weren't the first draft:

- **Subtopics are modeled as real nested/compound states with `onDone`, not flattened into a pre-order array.** `position` owns a child `motion-and-rest`; only once that inner machine reaches its `done` final state does `onDone` fire and move the outer machine to `distance`. This keeps the parent/child relationship visible in the machine's own shape instead of erasing it during a pre-processing step — subtopic roll-up falls out for free, with no separate roll-up function needed.
- **States are hand-written literally, not generated from an array via `.map()`.** Generating them (`TOPIC_ORDER.map(...)` → `Object.fromEntries`) is DRY but loses TypeScript's ability to check `target` strings against real state names. With 7ish topics, literal authoring is worth the repetition for that safety. The repeated *event-handler* shape within each state (identical except for which topic id it closes over) still goes through a small `evidenceHandlers()` helper — that duplication isn't load-bearing for type safety the way state keys and `target` strings are.

```ts
import { setup, assign, createActor, type ActorRefFrom } from "xstate";

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
    DEFINITION_PRESENTED: { actions: { type: "recordDefinition", params: { topicId } } },
    UNIT_PRESENTED: { actions: { type: "recordUnit", params: { topicId } } },
    FORMULA_PRESENTED: { actions: { type: "recordFormula", params: { topicId } } },
    ASSESSMENT_POSED: {
      actions: {
        type: "recordPosed",
        params: ({ event }: { event: MachineEvent & { type: "ASSESSMENT_POSED" } }) => ({ topicId, problemText: event.problemText }),
      },
    },
    ASSESSMENT_ANSWERED: {
      actions: {
        type: "recordAssessment",
        params: ({ event }: { event: MachineEvent & { type: "ASSESSMENT_ANSWERED" } }) => ({ topicId, problemText: event.problemText, correct: event.correct }),
      },
    },
  };
}

const syllabusMachine = setup({
  types: {} as { context: MachineContext; events: MachineEvent },
  guards: {
    topicComplete: ({ context }, params: { topicId: TopicId }) =>
      isTopicComplete(findNode(SYLLABUS, params.topicId)!.content, context.topics[params.topicId]),
  },
  actions: {
    recordDefinition: assign(({ context }, params: { topicId: TopicId }) => ({
      topics: { ...context.topics, [params.topicId]: { ...context.topics[params.topicId], definitionPresented: true } },
    })),
    recordUnit: assign(({ context }, params: { topicId: TopicId }) => ({
      topics: { ...context.topics, [params.topicId]: { ...context.topics[params.topicId], unitPresented: true } },
    })),
    recordFormula: assign(({ context }, params: { topicId: TopicId }) => ({
      topics: { ...context.topics, [params.topicId]: { ...context.topics[params.topicId], formulaPresented: true } },
    })),
    recordPosed: assign(({ context }, params: { topicId: TopicId; problemText: string }) => ({
      topics: { ...context.topics, [params.topicId]: { ...context.topics[params.topicId], pendingAssessment: params.problemText } },
    })),
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
      // Compound state: covers its own content first, then the motion-and-rest
      // subtopic, only reaching "distance" once both are done.
      initial: "own",
      states: {
        own: {
          on: {
            ...evidenceHandlers("position"),
            ADVANCE: { guard: { type: "topicComplete", params: { topicId: "position" } }, target: "motion-and-rest" },
          },
        },
        "motion-and-rest": {
          on: {
            ...evidenceHandlers("motion-and-rest"),
            ADVANCE: { guard: { type: "topicComplete", params: { topicId: "motion-and-rest" } }, target: "done" },
          },
        },
        done: { type: "final" },
      },
      onDone: "distance",
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

With compound states, `actor.getSnapshot().value` is no longer always a flat string — while inside `position`, it's `{ position: "own" }` or `{ position: "motion-and-rest" }`. `innermostTopic()` (defined earlier alongside `findNode`) drills down to the actual leaf `TopicId`, or the `"syllabusComplete"` sentinel once the whole machine is done.

## Verification tools: `presentFact`, `getAssessmentProblem`, `advanceTopic` — plus one non-model-facing endpoint

Adopted design. Replaces the earlier regex/keyword-scanning approach (`applyEvidenceFromText`, `scoreAssessmentIfApplicable`) entirely — nothing here is inferred from finished text anymore. There's no `submitAnswer` tool anymore, and that's deliberate, not an omission: assessments are multiple-choice now, and the student's answer never passes through the model at all. All model-facing tools close over the session's `actor`, and fall into two trust shapes:

- **`presentFact`, `getAssessmentProblem`** — no meaningful argument to fake. The tool's `execute` *is* the delivery (writing canonical content directly into the visible stream) or the retrieval (serving a pre-authored problem, server-side only) — there's no claim the model makes that could diverge from what actually happened, because the action and the record of it are the same step.
- **`advanceTopic`** — the model does supply something (a request to move on), checked against a ground truth the server already holds (`isTopicComplete`). It doesn't succeed just because the model asked.

Scoring the answer itself isn't a model-facing tool at all anymore — see `handleMcqAnswer` below, reached through a separate route the model never touches.

```ts
const sessionStore = new Map<string, ActorRefFrom<typeof syllabusMachine>>();

function getOrCreateActor(sessionId: string) {
  let actor = sessionStore.get(sessionId);
  if (!actor) {
    actor = createActor(syllabusMachine).start();
    sessionStore.set(sessionId, actor);
  }
  return actor;
}

// `writer` is the AI SDK's UI-message-stream writer — needed so presentFact
// can inject text directly into what the student sees. Exact API (a plain
// `text`-type part merging seamlessly into the assistant's message, vs. a
// custom `data-*` part needing bespoke frontend rendering) needs
// verification against the installed AI SDK; see the route handler below
// for where `writer` actually comes from.
function makeTools(actor: ActorRefFrom<typeof syllabusMachine>, activeTopic: TopicId) {
  const presentFact = tool({
    description:
      "Present the canonical definition, unit, or formula for the current topic. Shown to the student as its " +
      "own styled card, not inline text — don't also say the same statement yourself, and don't write a sentence " +
      "that grammatically continues into it, since it renders as a separate block.",
    inputSchema: z.object({ fact: z.enum(["definition", "unit", "formula"]) }),
    execute: async ({ fact }) => {
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
      // No writer.write here either, same reasoning as getAssessmentProblem
      // below — the tool's own result is what a custom component renders.
    },
  });

  const getAssessmentProblem = tool({
    description:
      "Fetch the assessment problem to pose to the student for the current topic. The question and its answer " +
      "options are shown directly to the student as clickable choices — you don't need to relay the options " +
      "yourself, just introduce the question naturally.",
    inputSchema: z.object({}),
    execute: async () => {
      const state = actor.getSnapshot().context.topics[activeTopic];
      const node = findNode(SYLLABUS, activeTopic)!;
      const problem = state.pendingAssessment
        ? node.content.assessments!.find((a) => a.problemText === state.pendingAssessment)!
        : node.content.assessments?.[0];
      if (!problem) return { error: "This topic has no assessment." };
      if (!state.pendingAssessment) actor.send({ type: "ASSESSMENT_POSED", problemText: problem.problemText });
      return { problemText: problem.problemText, options: problem.options };
      // No writer.write here — the return value is already rendered client-side
      // via the tool-getAssessmentProblem part's own output (see "Frontend
      // rendering" below), so a parallel data part would just be redundant.
      // correctOptionId stays server-side — never sent to the model. The
      // student's answer never comes back through this tool at all — see
      // the dedicated route below, which bypasses the model entirely.
    },
  });

  const advanceTopic = tool({
    description:
      "Attempt to move on to the next topic in the syllabus. Only succeeds if the " +
      "current topic's requirements (definition, unit, formula, and a correctly " +
      "solved assessment, where applicable) have already been presented in this conversation.",
    inputSchema: z.object({}), // no arguments — can only ever advance one step,
    // by design: an argument like a target topic id would reopen the
    // skip-ahead risk this whole mechanism exists to close
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

// --- Dedicated MCQ-answer endpoint — a separate route, not part of the
// chat/streamText flow at all. This is the actual fix for gap 3: the
// student's choice goes straight from a UI click to this handler, with no
// model in the data path to persuade or fabricate a claim through.
async function handleMcqAnswer(sessionId: string, optionId: string) {
  const actor = getOrCreateActor(sessionId);
  const activeTopic = innermostTopic(actor.getSnapshot().value);
  if (activeTopic === "syllabusComplete") return { error: "syllabus already complete" };
  const state = actor.getSnapshot().context.topics[activeTopic];
  if (!state.pendingAssessment) return { error: "No assessment is currently posed." };
  const problem = findNode(SYLLABUS, activeTopic)!.content.assessments!.find((a) => a.problemText === state.pendingAssessment)!;
  const correct = optionId === problem.correctOptionId;
  actor.send({ type: "ASSESSMENT_ANSWERED", problemText: state.pendingAssessment, correct });
  return { correct };
}
```

The key thing this corrects from an earlier draft: with the machine living as a real, backend-maintained actor (not rederived from message history every request), `ADVANCE` is a genuine, load-bearing transition — it's the *only* thing that moves the active topic forward. The other events (`DEFINITION_PRESENTED`, `UNIT_PRESENTED`, `FORMULA_PRESENTED`, `ASSESSMENT_POSED`, `ASSESSMENT_ANSWERED`) update context but never move the active state by themselves; the model has to actually call `advanceTopic` for progression to happen.

Why this is "safe even when imperfectly triggered": if Arya forgets to call `advanceTopic` after genuinely finishing a topic, the actor just stays put — never wrong, just delayed until the model asks. If it calls too early, the guard blocks the transition and returns a specific reason it can act on immediately.

**Timing rule, changed from the regex-based version — deliberately, not an oversight.** Evidence used to be scanned from finished text, strictly after generation, which meant a topic's last requirement and a successful `advanceTopic` were always at least two turns apart. Now, `presentFact`/`getAssessmentProblem` record their result synchronously, inside their own `execute`, at the moment each tool runs — so within one multi-step turn, Arya can present the last missing fact and then successfully call `advanceTopic`, because by the time the guard runs, the earlier tool call in that same turn has already updated the ledger. `handleMcqAnswer` sits outside this entirely, since it's reached through its own route, not a step in the model's turn — an MCQ answer updates the ledger the moment the student clicks, independent of whatever turn Arya happens to be generating.

**Gap 1, originally resolved with a 3-attempt cap on `submitAnswer`, is superseded, not still active — worth recording rather than leaving as a dangling reference to a tool that no longer exists.** That fix (`attemptCount`, capping numeric guesses at 3) was correct for the format it was built for. Once assessments moved to MCQ (see Gap 3 below), `submitAnswer` and the numeric answer path it protected were removed entirely, and `attemptCount` went with it — there's nothing left for a 3-attempt cap to apply to. The underlying concern gap 1 addressed (brute-force guessing) didn't go away; it's now handled by MCQ's own single-attempt design, folded into the gap 3 writeup below rather than tracked separately, since the two turned out to be the same problem once the answer format changed. The general lesson — this mirrors the oldest, most standard feature of any LMS quiz tool (Moodle's and Canvas's "attempts allowed" setting), not a novel AI-safety idea — still holds; it just now applies to MCQ's 1-attempt setting instead of numeric's 3-attempt one.

**Gap 2 resolved: `getAssessmentProblem` now checks for an existing `pendingAssessment` before generating a new one, returning it unchanged if found.** No idempotency key needed — that pattern exists to handle ambiguity from lost responses over a network boundary, which doesn't apply here: `execute` runs synchronously, in-process, against a single actor we already hold a reference to, so checking existing state directly is simpler and sufficient. A redundant call (Tool-Skip/Unnecessary-Tool-Use style, per ToolFailBench) now just returns what's already pending instead of silently overwriting it. Worth noting separately, not folded into this fix: `getAssessmentProblem` always serves `assessments[0]`, so `position`'s second assessment is currently dead content — a latent bug this fix doesn't touch, since it was never actually a symptom of gap 2, just something gap 2's old behavior happened to mask.

**Gap 3 resolved — not mitigated, actually closed, and by removing the model from the data path rather than by screening what it claims.** The original gap was that nothing independently confirmed a `submitAnswer` argument reflected something the student actually said, rather than something the model was persuaded into asserting directly (OWASP's "Excessive Agency," LLM06:2025). Rather than adding a check to catch that after the fact, assessments moved to multiple-choice with the student's click going straight from the UI to `handleMcqAnswer` — a route the model never touches. There's no claim to screen, because the model is never asked to relay or interpret the answer at all.

This reopened a different problem, worth stating precisely rather than leaving implicit: a *correctly-guessed* answer looks identical to a genuinely-known one, and with a small, enumerated option set, guessing is cheap. With `n` options and `k` attempts, pure random guessing succeeds with probability `1 − ((n−k)/n)` — for 4 options and 3 attempts, that's `1 − 1/4 = 75%`, worse than the numeric format's near-zero baseline. Capping MCQ specifically at **one attempt** (not the numeric format's 3 — the two formats now have genuinely different caps, because the right cap is a function of the answer space, not a fixed constant) brings that down to `1/4 = 25%` — a real, honest tradeoff against numeric's baseline, not a fully closed gap, but landing at ordinary-quiz-tool stakes rather than a coin flip.

## Content scoping: telling the model what *and* how far

Injecting only the current topic's `TopicContent` into the prompt isn't sufficient by itself. Two gaps:

- The model needs to be told explicitly that this is the topic to teach *right now* — silently pasting definition/unit/formula text with no framing leaves it to guess what the content is for.
- The model needs to know **what's already been covered**, not just what the topic contains — otherwise it has no way to know the unit was already confirmed two turns ago, or that the formula still hasn't come up. Without this, it either re-explains things unnecessarily or assumes something's done that was never actually verified. Relying on the model to infer this from its own conversation history would just be a softer version of the self-tracking problem this whole mechanism exists to avoid — progress has to be *told* to the model as a verified fact, not left for it to reconstruct.

`describeGap` already computes the second half, but only reactively, for a rejected `advanceTopic` call. The same read should also drive the prompt proactively, every turn — a sibling function that reports status on *everything*, not just what's missing:

```ts
function describeProgress(content: TopicContent, state: TopicState): string {
  const lines: string[] = [`definition: ${state.definitionPresented ? "presented" : "not yet presented"}`];
  if (content.unit) lines.push(`unit: ${state.unitPresented ? "presented" : "not yet presented"}`);
  if (content.formula) lines.push(`formula: ${state.formulaPresented ? "presented" : "not yet presented"}`);
  if (content.assessments?.length) {
    const solved = state.assessmentResults.some((r) => r.correct);
    lines.push(`assessment: ${solved ? "answered correctly" : "not yet answered correctly"}`);
  }
  return lines.join("; ");
}
```

Per turn, the injected block combines both halves — what the topic contains, and how far the verified ledger says it's gotten:

```
You are currently teaching: position.
Definition: Distance and direction of the object from a reference point at a given moment is called position of that object.
Unit: m
Progress so far on this topic: definition: not yet presented; unit: not yet presented; assessment: not yet answered correctly.
```

Both halves come from the same source — `findNode` for content, the actor's `context.topics[activeTopic]` for progress — so this is still just a read of the verified ledger, handed to the model as fact, never something it's asked to self-assess.

## Revised system prompt (draft)

Not yet applied to `arya-instructions.ts` — drafted here first. Two parts: a static block (unchanging, same every turn, sent as `instructions`) and a dynamic block (rebuilt each turn from `findNode` + `describeProgress`, sent as a separate trailing message, not concatenated into the same string — see "Prompt caching" after the composed route handler for why they're kept apart). Changes from the current live prompt, and why:

- **Removed the full 7-item `CURRENT SYLLABUS` list.** Seeing later topic names every turn invites exactly the preview-ahead drift discussed earlier. The model learns what's next when `advanceTopic` succeeds and returns `nextTopic`, not before.
- **Removed the topic-list-wide completion-criteria instruction.** Replaced by the dynamic block's `describeProgress` readout — concrete and per-topic instead of an abstract rule applied to whichever topic the model thinks it's on.
- **Removed the hardcoded misconceptions list.** Duplicated, flatter versions of what now lives in each topic's `TopicContent.misconceptions` (with a `confrontationHook` the static list never had), and same preview problem as the syllabus list.
- **Added instructions for the `advanceTopic` tool and for not previewing later topics** — both genuinely new, motivated directly by the architecture rather than carried over.
- **`SCOPE` reworded** — no longer points at "the syllabus given above," since there's no static list there anymore.

```ts
export const ARYA_STATIC_INSTRUCTIONS = `You are Arya, an AI physics tutor for CBSE Class 9 students,
currently covering the NCERT Motion chapter. Your student is around
14–15 years old.

Below this message, you'll be told which topic to teach right now,
along with a readout of what's already been verified as covered for
it. Teach that topic, and feel free to connect it back to topics
already covered earlier in this conversation — but do not introduce,
preview, or answer questions about concepts from topics that haven't
come up yet, even if a student's question invites it. Acknowledge
their curiosity and gently redirect back to the current topic
instead.

You have three tools. Use presentFact to formally state the
definition, unit, or formula for the current topic, at the point in
your own explanation where that's the natural thing to say — it
shows the exact wording directly to the student, so call it once per
fact rather than also retyping the same statement yourself. Use
getAssessmentProblem to fetch the assessment question for this topic
when you're ready to pose it — its answer options are shown to the
student directly as clickable choices, so introduce the question
naturally but don't retype the options yourself, and you won't see
their answer either; it's scored automatically the moment they
click. Use advanceTopic once you believe everything required for the
current topic is done. If it's rejected, the reason tells you exactly what's
still missing — keep teaching the current topic and address that
specific gap before trying again.

TEACHING APPROACH — you are a tutor, not an answer engine:
- Give one idea at a time, in 2–4 sentences, then stop and wait for
  the student's response before continuing.
- Before explaining a new concept or solving a problem, ask the
  student to predict or guess first — their answer tells you what
  to correct.
- Work systematically toward presenting a formal definition, the
  formula together with its SI unit (where the topic has one), and
  posing a correctly solved assessment problem — advanceTopic checks
  that all of this has actually happened, so build toward it across
  as many turns as needed rather than rushing there in one.
- When a topic's misconception is provided to you and a student's
  prediction reveals it, don't just state the correct rule — ask a
  question that makes the contradiction in their own prediction
  obvious, then explain why the intuition breaks down.
- Ground new concepts in something the student has physically
  experienced before formalizing it (e.g. inertia via a bus
  lurching forward when it brakes) — move to the equation only once
  the physical picture is there.
- Move between representations for the same idea: words, then the
  equation.
- Teach problem-solving as a repeatable process: understand what's
  being asked, note down what's known, identify which
  law/principle/formula applies and why, solve step by step, then
  sanity-check the answer (right units? reasonable magnitude?).
- When reviewing work a student has already started, only engage
  with what they've actually written — don't silently work out the
  rest yourself first.
- If a student is stuck, escalate gradually: a pointed question
  first, then a bigger hint or similar worked example, then the
  full solution if they're still stuck or ask for it outright —
  don't withhold to the point of frustration.
- Adjust pace and difficulty to how the student is doing — faster
  or harder if they're confident, slower and simpler if they're
  struggling.
- Once a student gets it right, ask them to briefly say how they
  got there, then summarize the key takeaway before continuing.

STYLE:
- Write like a patient tutor talking out loud, not a textbook —
  flowing spoken sentences, even when walking through multiple
  steps. Do not use bullet points, numbered lists, headings, or
  markdown formatting (no **bold**, no # headings).
- When you introduce a formula, say it in words first (for example,
  "force equals mass times acceleration") alongside the symbols.
- Respond only in English.
- Encouraging and patient tone. Never condescending.

SCOPE:
- Stay focused on the current topic given below, topics already
  covered earlier in this conversation, and the basic math (algebra,
  graphs, units) needed to work through them.
- If asked something unrelated to this scope, gently redirect back
  rather than answering it at length.`;
```

Dynamic block, appended below the static instructions each turn — built from `findNode(SYLLABUS, activeTopic).content` and `describeProgress`, e.g. for `position` mid-session:

```
You are currently teaching: position.
Definition: Distance and direction of the object from a reference point at a given moment is called position of that object.
Unit: m
Progress so far on this topic: definition: not yet presented; unit: not yet presented; assessment: not yet answered correctly.
```

Resolved: the athlete-on-a-number-line recurring-example instruction, previously a blanket `STYLE`-level rule, now lives as per-topic `notes` on `position`, `motion-and-rest`, `distance`, and `displacement` — the four topics it actually applies to. Not a blanket instruction, because `STYLE` is reserved for rules that are always true regardless of topic, and this one isn't; putting it there would mean Arya has to correctly remember which of the seven topics it covers, unaided, every turn — the same prompt-only conditional-compliance pattern replaced with architecture everywhere else in this design. Since content scoping only ever shows the current topic's content, the scope boundary now enforces itself instead of needing to be remembered.

## Composed route handler (draft)

Everything above wired into what `app/api/chat/route.ts` would actually look like. Not applied to the real file yet. Assumes the state-model code (`SYLLABUS`, `findNode`, `innermostTopic`, `describeProgress`, `getOrCreateActor`, `makeTools`) has been moved into its own module — file organization not decided yet, shown here as `@/lib/syllabus-state`.

Simpler than the last draft of this, not more complex: neither `presentFact` nor `getAssessmentProblem` writes to the stream anymore — both render client-side off their own tool result, the same Generative UI pattern (see "Frontend rendering" below). That means no tool needs `writer` access at all, which means the `createUIMessageStream` + `writer.merge(toUIMessageStream(...))` wrapper this used to need is gone too — back to the plain `streamText(...).toUIMessageStreamResponse()` shape from the very first version of this route, just with `tools` and `instructions` now built dynamically instead of static. Exact API still needs verification against the installed AI SDK at implementation time, same caveat as `makeTools`.

```ts
import { deepSeek } from "@ai-sdk/deepseek";
import { convertToModelMessages, streamText, isStepCount, type UIMessage } from "ai";
import { after } from "next/server";
import { propagateAttributes } from "@langfuse/tracing";
import { ARYA_STATIC_INSTRUCTIONS } from "@/lib/arya-instructions";
import { langfuseSpanProcessor } from "@/instrumentation";
import {
  SYLLABUS, findNode, innermostTopic, describeProgress,
  getOrCreateActor, makeTools,
} from "@/lib/syllabus-state";

export async function POST(req: Request) {
  const body = await req.json();
  const messages = body?.messages as UIMessage[] | undefined;
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId : undefined;

  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: "Request body must include a non-empty `messages` array." }, { status: 400 });
  }
  if (!sessionId) {
    return Response.json({ error: "Request body must include a `sessionId`." }, { status: 400 });
  }
  if (!process.env.DEEPSEEK_API_KEY) {
    return Response.json({ error: "Missing DEEPSEEK_API_KEY on the server." }, { status: 500 });
  }

  let modelMessages;
  try {
    modelMessages = await convertToModelMessages(messages);
  } catch (error) {
    console.error("Failed to convert chat messages:", error);
    return Response.json({ error: "Request body contained malformed messages." }, { status: 400 });
  }

  const actor = getOrCreateActor(sessionId);
  const activeTopic = innermostTopic(actor.getSnapshot().value);
  const done = activeTopic === "syllabusComplete";

  const statusBlock = done
    ? "The student has completed the entire syllabus. Congratulate them and ask if they'd like to review anything."
    : buildStatusBlock(activeTopic, actor);

  const result = propagateAttributes({ sessionId, traceName: "chat-response" }, () =>
    streamText({
      model: deepSeek("deepseek-flash"),
      instructions: ARYA_STATIC_INSTRUCTIONS, // pure constant — always cache-hits
      messages: [
        ...modelMessages,
        { role: "user", content: `<current-status>\n${statusBlock}\n</current-status>` },
      ],
      abortSignal: req.signal,
      telemetry: { isEnabled: true, functionId: "arya-chat" },
      tools: done ? undefined : makeTools(actor, activeTopic),
      stopWhen: isStepCount(5), // several tool calls can now chain in one
      // turn (e.g. presentFact ×2-3, getAssessmentProblem, advanceTopic)
      onEnd: ({ usage, reasoningText }) => {
        console.log(`[chat] input tokens: ${usage.inputTokens}, output tokens: ${usage.outputTokens}`);
        console.log(`[chat] reasoning: ${reasoningText ?? "(none)"}`);
      },
    }),
  );

  after(() => langfuseSpanProcessor.forceFlush());

  return result.toUIMessageStreamResponse({
    onError: (error) => {
      console.error("DeepSeek chat request failed:", error);
      return "Something went wrong talking to the tutor.";
    },
  });
}

function buildStatusBlock(activeTopic: TopicId, actor: ReturnType<typeof getOrCreateActor>): string {
  const node = findNode(SYLLABUS, activeTopic)!;
  const state = actor.getSnapshot().context.topics[activeTopic];
  return [
    `You are currently teaching: ${activeTopic}.`,
    `Definition: ${node.content.definition}`,
    node.content.unit ? `Unit: ${node.content.unit.value}` : null,
    node.content.formula
      ? `Formula: ${node.content.formula.words}${node.content.formula.expression ? ` (${node.content.formula.expression})` : ""}`
      : null,
    node.content.notes?.length ? `Notes:\n${node.content.notes.map((n) => `- ${n}`).join("\n")}` : null,
    node.content.misconceptions?.length
      ? `Misconception to watch for:\n${node.content.misconceptions
          .map((m) => `- Claim: "${m.claim}". Correction: ${m.correction}. Confrontation: ${m.confrontationHook}`)
          .join("\n")}`
      : null,
    `Progress so far on this topic: ${describeProgress(node.content, state)}`,
  ].filter(Boolean).join("\n");
  // No longer prefixed with ARYA_STATIC_INSTRUCTIONS — see "Prompt caching"
  // below for why this moved out of `instructions` entirely.
}
```

Fixed a real gap here, not just accommodated the notes decision: `node.content.notes` and `node.content.misconceptions` were never included in this block before — only `definition`, `unit`, `formula`, and the progress readout were. That meant every note authored so far (the four athlete-motif notes just added, plus the existing ones on `displacement` and `average-speed`) was inert, and — more significantly — every topic's `confrontationHook` was never reaching the model at all, despite `TEACHING APPROACH` describing a whole technique built around using it. This was broken since `buildStatusBlock` (then called `buildDynamicInstructions`) was first drafted; the notes decision just happened to be what surfaced it.

This resolves the two gaps flagged the last time this was composed. `scoreAssessmentIfApplicable` and `applyEvidenceFromText` don't exist anymore — there's nothing left to infer from a finished transcript, because there's no finished-transcript-scanning step in this design at all. `presentFact` and `getAssessmentProblem` record their own facts synchronously, inside their own `execute`. Composing the pieces this time didn't surface a new stub the way it did before — it confirmed that moving verification into tool calls removes the "before generation / after generation" split entirely, along with the whole category of post-hoc text analysis that split existed to support.

## Prompt caching

DeepSeek's API caches prompt prefixes on disk: a cache hit costs **$0.007 per million tokens**, a cache miss **$0.22 per million** — roughly 31x. [DeepSeek API Docs — Context Caching](https://api-docs.deepseek.com/guides/kv_cache/) Matching is prefix-based — "a subsequent request can only hit the cache if it fully matches a cache prefix unit" — so any divergence anywhere breaks the cache for everything *after* that point in the request, not just the part that changed.

This is why `instructions` and the per-turn status block are two separate channels instead of one concatenated string. `describeProgress`'s readout changes on nearly every turn — as `definitionPresented`/`unitPresented`/`formulaPresented`/`assessmentResults` accumulate — not just when the active topic changes. If that block were still prefixed onto `ARYA_STATIC_INSTRUCTIONS` the way an earlier draft had it, and `instructions` becomes the system message sitting *before* `messages`, then every turn's change to the status block would break the cache prefix right there — taking the entire downstream conversation history down with it, even though that history is otherwise about as cache-friendly as content gets (same as last turn, plus one new exchange). We'd pay the 31x miss rate on the whole growing transcript, every turn, because of a small status block placed ahead of it.

The fix: `instructions: ARYA_STATIC_INSTRUCTIONS` stays a pure, never-changing constant — always a cache hit. The status block moves to a message appended *after* `modelMessages`, so the static instructions and the entire stable history both hit the cache, and only the small trailing block misses.

One implementation detail this surfaced, worth recording since it was wrong in an earlier draft of this idea: the trailing message **can't** use `role: "system"` — the AI SDK's `ModelMessage` docs are explicit that "AI SDK functions reject system messages in `prompt` or `messages` by default unless `allowSystemInMessages` is set to `true` [and] opting in can create a prompt injection risk." System-level instructions are meant to go through the top-level `instructions` parameter only, never as a message in the array, first or last. `role: "user"` is the correct choice instead — the same pattern RAG and agentic systems commonly use for injecting live context — wrapped in a `<current-status>` tag so the model doesn't mistake server-injected status for something the student actually typed.

One honest tradeoff, not a clean win: models are generally trained to weight system-prompt-positioned instructions more reliably than content at the tail end of a long history. Moving "here's what's verified, here's what you can't advance without" to a trailing user-role message, for caching economics, could plausibly make the model attend to it less consistently than it did as part of the leading system prompt. No data on how large that effect actually is for this case — a real cost to weigh against the 31x pricing difference, not something to treat as free.

## MCQ answer route (draft)

A second, small route — `app/api/mcq-answer/route.ts` — separate from `app/api/chat/route.ts` on purpose: this is the whole point of the gap 3 fix, a path the model never touches.

```ts
import { handleMcqAnswer } from "@/lib/syllabus-state";

export async function POST(req: Request) {
  const body = await req.json();
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId : undefined;
  const optionId = typeof body?.optionId === "string" ? body.optionId : undefined;

  if (!sessionId || !optionId) {
    return Response.json({ error: "Request body must include `sessionId` and `optionId`." }, { status: 400 });
  }

  const result = await handleMcqAnswer(sessionId, optionId);
  return Response.json(result);
}
```

No `streamText`, no `tools`, no instructions — this route doesn't know Arya exists. The frontend is responsible for triggering Arya's next turn afterward (e.g. firing a normal chat request right after a successful click), since nothing about this route resuming the conversation happens automatically — `buildStatusBlock` will pick up the updated ledger the moment that next request comes in, but something has to actually send it.

## Frontend rendering (draft)

Checked against `components/chat-panel.tsx` as it actually exists today, and against the AI SDK's own [Generative UI](https://ai-sdk.dev/docs/ai-sdk-ui/generative-user-interfaces) docs — this is the current, recommended pattern (AI SDK RSC / `streamUI` is flagged experimental in favor of it).

**`presentFact` renders as its own component, not inline text — same reasoning as MCQ, applied consistently.** Earlier drafts of this had `presentFact` write a plain `{ type: "text" }` part, which would've merged seamlessly into Arya's own flowing prose with zero frontend work. That's still a valid, simpler option — worth naming, since it was genuinely free. But rendering it as a distinct, styled card — visually set apart from the surrounding conversation — matches how the MCQ options already work, and makes it visually unambiguous to the student which words are the formal, canonical statement versus Arya's own explanation around it:

```tsx
type FactCardProps =
  | { fact: "definition"; definition: string }
  | { fact: "unit"; unit: string }
  | { fact: "formula"; words: string; expression?: string };

function FactCard(props: FactCardProps) {
  const label = { definition: "Definition", unit: "Unit", formula: "Formula" }[props.fact];
  return (
    <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm">
      <div className="font-medium text-muted-foreground">{label}</div>
      {props.fact === "definition" && <p>{props.definition}</p>}
      {props.fact === "unit" && <p>{props.unit}</p>}
      {props.fact === "formula" && <p>{props.words}{props.expression ? ` (${props.expression})` : ""}</p>}
    </div>
  );
}
```

```tsx
{message.parts.map((part, index) => {
  if (part.type === "tool-presentFact" && part.state === "output-available" && !("error" in part.output)) {
    return <FactCard key={index} {...part.output} />;
  }
  return null;
})}
```

Same tradeoff as the radio-button call on MCQ, worth being upfront about: a distinct card is a stronger, clearer signal to the student ("this exact wording is the definition") than blending it into flowing prose, but it's also a slightly more rigid interaction than a tutor "just saying" the definition naturally mid-sentence. That's a real, deliberate design choice, not a technical necessity — the plain-text version above would have worked too.

**MCQ options render off the tool's own result — no separate data part needed.** Any tool call shows up in `message.parts` as a `tool-${toolName}` part, with a `state` (`input-available` / `output-available` / `output-error`) and the tool's actual `output` — this is the SDK's built-in Generative UI wiring, not something bespoke. Since `getAssessmentProblem` already returns `{ problemText, options }`, that's directly renderable with no parallel `writer.write` — an earlier draft of this had one, and it was redundant:

```tsx
{message.parts.map((part, index) => {
  if (part.type === "tool-getAssessmentProblem" && part.state === "output-available") {
    return (
      <div key={index} className="flex flex-col gap-2">
        {part.output.options.map((option: { id: string; label: string }) => (
          <Button
            key={option.id}
            variant="outline"
            disabled={answeredMcqIds.has(part.output.problemText) || isBusy}
            onClick={() => handleMcqClick(part.output.problemText, option.id, option.label)}
          >
            {option.id}) {option.label}
          </Button>
        ))}
      </div>
    );
  }
  return null;
})}
```

```tsx
const [answeredMcqIds, setAnsweredMcqIds] = useState<Set<string>>(new Set());

async function handleMcqClick(mcqId: string, optionId: string, optionLabel: string) {
  if (answeredMcqIds.has(mcqId) || isBusy) return;
  setAnsweredMcqIds((prev) => new Set(prev).add(mcqId));
  const res = await fetch("/api/mcq-answer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, optionId }),
  });
  if (!res.ok) {
    setAnsweredMcqIds((prev) => { const next = new Set(prev); next.delete(mcqId); return next; });
    return;
  }
  sendMessage({ text: `I chose: ${optionLabel}` }); // natural transcript entry + triggers Arya's next turn
}
```

Three things worth staying explicit about, not glossed over:

- **`await` the fetch before calling `sendMessage`, never in parallel.** `/api/mcq-answer` and `/api/chat` read the same in-memory actor. Racing them risks `describeProgress` firing before the answer is actually recorded.
- **`answeredMcqIds` is local React state, not derived from the ledger.** The server already refuses a second scoring attempt once `pendingAssessment` clears — this state exists purely so a *stale, already-answered* widget doesn't still look clickable if a student scrolls back up. Tool parts are permanent message history, so an old MCQ instance is still sitting in `messages` indefinitely; any interactive component rendered this way inherits the same responsibility to know it's stale.
- **Real radio buttons weren't used on purpose.** A `<RadioGroup>` (shadcn has one available, same library already used for `Button`/`Card`/etc.) implies select-then-separately-confirm, with room to change your mind before submitting. That's a looser interaction than what the one-shot cap actually wants — the click itself *is* the attempt, irreversible. Immediate-submit buttons match that intent more precisely than a radio-group-plus-confirm flow would, even though either is buildable.
