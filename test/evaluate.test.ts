import { describe, expect, it } from 'vitest';

import { DEFAULT_CATALOG } from '../src/courses.js';
import { evaluate, pendingEnrollments, safeEvaluate, toSpecPayload } from '../src/evaluate.js';
import { AUDIENCE_RULES, CHALLENGE_RULES } from '../src/rules.js';
import type { Answers, AudienceId, CourseNumber, OptionalItem } from '../src/types.js';
import { AssessmentValidationError } from '../src/validate.js';

const BASE: Answers = {
  audience: 'other',
  otherRoleText: 'Independent consultant',
  challenge: 'technology_uncertainty',
  experience: 'experienced',
};

const core = (a: Answers) => evaluate(a).corePath.map((c) => c.courseNumber);
const reasons = (a: Answers) => evaluate(a).corePath.map((c) => c.reason);
const optional = (a: Answers) =>
  evaluate(a).optionalResources.map((item: OptionalItem) =>
    item.kind === 'course' ? [`C${item.courseNumber}`, item.tag] : [item.key, item.tag],
  );

describe('anchor', () => {
  it('always produces exactly one core course from the challenge alone', () => {
    for (const challengeId of Object.keys(CHALLENGE_RULES) as Array<
      keyof typeof CHALLENGE_RULES
    >) {
      const result = evaluate({ ...BASE, challenge: challengeId });
      expect(result.corePath).toHaveLength(1);
      expect(result.corePath[0]!.reason).toBe('challenge');
      expect(result.corePath[0]!.courseNumber).toBe(CHALLENGE_RULES[challengeId].course);
    }
  });

  it('is never removed by a confidence flag on the same topic', () => {
    const answers: Answers = {
      ...BASE,
      challenge: 'technology_uncertainty',
      confidence: ['technology_solutions'],
    };
    expect(core(answers)).toEqual([6]);
    expect(evaluate(answers).flags).toEqual(['challenge_confidence_contradiction']);
  });

  it('raises no flag when the confidence areas are unrelated', () => {
    const answers: Answers = {
      ...BASE,
      challenge: 'technology_uncertainty',
      confidence: ['waste_3rs'],
    };
    expect(evaluate(answers).flags).toEqual([]);
  });

  it('queues the toolkit when the challenge is the community option', () => {
    const answers: Answers = { ...BASE, challenge: 'community_participation' };
    expect(core(answers)).toEqual([4]);
    expect(optional(answers)).toEqual([['waste_picker_toolkit', 'resource']]);
  });
});

