# SEA-MaP — Learner Self-Assessment → Course Recommendation

Five questions in, a short ordered learning path out, plus a clearly separated list of
optional extras. Framework-agnostic and dependency-free, so it imports the same way from a
Next.js client component, a route handler, or a NestJS service.

The engine implements the client's *Course recommendation tool — Product logic & build
specification*. Where this README explains a decision, the specification is the source of
truth; the code carries no explanatory comments by design, so the reasoning lives here.

## The shape of the answer

The tool picks a destination first — the difficulty the learner says they are facing right
now — then builds the shortest sensible route to it, and offers everything else as clearly
marked optional stops.

- **Core path.** One to four courses, in order. Never empty.
- **Optional resources.** Everything else, each item tagged and appearing exactly once.
- **Flags.** Currently just the contradiction case, which changes copy and nothing else.

The whole system reduces to one repeated decision: does this answer add something genuinely
new, or does it only confirm something already covered?

## Quick start

```bash
npm install
npm test
npm run demo
npm run preview
```

`npm run demo` prints a recommendation for each of the layout states the design has to
handle and writes [`examples/sample-output.json`](examples/sample-output.json).
`npm run preview` serves the real quiz with the real styles at `http://localhost:5180`.

```ts
import { evaluate } from '@sea-map/learning-path-assessment';

const recommendation = evaluate({
  audience: 'national_government',
  challenge: 'coordination_governance',
  experience: 'new_to_field',
  application: ['design_policy_instruments'],
  confidence: ['circular_economy'],
  deliverTraining: false,
});

for (const courseId of recommendation.enroll.courseIds) {
  await api.enrollCourse({ course: courseId });
}
```

## The questionnaire

| | Question | Type | Feeds |
| --- | --- | --- | --- |
| Q1 | Audience | single | optional tier only |
| Q2 | Intended application | up to 2, plus one uncapped option | core path |
| Q3 | Challenges | single | the anchor |
| Q4 | Experience | single | core path, Course 1 only |
| Q5 | Prior competence | multi, with an exclusive option | demotes to optional |

Q2's training/facilitation option sits outside the two-selection cap and is carried on
`answers.deliverTraining`, not inside `answers.application`. Passing `deliver_training`
inside the array is rejected as an unknown option.

Q5's "None of these areas" is mutually exclusive with everything else. That is a UI
constraint, enforced in [`applyExclusive`](ui/useAssessment.ts) and re-checked in
validation, so an impossible combination can never reach the algorithm.

## The algorithm

Applied in this order, every time:

1. **Anchor.** The Q3 challenge becomes the first core course, reason `challenge`. If that
   challenge is the community option, the Waste Picker Toolkit is queued as a resource.
   This step always produces exactly one course, which is why the core path is never empty.
2. **Experience gate.** If Q4 is "New to the field" and Course 1 is not already the anchor,
   Course 1 goes to the front with reason `c1_gate` — unless Q5 says the learner is already
   confident there, in which case it is queued as an optional refresher instead.
3. **Application pass.** Each Q2 selection resolves to a course. Already in the core path,
   skip it. Confident in it per Q5, queue it as a refresher. Otherwise append it with reason
   `application`, in the order the learner selected.
4. **Training pass.** If the training/facilitation option is selected, queue the Training of
   Trainers Manual as a resource. It never takes a core slot, and neither does the Toolkit.
5. **Audience pass.** Queue the audience's primary and secondary courses as `role`, and its
   named resource, if any.
6. **Resolve.** Drop anything already in the core path. Group by item and keep the
   highest-precedence tag, so every item appears exactly once.

Resulting order: Course 1 if present → the challenge course → application additions in
selection order. Minimum length 1, maximum 4.

### Why audience does not add courses

An earlier build let Q1 populate the main path directly — a national government official
received three courses before answering anything else, and with Q2 and the Course 1 gate on
top the path routinely reached five to seven. That defeats the purpose of a focused path, so
audience now contributes to the optional tier only. It is the weakest signal available: it
describes who someone is, not what they are stuck on.

### Tag precedence

`refresher` → `role` → `resource`, highest first.

A personalised signal the learner gave directly — confidence, via Q5 — outranks a generic
role-based default. A named resource is the lowest-precedence fallback because it is never
in competition with an actual course recommendation.

Worked example: an NGO learner whose anchor is unrelated to Course 4, whose Q2 selection
maps to Course 4, and who flagged that area in Q5. Step 3 queues Course 4 as `refresher`;
step 5's audience pass queues it again as `role`. The refresher tag wins and Course 4 appears
once.

### The contradiction case

A learner can name a topic as their biggest current difficulty in Q3 and also claim
confidence in that same topic in Q5. The challenge always wins: confidence never demotes or
removes the anchor. Instead `flags` carries `challenge_confidence_contradiction`, and the
anchor card renders an alternate rationale sentence that acknowledges the stated confidence
without implying the recommendation is optional.

This is deliberately *not* a badge or tag. It is still the main recommendation and must not
read as downgraded — the acknowledgement belongs in the sentence, not in a label.

The same tension between Q4 and Q5 never surfaces, because step 2 routes Course 1 straight
to the optional tier the moment Q5 flags it. Course 1 therefore never carries a contradiction
flag.

## Output

`evaluate()` returns the structure the specification documents, verbatim:

