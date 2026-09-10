import { describe, expect, it } from 'vitest';

import {
  COURSES,
  courseNumberFromCode,
  DEFAULT_CATALOG,
  DEFAULT_RESOURCES,
  RESOURCE_ITEM_NAMES,
  RESOURCES,
} from '../src/courses.js';
import { QUESTIONS } from '../src/questions.js';
import {
  APPLICATION_RULES,
  AUDIENCE_RULES,
  CHALLENGE_RULES,
  CONFIDENCE_RULES,
  EXPERIENCE_RULES,
} from '../src/rules.js';
import type { CourseNumber, QuestionId, ResourceKey } from '../src/types.js';

const RULE_TABLES: Record<QuestionId, Record<string, unknown>> = {
  audience: AUDIENCE_RULES,
  application: APPLICATION_RULES,
  challenge: CHALLENGE_RULES,
  experience: EXPERIENCE_RULES,
  confidence: CONFIDENCE_RULES,
};

const OFFICIAL_TITLES: Record<CourseNumber, string> = {
  1: 'Foundations of Plastic Waste Management',
  2: 'Circular Economy Approaches for Plastic Waste Management',
  3: 'Applied 3Rs in Plastic Waste Management',
  4: 'Behaviour Change, Community Engagement, & Inclusion of the Informal Sector',
  5: 'Business Engagement and Decision-Making Tools for Plastic Waste Management',
  6: 'Technology and Innovation in Plastic Waste Management',
  7: 'Inclusive Policy, Governance, and Gender-Responsive Implementation',
};

describe('questionnaire', () => {
  it('defines the five questions in order', () => {
    expect(QUESTIONS.map((q) => q.id)).toEqual([
      'audience',
      'application',
      'challenge',
      'experience',
      'confidence',
    ]);
  });

  it('caps the application question at two selections', () => {
    const application = QUESTIONS.find((q) => q.id === 'application')!;
    expect(application.maxSelections).toBe(2);
  });

  it('keeps the training option outside the selection limit', () => {
    const application = QUESTIONS.find((q) => q.id === 'application')!;
    const uncapped = application.options.filter((o) => o.outsideSelectionLimit);
    expect(uncapped.map((o) => o.id)).toEqual(['deliver_training']);
  });

  it('makes the challenge and experience questions single select', () => {
    for (const id of ['challenge', 'experience'] as const) {
      const question = QUESTIONS.find((q) => q.id === id)!;
      expect(question.type).toBe('single');
      expect(question.required).toBe(true);
    }
  });

  it('marks exactly one exclusive option, on the confidence question', () => {
    const exclusive = QUESTIONS.flatMap((q) =>
      q.options.filter((o) => o.exclusive).map((o) => `${q.id}.${o.id}`),
    );
    expect(exclusive).toEqual(['confidence.none']);
  });
});

describe('rule coverage', () => {
  it('has a rule for every option the quiz can produce', () => {
    for (const question of QUESTIONS) {
      const table = RULE_TABLES[question.id];
      for (const option of question.options) {
        if (option.outsideSelectionLimit) continue;
        expect(
          Object.prototype.hasOwnProperty.call(table, option.id),
          `${question.id}.${option.id} has no rule`,
        ).toBe(true);
      }
    }
  });

  it('has an option for every rule', () => {
    for (const question of QUESTIONS) {
      const optionIds = new Set(question.options.map((o) => o.id));
      for (const ruleId of Object.keys(RULE_TABLES[question.id])) {
        expect(optionIds.has(ruleId), `${question.id}.${ruleId} has no option`).toBe(true);
      }
    }
  });

  it('maps every challenge to a real course', () => {
    for (const rule of Object.values(CHALLENGE_RULES)) {
      expect(DEFAULT_CATALOG[rule.course]).toBeDefined();
    }
  });

  it('maps every application to a real course', () => {
    for (const rule of Object.values(APPLICATION_RULES)) {
      expect(DEFAULT_CATALOG[rule.course]).toBeDefined();
    }
  });

  it('points every rule resource at a real resource', () => {
    const keys = new Set<ResourceKey>(RESOURCES.map((r) => r.key));
    const referenced = [
      ...Object.values(AUDIENCE_RULES).map((r) => r.resource),
      ...Object.values(APPLICATION_RULES).map((r) => r.resource),
      ...Object.values(CHALLENGE_RULES).map((r) => r.resource),
    ].filter((key): key is ResourceKey => Boolean(key));

    for (const key of referenced) {
      expect(keys.has(key), `${key} is not a known resource`).toBe(true);
      expect(DEFAULT_RESOURCES[key]).toBeDefined();
    }
  });

  it('never gives an audience a primary, a secondary and a resource at once', () => {
    for (const [audienceId, rule] of Object.entries(AUDIENCE_RULES)) {
      const filled = [rule.primary, rule.secondary, rule.resource].filter(
        (value) => value !== null,
      );
      expect(filled.length, `${audienceId} contributes more than two items`).toBeLessThanOrEqual(2);
    }
  });
});

describe('catalogue', () => {
  it('covers courses one to seven', () => {
    expect(COURSES.map((c) => c.courseNumber)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('carries the official titles', () => {
    for (const course of COURSES) {
      expect(course.title).toBe(OFFICIAL_TITLES[course.courseNumber]);
    }
  });

  it('gives every course a distinct id and slug', () => {
    expect(new Set(COURSES.map((c) => c.courseId)).size).toBe(COURSES.length);
    expect(new Set(COURSES.map((c) => c.slug)).size).toBe(COURSES.length);
  });

  it('names both companion resources', () => {
    expect(RESOURCES.map((r) => r.key)).toEqual(['waste_picker_toolkit', 'tot_manual']);
  });

  it('uses the official resource names as output item values', () => {
    expect(RESOURCE_ITEM_NAMES).toEqual({
      waste_picker_toolkit: 'Waste Picker Training Toolkit',
      tot_manual: 'Training of Trainers (ToT) Manual',
    });
    for (const resource of RESOURCES) {
      expect(RESOURCE_ITEM_NAMES[resource.key]).toBe(resource.title);
    }
  });

  it('round-trips course codes', () => {
    for (const course of COURSES) {
      expect(courseNumberFromCode(`C${course.courseNumber}`)).toBe(course.courseNumber);
    }
    expect(courseNumberFromCode('C8')).toBeNull();
    expect(courseNumberFromCode('Waste Picker Training Toolkit')).toBeNull();
  });
});
