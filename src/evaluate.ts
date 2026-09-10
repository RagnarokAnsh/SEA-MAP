import { resolveConfig } from './config.js';
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
  CorePathItem,
  CourseNumber,
  EngineConfig,
  EvaluateResult,
  OptionalItem,
  OptionalTag,
  Recommendation,
  RecommendationFlag,
  ResourceKey,
  SpecPayload,
} from './types.js';
import { AssessmentValidationError, validateAnswers } from './validate.js';

type QueueKey = `course:${CourseNumber}` | `resource:${ResourceKey}`;

interface QueueEntry {
  kind: 'course' | 'resource';
  courseNumber?: CourseNumber;
  resourceKey?: ResourceKey;
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
  const corePath: CorePathItem[] = [];
  const queue = new Map<QueueKey, QueueEntry>();
  let order = 0;

  const inCorePath = (courseNumber: CourseNumber) =>
    corePath.some((item) => item.courseNumber === courseNumber);

  const queueCourse = (courseNumber: CourseNumber, tag: OptionalTag) => {
    const key: QueueKey = `course:${courseNumber}`;
    const existing = queue.get(key);
    if (existing && tagRank(existing.tag) <= tagRank(tag)) return;
    queue.set(key, {
      kind: 'course',
      courseNumber,
      tag,
      order: existing?.order ?? order++,
    });
  };

  const queueResource = (resourceKey: ResourceKey) => {
    const key: QueueKey = `resource:${resourceKey}`;
    if (queue.has(key)) return;
    queue.set(key, { kind: 'resource', resourceKey, tag: 'resource', order: order++ });
  };

  const challenge = CHALLENGE_RULES[answers.challenge];
  corePath.push({ ...config.catalog[challenge.course], reason: 'challenge' });
  if (challenge.resource) queueResource(challenge.resource);
  if (confident.has(challenge.course)) flags.push('challenge_confidence_contradiction');

  const gateCourse = EXPERIENCE_RULES[answers.experience];
  if (gateCourse !== null && !inCorePath(gateCourse)) {
    if (confident.has(gateCourse)) queueCourse(gateCourse, 'refresher');
    else corePath.unshift({ ...config.catalog[gateCourse], reason: 'c1_gate' });
  }

  for (const applicationId of answers.application ?? []) {
    const rule = APPLICATION_RULES[applicationId];
    if (rule.resource) queueResource(rule.resource);
    if (inCorePath(rule.course)) continue;
    if (confident.has(rule.course)) queueCourse(rule.course, 'refresher');
    else corePath.push({ ...config.catalog[rule.course], reason: 'application' });
  }

  if (answers.deliverTraining) queueResource(TRAINING_APPLICATION_RESOURCE);

  const audience = AUDIENCE_RULES[answers.audience];
  if (audience.primary !== null) queueCourse(audience.primary, 'role');
  if (audience.secondary !== null) queueCourse(audience.secondary, 'role');
  if (audience.resource !== null) queueResource(audience.resource);

  const optionalResources: OptionalItem[] = [...queue.values()]
    .filter((entry) => entry.kind === 'resource' || !inCorePath(entry.courseNumber!))
    .sort((a, b) => tagRank(a.tag) - tagRank(b.tag) || a.order - b.order)
    .map((entry) =>
      entry.kind === 'course'
        ? { ...config.catalog[entry.courseNumber!], kind: 'course', tag: entry.tag }
        : { ...config.resources[entry.resourceKey!], kind: 'resource', tag: 'resource' },
    );

  const recommendation: Recommendation = {
    corePath,
    optionalResources,
    flags,
    enroll: {
      courseNumbers: corePath.map((item) => item.courseNumber),
      courseIds: corePath.map((item) => item.courseId),
      slugs: corePath.map((item) => item.slug),
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

export function toSpecPayload(recommendation: Recommendation): SpecPayload {
  return {
    core_path: recommendation.corePath.map((item) => ({
      course: `C${item.courseNumber}`,
      reason: item.reason,
    })),
    optional_resources: recommendation.optionalResources.map((item) => ({
      item: item.kind === 'course' ? `C${item.courseNumber}` : item.key,
      tag: item.tag,
    })),
    flags: [...recommendation.flags],
  };
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
