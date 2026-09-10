import { describe, expect, it } from 'vitest';

import { buildCatalog, catalogFromApiCourses, DEFAULT_CATALOG } from '../src/courses.js';
import { evaluate, pendingEnrollments, safeEvaluate } from '../src/evaluate.js';
import type { Answers, CourseNumber } from '../src/types.js';
import { AssessmentValidationError } from '../src/validate.js';

const id = (n: CourseNumber) => DEFAULT_CATALOG[n].courseId;
const slug = (n: CourseNumber) => DEFAULT_CATALOG[n].slug;

// course numbers in the main path
const main = (a: Answers, cfg?: Parameters<typeof evaluate>[1]) =>
  evaluate(a, cfg).mainLearningPath.map((c) => c.courseNumber);

// course numbers in the additional list
const additional = (a: Answers, cfg?: Parameters<typeof evaluate>[1]) =>
  evaluate(a, cfg).additionalRecommendedCourses.map((c) => c.courseNumber);

// contributes nothing on its own, so each test isolates one rule
const BASE: Answers = { audience: 'other', otherRoleText: 'Consultant', experience: 'advanced' };

describe('Q1 AUDIENCE -> Main Learning Path', () => {
  it.each([
    ['national_government', [2, 5, 7]],
    ['sub_national_government', [3, 6, 7]],
    ['waste_practitioner', [3, 6]],
    ['ngo_cso', [4, 7]],
    ['private_sector', [2, 5]],
    ['educator_youth', [4]],
    ['tot_partner', [1, 2, 3, 4, 5, 6, 7]],
    ['other', []],
  ] as const)('%s -> courses %j', (audience, expected) => {
    const answers: Answers = { audience, experience: 'advanced' };
    if (audience === 'other') answers.otherRoleText = 'Independent consultant';
    expect(main(answers)).toEqual([...expected]);
  });

  it('"other" adds nothing but lets Q2-Q6 carry the recommendation', () => {
    const result = evaluate({
      ...BASE,
      application: ['epr_compliance'],
      challenges: ['data_technology_monitoring'],
    });

    // Q2 and Q3 still contribute
    expect(result.mainLearningPath.map((c) => c.courseNumber)).toEqual([5]);
    expect(result.additionalRecommendedCourses.map((c) => c.courseNumber)).toEqual([6]);
  });

  it('does not raise anything for review - there is nobody to review it', () => {
    const result = evaluate({ ...BASE, application: ['epr_compliance'] });
    expect(JSON.stringify(result)).not.toMatch(/manual|review/i);
  });

  it('adds the ToT materials, which are not a course', () => {
    const result = evaluate({ audience: 'tot_partner', experience: 'advanced' });
    expect(result.supplementaryResources).toHaveLength(1);
    expect(result.notices.map((n) => n.code)).toContain('TOT_MATERIALS_INCLUDED');
    expect(result.enroll.courseIds).toHaveLength(7);
  });

  it('is the only Q1 answer that grants the full set', () => {
    for (const audience of [
      'national_government',
      'sub_national_government',
      'waste_practitioner',
      'ngo_cso',
      'private_sector',
      'educator_youth',
    ] as const) {
      const result = evaluate({ audience, experience: 'advanced' });
      expect(result.supplementaryResources, audience).toEqual([]);
      expect(result.mainLearningPath.length, audience).toBeLessThan(7);
    }
  });
});

describe('Q2 INTENDED APPLICATION -> Main Learning Path', () => {
  it.each([
    ['policy_decision_making', [5]],
    ['design_implement_programmes', [3]],
    ['engage_communities', [4]],
    ['internal_sustainability', [3]],
    ['research_data_technology', [6]],
    ['advocacy_communications', [4]],
    ['professional_development', []],
    ['social_inclusion', [4, 7]],
    ['product_design', [2, 5]],
    ['epr_compliance', [5]],
    ['operational_efficiency', [3]],
  ] as const)('%s -> courses %j', (application, expected) => {
    expect(main({ ...BASE, application: [application] })).toEqual([...expected]);
  });

  it('combines two selections', () => {
    expect(main({ ...BASE, application: ['product_design', 'research_data_technology'] })).toEqual([
      2, 5, 6,
    ]);
  });
});

