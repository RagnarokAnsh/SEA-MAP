export type CourseNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface CourseRef {
  courseNumber: CourseNumber;
  courseId: string;
  slug: string;
  title: string;
}

export type CourseCatalog = Record<CourseNumber, CourseRef>;

export type ResourceKey = 'waste_picker_toolkit' | 'tot_manual';

export type ResourceAssetType = 'pdf' | 'video' | 'manual' | 'link';

export interface ResourceAsset {
  type: ResourceAssetType;
  title: string;
  url: string;
}

export interface ResourceRef {
  key: ResourceKey;
  title: string;
  description: string;
  assets: ResourceAsset[];
}

export type ResourceCatalog = Record<ResourceKey, ResourceRef>;

export type AudienceId =
  | 'national_government'
  | 'sub_national_government'
  | 'waste_practitioner'
  | 'community_informal_sector'
  | 'ngo_cso'
  | 'private_sector'
  | 'educator_youth'
  | 'researcher_academic'
  | 'other';

export type ApplicationId =
  | 'interpret_plastic_types'
  | 'assess_sources_impacts'
  | 'identify_circular_opportunities'
  | 'integrate_circular_principles'
  | 'improve_collection_systems'
  | 'hard_to_recycle_approaches'
  | 'design_behaviour_change'
  | 'engage_informal_sector'
  | 'design_policy_instruments'
  | 'apply_business_tools'
  | 'choose_recycling_technology'
  | 'select_technical_solutions'
  | 'coordinate_across_institutions'
  | 'integrate_gender_inclusion';

export type TrainingApplicationId = 'deliver_training';

export type ChallengeId =
  | 'understand_plastic_types'
  | 'apply_circular_economy'
  | 'operate_waste_systems'
  | 'community_participation'
  | 'policy_market_instruments'
  | 'technology_uncertainty'
  | 'coordination_governance';

export type ExperienceId = 'new_to_field' | 'some_experience' | 'experienced';

export type ConfidenceId =
  | 'none'
  | 'plastic_materials'
  | 'circular_economy'
  | 'waste_3rs'
  | 'community_engagement'
  | 'policy_business_instruments'
  | 'technology_solutions'
  | 'governance_inclusion';

export type QuestionId =
  | 'audience'
  | 'application'
  | 'challenge'
  | 'experience'
  | 'confidence';

export interface QuestionOption {
  id: string;
  label: string;
  hint?: string;
  requiresText?: boolean;
  exclusive?: boolean;
  outsideSelectionLimit?: boolean;
}

export interface Question {
  id: QuestionId;
  number: number;
  key: string;
  title: string;
  instruction: string;
  type: 'single' | 'multi';
  maxSelections: number | null;
  required: boolean;
  options: QuestionOption[];
}

export interface Answers {
  audience: AudienceId;
  otherRoleText?: string;
  application?: ApplicationId[];
  deliverTraining?: boolean;
  challenge: ChallengeId;
  experience: ExperienceId;
  confidence?: ConfidenceId[];
}

export type CourseCode = 'C1' | 'C2' | 'C3' | 'C4' | 'C5' | 'C6' | 'C7';

export type CoreReason = 'c1_gate' | 'challenge' | 'application';

export type OptionalTag = 'refresher' | 'role' | 'resource';

export type RecommendationFlag = 'challenge_confidence_contradiction';

export interface CorePathEntry {
  course: CourseCode;
  reason: CoreReason;
}

export interface OptionalEntry {
  item: string;
  tag: OptionalTag;
}

export interface Recommendation {
  core_path: CorePathEntry[];
  optional_resources: OptionalEntry[];
  flags: RecommendationFlag[];
  enroll: {
    courseNumbers: CourseNumber[];
    courseIds: string[];
    slugs: string[];
  };
}

export interface EngineConfig {
  catalog: CourseCatalog;
  resources: ResourceCatalog;
}

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
