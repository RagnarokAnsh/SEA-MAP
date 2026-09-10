# How to add this to the SEA-MaP app

Step-by-step. Should take under an hour, most of it copy-paste.

---

## What's in the package

```
src/       the rules engine - plain TypeScript, no dependencies at all
ui/        the quiz screens - React + Mantine + one SCSS file
examples/  a ready-made page component and some sample output
preview/   a runnable copy of the page so you can see it before wiring it up
test/      69 tests
```

You need `src/` and `ui/`. Everything else is reference.

## Have a look at it first

```bash
npm install
npm run preview
```

Opens at `http://localhost:5180`. This is the real component with the real styles — the only
thing missing is the enrolment call, since there's no session locally. Open the browser console
and you'll see the answers and the recommendation logged on submit.

---

## Step 1 — copy the two folders in

```
src/features/self-assessment/
  engine/     <- copy the contents of src/
  ui/         <- copy the contents of ui/
```

Then fix the relative imports at the top of the `ui/` files — they point at `../src/...`, change
them to `../engine/...`. Four files: `SelfAssessment.tsx`, `QuestionStep.tsx`, `ResultPanel.tsx`,
`useAssessment.ts`.

No new dependencies. `ui/` needs `react`, `@mantine/core` and `@mantine/hooks`, all of which the
app already has. `engine/` needs nothing at all.

## Step 2 — make sure the SCSS gets compiled

`ui/self-assessment.scss` uses nesting and `&__element` syntax. If the app already builds `.scss`
files, nothing to do. If not, `npm i -D sass` and Next picks it up automatically.

## Step 3 — create the page

`app/training/self-assessment/page.tsx`. The route already exists and is auth gated — it 307s to
`/training?login=required` — and the "Begin Self-Assessment" CTA on `/training` already points at
it. This is just filling in what sits behind it.

A complete version is in [`examples/nextjs-page.tsx`](examples/nextjs-page.tsx). The essentials:

```tsx
'use client';

import { catalogFromApiCourses, evaluate, pendingEnrollments } from '../engine/index.js';
import { SelfAssessment } from '../ui/index.js';

export default function SelfAssessmentPage() {
  const handleSubmit = async (answers: Answers): Promise<Recommendation> => {
    const { data } = await api.getCourses();
    const recommendation = evaluate(answers, {
      catalog: catalogFromApiCourses(data?.data ?? data ?? []),
    });

    const mine = await api.getUserCourses();
    const pending = pendingEnrollments(recommendation, extractEnrolledIds(mine));

    for (const courseId of pending.courseIds) {
      await api.enrollCourse({ course: courseId });
    }

    await api.getUserCourses();
    return recommendation;
  };

  return <SelfAssessment onSubmit={handleSubmit} />;
}
```

Enrol one at a time rather than with `Promise.all` — parallel calls hammer the API and make
partial failures harder to report. Don't throw when an enrolment fails: the learner has done the
quiz, so show them the result and let them enrol from the course cards.

### ⚠️ Check the enrollCourse payload

`await api.enrollCourse({ course: courseId })` is a **guess**. The endpoint is definitely
`POST /v2/user/course` and the client definitely exposes it as `enrollCourse(payload)`, but the
call site isn't in the public bundle so the body shape couldn't be confirmed from outside. Check
it against wherever `enrollCourse` is already called and fix that one line.

Everything else is verified.

## Step 4 — refresh the Redux course state

After enrolling, the existing `setUserCourses` / `upsertUserCourse` actions need to run so
`/training` reflects the new enrolments. Re-fetching `getUserCourses()` at the end of the handler
(as above) is the simplest way, assuming that already dispatches.

## Step 5 — check it

Go to `/training`, click "Begin Self-Assessment", answer the five questions. You should land on
the results screen, and the core-path courses should show on `/training`.

These cover the layout states the design has to handle. `npm run demo` prints all of them.

| Answers | Expect |
|---|---|
| Q1 *Other*, Q3 *Uncertainty about technologies*, Q4 *Experienced* | One card, no optional section |
| Q1 *National government*, Q3 *Waste systems difficult to operate*, Q4 *Experienced* | One card, two "Relevant to your role" rows |
| Q1 *NGO*, Q3 *Waste systems*, Q2 *Decide between recycling technologies* | Two cards joined by an arrow, two role rows |
| Q1 *National government*, Q3 *Fragmented responsibilities*, Q4 *New to the field*, Q2 two selections, training option ticked | Four cards, one "Resource" row |
| Q3 *Uncertainty about technologies* **and** Q5 *Recycling technologies* | One card with the contradiction rationale, no badge |

That last one is the case worth looking at closely. The anchor must not look downgraded — no
badge, no tag, just the longer rationale sentence.

---

## Things to set before going live

### The companion resources

Two named items can appear in the optional tier — the **Waste Picker Training Toolkit** and the
**Training of Trainers (ToT) Manual**. Neither is a course. Neither is ever enrolled into. Both
ship with empty asset lists until you point them at the real files:

The engine returns resources by name, so the files are a presentation concern — pass the
catalogue to the component, not to `evaluate()`:

```tsx
import { DEFAULT_RESOURCES } from '@/features/self-assessment/engine';

const resources = {
  ...DEFAULT_RESOURCES,
  waste_picker_toolkit: {
    ...DEFAULT_RESOURCES.waste_picker_toolkit,
    assets: [{ type: 'pdf', title: 'Waste picker toolkit', url: '/files/toolkit.pdf' }],
  },
  tot_manual: {
    ...DEFAULT_RESOURCES.tot_manual,
    assets: [{ type: 'manual', title: 'ToT manual', url: '/files/tot-manual.pdf' }],
  },
};

<SelfAssessment onSubmit={handleSubmit} resources={resources} />;
```

Asset types are `'pdf' | 'video' | 'manual' | 'link'`. These are downloads — never pass them to
the enrolment endpoint.

### Course titles do not match the course records

Titles come from Appendix A of the specification, which states that every card and list row must
show the official title and never a paraphrase. Four of them differ from what the platform's own
course records currently hold:

| | Appendix A (what the UI shows) | Current course record |
|---|---|---|
| Course 1 | Foundations of Plastic Waste Management | Foundations of **Plastics and** Plastic Waste Management |
| Course 4 | **Behaviour Change, Community Engagement, & Inclusion of the Informal Sector** | Community Engagement, Behaviour Change, and Informal Sector Inclusion |
| Course 5 | Business Engagement and Decision-Making Tools for Plastic Waste Management | …same, **plus ": EPR, LCA and GPP"** |
| Course 6 | Technology **and** Innovation in Plastic Waste Management | Technology, Innovation, **Data, and Monitoring** for… |

Courses 2, 3 and 7 match.

**Slugs are unchanged and must stay unchanged** — they are live URLs. Course 1 is still served at
`/training/foundations-of-plastics-and-plastic-waste-management`. `catalogFromApiCourses()`
therefore binds only ids and slugs from `GET /v2/course` and leaves titles alone, so the live
catalogue can carry a different title without the results page contradicting the specification.

Someone on the client side should decide whether the course records themselves get renamed. Until
that happens, the results page and the course page will show slightly different titles for four
courses.

### Retakes

The results screen has a "Retake assessment" button. Enrolment **only ever grows** — if a retake
produces a shorter core path, courses that dropped off stay enrolled. Un-enrolling could wipe real
progress if someone is midway through a course a changed answer just knocked off.

---

## Optional — put it behind an API endpoint instead

Worth doing if you want reporting on who answered what, or want to change the rules without a
frontend deploy. The engine is the same module either way; it has no framework imports.

```ts
// src/user/learning-path-assessment.controller.ts
@Controller('v2/user/learning-path-assessment')
@UseGuards(AuthGuard)
export class LearningPathAssessmentController {
  @Post()
  async submit(@Req() req, @Body() answers: Answers) {
    const check = safeEvaluate(answers);
    if (!check.ok) throw new BadRequestException({ errors: check.issues });

    const catalog = catalogFromApiCourses(await this.courses.findAll());
    const recommendation = evaluate(answers, { catalog });

    await this.submissions.create({
      userId: req.user.id,
      answers,
      recommendation,
      submittedAt: new Date(),
    });

    const existing = await this.enrolments.courseIdsFor(req.user.id);
    for (const courseId of pendingEnrollments(recommendation, existing).courseIds) {
      await this.enrolments.enrol(req.user.id, courseId);
    }

    return recommendation;
  }
}
```

Note the route name: not `/v2/user/course/:id/self-assessment`, which is already taken by the
per-course assessment — a different feature.

Store the `answers` **and** the `recommendation`. If a rule changes later, old submissions can be
re-run against the new rules without asking anyone to retake anything.

`evaluate()` already returns the specification's documented shape, so the response body needs no
translation:

```json
{
  "core_path": [{ "course": "C7", "reason": "challenge" }],
  "optional_resources": [{ "item": "C4", "tag": "refresher" }],
  "flags": [],
  "enroll": { "courseNumbers": [7], "courseIds": ["..."], "slugs": ["..."] }
}
```

Drop `enroll` from the response if the endpoint does the enrolling itself.

The frontend barely changes — `handleSubmit` posts to this endpoint instead of calling
`evaluate()` locally.

---

## Three things to watch

**The training/facilitation option is not part of the two-selection cap.** It travels on
`answers.deliverTraining` as a boolean, not inside `answers.application`. If you build your own
form rather than using `ui/`, use `splitApplicationSelection()` to separate them — passing
`deliver_training` inside the array is rejected as an unknown option.

**Only the core path is enrolled.** Optional items are links the learner chooses to follow.
Auto-enrolling them would put back the over-recommendation this logic was written to remove.

**Courses come back as codes, not objects.** `core_path` entries carry `"C1"`–`"C7"` and
`optional_resources` entries carry either a code or a resource's official name. Resolve them with
`courseNumberFromCode()` and `resourceKeyFromItem()` against the catalogue — `ResultPanel` does
this internally, so you only need it if you render the result yourself.

**The contradiction flag changes copy, never courses.** When `flags` contains
`challenge_confidence_contradiction`, the anchor card swaps its rationale sentence and nothing
else. It must not render as a badge and the card must not look skippable.
