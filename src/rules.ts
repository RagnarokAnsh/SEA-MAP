import type {
  ApplicationId,
  AudienceId,
  ChallengeId,
  CourseNumber,
  ExperienceId,
  InterestId,
  PriorTrainingId,
} from './types.js';

// where Q5 puts course 1
export type Course1Placement = 'main' | 'additional' | 'none';

export interface AudienceRule {
  main: CourseNumber[];
  // learner also gets the ToT facilitation materials
  totMaterials?: boolean;
}

export interface ApplicationRule {
  main: CourseNumber[];
  // the disputed one. only applies when deliverTrainingGrantsFullSet is on
  fullSetWhenEnabled?: boolean;
}

// Q1 -> main learning path.
// pdf p1-2 (inline notes) and p6 (summary table) agree on all of these.
export const AUDIENCE_RULES: Record<AudienceId, AudienceRule> = {
  national_government: { main: [2, 5, 7] },
  sub_national_government: { main: [3, 6, 7] },
  waste_practitioner: { main: [3, 6] },
  ngo_cso: { main: [4, 7] },
  private_sector: { main: [2, 5] },
  educator_youth: { main: [4] },
  tot_partner: { main: [1, 2, 3, 4, 5, 6, 7], totMaterials: true },
  // no reviewer exists, so "other" just contributes nothing and the rest of
  // the questions carry the recommendation
  other: { main: [] },
};

// Q2 -> main learning path. pdf p2-3 and p6-7.
export const APPLICATION_RULES: Record<ApplicationId, ApplicationRule> = {
  policy_decision_making: { main: [5] },
  design_implement_programmes: { main: [3] },
  engage_communities: { main: [4] },
  internal_sustainability: { main: [3] },
  // the one real contradiction in the doc. by default this grants the full
  // set, so it behaves the same as picking ToT in Q1 - see config.ts
  deliver_training: { main: [], fullSetWhenEnabled: true },
  research_data_technology: { main: [6] },
  advocacy_communications: { main: [4] },
  // "no additional course: follows the main learning path from Q1 in full"
  professional_development: { main: [] },
  social_inclusion: { main: [4, 7] },
  product_design: { main: [2, 5] },
  epr_compliance: { main: [5] },
  operational_efficiency: { main: [3] },
};

export const DELIVER_TRAINING_FULL_SET: CourseNumber[] = [1, 2, 3, 4, 5, 6, 7];

// Q3 -> additional. pdf p3 and p7-8.
export const CHALLENGE_RULES: Record<ChallengeId, CourseNumber[]> = {
  // "no additional course - this topic is covered by course 1", which Q5 handles
  scale_sources_impacts: [],
  circular_economy: [2],
  collection_recycling: [3],
  community_informal_sector: [4],
  policy_advocacy: [5],
  data_technology_monitoring: [6],
  governance_inclusion: [7],
};

// Q4 -> additional. pdf p3-4 and p8. same shape as Q3, different wording.
export const INTEREST_RULES: Record<InterestId, CourseNumber[]> = {
  scope_of_plastic_waste: [],
  circular_economy: [2],
  practical_waste_reduction: [3],
  community_behaviour_change: [4],
  policy_incentives_business: [5],
  data_technology: [6],
  governance_coordination: [7],
};

// Q5 -> where course 1 goes. pdf p4 and p8-9.
export const EXPERIENCE_RULES: Record<ExperienceId, Course1Placement> = {
  beginner: 'main',
  introductory: 'main',
  intermediate: 'additional',
  advanced: 'none',
  expert: 'none',
};

// Q6 -> refresher label only. never adds a course. pdf p4 and p9.
export const PRIOR_TRAINING_RULES: Record<PriorTrainingId, CourseNumber | null> = {
  none: null,
  general_environmental: 1,
  circular_economy: 2,
  waste_3rs: 3,
  community_engagement: 4,
  policy_epr: 5,
  data_monitoring: 6,
  governance_advocacy: 7,
  // academic background counts as course 1 too
  academic_qualification: 1,
};

// course 1 is special, only Q5 (or the ToT exception) places it
export const FOUNDATION_COURSE: CourseNumber = 1;