describe('Q3 CHALLENGES and Q4 INTEREST -> Additional Recommended Courses', () => {
  it.each([
    ['scale_sources_impacts', []],
    ['circular_economy', [2]],
    ['collection_recycling', [3]],
    ['community_informal_sector', [4]],
    ['policy_advocacy', [5]],
    ['data_technology_monitoring', [6]],
    ['governance_inclusion', [7]],
  ] as const)('Q3 %s -> courses %j', (challenge, expected) => {
    expect(additional({ ...BASE, challenges: [challenge] })).toEqual([...expected]);
  });

  it.each([
    ['scope_of_plastic_waste', []],
    ['circular_economy', [2]],
    ['practical_waste_reduction', [3]],
    ['community_behaviour_change', [4]],
    ['policy_incentives_business', [5]],
    ['data_technology', [6]],
    ['governance_coordination', [7]],
  ] as const)('Q4 %s -> courses %j', (interest, expected) => {
    expect(additional({ ...BASE, interests: [interest] })).toEqual([...expected]);
  });

  it('never writes into the Main Learning Path', () => {
    expect(
      main({
        ...BASE,
        challenges: ['circular_economy', 'governance_inclusion'],
        interests: ['data_technology'],
      }),
    ).toEqual([]);
  });
});

describe('Q5 EXPERIENCE places Course 1', () => {
  it.each([
    ['beginner', [1], []],
    ['introductory', [1], []],
    ['intermediate', [], [1]],
    ['advanced', [], []],
    ['expert', [], []],
  ] as const)('%s -> main %j, additional %j', (experience, expectedMain, expectedAdditional) => {
    const answers: Answers = { audience: 'other', otherRoleText: 'x', experience };
    expect(main(answers)).toEqual([...expectedMain]);
    expect(additional(answers)).toEqual([...expectedAdditional]);
  });

  it('is the only question that can add Course 1', () => {
    // Every Q2/Q3/Q4 option selected in turn must never introduce Course 1
    // while Q5 says Advanced.
    const result = evaluate({
      ...BASE,
      application: ['social_inclusion', 'product_design'],
      challenges: ['scale_sources_impacts', 'circular_economy'],
      interests: ['scope_of_plastic_waste', 'data_technology'],
    });
    const all = [...result.mainLearningPath, ...result.additionalRecommendedCourses];
    expect(all.map((c) => c.courseNumber)).not.toContain(1);
  });
});

describe('Q6 PREVIOUS TRAINING labels but never adds', () => {
  it('labels a course that is already recommended', () => {
    const result = evaluate({
      audience: 'private_sector', // main 2, 5
      experience: 'advanced',
      priorTraining: ['policy_epr'], // -> Course 5
    });
    expect(result.mainLearningPath.map((c) => [c.courseNumber, c.isRefresher])).toEqual([
      [2, false],
      [5, true],
    ]);
  });

  it('labels courses in the Additional list too', () => {
    const result = evaluate({
      ...BASE,
      challenges: ['data_technology_monitoring'], // -> Course 6 (additional)
      priorTraining: ['data_monitoring'], // -> Course 6
    });
    expect(result.additionalRecommendedCourses[0]).toMatchObject({
      courseNumber: 6,
      isRefresher: true,
    });
  });

  it('has no effect when the matching course is not recommended', () => {
    const withTraining = evaluate({
      audience: 'educator_youth', // main 4 only
      experience: 'advanced',
      priorTraining: ['data_monitoring', 'governance_advocacy'], // Courses 6, 7
    });
    expect(withTraining.mainLearningPath.map((c) => c.courseNumber)).toEqual([4]);
    expect(withTraining.additionalRecommendedCourses).toEqual([]);
  });

  it('"none" is a no-op', () => {
    const result = evaluate({
      audience: 'private_sector',
      experience: 'advanced',
      priorTraining: ['none'],
    });
    expect(result.mainLearningPath.every((c) => !c.isRefresher)).toBe(true);
  });

  it('treats an academic qualification as a Course 1 refresher', () => {
    const result = evaluate({
      audience: 'other',
      otherRoleText: 'Researcher',
      experience: 'beginner', // Course 1 -> main
      priorTraining: ['academic_qualification'],
    });
    expect(result.mainLearningPath).toEqual([
      expect.objectContaining({ courseNumber: 1, isRefresher: true }),
    ]);
  });
});

