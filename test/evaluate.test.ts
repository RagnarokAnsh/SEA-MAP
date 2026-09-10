import { describe, expect, it } from 'vitest';

import { courseCode, DEFAULT_CATALOG, RESOURCE_ITEM_NAMES } from '../src/courses.js';
import { evaluate, pendingEnrollments, safeEvaluate } from '../src/evaluate.js';
import { AUDIENCE_RULES, CHALLENGE_RULES } from '../src/rules.js';
import type { Answers, AudienceId, CourseNumber, Recommendation } from '../src/types.js';
import { AssessmentValidationError } from '../src/validate.js';

const BASE: Answers = {
  audience: 'other',
  otherRoleText: 'Independent consultant',
  challenge: 'technology_uncertainty',
  experience: 'experienced',
};

const TOOLKIT = RESOURCE_ITEM_NAMES.waste_picker_toolkit;
const TOT = RESOURCE_ITEM_NAMES.tot_manual;

const core = (a: Answers) => evaluate(a).core_path.map((e) => e.course);
const reasons = (a: Answers) => evaluate(a).core_path.map((e) => e.reason);
const optional = (a: Answers) =>
  evaluate(a).optional_resources.map((e) => [e.item, e.tag]);

const withoutEnroll = (recommendation: Recommendation) => ({
  core_path: recommendation.core_path,
  optional_resources: recommendation.optional_resources,
  flags: recommendation.flags,
});

describe('output contract', () => {
  const CORE_REASONS = ['c1_gate', 'challenge', 'application'];
  const TAGS = ['refresher', 'role', 'resource'];
  const RESOURCE_NAMES = Object.values(RESOURCE_ITEM_NAMES);

  const SAMPLES: Answers[] = [
    BASE,
    { ...BASE, experience: 'new_to_field' },
    { ...BASE, confidence: ['technology_solutions'] },
    {
      audience: 'national_government',
      challenge: 'policy_market_instruments',
      experience: 'experienced',
      application: ['integrate_circular_principles', 'design_behaviour_change'],
      confidence: ['community_engagement'],
    },
    {
      audience: 'community_informal_sector',
      challenge: 'community_participation',
      experience: 'new_to_field',
      application: ['engage_informal_sector', 'apply_business_tools'],
      deliverTraining: true,
    },
  ];

  it('exposes the three documented fields plus the enrolment addition', () => {
    expect(Object.keys(evaluate(BASE)).sort()).toEqual([
      'core_path',
      'enroll',
      'flags',
      'optional_resources',
    ]);
  });

  it('shapes every core path entry as a course code and a reason', () => {
    for (const answers of SAMPLES) {
      for (const entry of evaluate(answers).core_path) {
        expect(Object.keys(entry).sort()).toEqual(['course', 'reason']);
        expect(entry.course).toMatch(/^C[1-7]$/);
        expect(CORE_REASONS).toContain(entry.reason);
      }
    }
  });

  it('shapes every optional entry as an item and a tag', () => {
    for (const answers of SAMPLES) {
      for (const entry of evaluate(answers).optional_resources) {
        expect(Object.keys(entry).sort()).toEqual(['item', 'tag']);
        expect(TAGS).toContain(entry.tag);
        const isCourse = /^C[1-7]$/.test(entry.item);
        expect(isCourse || RESOURCE_NAMES.includes(entry.item)).toBe(true);
        if (!isCourse) expect(entry.tag).toBe('resource');
      }
    }
  });

  it('emits exactly one reason of challenge per result', () => {
    for (const answers of SAMPLES) {
      const anchors = evaluate(answers).core_path.filter(
        (e) => e.reason === 'challenge',
      );
      expect(anchors).toHaveLength(1);
    }
  });

  it('survives a JSON round trip unchanged', () => {
    for (const answers of SAMPLES) {
      const result = evaluate(answers);
      expect(JSON.parse(JSON.stringify(withoutEnroll(result)))).toEqual(
        withoutEnroll(result),
      );
    }
  });
});

