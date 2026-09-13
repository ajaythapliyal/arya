# Arya — Eval Requirements

This documents what we need from an eval system for Arya's current setup, and why. Written before any eval tooling exists — this is the spec, not the implementation.

## What's actually being evaluated

The entire model-facing surface today (`app/api/chat/route.ts`) is three things:

1. **Model**: `deepSeek("deepseek-v4-flash")` — hardcoded, no sampling params (`temperature`, `reasoningEffort`, etc.) configured, using provider defaults.
2. **`instructions`**: the `ARYA_INSTRUCTIONS` system prompt — this is what we're really testing.
3. **`messages`**: raw conversation history, passed straight through — no trimming, no summarization, no injected context.

No tools, no RAG/retrieval, no memory across sessions. This means an eval only has one lever to explain a failure: the prompt (and by extension, the model's own unaided knowledge — see "Known gap" below). There's no retrieval step or tool call to blame instead.

## Why we need this at all

Evals are a dev-time, offline regression check — not a runtime guarantee. They exist to answer:
- Did a prompt change actually help, on a fixed set of known scenarios, instead of relying on one anecdotal manual test?
- Is a specific behavior (e.g. chapter sequencing) actually happening, at what rate, across varied phrasing — not just in the one transcript we happened to read?

They do **not**: guarantee any individual real student's conversation goes well, prove the model is factually correct, or measure real learning outcomes. See "Known limitations" below — this isn't a footnote, it's load-bearing for how much weight to put on a passing eval run.

## Behaviors to test (v1 scope)

Pulled directly from `ARYA_INSTRUCTIONS`, not invented fresh:

1. Predict-before-explain (asks the student to guess before teaching a new concept)
2. Misconception confrontation (the 5 specific misconceptions listed in the prompt)
3. Concrete-before-abstract grounding
4. One-idea-per-turn pacing (2–4 sentences, stop and wait)
5. Hint escalation — nudge → bigger hint → full solution, not straight to the answer
6. Don't work ahead of a student's shown work
7. Adapt pace/difficulty to the student
8. Close-the-loop / metacognition prompt after a correct answer
9. Style: no markdown, English only, encouraging tone
10. Scope redirection (off-topic requests)
11. **Chapter/section sequencing** — does Arya introduce concepts in NCERT's actual order, or jump ahead

## Eval categories (not all checks are the same kind of check)

| Category | Examples | How it's graded |
|---|---|---|
| **Deterministic** | no markdown syntax present, response is in English | Regex / code — cheap, instant, no judge needed |
| **Pedagogy (LLM-judge)** | predict-first, misconception handling, hint escalation, sequencing, scope redirection | Narrow, single-criterion rubric per case, graded by an LLM judge |
| **Content accuracy (LLM-judge or reference-answer match)** | is the physics actually correct, independent of teaching style | New category — see "Known gap" below. Needs a reference correct answer to grade against, not just a style rubric. |

## Known gap this surfaces: no grounding, so accuracy is unverified

We found direct evidence (PustakAI / NCERT-QA benchmark, arXiv 2511.10002) that DeepSeek's **unaided** accuracy on real NCERT questions is weak — F1 = 0.13 (English), 0.46 (Science), without any textbook content provided in context. With real textbook context supplied (RAG), the same model jumped to F1 ≈ 0.45–0.46. Arya currently has no RAG — it relies entirely on the model's own training-time knowledge of the syllabus.

Implication: a "content accuracy" eval case can fail for a reason that **no prompt change can fix** — the model just doesn't reliably know the answer. If accuracy evals show a real problem, the fix is likely RAG (grounding Arya in actual textbook content), not more prompt engineering. This should be treated as a separate, larger follow-up, not folded into prompt-tuning work.

## Scale and process for v1

- Start with roughly **20–25 single-turn test cases** covering the behaviors above, not the 200–500 scale a mature product would use.
- **Multi-turn cases come after single-turn is solid** — specifically needed for: knowledge retention (does Arya remember something the student said several turns back — the ICLR 2026 "Lost in Simulation" / "LLMs Get Lost in Multi-Turn Conversation" finding showed real models lose ~39% accuracy when the same information is split across turns instead of given at once) and role adherence (does Arya stay on-topic across a longer conversation, e.g. a student trying to derail it).
- **Calibrate before automating**: hand-grade a batch of real Arya outputs (pass/fail + a note on every failure) *before* trusting an automated LLM judge on the same rubric. This grading step is a domain-expert/teaching-judgment call — not something to delegate to the same model being tested, and not something to do unilaterally without a human who actually knows good pedagogy reviewing it.
- **Judge model should not be DeepSeek itself** — avoids self-grading bias documented in eval literature.
- Each case should run multiple times (~5x), not once — outputs aren't deterministic, so a single pass/fail isn't a reliable read.

## Tooling direction (not yet implemented)

Leaning toward **Promptfoo**:
- Local, no-account results UI (`promptfoo view`)
- Its HTTP provider can point directly at our real running `/api/chat` endpoint — tests the actual production code path (real `ARYA_INSTRUCTIONS`, real route handler), avoiding any drift between "what we tested" and "what's actually deployed"

**Status: set up and verified.** Lives at `evals/` as an npm workspace of the root `package.json` (one `npm install`, one lockfile — not a separate standalone project). `evals/promptfooconfig.yaml` defines an HTTP provider pointed at `http://localhost:3000/api/chat`, with a `transformResponse` function that reconstructs full reply text from the SSE stream (`data: {"type":"text-delta",...}` chunks) — confirmed working against a real run, not assumed. One example deterministic test case (no-markdown check) passes end-to-end. Run via `npm run eval --workspace=evals` (dev server must be running first) and inspect with `npm run view --workspace=evals`.

Alternative considered: DeepEval (Python, pytest-native, has purpose-built multi-turn primitives — `ConversationalTestCase`, `KnowledgeRetentionMetric`, `RoleAdherenceMetric`). Worth revisiting specifically when multi-turn eval cases are added, since its conversational tooling is more mature out of the box than Promptfoo's for that specific need.

## Known limitations (apply regardless of tooling choice)

- **Evals ≠ production guarantee.** A high pass rate is evidence, not proof — it only reflects performance on the scenarios we thought to write.
- **LLM-as-judge is systematically optimistic** — documented failure mode across the field, not specific to our setup. Judge scores need periodic sanity-checking against human judgment.
- **Coverage decays without real usage feeding back in.** Right now there are zero real users/traces, so the eval set is necessarily synthetic/hand-authored. It should be revisited once real conversations exist, per standard error-analysis practice (sample real traces → open coding → axial coding → failure taxonomy → new eval cases).
- **Passing evals does not by itself improve production quality.** Evals are a measurement tool; improvement only happens when someone reads a failure, fixes the prompt (or, per the content-accuracy gap above, adds grounding), and reruns to confirm.
- **No eval here measures actual learning outcomes.** These checks measure "did the response exhibit behavior X," not "did the student learn better." That's a different, harder problem, out of scope for this document.

## Open, undecided

- Exact rubric wording for each pedagogy case — draft, then calibrate against hand-graded examples.
- Whether to author test-case *inputs* by hand, or pull real Class 9 physics questions from an external source (e.g. community NCERT datasets on Hugging Face) — faster to bootstrap, but unverified for accuracy/coverage of our specific chapter.
- Whether/when to invest in RAG grounding as a follow-up to what content-accuracy evals reveal.