```json
{
  "core_path": [
    { "course": "C1", "reason": "c1_gate" },
    { "course": "C7", "reason": "challenge" },
    { "course": "C5", "reason": "application" }
  ],
  "optional_resources": [
    { "item": "C4", "tag": "refresher" },
    { "item": "Waste Picker Training Toolkit", "tag": "resource" }
  ],
  "flags": []
}
```

`reason` is `c1_gate | challenge | application`. `tag` is `refresher | role | resource`.
Courses appear as codes `C1`–`C7`; the two companion resources appear under their official
names, which is how the specification identifies them. Every item appears at most once.

Four of the specification's five worked examples are asserted verbatim in
[`evaluate.test.ts`](test/evaluate.test.ts), so the documented contract is pinned by tests
rather than by convention.

Alongside those three fields the result carries an `enroll` block, which is an addition for
the platform integration rather than part of the specification:

```ts
enroll: { courseNumbers: [1, 7, 5], courseIds: [...], slugs: [...] }
```

It covers the **core path only**, in path order. Optional items are links the learner chooses
to follow, so auto-enrolling them would reintroduce exactly the over-recommendation the
specification set out to fix. `pendingEnrollments(recommendation, alreadyEnrolledIds)` filters
out what the learner already has, which matters on a retake.

Rendering a result means resolving codes against the catalogue. `courseNumberFromCode()` and
`resourceKeyFromItem()` do that, and `ResultPanel` uses them internally — pass it a `catalog`
and `resources` if you are not using the defaults.

## Course titles and slugs

Titles come from the specification's Appendix A and are the strings that must appear on every
card and list row — never a paraphrase or a shortened description.

Four of them differ from the titles currently held in the platform's own course records
(Courses 1, 4, 5 and 6). **Slugs deliberately do not change**: they are live URLs of the form
`/training/<slug>`, and `foundations-of-plastics-and-plastic-waste-management` is still the
address of Course 1 on staging. Titles and slugs are therefore decoupled.

`catalogFromApiCourses()` binds ids and slugs to a live `GET /v2/course` response, matching on
slug, and leaves titles alone. Courses missing from the response keep their defaults, so a
partial or failed response degrades quietly.

```ts
const catalog = catalogFromApiCourses(await api.getCourses());
const recommendation = evaluate(answers, { catalog });
```

Whether the course records themselves should be renamed to match Appendix A is a decision for
the client, not something this package should force.

## Companion resources

Two named items can appear in the optional tier, neither of which is a course and neither of
which is ever enrolled into:

- **Waste Picker Training Toolkit** — queued by the community challenge, the informal-sector
  application, and the community-based organization audience.
- **Training of Trainers (ToT) Manual** — queued by the Q2 training/facilitation option.

Both ship with empty `assets` arrays. Drop the real files in through config and they render
as downloads without a code change:

```ts
evaluate(answers, {
  resources: {
    ...DEFAULT_RESOURCES,
    tot_manual: {
      ...DEFAULT_RESOURCES.tot_manual,
      assets: [{ type: 'manual', title: 'ToT manual', url: '/files/tot.pdf' }],
    },
  },
});
```

## The quiz UI

[`ui/`](ui) holds the React front end: Mantine components, BEM class names, and a stylesheet
driven off Mantine tokens and the site font variables rather than hardcoded colours. It is
kept out of the published build because it needs React and Mantine, which are dev
dependencies here.

- [`SelfAssessment`](ui/SelfAssessment.tsx) — the whole flow: intro, five steps, result.
- [`QuestionStep`](ui/QuestionStep.tsx) — one question, with the uncapped option rendered in
  its own group below the capped ones.
- [`ResultPanel`](ui/ResultPanel.tsx) — the results page, built to the approved mockups.
- [`useAssessment`](ui/useAssessment.ts) — state, validation, and navigation.

The results page renders one card per core-path item joined by thin uniform arrows. The
arrows carry no semantics: a hard prerequisite and a suggested next step look identical, on
purpose. A single-course path renders one card that is not stretched to fill the row. When
the optional list is empty the whole section is omitted rather than showing an empty state.

## Validation

`validateAnswers()` returns everything wrong with a set of answers, as data. The quiz calls it
on every change to decide whether "Next" should surface an error.

Codes: `REQUIRED`, `UNKNOWN_OPTION`, `TOO_MANY_SELECTIONS`, `NOT_AN_ARRAY`,
`DUPLICATE_SELECTION`, `MISSING_OTHER_TEXT`, `EXCLUSIVE_OPTION_CONFLICT`.

`evaluate()` throws `AssessmentValidationError` on invalid input; `safeEvaluate()` hands back
the issues instead.

Validation is driven off the question definitions, so adding an option in
[`questions.ts`](src/questions.ts) automatically extends it — and
[`rules-coverage.test.ts`](test/rules-coverage.test.ts) fails the build if that option has no
matching rule, which stops the quiz and the logic drifting apart.

## Verification

```bash
npm test
npm run typecheck
npm run build
npm run states
```

`npm run states` renders every layout state the results page has to handle — including the
four-card row and the contradiction case — into `examples/layout-states.html` as a single
self-contained file, using real engine output rather than placeholder text. Open it in a
browser and resize to check wrapping.

69 tests cover the algorithm step by step, the four reproducible worked examples from the
specification asserted verbatim, the bounds the specification sets (never empty,
never more than four), tag precedence and exactly-once resolution, the contradiction case,
Appendix A titles, enrolment scope, and the wire payload. The layout states the design has to
handle are enumerated as personas in [`examples/demo.ts`](examples/demo.ts).