describe('anchor', () => {
  it('always produces exactly one core course from the challenge alone', () => {
    for (const challengeId of Object.keys(CHALLENGE_RULES) as Array<
      keyof typeof CHALLENGE_RULES
    >) {
      const result = evaluate({ ...BASE, challenge: challengeId });
      expect(result.core_path).toHaveLength(1);
      expect(result.core_path[0]!.reason).toBe('challenge');
      expect(result.core_path[0]!.course).toBe(
        courseCode(CHALLENGE_RULES[challengeId].course),
      );
    }
  });

  it('is never removed by a confidence flag on the same topic', () => {
    const answers: Answers = {
      ...BASE,
      challenge: 'technology_uncertainty',
      confidence: ['technology_solutions'],
    };
    expect(core(answers)).toEqual(['C6']);
    expect(evaluate(answers).flags).toEqual(['challenge_confidence_contradiction']);
  });

  it('raises no flag when the confidence areas are unrelated', () => {
    expect(evaluate({ ...BASE, confidence: ['waste_3rs'] }).flags).toEqual([]);
  });

  it('queues the toolkit when the challenge is the community option', () => {
    const answers: Answers = { ...BASE, challenge: 'community_participation' };
    expect(core(answers)).toEqual(['C4']);
    expect(optional(answers)).toEqual([[TOOLKIT, 'resource']]);
  });
});

describe('audience', () => {
  it('never adds a course to the core path', () => {
    for (const audienceId of Object.keys(AUDIENCE_RULES) as AudienceId[]) {
      expect(core({ ...BASE, audience: audienceId })).toEqual(['C6']);
    }
  });

  it('queues primary then secondary as role items', () => {
    expect(optional({ ...BASE, audience: 'national_government' })).toEqual([
      ['C7', 'role'],
      ['C5', 'role'],
    ]);
  });

  it('queues its named resource', () => {
    expect(optional({ ...BASE, audience: 'community_informal_sector' })).toEqual([
      ['C4', 'role'],
      [TOOLKIT, 'resource'],
    ]);
  });

  it('contributes nothing for an audience with no mapping', () => {
    expect(optional({ ...BASE, audience: 'other' })).toEqual([]);
  });

  it('drops a role item that is already in the core path', () => {
    const answers: Answers = {
      ...BASE,
      audience: 'waste_practitioner',
      challenge: 'operate_waste_systems',
    };
    expect(core(answers)).toEqual(['C3']);
    expect(optional(answers)).toEqual([['C6', 'role']]);
  });
});

describe('experience gate', () => {
  it('places course 1 at the front of the core path', () => {
    const answers: Answers = { ...BASE, experience: 'new_to_field' };
    expect(core(answers)).toEqual(['C1', 'C6']);
    expect(reasons(answers)).toEqual(['c1_gate', 'challenge']);
  });

  it('adds nothing for the other experience levels', () => {
    expect(core({ ...BASE, experience: 'some_experience' })).toEqual(['C6']);
    expect(core({ ...BASE, experience: 'experienced' })).toEqual(['C6']);
  });

  it('routes course 1 to optional when confidence covers it, with no flag', () => {
    const answers: Answers = {
      ...BASE,
      experience: 'new_to_field',
      confidence: ['plastic_materials'],
    };
    expect(core(answers)).toEqual(['C6']);
    expect(optional(answers)).toEqual([['C1', 'refresher']]);
    expect(evaluate(answers).flags).toEqual([]);
  });

  it('does not duplicate course 1 when it is already the anchor', () => {
    const answers: Answers = {
      ...BASE,
      challenge: 'understand_plastic_types',
      experience: 'new_to_field',
    };
    expect(core(answers)).toEqual(['C1']);
    expect(reasons(answers)).toEqual(['challenge']);
  });
});

