import type {
  ApplicationId,
  AudienceId,
  ChallengeId,
  ConfidenceId,
  CourseNumber,
  ExperienceId,
  ResourceKey,
} from './types.js';

export interface AudienceRule {
  primary: CourseNumber | null;
  secondary: CourseNumber | null;
  resource: ResourceKey | null;
}

export interface ApplicationRule {
  course: CourseNumber;
  resource?: ResourceKey;
}

export interface ChallengeRule {
  course: CourseNumber;
  resource?: ResourceKey;
}

export const AUDIENCE_RULES: Record<AudienceId, AudienceRule> = {
  national_government: { primary: 7, secondary: 5, resource: null },
  sub_national_government: { primary: 3, secondary: 7, resource: null },
  waste_practitioner: { primary: 3, secondary: 6, resource: null },
  community_informal_sector: { primary: 4, secondary: null, resource: 'waste_picker_toolkit' },
  ngo_cso: { primary: 4, secondary: 7, resource: null },
  private_sector: { primary: 5, secondary: 2, resource: null },
  educator_youth: { primary: 4, secondary: null, resource: null },
  researcher_academic: { primary: null, secondary: 6, resource: null },
  other: { primary: null, secondary: null, resource: null },
};

export const APPLICATION_RULES: Record<ApplicationId, ApplicationRule> = {
  interpret_plastic_types: { course: 1 },
  assess_sources_impacts: { course: 1 },
  identify_circular_opportunities: { course: 2 },
  integrate_circular_principles: { course: 2 },
  improve_collection_systems: { course: 3 },
  hard_to_recycle_approaches: { course: 3 },
  design_behaviour_change: { course: 4 },
  engage_informal_sector: { course: 4, resource: 'waste_picker_toolkit' },
  design_policy_instruments: { course: 5 },
  apply_business_tools: { course: 5 },
  choose_recycling_technology: { course: 6 },
  select_technical_solutions: { course: 6 },
  coordinate_across_institutions: { course: 7 },
  integrate_gender_inclusion: { course: 7 },
};

export const TRAINING_APPLICATION_RESOURCE: ResourceKey = 'tot_manual';

export const CHALLENGE_RULES: Record<ChallengeId, ChallengeRule> = {
  understand_plastic_types: { course: 1 },
  apply_circular_economy: { course: 2 },
  operate_waste_systems: { course: 3 },
  community_participation: { course: 4, resource: 'waste_picker_toolkit' },
  policy_market_instruments: { course: 5 },
  technology_uncertainty: { course: 6 },
  coordination_governance: { course: 7 },
};

export const EXPERIENCE_RULES: Record<ExperienceId, CourseNumber | null> = {
  new_to_field: 1,
  some_experience: null,
  experienced: null,
};

export const CONFIDENCE_RULES: Record<ConfidenceId, CourseNumber | null> = {
  none: null,
  plastic_materials: 1,
  circular_economy: 2,
  waste_3rs: 3,
  community_engagement: 4,
  policy_business_instruments: 5,
  technology_solutions: 6,
  governance_inclusion: 7,
};

export const FOUNDATION_COURSE: CourseNumber = 1;

export const MAX_CORE_PATH_LENGTH = 4;

export const OPTIONAL_TAG_PRECEDENCE = ['refresher', 'role', 'resource'] as const;
