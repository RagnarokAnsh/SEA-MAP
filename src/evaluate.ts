import { resolveConfig } from './config.js';
import {
  APPLICATION_RULES,
  AUDIENCE_RULES,
  CHALLENGE_RULES,
  DELIVER_TRAINING_FULL_SET,
  EXPERIENCE_RULES,
  FOUNDATION_COURSE,
  INTEREST_RULES,
  PRIOR_TRAINING_RULES,
} from './rules.js';
import type {
  Answers,
  CourseNumber,
  EngineConfig,
  EvaluateResult,
  Notice,
  NoticeCode,
  Recommendation,
  RecommendedCourse,
  SupplementaryResource,
} from './types.js';
import { AssessmentValidationError, validateAnswers } from './validate.js';

type Bucket = Set<CourseNumber>;

function addMany(bucket: Bucket, courses: readonly CourseNumber[]): void {
  for (const course of courses) bucket.add(course);
}

// Same as evaluate() but hands back validation problems instead of throwing.
export function safeEvaluate(
  answers: Answers,
  overrides?: Partial<EngineConfig>,
): EvaluateResult {
  const issues = validateAnswers(answers);
  if (issues.length > 0) return { ok: false, recommendation: null, issues };

  const config = resolveConfig(overrides);
  const notices: Notice[] = [];
  const pushNotice = (
    code: NoticeCode,
    audience: Notice['audience'],
    message: string,
  ) => {
    if (!notices.some((n) => n.code === code)) notices.push({ code, message, audience });
  };

  const main: Bucket = new Set();
  const additional: Bucket = new Set();
  let owedTotMaterials = false;

  // Q1 -> main.
  // "other" contributes nothing and thats the end of it - no review queue,
  // the rest of the questions carry the recommendation
  const audienceRule = AUDIENCE_RULES[answers.audience];
  addMany(main, audienceRule.main);
  if (audienceRule.totMaterials) owedTotMaterials = true;

  // Q2 -> main.
  // course 1 never comes from here, thats Q5's job, except via the full set below
  for (const application of answers.application ?? []) {
    const rule = APPLICATION_RULES[application];

    if (rule.fullSetWhenEnabled && config.deliverTrainingGrantsFullSet) {
      addMany(main, DELIVER_TRAINING_FULL_SET);
      owedTotMaterials = true;
      continue;
    }

    addMany(main, rule.main);
  }

  // Q3 -> additional
  for (const challenge of answers.challenges ?? []) {
    addMany(additional, CHALLENGE_RULES[challenge]);
  }

  // Q4 -> additional
  for (const interest of answers.interests ?? []) {
    addMany(additional, INTEREST_RULES[interest]);
  }

  // Q5 -> course 1 placement.
  // only the ToT rule (or the Q2 full set) can have put it there already
  const placement = EXPERIENCE_RULES[answers.experience];
  const course1AlreadyInMain = main.has(FOUNDATION_COURSE);

  if (course1AlreadyInMain && config.totOverridesCourse1Placement) {
    // leave it. a trainer needs the foundations course no matter how
    // experienced they say they are
  } else {
    // Q5 decides, so wipe whatever was there first
    main.delete(FOUNDATION_COURSE);
    additional.delete(FOUNDATION_COURSE);

    if (placement === 'main') main.add(FOUNDATION_COURSE);
    else if (placement === 'additional') additional.add(FOUNDATION_COURSE);
    // 'none' -> not recommended at all
  }

  // a course can qualify for both lists, keep one copy
  for (const courseNumber of [...additional]) {
    if (!main.has(courseNumber)) continue;
    if (config.duplicatePrecedence === 'main') additional.delete(courseNumber);
    else main.delete(courseNumber);
  }

  // Q6 -> labels only
  const refresherCourses = new Set<CourseNumber>();
  for (const training of answers.priorTraining ?? []) {
    const courseNumber = PRIOR_TRAINING_RULES[training];
    if (courseNumber !== null) refresherCourses.add(courseNumber);
  }

  // ToT materials arent a course, theyre downloads. own bucket, never enrolled.
  const supplementaryResources: SupplementaryResource[] = [];
  if (owedTotMaterials) {
    supplementaryResources.push({
      key: 'tot_facilitation_materials',
      title: config.totMaterials.title,
      description: config.totMaterials.description,
      assets: [...config.totMaterials.assets],
    });
    pushNotice(
      'TOT_MATERIALS_INCLUDED',
      'learner',
      'Your path also includes the trainer-of-trainers facilitation materials. These are sent separately from the courses.',
    );
  }

  if (main.size === 0 && additional.size === 0 && supplementaryResources.length === 0) {
    if (config.fallbackToCourse1WhenEmpty) {
      additional.add(FOUNDATION_COURSE);
    } else {
      pushNotice(
        'EMPTY_RECOMMENDATION',
        'learner',
        'Your answers dont point to a specific course. Have a look through the full catalogue and pick whatever fits.',
      );
    }
  }

  const toList = (bucket: Bucket): RecommendedCourse[] =>
    [...bucket]
      .sort((a, b) => a - b)
      .map((courseNumber) => ({
        ...config.catalog[courseNumber],
        isRefresher: refresherCourses.has(courseNumber),
      }));

  const mainLearningPath = toList(main);
  const additionalRecommendedCourses = toList(additional);
  const everything = [...mainLearningPath, ...additionalRecommendedCourses];

  const enrollable = everything.filter(
    (course) => !(config.excludeRefreshersFromEnrollment && course.isRefresher),
  );

  const excludedRefreshers = everything.length - enrollable.length;
  if (excludedRefreshers > 0) {
    pushNotice(
      'REFRESHERS_EXCLUDED_FROM_ENROLLMENT',
      'internal',
      `${excludedRefreshers} course(s) labelled as a refresher were left out of the enrolment list.`,
    );
  }

  const recommendation: Recommendation = {
    mainLearningPath,
    additionalRecommendedCourses,
    supplementaryResources,
    enroll: {
      courseNumbers: enrollable.map((c) => c.courseNumber),
      courseIds: enrollable.map((c) => c.courseId),
      slugs: enrollable.map((c) => c.slug),
    },
    notices,
  };

  return { ok: true, recommendation, issues: [] };
}

// Throws AssessmentValidationError on bad input. Use safeEvaluate if you'd
// rather have the problems as data.
export function evaluate(
  answers: Answers,
  overrides?: Partial<EngineConfig>,
): Recommendation {
  const result = safeEvaluate(answers, overrides);
  if (!result.ok) throw new AssessmentValidationError(result.issues);
  return result.recommendation;
}

// What still needs enrolling, given what the learner already has.
//
// Pass the ids from GET /v2/user/course. Saves firing enrolment calls that
// would just bounce, which matters on a retake - most of the list will already
// be there. Also means we never send a duplicate, so it doesnt matter what the
// endpoint does with one.
export function pendingEnrollments(
  recommendation: Recommendation,
  alreadyEnrolledCourseIds: readonly string[],
): { courseIds: string[]; slugs: string[] } {
  const have = new Set(alreadyEnrolledCourseIds);
  const courseIds: string[] = [];
  const slugs: string[] = [];

  recommendation.enroll.courseIds.forEach((courseId, i) => {
    if (have.has(courseId)) return;
    courseIds.push(courseId);
    const slug = recommendation.enroll.slugs[i];
    if (slug) slugs.push(slug);
  });

  return { courseIds, slugs };
}
