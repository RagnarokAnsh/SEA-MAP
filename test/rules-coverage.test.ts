import { describe, expect, it } from 'vitest';

import { COURSES, DEFAULT_CATALOG } from '../src/courses.js';
import { QUESTIONS } from '../src/questions.js';
import {
  APPLICATION_RULES,
  AUDIENCE_RULES,
  CHALLENGE_RULES,
  EXPERIENCE_RULES,
  INTEREST_RULES,
  PRIOR_TRAINING_RULES,
} from '../src/rules.js';
import type { CourseNumber, QuestionId } from '../src/types.js';

const RULE_TABLES: Record<QuestionId, Record<string, unknown>> = {
  audience: AUDIENCE_RULES,
  application: APPLICATION_RULES,
  challenges: CHALLENGE_RULES,
  interests: INTEREST_RULES,
  experience: EXPERIENCE_RULES,
  priorTraining: PRIOR_TRAINING_RULES,
};

// Guard rail against the quiz and the rules drifting apart. Add an option to
// questions.ts without a matching rule and this fails.
describe('rules coverage', () => {
  it('defines all six questions from the document', () => {
    expect(QUESTIONS.map((q) => q.id)).toEqual([
      'audience',
      'application',
      'challenges',
      'interests',
      'experience',
      'priorTraining',
    ]);
    expect(QUESTIONS.map((q) => q.number)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it.each(QUESTIONS.map((q) => [q.id, q] as const))(
    'every %s option has a rule',
    (questionId, question) => {
      const table = RULE_TABLES[questionId];
      for (const option of question.options) {
        expect(
          Object.prototype.hasOwnProperty.call(table, option.id),
          `${questionId}: option "${option.id}" has no rule`,
        ).toBe(true);
      }
    },
  );

  it.each(QUESTIONS.map((q) => [q.id, q] as const))(
    'every %s rule has an option',
    (questionId, question) => {
      const optionIds = new Set(question.options.map((o) => o.id));
      for (const ruleKey of Object.keys(RULE_TABLES[questionId])) {
        expect(
          optionIds.has(ruleKey),
          `${questionId}: rule "${ruleKey}" has no matching option`,
        ).toBe(true);
      }
    },
  );

  it('has no duplicate option ids within a question', () => {
    for (const question of QUESTIONS) {
      const ids = question.options.map((o) => o.id);
      expect(new Set(ids).size, `${question.id} has duplicate option ids`).toBe(ids.length);
    }
  });

  it('references only course numbers that exist in the catalog', () => {
    const referenced = new Set<CourseNumber>();
    for (const rule of Object.values(AUDIENCE_RULES)) {
      rule.main.forEach((c: CourseNumber) => referenced.add(c));
    }
    for (const rule of Object.values(APPLICATION_RULES)) {
      rule.main.forEach((c: CourseNumber) => referenced.add(c));
    }
    for (const list of Object.values(CHALLENGE_RULES)) {
      list.forEach((c: CourseNumber) => referenced.add(c));
    }
    for (const list of Object.values(INTEREST_RULES)) {
      list.forEach((c: CourseNumber) => referenced.add(c));
    }
    for (const course of Object.values(PRIOR_TRAINING_RULES)) {
      if (course !== null) referenced.add(course);
    }

    for (const courseNumber of referenced) {
      expect(DEFAULT_CATALOG[courseNumber], `course ${courseNumber} missing`).toBeDefined();
    }
  });

  it('has all seven courses mapped, with unique ids and slugs', () => {
    expect(COURSES).toHaveLength(7);
    expect(COURSES.map((c) => c.courseNumber)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(new Set(COURSES.map((c) => c.courseId)).size).toBe(7);
    expect(new Set(COURSES.map((c) => c.slug)).size).toBe(7);
    for (const course of COURSES) {
      expect(course.courseId).toMatch(/^[a-f0-9]{24}$/);
      expect(course.slug.length).toBeGreaterThan(0);
      expect(course.title.length).toBeGreaterThan(0);
    }
  });

  it('maps every Q6 prior-training option except "none" to exactly one course', () => {
    const mapped = Object.entries(PRIOR_TRAINING_RULES).filter(([, v]) => v !== null);
    expect(mapped).toHaveLength(8);
    // "Each training area below corresponds to exactly one course, covering all
    // seven RTP courses" - document page 9.
    expect(new Set(mapped.map(([, v]) => v))).toEqual(new Set([1, 2, 3, 4, 5, 6, 7]));
  });
});
