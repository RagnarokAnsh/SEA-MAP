# SEA-MaP — Learner Self-Assessment → Course Recommendation

Six-question quiz that works out which of the seven courses a learner should be enrolled in,
and hands it back as JSON.

Two pieces, deliberately separate:

- **`src/`** — the rules engine. Plain TypeScript, no runtime deps, no DOM. Runs in a Next.js
  client component, a route handler, a NestJS service, or plain Node.
- **`ui/`** — the quiz itself. React + Mantine, BEM class names, styles in one SCSS file. Copy
  it into the Next app.

Rules come from `Learner's Self-Assessment_simplified 1.pdf`. That document contradicts itself
in a few places; where it does, the reading we went with is a flag in `src/config.ts` with the
reasoning next to it.

**To put this in the app, follow [INTEGRATION.md](INTEGRATION.md).**

---

## Quick start

```bash
npm install
npm run preview  # opens the quiz in a browser at localhost:5180
npm test         # 117 tests
npm run demo     # prints JSON for six sample learners
```

**`npm run preview` runs the real thing.** It renders exactly what will render in their app —
same component, same styles, no dev chrome. The only difference is that the enrolment call is
stubbed, since there's no session locally.

The recommendation is logged to the **browser console** on submit:

```
[self-assessment] answers          { audience: 'ngo_cso', … }
[self-assessment] recommendation   { mainLearningPath: […], enroll: {…} }
[self-assessment] would enrol into 3 courses: [ 'foundations-of-…', … ]
```

`preview/main.tsx` is a working copy of the page — it's about 30 lines, and
[`examples/nextjs-page.tsx`](examples/nextjs-page.tsx) is the same thing with the real API calls
wired in.

```ts
import { evaluate } from '@sea-map/learning-path-assessment';

const result = evaluate({
  audience: 'national_government',            // Q1 - required, pick one
  application: ['epr_compliance'],            // Q2 - up to 2
  challenges: ['data_technology_monitoring'], // Q3 - up to 2
  interests: ['governance_coordination'],     // Q4 - up to 2
  experience: 'intermediate',                 // Q5 - required, pick one
  priorTraining: ['policy_epr'],              // Q6 - as many as apply
});

for (const courseId of result.enroll.courseIds) {
  await api.enrollCourse({ course: courseId });
}
```

### Course ids differ per environment

The ids in `src/courses.ts` came off **staging**
(`GET https://sea-map-api.staging.catalyze.id/v2/course`). Production will differ. Slugs don't
change, so rebind the catalog to whatever environment you're in:

```ts
const { data } = await api.getCourses();
const result = evaluate(answers, { catalog: catalogFromApiCourses(data) });
```

Courses missing from the response keep their defaults, so a partial or failed response won't
break anything.

