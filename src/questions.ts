import type { Question } from './types.js';

export const QUESTIONS: readonly Question[] = Object.freeze([
  {
    id: 'audience',
    number: 1,
    key: 'AUDIENCE',
    title: 'What best describes your main professional role or stakeholder category?',
    instruction:
      'Select one — if the role spans more than one category, select the primary implementation responsibility.',
    type: 'single',
    maxSelections: 1,
    required: true,
    options: [
      {
        id: 'national_government',
        label: 'National government official',
        hint: 'Policymaker, planner or regulator.',
      },
      {
        id: 'sub_national_government',
        label: 'Sub-national or local government official',
        hint: 'Planning, service delivery or coordination.',
      },
      {
        id: 'waste_practitioner',
        label: 'Waste management practitioner or technical officer',
        hint: 'Operations, monitoring or field implementation.',
      },
      {
        id: 'community_informal_sector',
        label:
          'Community-based organization, waste picker organization or informal-sector representative',
      },
      { id: 'ngo_cso', label: 'NGO or civil society professional' },
      {
        id: 'private_sector',
        label: 'Private-sector professional',
        hint: 'Business, industry or SME.',
      },
      {
        id: 'educator_youth',
        label: 'School educator, youth organization or awareness facilitator',
      },
      { id: 'researcher_academic', label: 'Researcher, academic or technical expert' },
      { id: 'other', label: 'Other (please specify)', requiresText: true },
    ],
  },
  {
    id: 'application',
    number: 2,
    key: 'INTENDED APPLICATION',
    title:
      'How do you intend to apply the knowledge and skills gained from this training?',
    instruction:
      'Select up to two professional applications. You may also select the training/facilitation option below if relevant — this doesn’t count toward the two-selection limit.',
    type: 'multi',
    maxSelections: 2,
    required: false,
    options: [
      {
        id: 'interpret_plastic_types',
        label:
          'Interpret plastic types, material properties and their implications for waste management, recycling, health or the environment',
      },
      {
        id: 'assess_sources_impacts',
        label:
          'Assess the main sources, pathways and impacts of plastic waste to inform priorities or decisions',
      },
      {
        id: 'identify_circular_opportunities',
        label:
          'Identify opportunities to prevent waste and keep materials in use through circular approaches',
      },
      {
        id: 'integrate_circular_principles',
        label:
          'Integrate circular economy principles into strategies, programmes, operations or organizational practices',
      },
      {
        id: 'improve_collection_systems',
        label: 'Plan or improve segregation, collection, sorting and recycling systems',
      },
      {
        id: 'hard_to_recycle_approaches',
        label: 'Identify practical approaches for hard-to-recycle plastic waste',
      },
      {
        id: 'design_behaviour_change',
        label:
          'Design communication, awareness and/or behaviour-change approaches that influence waste-related practices',
      },
      {
        id: 'engage_informal_sector',
        label:
          'Engage communities, waste pickers or informal-sector actors effectively in planning or implementation',
      },
      {
        id: 'design_policy_instruments',
        label:
          'Design, implement or assess EPR schemes, incentives or other policy/economic instruments',
      },
      {
        id: 'apply_business_tools',
        label:
          'Use procurement, lifecycle assessment, financing or business tools to support more sustainable decisions',
      },
      {
        id: 'choose_recycling_technology',
        label: 'Decide between appropriate recycling technologies',
      },
      {
        id: 'select_technical_solutions',
        label:
          'Assess or select appropriate technologies, digital tools or technical solutions for waste management',
      },
      {
        id: 'coordinate_across_institutions',
        label:
          'Coordinate implementation across institutions, levels of government, sectors or stakeholder groups',
      },
      {
        id: 'integrate_gender_inclusion',
        label:
          'Integrate gender equality, social inclusion and meaningful participation into waste policies or programmes',
      },
      {
        id: 'deliver_training',
        label:
          'Design or deliver training or capacity-building for others using the knowledge and materials from the RTP',
        outsideSelectionLimit: true,
      },
    ],
  },
  {
    id: 'challenge',
    number: 3,
    key: 'CHALLENGES',
    title: 'In which areas do you currently face the greatest difficulties in your work?',
    instruction: 'Select one.',
    type: 'single',
    maxSelections: 1,
    required: true,
    options: [
      {
        id: 'understand_plastic_types',
        label:
          'I need a clearer understanding of the types of plastics, where they come from, or their environmental and health implications',
      },
      {
        id: 'apply_circular_economy',
        label:
          'It is difficult to translate circular economy principles into practical actions or operating approaches',
      },
      {
        id: 'operate_waste_systems',
        label:
          'Waste prevention, segregation, collection, sorting or recycling systems are difficult to improve or operate effectively',
      },
      {
        id: 'community_participation',
        label:
          'Community participation, behaviour change, or meaningful integration of waste pickers and informal-sector actors is difficult to achieve',
      },
      {
        id: 'policy_market_instruments',
        label:
          'Policy or market instruments such as EPR, incentives, procurement or private-sector mechanisms are difficult to design, implement or apply effectively',
      },
      {
        id: 'technology_uncertainty',
        label: 'Uncertainty about appropriate technologies makes decision-making difficult',
      },
      {
        id: 'coordination_governance',
        label:
          'Fragmented responsibilities, weak coordination, or difficulties ensuring inclusive and gender-responsive implementation affect progress',
      },
    ],
  },
  {
    id: 'experience',
    number: 4,
    key: 'EXPERIENCE',
    title:
      'How would you describe your current level of knowledge or experience in plastic waste management or related fields?',
    instruction: 'Select one.',
    type: 'single',
    maxSelections: 1,
    required: true,
    options: [
      { id: 'new_to_field', label: 'New to the field' },
      { id: 'some_experience', label: 'Some experience' },
      { id: 'experienced', label: 'Experienced' },
    ],
  },
  {
    id: 'confidence',
    number: 5,
    key: 'PRIOR COMPETENCE',
    title:
      'In which of the following areas do you already feel confident applying your knowledge and skills, based on prior training or experience?',
    instruction: 'Select all that apply.',
    type: 'multi',
    maxSelections: null,
    required: false,
    options: [
      { id: 'none', label: 'None of these areas', exclusive: true },
      {
        id: 'plastic_materials',
        label: 'Plastic materials, plastic pollution, sources and impacts',
      },
      {
        id: 'circular_economy',
        label: 'Circular economy or sustainable production and consumption',
      },
      {
        id: 'waste_3rs',
        label: 'Waste prevention, segregation, collection, sorting, recycling or 3Rs',
      },
      {
        id: 'community_engagement',
        label: 'Community engagement, behaviour change or informal-sector integration',
      },
      {
        id: 'policy_business_instruments',
        label:
          'EPR, GPP, LCA, environmental regulation or related policy/business instruments',
      },
      {
        id: 'technology_solutions',
        label:
          'Recycling technologies, digital tools or other technical solutions for waste management',
      },
      {
        id: 'governance_inclusion',
        label:
          'Governance, institutional coordination, participation, inclusion or gender-responsive implementation',
      },
    ],
  },
] as const satisfies readonly Question[]);