describe('audience', () => {
  it('never adds a course to the core path', () => {
    for (const audienceId of Object.keys(AUDIENCE_RULES) as AudienceId[]) {
      const answers: Answers = {
        ...BASE,
        audience: audienceId,
        otherRoleText: 'Independent consultant',
      };
      expect(core(answers)).toEqual([6]);
    }
  });

  it('queues primary then secondary as role items', () => {
    const answers: Answers = { ...BASE, audience: 'national_government' };
    expect(optional(answers)).toEqual([
      ['C7', 'role'],
      ['C5', 'role'],
    ]);
  });

  it('queues its named resource', () => {
    const answers: Answers = { ...BASE, audience: 'community_informal_sector' };
    expect(optional(answers)).toEqual([
      ['C4', 'role'],
      ['waste_picker_toolkit', 'resource'],
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
    expect(core(answers)).toEqual([3]);
    expect(optional(answers)).toEqual([['C6', 'role']]);
  });
});

describe('experience gate', () => {
  it('places course 1 at the front of the core path', () => {
    const answers: Answers = { ...BASE, experience: 'new_to_field' };
    expect(core(answers)).toEqual([1, 6]);
    expect(reasons(answers)).toEqual(['c1_gate', 'challenge']);
  });

  it('adds nothing for the other experience levels', () => {
    expect(core({ ...BASE, experience: 'some_experience' })).toEqual([6]);
    expect(core({ ...BASE, experience: 'experienced' })).toEqual([6]);
  });

  it('routes course 1 to optional when confidence covers it, with no flag', () => {
    const answers: Answers = {
      ...BASE,
      experience: 'new_to_field',
      confidence: ['plastic_materials'],
    };
    expect(core(answers)).toEqual([6]);
    expect(optional(answers)).toEqual([['C1', 'refresher']]);
    expect(evaluate(answers).flags).toEqual([]);
  });

  it('does not duplicate course 1 when it is already the anchor', () => {
    const answers: Answers = {
      ...BASE,
      challenge: 'understand_plastic_types',
      experience: 'new_to_field',
    };
    expect(core(answers)).toEqual([1]);
    expect(reasons(answers)).toEqual(['challenge']);
  });
});

describe('application pass', () => {
  it('appends selections in the order the learner made them', () => {
    const answers: Answers = {
      ...BASE,
      application: ['design_policy_instruments', 'improve_collection_systems'],
    };
    expect(core(answers)).toEqual([6, 5, 3]);
    expect(reasons(answers)).toEqual(['challenge', 'application', 'application']);
  });

  it('skips a selection already in the core path', () => {
    const answers: Answers = {
      ...BASE,
      challenge: 'technology_uncertainty',
      application: ['choose_recycling_technology', 'apply_business_tools'],
    };
    expect(core(answers)).toEqual([6, 5]);
  });

  it('demotes a selection to a refresher when confidence covers it', () => {
    const answers: Answers = {
      ...BASE,
      application: ['integrate_circular_principles'],
      confidence: ['circular_economy'],
    };
    expect(core(answers)).toEqual([6]);
    expect(optional(answers)).toEqual([['C2', 'refresher']]);
  });

  it('queues the toolkit alongside the informal-sector application', () => {
    const answers: Answers = { ...BASE, application: ['engage_informal_sector'] };
    expect(core(answers)).toEqual([6, 4]);
    expect(optional(answers)).toEqual([['waste_picker_toolkit', 'resource']]);
  });

  it('adds nothing to the core path when both selections are already covered', () => {
    const answers: Answers = {
      ...BASE,
      challenge: 'technology_uncertainty',
      application: ['choose_recycling_technology', 'integrate_circular_principles'],
      confidence: ['circular_economy'],
    };
    expect(core(answers)).toEqual([6]);
  });
});

describe('training and toolkit resources', () => {
  it('queues the ToT manual without taking a core slot', () => {
    const answers: Answers = { ...BASE, deliverTraining: true };
    expect(core(answers)).toEqual([6]);
    expect(optional(answers)).toEqual([['tot_manual', 'resource']]);
  });

  it('is independent of the two-selection cap', () => {
    const answers: Answers = {
      ...BASE,
      application: ['design_policy_instruments', 'improve_collection_systems'],
      deliverTraining: true,
    };
    expect(core(answers)).toEqual([6, 5, 3]);
    expect(optional(answers)).toEqual([['tot_manual', 'resource']]);
  });

  it('lists a toolkit queued by two passes only once', () => {
    const answers: Answers = {
      ...BASE,
      audience: 'community_informal_sector',
      challenge: 'community_participation',
      application: ['engage_informal_sector'],
    };
    const toolkitEntries = optional(answers).filter(
      ([key]) => key === 'waste_picker_toolkit',
    );
    expect(toolkitEntries).toHaveLength(1);
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
    expect(core(answers)).toEqual([6]);
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
    const keys = optional(answers).map(([key]) => key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('core path bounds', () => {
  it('is never empty', () => {
    expect(evaluate(BASE).corePath.length).toBeGreaterThanOrEqual(1);
  });

  it('never exceeds four courses', () => {
    const answers: Answers = {
      audience: 'national_government',
      challenge: 'coordination_governance',
      experience: 'new_to_field',
      application: ['design_policy_instruments', 'improve_collection_systems'],
      deliverTraining: true,
    };
    expect(core(answers)).toEqual([1, 7, 5, 3]);
    expect(reasons(answers)).toEqual([
      'c1_gate',
      'challenge',
      'application',
      'application',
    ]);
  });

  it('stays inside four courses across a broad sweep of answers', () => {
    const audiences = Object.keys(AUDIENCE_RULES) as AudienceId[];
    const challenges = Object.keys(CHALLENGE_RULES) as Array<keyof typeof CHALLENGE_RULES>;

    for (const audience of audiences) {
      for (const challenge of challenges) {
        const answers: Answers = {
          audience,
          otherRoleText: 'Independent consultant',
          challenge,
          experience: 'new_to_field',
          application: ['design_policy_instruments', 'improve_collection_systems'],
          deliverTraining: true,
        };
        const result = evaluate(answers);
        expect(result.corePath.length).toBeGreaterThanOrEqual(1);
        expect(result.corePath.length).toBeLessThanOrEqual(4);
      }
    }
  });
});

describe('titles', () => {
  it('uses the official catalogue titles on core and optional items', () => {
    const answers: Answers = {
      ...BASE,
      audience: 'private_sector',
      challenge: 'understand_plastic_types',
    };
    const result = evaluate(answers);
    expect(result.corePath[0]!.title).toBe('Foundations of Plastic Waste Management');
    const c5 = result.optionalResources.find(
      (item) => item.kind === 'course' && item.courseNumber === 5,
    );
    expect(c5 && c5.kind === 'course' && c5.title).toBe(
      'Business Engagement and Decision-Making Tools for Plastic Waste Management',
    );
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
    expect(result.optionalResources.length).toBeGreaterThan(0);
    for (const item of result.optionalResources) {
      if (item.kind !== 'course') continue;
      expect(result.enroll.courseNumbers).not.toContain(item.courseNumber);
    }
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
    const result = evaluate(answers);
    const pending = pendingEnrollments(result, [DEFAULT_CATALOG[1].courseId]);
    expect(pending.courseIds).toEqual([
      DEFAULT_CATALOG[7].courseId,
      DEFAULT_CATALOG[5].courseId,
    ]);
  });
});

describe('spec payload', () => {
  it('serialises to the documented shape', () => {
    const answers: Answers = {
      audience: 'ngo_cso',
      challenge: 'technology_uncertainty',
      experience: 'experienced',
      application: ['design_behaviour_change'],
      confidence: ['community_engagement'],
    };
    expect(toSpecPayload(evaluate(answers))).toEqual({
      core_path: [{ course: 'C6', reason: 'challenge' }],
      optional_resources: [
        { item: 'C4', tag: 'refresher' },
        { item: 'C7', tag: 'role' },
      ],
      flags: [],
    });
  });

  it('carries the contradiction flag through', () => {
    const answers: Answers = {
      ...BASE,
      challenge: 'technology_uncertainty',
      confidence: ['technology_solutions'],
    };
    expect(toSpecPayload(evaluate(answers))).toEqual({
      core_path: [{ course: 'C6', reason: 'challenge' }],
      optional_resources: [],
      flags: ['challenge_confidence_contradiction'],
    });
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
    const result = safeEvaluate({
      ...BASE,
      application: ['deliver_training' as never],
    });
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