> One caveat: the pdf only ever says "Course 1".."Course 7" and never names them. Which catalogue
> course each number is was worked out by matching subject matter. All seven line up cleanly, but
> it's worth a check from someone who knows the course content — see
> [INTEGRATION.md](INTEGRATION.md#confirm-the-course-numbering).

`enroll` is the flat, de-duplicated list to enroll — Main path first, then Additional. All three
arrays line up index for index.

On a retake, filter out what they already have first, so you're not firing calls that would just
bounce:

```ts
const pending = pendingEnrollments(result, alreadyEnrolledCourseIds);
for (const courseId of pending.courseIds) { … }
```

Nothing is ever un-enrolled, including on a retake.

---

## Output

```jsonc
{
  // priority pathway, from Q1 + Q2 (+ Course 1 via Q5). sorted by course number
  "mainLearningPath": [
    {
      "courseNumber": 2,
      "courseId": "6a3b4a8220a71b2b8c65188d",
      "slug": "circular-economy-approaches-for-plastic-waste-management",
      "title": "Circular Economy Approaches for Plastic Waste Management",
      "isRefresher": false     // Q6 said they've already trained in this area
    }
  ],

  // secondary suggestions, from Q3 + Q4 (+ Course 1 via Q5)
  "additionalRecommendedCourses": [ /* same shape */ ],

  // Not courses - downloads. Only the ToT materials so far, and only for
  // trainers. Nobody gets enrolled into these.
  "supplementaryResources": [
    {
      "key": "tot_facilitation_materials",
      "title": "Trainer-of-Trainers Facilitation Materials",
      "description": "Facilitation guides, manuals and short videos…",
      "assets": [
        { "type": "pdf", "title": "Facilitator handbook", "url": "/files/handbook.pdf" }
      ]
    }
  ],

  // What to enrol into. Main path first, then additional, de-duped.
  // All three arrays line up index for index.
  "enroll": {
    "courseNumbers": [2, 5, 1, 6],
    "courseIds": ["6a3b4a82…", "6a3933d0…", "6a2b9e4b…", "6a3b4fc9…"],
    "slugs": ["circular-economy-…", "business-engagement-…", "foundations-…", "technology-…"]
  },

  "notices": []
}
```

### `isRefresher`

Q6 asks what training the learner has already done. If an answer there matches a course they've
been recommended, that course gets `isRefresher: true` and the results screen labels it
*"Take only if a refresher is needed."* It never adds or removes a course — it only labels.

Full output for six personas is in [`examples/sample-output.json`](examples/sample-output.json)
(`npm run demo` regenerates it).

### Notices

Stable `code`, human `message`, and an `audience`.

**Only render `audience: 'learner'` notices.** The others are for you and whoever's watching
submissions — telling a learner their answers need reviewing isn't useful to them. `ResultPanel`
already filters on this.

| Code | Audience | Meaning |
|---|---|---|
| `TOT_MATERIALS_INCLUDED` | learner | They're also getting the ToT materials, which aren't a course. |
| `EMPTY_RECOMMENDATION` | learner | Nothing qualified. Point them at the full catalogue. |
| `REFRESHERS_EXCLUDED_FROM_ENROLLMENT` | internal | Refresher courses were held back from `enroll`. |

---

## The quiz UI

```tsx
import { SelfAssessment } from '@/features/self-assessment/ui';
import '@/features/self-assessment/ui/self-assessment.scss';

<SelfAssessment onSubmit={handleSubmit} />
```

One question per screen with a progress bar, then the results. It handles the "up to 2" caps
(greys out the rest once you've picked two), the "please specify" box on Q1 Other, and Q6's
"no prior training" clearing its siblings.

The results screen ends with **Retake assessment** / **Open training**, matching the mockup on
pages 5 and 10 of the pdf. "Open training" defaults to the first course of the Main path — the
mockup doesn't say what it should open, so override it with `openTrainingHref` if that's wrong.

Everything renders off `QUESTIONS` and `RESULT_COPY` from the engine, so the wording and the
rules can't drift apart.

`onSubmit(answers) => Promise<Recommendation>` is yours — run `evaluate()`, call the API, enroll,
return the result. Keeps the component free of any API client. There's a working version in
[`examples/nextjs-page.tsx`](examples/nextjs-page.tsx).

**On the styling:** built on Mantine (what the site already uses) with `self-assessment__*` BEM
names to match their existing convention (`training-catalog__grid`, `banner-training__title`).
Colours, spacing and radii all come from Mantine theme variables and the site's font variables
rather than hardcoded values, so it picks up their brand automatically.

Worth knowing: their compiled stylesheet **404s on staging** (`d29701dd63156d91.css` returns
"Not Found"), so exact brand colours couldn't be read off the live site. Using theme tokens
sidesteps that. The one guess is the heading font — `--sa-font-heading` at the top of
[`ui/self-assessment.scss`](ui/self-assessment.scss) is set to Reddit Sans Condensed; the site
also loads Catamaran, so change that one line if the designs say otherwise.

---

## API

| Export | What it does |
|---|---|
| `evaluate(answers, config?)` | Returns a `Recommendation`. Throws `AssessmentValidationError` on bad input. |
| `safeEvaluate(answers, config?)` | Same, but returns `{ ok, recommendation, issues }`. |
| `pendingEnrollments(rec, enrolledIds)` | Strips courses the learner already has. Use it before the enrol loop. |
| `validateAnswers(answers)` | `ValidationIssue[]` — empty means valid. The quiz calls this on every change. |
| `QUESTIONS` | All six questions and every option, as data. Render the quiz off this. |
| `RESULT_COPY` | Results-screen headings and copy, from page 5 of the pdf. |
| `COURSES`, `DEFAULT_CATALOG` | The seven courses with ids, slugs and titles. |
| `catalogFromApiCourses(list)` | Rebind the catalog to a live `GET /v2/course` response, by slug. |
| `buildCatalog({ byCourseNumber \| bySlug })` | Override ids/slugs/titles by hand. |
| `DEFAULT_CONFIG` | Every flag and its default. |
| `AUDIENCE_RULES` … `PRIOR_TRAINING_RULES` | Raw rule tables, if you want to display or audit them. |

---

## How the rules work

| Question | Feeds | Effect |
|---|---|---|
| **Q1** Audience (1) | Main path | Role → 1–7 courses. ToT grants all seven. |
| **Q2** Intended application (≤2) | Main path | Each answer → 0–2 courses. "Deliver training" grants all seven. |
| **Q3** Challenges (≤2) | Additional | Each answer → 0–1 course. |
| **Q4** Interests (≤2) | Additional | Each answer → 0–1 course. |
| **Q5** Experience (1) | Places **Course 1** | Beginner/Introductory → Main; Intermediate → Additional; Advanced/Expert → neither. |
| **Q6** Previous training (any) | Labels only | Marks recommended courses `isRefresher`. **Never adds a course.** |

Order: Q1 + Q2 → Main; Q3 + Q4 → Additional; Q5 places Course 1; duplicates collapse into Main;
Q6 applies refresher labels; both lists sorted by course number.

### Config

Each flag is a place where the pdf contradicts itself. `src/config.ts` explains each one.

```ts
evaluate(answers, {
  deliverTrainingGrantsFullSet: true,     // item 1 — DECIDED: Q2 "deliver training" grants 1-7 + ToT
  totOverridesCourse1Placement: true,     // item 4 — ToT keeps Course 1 in Main whatever Q5 says
  duplicatePrecedence: 'main',            // item 5 — a duplicated course shows under Main
  excludeRefreshersFromEnrollment: false, // item 8 — refreshers still get enrolled
  fallbackToCourse1WhenEmpty: false,      // item 9 — empty stays empty
  totMaterials: { title, description, assets },  // item 2 — the ToT downloads
  catalog: DEFAULT_CATALOG,               // rebind per environment
});
```

---

## Validation

`evaluate()` rejects bad submissions rather than guessing; `safeEvaluate()` hands the problems
back as data.

Q1 and Q5 required; Q2/Q3/Q4 capped at two; unknown option ids; duplicate selections; non-array
multi-selects; Q1 "Other" needs free text; Q6 "no prior training" can't combine with anything else.

```ts
const result = safeEvaluate(answers);
if (!result.ok) {
  // [{ questionId: 'application', code: 'TOO_MANY_SELECTIONS', message: '…' }]
  return res.status(400).json({ errors: result.issues });
}
```

---

## Layout

```
src/                  the engine (no react, no DOM)
  types.ts  courses.ts  questions.ts  rules.ts  config.ts  validate.ts  evaluate.ts  index.ts
ui/                    the quiz (react + mantine)
  SelfAssessment.tsx   phases: intro -> questions -> result
  QuestionStep.tsx     one question
  ResultPanel.tsx      the results screen
  useAssessment.ts     state, step nav, validation gating
  self-assessment.scss BEM styles on mantine + site font tokens
preview/               runnable copy of the page (npm run preview) - does not ship
test/                  117 tests
examples/              demo.ts, nextjs-page.tsx, sample-output.json
```

`npm run build` compiles `src/` only — `ui/` is meant to be copied into the Next app, since it
needs React and Mantine from there.

## Verification

```bash
npm test
npm run typecheck
npm run demo
```

Covered: every option of all six questions; the page 5 sample result reproduced exactly; the
page 7 worked example corrected to Courses 2, 3, 5; both readings of the Q2 conflict; ToT
materials as a resource and its id plumbing; Course 1 placement across all five experience
levels and both ToT settings; Q6 labelling without adding; de-duplication; enrolment list order
and the retake filter; notice audience tagging; every validation rule; rebinding the catalog to a
live API response; and the Q6 exclusive-option handling in the quiz.

**Not verified:** the request body for `POST /v2/user/course`. The endpoint exists, but its call
site isn't in the public bundle — the one line that builds that payload is marked `TODO` in
`examples/nextjs-page.tsx` and needs checking against the repo.
