import { resolveConfig } from './config.js';
import { courseCode, RESOURCE_ITEM_NAMES } from './courses.js';
import {
  APPLICATION_RULES,
  AUDIENCE_RULES,
  CHALLENGE_RULES,
  CONFIDENCE_RULES,
  EXPERIENCE_RULES,
  OPTIONAL_TAG_PRECEDENCE,
  TRAINING_APPLICATION_RESOURCE,
} from './rules.js';
import type {
  Answers,
  CorePathEntry,
  CourseNumber,
  EngineConfig,
  EvaluateResult,
  OptionalEntry,
  OptionalTag,
  Recommendation,
  RecommendationFlag,
  ResourceKey,
} from './types.js';
import { AssessmentValidationError, validateAnswers } from './validate.js';

type QueueKey = `course:${CourseNumber}` | `resource:${ResourceKey}`;

interface QueueEntry {
  item: string;
  tag: OptionalTag;
  order: number;
}

function tagRank(tag: OptionalTag): number {
  return OPTIONAL_TAG_PRECEDENCE.indexOf(tag);
}

function confidenceCourses(answers: Answers): Set<CourseNumber> {
  const courses = new Set<CourseNumber>();
  for (const id of answers.confidence ?? []) {
    const courseNumber = CONFIDENCE_RULES[id];
    if (courseNumber !== null) courses.add(courseNumber);
  }
  return courses;
}

export function safeEvaluate(
  answers: Answers,
  overrides?: Partial<EngineConfig>,
): EvaluateResult {
  const issues = validateAnswers(answers);
  if (issues.length > 0) return { ok: false, recommendation: null, issues };

  const config = resolveConfig(overrides);
  const confident = confidenceCourses(answers);
  const flags: RecommendationFlag[] = [];
  const corePath: CorePathEntry[] = [];
  const coreCourses: CourseNumber[] = [];
  const queue = new Map<QueueKey, QueueEntry>();
  let order = 0;

  const inCorePath = (courseNumber: CourseNumber) => coreCourses.includes(courseNumber);

  const addToCore = (
    courseNumber: CourseNumber,
    reason: CorePathEntry['reason'],
    position: 'front' | 'end',
  ) => {
    const entry: CorePathEntry = { course: courseCode(courseNumber), reason };
    if (position === 'front') {
      corePath.unshift(entry);
      coreCourses.unshift(courseNumber);
    } else {
      corePath.push(entry);
      coreCourses.push(courseNumber);
    }
  };

  const queueCourse = (courseNumber: CourseNumber, tag: OptionalTag) => {
    const key: QueueKey = `course:${courseNumber}`;
    const existing = queue.get(key);
    if (existing && tagRank(existing.tag) <= tagRank(tag)) return;
    queue.set(key, {
      item: courseCode(courseNumber),
      tag,
      order: existing?.order ?? order++,
    });
  };

  const queueResource = (resourceKey: ResourceKey) => {
    const key: QueueKey = `resource:${resourceKey}`;
    if (queue.has(key)) return;
    queue.set(key, {
      item: RESOURCE_ITEM_NAMES[resourceKey],
      tag: 'resource',
      order: order++,
    });
  };

  const challenge = CHALLENGE_RULES[answers.challenge];
  addToCore(challenge.course, 'challenge', 'end');
  if (challenge.resource) queueResource(challenge.resource);
  if (confident.has(challenge.course)) flags.push('challenge_confidence_contradiction');

  const gateCourse = EXPERIENCE_RULES[answers.experience];
  if (gateCourse !== null && !inCorePath(gateCourse)) {
    if (confident.has(gateCourse)) queueCourse(gateCourse, 'refresher');
    else addToCore(gateCourse, 'c1_gate', 'front');
  }

  for (const applicationId of answers.application ?? []) {
    const rule = APPLICATION_RULES[applicationId];
    if (rule.resource) queueResource(rule.resource);
    if (inCorePath(rule.course)) continue;
    if (confident.has(rule.course)) queueCourse(rule.course, 'refresher');
    else addToCore(rule.course, 'application', 'end');
  }

  if (answers.deliverTraining) queueResource(TRAINING_APPLICATION_RESOURCE);

  const audience = AUDIENCE_RULES[answers.audience];
  if (audience.primary !== null) queueCourse(audience.primary, 'role');
  if (audience.secondary !== null) queueCourse(audience.secondary, 'role');
  if (audience.resource !== null) queueResource(audience.resource);

  const optionalResources: OptionalEntry[] = [...queue.entries()]
    .filter(([key]) => {
      const courseNumber = key.startsWith('course:')
        ? (Number(key.slice('course:'.length)) as CourseNumber)
        : null;
      return courseNumber === null || !inCorePath(courseNumber);
    })
    .map(([, entry]) => entry)
    .sort((a, b) => tagRank(a.tag) - tagRank(b.tag) || a.order - b.order)
    .map(({ item, tag }) => ({ item, tag }));

  const recommendation: Recommendation = {
    core_path: corePath,
    optional_resources: optionalResources,
    flags,
    enroll: {
      courseNumbers: [...coreCourses],
      courseIds: coreCourses.map((n) => config.catalog[n].courseId),
      slugs: coreCourses.map((n) => config.catalog[n].slug),
    },
  };

  return { ok: true, recommendation, issues: [] };
}

export function evaluate(
  answers: Answers,
  overrides?: Partial<EngineConfig>,
): Recommendation {
  const result = safeEvaluate(answers, overrides);
  if (!result.ok) throw new AssessmentValidationError(result.issues);
  return result.recommendation;
}

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
