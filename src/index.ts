// SEA-MaP self assessment -> course recommendation.
// No runtime deps, so this imports fine from a next client component, a route
// handler, a nest service, whatever.
//
//   const result = evaluate(answers);
//   for (const id of result.enroll.courseIds) await api.enrollCourse({ course: id });
//
// The quiz ui lives in ../ui - it's kept separate so this stays framework free.

export { evaluate, safeEvaluate, pendingEnrollments } from './evaluate.js';
export { validateAnswers, AssessmentValidationError } from './validate.js';

export { QUESTIONS, RESULT_COPY, getQuestion } from './questions.js';
export {
  ALL_COURSE_NUMBERS,
  COURSES,
  DEFAULT_CATALOG,
  buildCatalog,
  catalogFromApiCourses,
  getCourse,
} from './courses.js';
export { DEFAULT_CONFIG, resolveConfig } from './config.js';

export {
  AUDIENCE_RULES,
  APPLICATION_RULES,
  CHALLENGE_RULES,
  INTEREST_RULES,
  EXPERIENCE_RULES,
  PRIOR_TRAINING_RULES,
  DELIVER_TRAINING_FULL_SET,
  FOUNDATION_COURSE,
} from './rules.js';
export type { AudienceRule, ApplicationRule, Course1Placement } from './rules.js';

export type {
  Answers,
  ApplicationId,
  AudienceId,
  ChallengeId,
  CourseCatalog,
  CourseNumber,
  CourseRef,
  EngineConfig,
  EvaluateResult,
  ExperienceId,
  InterestId,
  Notice,
  NoticeCode,
  PriorTrainingId,
  Question,
  QuestionId,
  QuestionOption,
  Recommendation,
  RecommendedCourse,
  SupplementaryAsset,
  SupplementaryAssetType,
  SupplementaryResource,
  ValidationCode,
  ValidationIssue,
} from './types.js';