describe('application pass', () => {
  it('appends selections in the order the learner made them', () => {
    const answers: Answers = {
      ...BASE,
      application: ['design_policy_instruments', 'improve_collection_systems'],
    };
    expect(core(answers)).toEqual(['C6', 'C5', 'C3']);
    expect(reasons(answers)).toEqual(['challenge', 'application', 'application']);
  });

  it('skips a selection already in the core path', () => {
    expect(
      core({
        ...BASE,
        application: ['choose_recycling_technology', 'apply_business_tools'],
      }),
    ).toEqual(['C6', 'C5']);
  });

  it('demotes a selection to a refresher when confidence covers it', () => {
    const answers: Answers = {
      ...BASE,
      application: ['integrate_circular_principles'],
      confidence: ['circular_economy'],
    };
    expect(core(answers)).toEqual(['C6']);
    expect(optional(answers)).toEqual([['C2', 'refresher']]);
  });

  it('queues the toolkit alongside the informal-sector application', () => {
    const answers: Answers = { ...BASE, application: ['engage_informal_sector'] };
    expect(core(answers)).toEqual(['C6', 'C4']);
    expect(optional(answers)).toEqual([[TOOLKIT, 'resource']]);
  });

  it('adds nothing to the core path when both selections are already covered', () => {
    expect(
      core({
        ...BASE,
        application: ['choose_recycling_technology', 'integrate_circular_principles'],
        confidence: ['circular_economy'],
      }),
    ).toEqual(['C6']);
  });
});

describe('training and toolkit resources', () => {
  it('queues the ToT manual without taking a core slot', () => {
    const answers: Answers = { ...BASE, deliverTraining: true };
    expect(core(answers)).toEqual(['C6']);
    expect(optional(answers)).toEqual([[TOT, 'resource']]);
  });

  it('is independent of the two-selection cap', () => {
    const answers: Answers = {
      ...BASE,
      application: ['design_policy_instruments', 'improve_collection_systems'],
      deliverTraining: true,
    };
    expect(core(answers)).toEqual(['C6', 'C5', 'C3']);
    expect(optional(answers)).toEqual([[TOT, 'resource']]);
  });

  it('lists a toolkit queued by three passes only once', () => {
    const answers: Answers = {
      ...BASE,
      audience: 'community_informal_sector',
      challenge: 'community_participation',
      application: ['engage_informal_sector'],
    };
    expect(optional(answers).filter(([item]) => item === TOOLKIT)).toHaveLength(1);
  });
});

describe('optional list resolution', () => {
  it('keeps the higher-precedence tag when an item is queued twice', () => {
    const answers: Answers = {
      audience: 'ngo_cso',
      challenge: 'technology_uncertainty',
      experience: 'experienced',
      application: ['design_behaviour_change'],
      confidence: ['community_engagement'],
    };
    expect(core(answers)).toEqual(['C6']);
    expect(optional(answers)).toEqual([
      ['C4', 'refresher'],
      ['C7', 'role'],
    ]);
  });

  it('orders the list refresher, then role, then resource', () => {
    const answers: Answers = {
      audience: 'national_government',
      challenge: 'operate_waste_systems',
      experience: 'experienced',
      application: ['integrate_circular_principles'],
      confidence: ['circular_economy'],
      deliverTraining: true,
    };
    expect(optional(answers).map(([, tag]) => tag)).toEqual([
      'refresher',
      'role',
      'role',
      'resource',
    ]);
  });

  it('lists every item exactly once', () => {
    const answers: Answers = {
      audience: 'ngo_cso',
      challenge: 'policy_market_instruments',
      experience: 'new_to_field',
      application: ['design_behaviour_change', 'coordinate_across_institutions'],
      confidence: ['community_engagement', 'governance_inclusion'],
      deliverTraining: true,
    };
    const items = optional(answers).map(([item]) => item);
    expect(new Set(items).size).toBe(items.length);
  });
});

describe('core path bounds', () => {
  it('is never empty', () => {
    expect(evaluate(BASE).core_path.length).toBeGreaterThanOrEqual(1);
  });

  it('never exceeds four courses', () => {
    const answers: Answers = {
      audience: 'national_government',
      challenge: 'coordination_governance',
      experience: 'new_to_field',
      application: ['design_policy_instruments', 'improve_collection_systems'],
      deliverTraining: true,
    };
    expect(core(answers)).toEqual(['C1', 'C7', 'C5', 'C3']);
    expect(reasons(answers)).toEqual([
      'c1_gate',
      'challenge',
      'application',
      'application',
    ]);
  });

  it('stays inside four courses across a broad sweep of answers', () => {
    for (const audience of Object.keys(AUDIENCE_RULES) as AudienceId[]) {
      for (const challenge of Object.keys(CHALLENGE_RULES) as Array<
        keyof typeof CHALLENGE_RULES
      >) {
        const result = evaluate({
          audience,
          otherRoleText: 'Independent consultant',
          challenge,
          experience: 'new_to_field',
          application: ['design_policy_instruments', 'improve_collection_systems'],
          deliverTraining: true,
        });
        expect(result.core_path.length).toBeGreaterThanOrEqual(1);
        expect(result.core_path.length).toBeLessThanOrEqual(4);
      }
    }
  });
});