export const RESULT_COPY = Object.freeze({
  title: 'Your recommended courses',
  intro: {
    single:
      'Based on your answers, this is your recommended course. It isn’t mandatory, and you’re welcome to explore anything else in the catalogue whenever it’s useful.',
    multiple:
      'Based on your answers, here’s your suggested path. The order reflects what tends to work well for your situation — you’re welcome to take these in any order, or just focus on what matters most right now.',
  },
  coreLabels: {
    anchor: 'Main recommendation',
    additional: 'Also recommended',
  },
  coreRationale: {
    c1_gate: 'A good starting point, based on your experience level.',
    challenge: 'Matches the challenge you told us you’re facing.',
    application: 'Matches how you plan to use the training.',
    challengeWithConfidence:
      'This matches the challenge you told us you’re facing. You’ve told us you’re already confident in this area too — it’s still worth taking if the difficulty persists.',
  },
  optional: {
    heading: 'Also worth exploring',
    subheading:
      'These aren’t part of your core recommendation, but may still be useful given your role or background.',
  },
  optionalTagLabels: {
    refresher: 'Optional refresher',
    role: 'Relevant to your role',
    resource: 'Resource',
  },
  optionalRationale: {
    refresher:
      'You told us you’re already confident here — revisit only if it’d be useful.',
    role: 'Colleagues in similar roles often find this useful, though it wasn’t flagged by your answers.',
    waste_picker_toolkit:
      'A practical companion resource related to the challenge or application you selected.',
    tot_manual:
      'You indicated interest in delivering training to others — this manual supports that.',
  },
  footer:
    'This path is a recommendation, not a requirement — every course in the catalogue remains open to you regardless of your answers.',
});

export function getQuestion(id: Question['id']): Question {
  const question = QUESTIONS.find((q) => q.id === id);
  if (!question) throw new Error(`Unknown question id: ${id}`);
  return question;
}
