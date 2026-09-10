# How to add this to the SEA-MaP app

Step-by-step. Should take under an hour, most of it copy-paste.

---

## What's in the package

```
src/       the rules engine - plain TypeScript, no dependencies at all
ui/        the quiz screens - React + Mantine + one SCSS file
examples/  a ready-made page component and some sample output
preview/   a runnable copy of the page so you can see it before wiring it up
test/      117 tests
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

```tsx
'use client';

import { useCallback } from 'react';

import { SelfAssessment } from '@/features/self-assessment/ui';
import '@/features/self-assessment/ui/self-assessment.scss';
import {
  catalogFromApiCourses,
  evaluate,
  pendingEnrollments,
  type Answers,
  type Recommendation,
} from '@/features/self-assessment/engine';
import api from '@/services/api';

export default function SelfAssessmentPage() {
  const handleSubmit = useCallback(async (answers: Answers): Promise<Recommendation> => {
    // Rebind the catalog to this environment's course ids. Matches on slug,
    // which doesn't change between staging and prod.
    const { data } = await api.getCourses();
    const recommendation = evaluate(answers, {
      catalog: catalogFromApiCourses(data?.data ?? data ?? []),
    });

    // Skip whatever they're already enrolled in - matters on a retake.
    const mine = await api.getUserCourses();
    const enrolled = (mine?.data?.data ?? mine?.data ?? [])
      .map((entry: any) => entry?.course?._id)
      .filter(Boolean);

    const pending = pendingEnrollments(recommendation, enrolled);

    // One at a time. Promise.all just hammers the api and makes partial
    // failures harder to report.
    for (const courseId of pending.courseIds) {
      try {
        await api.enrollCourse({ course: courseId });
      } catch {
        console.error('[self-assessment] enrol failed for', courseId);
      }
    }

    // Refresh the store so /training shows the new enrolments.
    await api.getUserCourses();

    return recommendation;
  }, []);

  return <SelfAssessment onSubmit={handleSubmit} />;
}
```

A fuller version with comments is in [`examples/nextjs-page.tsx`](examples/nextjs-page.tsx).

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

Go to `/training`, click "Begin Self-Assessment", answer the six questions. You should land on the
results screen, and the new courses should show on `/training`.

These three cover the interesting paths:

| Answers | Expect |
|---|---|
| Q1 *Private sector*, Q2 *Design, plan or implement…*, Q5 *Advanced* | Courses 2, 3, 5 |
| Q1 *Training facilitator / ToT partner* | All seven, plus an "Also included" block |
| Q1 *Other*, Q5 *Expert*, Q3 *Understanding the scale…*, Q4 *Understanding the scope…* | Empty state with "Browse all courses" |

---

## Things to set before going live

### The ToT facilitation materials

Trainers get a downloads block on the results screen. It's empty until you point it at the real
files:

```ts
import { DEFAULT_CONFIG } from '@/features/self-assessment/engine';

evaluate(answers, {
  catalog,
  totMaterials: {
    ...DEFAULT_CONFIG.totMaterials,
    assets: [
      { type: 'pdf',    title: 'Facilitator handbook',       url: '/files/handbook.pdf' },
      { type: 'video',  title: 'Running your first session', url: '/files/intro.mp4' },
      { type: 'manual', title: 'Workshop activity manual',   url: '/files/manual.pdf' },
    ],
  },
});
```

Types are `'pdf' | 'video' | 'manual' | 'link'`. These are downloads — never pass them to the
enrolment endpoint.

### Confirm the course numbering

The assessment pdf refers to "Course 1" through "Course 7" and **never names them**. The mapping
in `engine/courses.ts` was worked out by matching subject matter:

| pdf | Course |
|---|---|
| Course 1 | Foundations of Plastics and Plastic Waste Management |
| Course 2 | Circular Economy Approaches for Plastic Waste Management |
| Course 3 | Applied 3Rs in Plastic Waste Management |
| Course 4 | Community Engagement, Behaviour Change, and Informal Sector Inclusion |
| Course 5 | Business Engagement and Decision-Making Tools: EPR, LCA and GPP |
| Course 6 | Technology, Innovation, Data, and Monitoring |
| Course 7 | Inclusive Policy, Governance, and Gender-Responsive Implementation |

All seven line up cleanly, but it's inference rather than something the document states. Worth two
minutes from someone who knows the course content — getting one wrong means enrolling people into
the wrong course without anyone noticing. Corrections are a one-line change in
`engine/courses.ts`.

### Where "Open training" goes

The results screen ends with **Retake assessment** / **Open training**, matching the mockup on
pages 5 and 10 of the pdf. The mockup doesn't say what "Open training" opens, so it defaults to
the first course in the Main path. To send them to the catalogue instead:

```tsx
<SelfAssessment onSubmit={handleSubmit} openTrainingHref="/training" />
```

### Retakes

The results screen has a "Retake assessment" button. Enrolment **only ever grows** — if a retake
produces a shorter list, courses that dropped off stay enrolled. Un-enrolling could wipe real
progress if someone is midway through a course a changed answer just knocked off.

---

## Optional — put it behind an API endpoint instead

Worth doing if you want reporting on who answered what, or want to change the rules without a
frontend deploy. The engine is the same module either way; it has no framework imports.

```ts
// src/user/learning-path-assessment.controller.ts
//
// NOTE: not /v2/user/course/:id/self-assessment - that name is already taken
// by the per-course assessment, which is a different feature.
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

Store the `answers` **and** the `recommendation`. If a rule changes later, old submissions can be
re-run against the new rules without asking anyone to retake anything.

The frontend barely changes — `handleSubmit` posts to this endpoint instead of calling
`evaluate()` locally.

---

## Two things to watch

**Only render notices with `audience: 'learner'`.** `ResultPanel` already filters on this. The
`internal` ones are for logs, not for the person taking the quiz.

**The worked example on page 7 of the pdf is wrong.** It says a Private Sector professional who
picks "Design, plan, or implement…" gets Courses 2 and 3. But the Q1 table on page 6 gives Private
Sector **Courses 2 and 5**, so the answer is **2, 3 and 5**. The engine follows the tables and
there's a test pinned to it — so if anyone reviews against that example, it will look like a bug
when it isn't. Worth correcting in the document.
