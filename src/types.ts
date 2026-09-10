// Types for the self assessment engine.
// Rules come from "Learner's Self-Assessment_simplified 1.pdf".
// Where the pdf contradicts itself there's a flag on EngineConfig at the
// bottom of this file, with the reasoning in config.ts.

export type CourseNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface CourseRef {
  courseNumber: CourseNumber;
  // backend _id. staging value by default, override per environment with
  // catalogFromApiCourses()
  courseId: string;
  slug: string;
  title: string;
}

export type CourseCatalog = Record<CourseNumber, CourseRef>;

// --- answer option ids ---

// Q1, single select
export type AudienceId =
  | 'national_government'
  | 'sub_national_government'
  | 'waste_practitioner'
  | 'ngo_cso'
  | 'private_sector'
  | 'educator_youth'
  | 'tot_partner'
  | 'other';

// Q2, max 2
export type ApplicationId =
  | 'policy_decision_making'
  | 'design_implement_programmes'
  | 'engage_communities'
  | 'internal_sustainability'
  | 'deliver_training'
  | 'research_data_technology'
  | 'advocacy_communications'
  | 'professional_development'
  | 'social_inclusion'
  | 'product_design'
  | 'epr_compliance'
  | 'operational_efficiency';

// Q3, max 2
export type ChallengeId =
  | 'scale_sources_impacts'
  | 'circular_economy'
  | 'collection_recycling'
  | 'community_informal_sector'
  | 'policy_advocacy'
  | 'data_technology_monitoring'
  | 'governance_inclusion';

// Q4, max 2
export type InterestId =
  | 'scope_of_plastic_waste'
  | 'circular_economy'
  | 'practical_waste_reduction'
  | 'community_behaviour_change'
  | 'policy_incentives_business'
  | 'data_technology'
  | 'governance_coordination';

// Q5, single. only question that places course 1
export type ExperienceId =
  | 'beginner'
  | 'introductory'
  | 'intermediate'
  | 'advanced'
  | 'expert';

// Q6, multi. never adds anything, only labels
export type PriorTrainingId =
  | 'none'
  | 'general_environmental'
  | 'circular_economy'
  | 'waste_3rs'
  | 'community_engagement'
  | 'policy_epr'
  | 'data_monitoring'
  | 'governance_advocacy'
  | 'academic_qualification';

export type QuestionId =
  | 'audience'
  | 'application'
  | 'challenges'
  | 'interests'
  | 'experience'
  | 'priorTraining';

// --- question defs (the quiz ui renders off these) ---

export interface QuestionOption {
  id: string;
  label: string;
  // the bit after the dash in the pdf, where there is one
  hint?: string;
  // Q1 "other" - ui has to collect free text
  requiresText?: boolean;
  // Q6 "no prior training" - ticking it clears the rest
  exclusive?: boolean;
}

export interface Question {
  id: QuestionId;
  number: number;
  // short label from the doc, eg "AUDIENCE"
  key: string;
  title: string;
  instruction: string;
  type: 'single' | 'multi';
  // null = no limit
  maxSelections: number | null;
  required: boolean;
  options: QuestionOption[];
}

// --- input ---

export interface Answers {
  audience: AudienceId;
  // required when audience === 'other'
  otherRoleText?: string;
  application?: ApplicationId[];
  challenges?: ChallengeId[];
  interests?: InterestId[];
  experience: ExperienceId;
  priorTraining?: PriorTrainingId[];
}

// --- output ---

export interface RecommendedCourse extends CourseRef {
  // Q6 matched this against training they already did.
  // render as "Take only if a refresher is needed."
  isRefresher: boolean;
}

export type SupplementaryAssetType = 'pdf' | 'video' | 'manual' | 'link';

// A single downloadable thing. Not a course, nobody gets enrolled into it.
export interface SupplementaryAsset {
  type: SupplementaryAssetType;
  title: string;
  url: string;
}

// Stuff thats recommended but isnt a course. Right now only the ToT
// facilitation materials - pdfs, short videos, manuals, that sort of thing.
// They get listed on the results screen for download, not enrolled into.
export interface SupplementaryResource {
  key: 'tot_facilitation_materials';
  title: string;
  description: string;
  // empty until somebody drops the real files in via EngineConfig.totMaterials
  assets: SupplementaryAsset[];
}

export type NoticeCode =
  // learner gets ToT materials on top of the courses
  | 'TOT_MATERIALS_INCLUDED'
  // nothing qualified, show the full catalogue instead
  | 'EMPTY_RECOMMENDATION'
  // refresher courses were kept out of the enrol list
  | 'REFRESHERS_EXCLUDED_FROM_ENROLLMENT';

export interface Notice {
  code: NoticeCode;
  message: string;
  // 'learner' is safe to put on the results screen. 'internal' is for logs and
  // whoever's keeping an eye on submissions - don't render those.
  audience: 'learner' | 'internal';
}

export interface Recommendation {
  // priority path - Q1 + Q2 (+ course 1 from Q5). sorted by course number
  mainLearningPath: RecommendedCourse[];
  // secondary - Q3 + Q4 (+ course 1 from Q5)
  additionalRecommendedCourses: RecommendedCourse[];
  // non-course extras, currently just ToT materials
  supplementaryResources: SupplementaryResource[];
  // What to enrol into. Flat, de-duped, main path first then additional.
  //
  // courseNumbers is always filled in - it's what the pdf actually gives us.
  // courseIds/slugs only have entries for courses you supplied a catalog for.
  enroll: {
    courseNumbers: CourseNumber[];
    courseIds: string[];
    slugs: string[];
  };
  notices: Notice[];
}

// --- config ---

export interface EngineConfig {
  // Q2 "design or deliver training for others".
  // pdf p2 grants courses 1-7 + ToT materials, the p6 table says it grants
  // nothing. Defaults to the p2 reading.
  deliverTrainingGrantsFullSet: boolean;

  // ToT grants courses 1-7 which clashes with p8 ("only Q5 places course 1").
  // true = ToT wins and course 1 stays in main whatever Q5 says
  totOverridesCourse1Placement: boolean;

  // where a course goes when both lists want it
  duplicatePrecedence: 'main' | 'additional';

  // refresher-labelled courses are still enrolled by default.
  // arguably wrong since the label literally means "you can skip this"
  excludeRefreshersFromEnrollment: boolean;

  // some answer combos qualify for nothing at all. default is to return
  // empty + a notice rather than invent a recommendation
  fallbackToCourse1WhenEmpty: boolean;

  // The ToT facilitation materials - pdfs, videos, manuals. Drop the real
  // files into `assets` and they show up on the results screen as downloads.
  totMaterials: {
    title: string;
    description: string;
    assets: SupplementaryAsset[];
  };

  catalog: CourseCatalog;
}

// --- validation ---

export type ValidationCode =
  | 'REQUIRED'
  | 'UNKNOWN_OPTION'
  | 'TOO_MANY_SELECTIONS'
  | 'NOT_AN_ARRAY'
  | 'DUPLICATE_SELECTION'
  | 'MISSING_OTHER_TEXT'
  | 'EXCLUSIVE_OPTION_CONFLICT';

export interface ValidationIssue {
  questionId: QuestionId | 'otherRoleText';
  code: ValidationCode;
  message: string;
}

export type EvaluateResult =
  | { ok: true; recommendation: Recommendation; issues: [] }
  | { ok: false; recommendation: null; issues: ValidationIssue[] };