describe('de-duplication across the two lists', () => {
  it('keeps a duplicated course in the Main path only', () => {
    const result = evaluate({
      audience: 'national_government', // main 2, 5, 7
      experience: 'advanced',
      challenges: ['circular_economy'], // would add 2 to additional
      interests: ['governance_coordination'], // would add 7 to additional
    });
    expect(result.mainLearningPath.map((c) => c.courseNumber)).toEqual([2, 5, 7]);
    expect(result.additionalRecommendedCourses).toEqual([]);
  });

  it('shows a course once even when several answers point at it', () => {
    const result = evaluate({
      audience: 'ngo_cso', // course 4
      application: ['engage_communities', 'social_inclusion'], // course 4 again, twice
      challenges: ['community_informal_sector'], // and again
      interests: ['community_behaviour_change'], // and again
      experience: 'advanced',
    });
    const fours = [...result.mainLearningPath, ...result.additionalRecommendedCourses].filter(
      (c) => c.courseNumber === 4,
    );
    expect(fours).toHaveLength(1);
  });

  it('honours duplicatePrecedence: "additional"', () => {
    const result = evaluate(
      {
        audience: 'national_government',
        experience: 'advanced',
        challenges: ['circular_economy'],
      },
      { duplicatePrecedence: 'additional' },
    );
    expect(result.mainLearningPath.map((c) => c.courseNumber)).toEqual([5, 7]);
    expect(result.additionalRecommendedCourses.map((c) => c.courseNumber)).toEqual([2]);
  });
});

describe('worked examples from the document', () => {
  // p5 of the pdf shows a sample result:
  //   Main: Course 2, Course 5 (refresher), Course 7
  //   Additional: Course 4, Course 6 (refresher)
  it('reproduces the page 5 sample result', () => {
    const result = evaluate({
      audience: 'national_government', // main 2, 5, 7
      experience: 'advanced', // no Course 1
      challenges: ['community_informal_sector', 'data_technology_monitoring'], // additional 4, 6
      priorTraining: ['policy_epr', 'data_monitoring'], // refresher on 5 and 6
    });

    expect(result.mainLearningPath.map((c) => [c.courseNumber, c.isRefresher])).toEqual([
      [2, false],
      [5, true],
      [7, false],
    ]);
    expect(result.additionalRecommendedCourses.map((c) => [c.courseNumber, c.isRefresher])).toEqual(
      [
        [4, false],
        [6, true],
      ],
    );
  });

  // p7 says: "a Private Sector professional (Q1 -> Course 2) who selects
  // 'Design, plan, or implement waste management programmes or projects'
  // (Q2 -> Course 3) receives a Main Learning Path of Courses 2 and 3".
  //
  // That's wrong. The Q1 table on p6 gives Private Sector Courses 2 AND 5, so
  // the answer is 2, 3, 5. We follow the tables.
  it('corrects the stale page 7 worked example to Courses 2, 3, 5', () => {
    expect(
      main({
        audience: 'private_sector',
        application: ['design_implement_programmes'],
        experience: 'advanced',
      }),
    ).toEqual([2, 3, 5]);
  });
});