describe('enrollment', () => {
  const answers: Answers = {
    audience: 'national_government',
    challenge: 'coordination_governance',
    experience: 'new_to_field',
    application: ['design_policy_instruments', 'integrate_circular_principles'],
    confidence: ['circular_economy'],
  };

  it('covers the core path only', () => {
    const result = evaluate(answers);
    expect(result.enroll.courseNumbers).toEqual([1, 7, 5]);
    expect(result.optional_resources.length).toBeGreaterThan(0);
    for (const entry of result.optional_resources) {
      expect(result.core_path.some((c) => c.course === entry.item)).toBe(false);
    }
  });

  it('follows the core path order rather than sorting', () => {
    const result = evaluate(answers);
    expect(result.enroll.courseNumbers.map(courseCode)).toEqual(
      result.core_path.map((e) => e.course),
    );
  });

  it('lines ids and slugs up with the course numbers', () => {
    const result = evaluate(answers);
    expect(result.enroll.courseIds).toEqual(
      result.enroll.courseNumbers.map((n: CourseNumber) => DEFAULT_CATALOG[n].courseId),
    );
    expect(result.enroll.slugs).toEqual(
      result.enroll.courseNumbers.map((n: CourseNumber) => DEFAULT_CATALOG[n].slug),
    );
  });

  it('skips courses the learner already has', () => {
    const pending = pendingEnrollments(evaluate(answers), [DEFAULT_CATALOG[1].courseId]);
    expect(pending.courseIds).toEqual([
      DEFAULT_CATALOG[7].courseId,
      DEFAULT_CATALOG[5].courseId,
    ]);
  });
});

describe('validation', () => {
  it('rejects a missing challenge', () => {
    const result = safeEvaluate({ ...BASE, challenge: undefined as never });
    expect(result.ok).toBe(false);
    expect(result.issues.map((i) => i.code)).toContain('REQUIRED');
  });

  it('rejects more than two application selections', () => {
    const result = safeEvaluate({
      ...BASE,
      application: [
        'design_policy_instruments',
        'improve_collection_systems',
        'design_behaviour_change',
      ],
    });
    expect(result.ok).toBe(false);
    expect(result.issues.map((i) => i.code)).toContain('TOO_MANY_SELECTIONS');
  });

  it('rejects the training option inside the capped application array', () => {
    const result = safeEvaluate({ ...BASE, application: ['deliver_training' as never] });
    expect(result.ok).toBe(false);
    expect(result.issues.map((i) => i.code)).toContain('UNKNOWN_OPTION');
  });

  it('rejects confidence combined with the exclusive option', () => {
    const result = safeEvaluate({ ...BASE, confidence: ['none', 'waste_3rs'] });
    expect(result.ok).toBe(false);
    expect(result.issues.map((i) => i.code)).toContain('EXCLUSIVE_OPTION_CONFLICT');
  });

  it('requires the free text when the audience is other', () => {
    const result = safeEvaluate({ ...BASE, otherRoleText: undefined });
    expect(result.ok).toBe(false);
    expect(result.issues.map((i) => i.code)).toContain('MISSING_OTHER_TEXT');
  });

  it('accepts the exclusive option on its own', () => {
    expect(safeEvaluate({ ...BASE, confidence: ['none'] }).ok).toBe(true);
  });

  it('throws from evaluate on invalid answers', () => {
    expect(() => evaluate({ ...BASE, challenge: undefined as never })).toThrow(
      AssessmentValidationError,
    );
  });
});