describe('conflict 1 - Q2 "deliver_training" (client chose the full-set reading)', () => {
  it('grants Courses 1-7 plus ToT materials by default', () => {
    const result = evaluate({ ...BASE, application: ['deliver_training'] });
    expect(result.mainLearningPath.map((c) => c.courseNumber)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(result.supplementaryResources.map((r) => r.key)).toEqual([
      'tot_facilitation_materials',
    ]);
  });

  it('gives the same result as picking ToT in Q1', () => {
    const viaQ2 = evaluate({ ...BASE, application: ['deliver_training'] });
    const viaQ1 = evaluate({ audience: 'tot_partner', experience: 'advanced' });
    expect(viaQ2.enroll.courseNumbers).toEqual(viaQ1.enroll.courseNumbers);
    expect(viaQ2.supplementaryResources.map((r) => r.key)).toEqual(
      viaQ1.supplementaryResources.map((r) => r.key),
    );
  });

  it('does not double up when both Q1 and Q2 say trainer', () => {
    const result = evaluate({
      audience: 'tot_partner',
      application: ['deliver_training'],
      experience: 'advanced',
    });
    expect(result.mainLearningPath.map((c) => c.courseNumber)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(result.supplementaryResources).toHaveLength(1);
    expect(result.notices.filter((n) => n.code === 'TOT_MATERIALS_INCLUDED')).toHaveLength(1);
  });

  it('still adds nothing if the page 6 reading is switched back on', () => {
    const result = evaluate(
      { ...BASE, application: ['deliver_training'] },
      { deliverTrainingGrantsFullSet: false },
    );
    expect(result.mainLearningPath).toEqual([]);
    expect(result.supplementaryResources).toEqual([]);
  });
});

describe('ToT facilitation materials', () => {
  it('comes back as downloads, not a course', () => {
    const result = evaluate({ audience: 'tot_partner', experience: 'advanced' });
    expect(result.supplementaryResources).toEqual([
      {
        key: 'tot_facilitation_materials',
        title: 'Trainer-of-Trainers Facilitation Materials',
        description: expect.any(String),
        assets: [],
      },
    ]);
    // never mixed in with the courses
    expect(result.enroll.courseIds).toHaveLength(7);
    expect(result.enroll.courseNumbers).toHaveLength(7);
  });

  it('carries whatever files you give it', () => {
    const assets = [
      { type: 'pdf' as const, title: 'Facilitator handbook', url: '/files/handbook.pdf' },
      { type: 'video' as const, title: 'Running a session', url: '/files/session.mp4' },
      { type: 'manual' as const, title: 'Workshop manual', url: '/files/manual.pdf' },
    ];
    const result = evaluate(
      { audience: 'tot_partner', experience: 'advanced' },
      {
        totMaterials: {
          title: 'ToT Pack',
          description: 'Facilitator handbook, manuals and short videos',
          assets,
        },
      },
    );
    expect(result.supplementaryResources[0]).toMatchObject({ title: 'ToT Pack', assets });
  });

  it('is absent for everyone else', () => {
    const result = evaluate({ audience: 'private_sector', experience: 'beginner' });
    expect(result.supplementaryResources).toEqual([]);
  });
});

describe('conflict 4 - Course 1 placement for ToT partners', () => {
  it('keeps Course 1 in the Main path regardless of Q5 (default)', () => {
    expect(main({ audience: 'tot_partner', experience: 'expert' })).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(main({ audience: 'tot_partner', experience: 'intermediate' })).toEqual([
      1, 2, 3, 4, 5, 6, 7,
    ]);
  });

  it('lets Q5 override when totOverridesCourse1Placement is off', () => {
    const cfg = { totOverridesCourse1Placement: false };
    expect(main({ audience: 'tot_partner', experience: 'expert' }, cfg)).toEqual([
      2, 3, 4, 5, 6, 7,
    ]);
    expect(main({ audience: 'tot_partner', experience: 'intermediate' }, cfg)).toEqual([
      2, 3, 4, 5, 6, 7,
    ]);
    expect(additional({ audience: 'tot_partner', experience: 'intermediate' }, cfg)).toEqual([1]);
    // beginner still keeps it in main
    expect(main({ audience: 'tot_partner', experience: 'beginner' }, cfg)).toEqual([
      1, 2, 3, 4, 5, 6, 7,
    ]);
  });
});

describe('enrollment list', () => {
  it('is main first, then additional, de-duplicated', () => {
    const result = evaluate(
      {
        audience: 'sub_national_government', // main 3, 6, 7
        experience: 'intermediate', // Course 1 -> additional
        interests: ['circular_economy'], // additional 2
      }
    );

    expect(result.mainLearningPath.map((c) => c.courseNumber)).toEqual([3, 6, 7]);
    expect(result.additionalRecommendedCourses.map((c) => c.courseNumber)).toEqual([1, 2]);

    expect(result.enroll.courseIds).toEqual([id(3), id(6), id(7), id(1), id(2)]);
    expect(new Set(result.enroll.courseIds).size).toBe(result.enroll.courseIds.length);
    expect(result.enroll.slugs).toEqual([slug(3), slug(6), slug(7), slug(1), slug(2)]);
  });

  it('includes refresher-labelled courses by default', () => {
    const result = evaluate({ audience: 'private_sector', experience: 'advanced', priorTraining: ['policy_epr'] });
    expect(result.enroll.courseIds).toHaveLength(2);
    expect(result.notices.map((n) => n.code)).not.toContain('REFRESHERS_EXCLUDED_FROM_ENROLLMENT');
  });

  it('can hold refreshers back when configured', () => {
    const result = evaluate(
      { audience: 'private_sector', experience: 'advanced', priorTraining: ['policy_epr'] },
      { excludeRefreshersFromEnrollment: true },
    );
    expect(result.enroll.courseIds).toEqual([id(2)]);
    expect(result.notices.map((n) => n.code)).toContain('REFRESHERS_EXCLUDED_FROM_ENROLLMENT');
    // The course is still shown in the path, just not auto-enrolled.
    expect(result.mainLearningPath.map((c) => c.courseNumber)).toEqual([2, 5]);
  });
});

describe('every recommended course carries its real identity', () => {
  it('fills in id, slug and title straight out of the box', () => {
    const result = evaluate({ audience: 'private_sector', experience: 'advanced' });

    expect(result.mainLearningPath).toEqual([
      { ...DEFAULT_CATALOG[2], isRefresher: false },
      { ...DEFAULT_CATALOG[5], isRefresher: false },
    ]);
    expect(result.enroll.courseNumbers).toEqual([2, 5]);
    expect(result.enroll.courseIds).toEqual([id(2), id(5)]);
    expect(result.enroll.slugs).toEqual([slug(2), slug(5)]);
  });

  it('keeps the three enroll lists lined up index for index', () => {
    const result = evaluate({
      audience: 'sub_national_government',
      experience: 'intermediate',
    });
    const { courseNumbers, courseIds, slugs } = result.enroll;
    expect(courseIds).toHaveLength(courseNumbers.length);
    expect(slugs).toHaveLength(courseNumbers.length);
    courseNumbers.forEach((n, i) => {
      expect(courseIds[i]).toBe(id(n));
      expect(slugs[i]).toBe(slug(n));
    });
  });
});

describe('empty recommendations', () => {
  const EMPTY: Answers = {
    audience: 'other',
    otherRoleText: 'Curious member of the public',
    application: ['professional_development'],
    challenges: ['scale_sources_impacts'],
    interests: ['scope_of_plastic_waste'],
    experience: 'expert',
  };

  it('returns empty lists with a notice by default', () => {
    const result = evaluate(EMPTY);
    expect(result.mainLearningPath).toEqual([]);
    expect(result.additionalRecommendedCourses).toEqual([]);
    expect(result.enroll.courseIds).toEqual([]);
    expect(result.notices.map((n) => n.code)).toContain('EMPTY_RECOMMENDATION');
  });

  it('can fall back to Course 1 when configured', () => {
    const result = evaluate(EMPTY, { fallbackToCourse1WhenEmpty: true });
    expect(result.additionalRecommendedCourses.map((c) => c.courseNumber)).toEqual([1]);
    expect(result.notices.map((n) => n.code)).not.toContain('EMPTY_RECOMMENDATION');
  });
});

describe('validation', () => {
  it('rejects more than two Q2 selections', () => {
    const result = safeEvaluate({
      ...BASE,
      application: ['policy_decision_making', 'engage_communities', 'product_design'],
    });
    expect(result.ok).toBe(false);
    expect(result.issues.map((i) => i.code)).toContain('TOO_MANY_SELECTIONS');
  });

  it('rejects unknown option ids', () => {
    const result = safeEvaluate({
      ...BASE,
      challenges: ['not_a_real_option'],
    } as unknown as Answers);
    expect(result.ok).toBe(false);
    expect(result.issues[0]?.code).toBe('UNKNOWN_OPTION');
  });

  it('requires Q1 and Q5', () => {
    const result = safeEvaluate({} as unknown as Answers);
    expect(result.ok).toBe(false);
    expect(result.issues.filter((i) => i.code === 'REQUIRED').map((i) => i.questionId)).toEqual([
      'audience',
      'experience',
    ]);
  });

  it('requires free text when Q1 is "other"', () => {
    const result = safeEvaluate({ audience: 'other', experience: 'beginner' });
    expect(result.ok).toBe(false);
    expect(result.issues[0]?.code).toBe('MISSING_OTHER_TEXT');
  });

  it('rejects "no prior training" combined with other Q6 selections', () => {
    const result = safeEvaluate({ ...BASE, priorTraining: ['none', 'waste_3rs'] });
    expect(result.ok).toBe(false);
    expect(result.issues.map((i) => i.code)).toContain('EXCLUSIVE_OPTION_CONFLICT');
  });

  it('rejects duplicate selections', () => {
    const result = safeEvaluate({ ...BASE, interests: ['data_technology', 'data_technology'] });
    expect(result.ok).toBe(false);
    expect(result.issues.map((i) => i.code)).toContain('DUPLICATE_SELECTION');
  });

  it('rejects a non-array multi-select', () => {
    const result = safeEvaluate({ ...BASE, interests: 'data_technology' } as unknown as Answers);
    expect(result.ok).toBe(false);
    expect(result.issues[0]?.code).toBe('NOT_AN_ARRAY');
  });

  it('evaluate() throws AssessmentValidationError with the issues attached', () => {
    expect(() => evaluate({} as unknown as Answers)).toThrow(AssessmentValidationError);
    try {
      evaluate({} as unknown as Answers);
    } catch (error) {
      expect((error as AssessmentValidationError).issues.length).toBeGreaterThan(0);
    }
  });

  it('accepts a minimal valid submission (Q2-Q4, Q6 all optional)', () => {
    const result = safeEvaluate({ audience: 'waste_practitioner', experience: 'beginner' });
    expect(result.ok).toBe(true);
    expect(result.recommendation?.mainLearningPath.map((c) => c.courseNumber)).toEqual([1, 3, 6]);
  });
});

describe('building a catalog for another environment', () => {
  it('overrides an id by course number, leaving everything else alone', () => {
    const catalog = buildCatalog({ byCourseNumber: { 3: { courseId: 'PROD_COURSE_3' } } });
    expect(catalog[3].courseId).toBe('PROD_COURSE_3');
    // slug and title still come from the defaults
    expect(catalog[3].slug).toBe(DEFAULT_CATALOG[3].slug);
    expect(catalog[6]).toEqual(DEFAULT_CATALOG[6]);
  });

  it('overrides by slug too', () => {
    const catalog = buildCatalog({
      bySlug: { [DEFAULT_CATALOG[3].slug]: { courseId: 'BY_SLUG_3' } },
    });
    expect(catalog[3].courseId).toBe('BY_SLUG_3');
  });

  it('rebinds ids and titles from a live GET /v2/course response', () => {
    const catalog = catalogFromApiCourses([
      { _id: 'PROD_1', slug: DEFAULT_CATALOG[1].slug, title: 'Renamed Foundations' },
      { _id: 'PROD_4', slug: DEFAULT_CATALOG[4].slug },
    ]);

    expect(catalog[1].courseId).toBe('PROD_1');
    expect(catalog[1].title).toBe('Renamed Foundations');
    expect(catalog[4].courseId).toBe('PROD_4');
    // no title in the response, so it keeps the default
    expect(catalog[4].title).toBe(DEFAULT_CATALOG[4].title);
    // absent from the response entirely -> untouched
    expect(catalog[2]).toEqual(DEFAULT_CATALOG[2]);
  });

  it('ignores courses in the response that arent one of the seven', () => {
    const catalog = catalogFromApiCourses([
      { _id: 'X', slug: 'some-unrelated-course', title: 'Unrelated' },
    ]);
    expect(catalog).toEqual(DEFAULT_CATALOG);
  });

  it('survives an empty or failed response', () => {
    expect(catalogFromApiCourses([])).toEqual(DEFAULT_CATALOG);
    expect(buildCatalog({})).toEqual(DEFAULT_CATALOG);
  });
});

describe('output shape', () => {
  it('is JSON-serialisable and has exactly the five top-level keys', () => {
    const result = evaluate({
      audience: 'ngo_cso',
      application: ['social_inclusion'],
      challenges: ['community_informal_sector'],
      interests: ['data_technology'],
      experience: 'intermediate',
      priorTraining: ['governance_advocacy'],
    });

    const roundTripped = JSON.parse(JSON.stringify(result));
    expect(roundTripped).toEqual(result);
    expect(Object.keys(result)).toEqual([
      'mainLearningPath',
      'additionalRecommendedCourses',
      'supplementaryResources',
      'enroll',
      'notices',
    ]);
    expect(Object.keys(result.enroll)).toEqual(['courseNumbers', 'courseIds', 'slugs']);
  });

  it('gives each course exactly the fields the ui needs, nothing else', () => {
    const result = evaluate({ audience: 'private_sector', experience: 'beginner' });
    for (const course of result.mainLearningPath) {
      expect(Object.keys(course)).toEqual([
        'courseNumber',
        'courseId',
        'slug',
        'title',
        'isRefresher',
      ]);
      expect(course.courseId).toMatch(/^[a-f0-9]{24}$/);
      expect(course.slug.length).toBeGreaterThan(0);
      expect(course.title.length).toBeGreaterThan(0);
    }
  });

  it('gives the ToT resource exactly four fields', () => {
    const result = evaluate({ audience: 'tot_partner', experience: 'advanced' });
    expect(Object.keys(result.supplementaryResources[0]!)).toEqual([
      'key',
      'title',
      'description',
      'assets',
    ]);
  });
});

describe('notices are tagged for who should see them', () => {
  it('keeps the refresher-exclusion note internal', () => {
    const result = evaluate(
      { audience: 'private_sector', experience: 'advanced', priorTraining: ['policy_epr'] },
      { excludeRefreshersFromEnrollment: true },
    );
    const notice = result.notices.find(
      (n) => n.code === 'REFRESHERS_EXCLUDED_FROM_ENROLLMENT',
    );
    expect(notice?.audience).toBe('internal');
  });

  it('shows the ToT materials note to the learner', () => {
    const result = evaluate({ audience: 'tot_partner', experience: 'advanced' });
    const notice = result.notices.find((n) => n.code === 'TOT_MATERIALS_INCLUDED');
    expect(notice?.audience).toBe('learner');
    // written for the learner, not lifted from our internal notes
    expect(notice?.message).not.toMatch(/catalogue course|admin|review this|submission/i);
    expect(notice?.message).toMatch(/your path/i);
  });

  it('every notice declares an audience', () => {
    const result = evaluate(
      { ...BASE, priorTraining: ['policy_epr'] },
      { excludeRefreshersFromEnrollment: true },
    );
    for (const notice of result.notices) {
      expect(['learner', 'internal']).toContain(notice.audience);
    }
  });
});

describe('pendingEnrollments', () => {
  const result = evaluate(
    {
      audience: 'sub_national_government', // main 3, 6, 7
      experience: 'intermediate', // additional 1
    }
  );

  it('drops courses the learner already has', () => {
    const pending = pendingEnrollments(result, [id(3)]);
    expect(pending.courseIds).toEqual([id(6), id(7), id(1)]);
    expect(pending.slugs).toEqual([slug(6), slug(7), slug(1)]);
  });

  it('returns everything when they have nothing yet', () => {
    expect(pendingEnrollments(result, []).courseIds).toEqual(result.enroll.courseIds);
  });

  it('returns nothing on a retake with the same answers', () => {
    expect(pendingEnrollments(result, result.enroll.courseIds).courseIds).toEqual([]);
  });

  it('ignores enrolled courses that arent in the recommendation', () => {
    const pending = pendingEnrollments(result, ['some-other-course-id']);
    expect(pending.courseIds).toEqual(result.enroll.courseIds);
  });
});
