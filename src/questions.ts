import type { Question } from './types.js';

// Q1-Q6 worded the same as the pdf.
// Render the quiz off this so the ui and the rules cant drift apart.
// rules-coverage.test.ts breaks the build if an option here has no rule.
export const QUESTIONS: readonly Question[] = Object.freeze([
  {
    id: 'audience',
    number: 1,
    key: 'AUDIENCE',
    title: 'What best describes your main professional role or stakeholder category?',
    instruction:
      'Select one - if your role spans more than one category, select your primary implementation responsibility.',
    type: 'single',
    maxSelections: 1,
    required: true,
    options: [
      {
        id: 'national_government',
        label: 'National government official',
        hint: 'Policymaker, planner, or regulator (e.g., ministry or agency staff shaping national policy or regulation).',
      },
      {
        id: 'sub_national_government',
        label: 'Sub-national or local government official',
        hint: 'Planning, service delivery, or coordination.',
      },
      {
        id: 'waste_practitioner',
        label: 'Waste management practitioner or technical officer',
        hint: 'Operations, monitoring, or field implementation.',
      },
      {
        id: 'ngo_cso',
        label: 'Non-governmental organization (NGO) or civil society professional (CSO)',
        hint: 'Staff of formally registered non-governmental or civil society organizations working across regions or sectors.',
      },
      {
        id: 'private_sector',
        label: 'Private sector professional',
        hint: 'Business, industry, or SME.',
      },
      {
        id: 'educator_youth',
        label: 'School educator, youth organization, or awareness facilitator',
      },
      {
        id: 'tot_partner',
        label: 'Training facilitator or trainer-of-trainers (ToT) partner',
      },
      {
        id: 'other',
        label: 'Other (please specify)',
        requiresText: true,
      },
    ],
  },
  {
    id: 'application',
    number: 2,
    key: 'INTENDED APPLICATION',
    title:
      'How do you intend to apply the knowledge and skills gained from this training?',
    instruction: 'Select up to 2.',
    type: 'multi',
    maxSelections: 2,
    required: false,
    options: [
      {
        id: 'policy_decision_making',
        label: 'Inform or support policy, regulatory, or strategic decision-making',
      },
      {
        id: 'design_implement_programmes',
        label: 'Design, plan, or implement waste management programmes or projects',
      },
      {
        id: 'engage_communities',
        label: 'Engage, communicate with, or mobilize communities or stakeholders',
      },
      {
        id: 'internal_sustainability',
        label:
          "Strengthen my organization's internal sustainability or waste management practices",
      },
      {
        id: 'deliver_training',
        label:
          'Design or deliver training, awareness, or capacity-building programmes for others',
      },
      {
        id: 'research_data_technology',
        label: 'Contribute to research, data analysis, or emerging technology',
      },
      {
        id: 'advocacy_communications',
        label: 'Support advocacy, communications, or public awareness campaigns',
      },
      {
        id: 'professional_development',
        label: 'Fulfil professional development or continuing education requirements',
      },
      {
        id: 'social_inclusion',
        label:
          'Address social inclusion, human rights, gender equality, or informal waste sector considerations in my work',
      },
      {
        id: 'product_design',
        label:
          'Develop or improve product design, packaging, or business models to reduce plastic use',
      },
      {
        id: 'epr_compliance',
        label:
          'Support compliance with, or development of, extended producer responsibility (EPR) schemes or similar regulatory mechanisms',
      },
      {
        id: 'operational_efficiency',
        label:
          'Improve the operational efficiency of waste collection, sorting, or recycling systems',
      },
    ],
  },
  {
    id: 'challenges',
    number: 3,
    key: 'CHALLENGES',
    title:
      'In which of the following areas do you face the greatest challenges applying this knowledge in your work?',
    instruction: 'Select up to 2.',
    type: 'multi',
    maxSelections: 2,
    required: false,
    options: [
      {
        id: 'scale_sources_impacts',
        label:
          'Understanding the scale, sources, types, and environmental or health impacts of plastic waste',
      },
      {
        id: 'circular_economy',
        label:
          'Designing or transitioning to circular economy approaches or sustainable production models',
      },
      {
        id: 'collection_recycling',
        label:
          'Improving waste collection, sorting, recycling systems, or managing hard-to-recycle and legacy plastics',
      },
      {
        id: 'community_informal_sector',
        label:
          'Engaging communities, integrating informal sector actors, or facilitating behavior change',
      },
      {
        id: 'policy_advocacy',
        label:
          'Designing or advocating effective policies, regulations, incentives, or private sector engagement mechanisms',
      },
      {
        id: 'data_technology_monitoring',
        label:
          'Accessing, applying, or managing waste data, appropriate technologies, or monitoring and reporting systems',
      },
      {
        id: 'governance_inclusion',
        label:
          'Coordinating governance across sectors, ensuring inclusive participation, or mainstreaming gender in implementation',
      },
    ],
  },
  {
    id: 'interests',
    number: 4,
    key: 'INTEREST',
    title: 'Areas you would like to strengthen your knowledge in',
    instruction: 'Select up to 2.',
    type: 'multi',
    maxSelections: 2,
    required: false,
    options: [
      {
        id: 'scope_of_plastic_waste',
        label: 'Understanding the scope of plastic waste',
        hint: 'Where it comes from, how much there is, and its effects on health and the environment.',
      },
      {
        id: 'circular_economy',
        label: 'Shifting toward circular economy approaches',
        hint: 'Sustainable production, consumption, and material-use models.',
      },
      {
        id: 'practical_waste_reduction',
        label: 'Practical waste reduction',
        hint: 'Improving collection, sorting, and recycling, including hard-to-recycle or legacy plastics.',
      },
      {
        id: 'community_behaviour_change',
        label: 'Community engagement and behavior change',
        hint: 'Working with communities and informal waste workers to shift attitudes and practices.',
      },
      {
        id: 'policy_incentives_business',
        label: 'Policy, incentives, and business tools',
        hint: 'Extended producer responsibility (EPR), regulation, and engaging the private sector.',
      },
      {
        id: 'data_technology',
        label: 'Data and technology for waste management',
        hint: 'Monitoring, reporting, and appropriate technology tools.',
      },
      {
        id: 'governance_coordination',
        label: 'Governance and coordination',
        hint: 'Working across government levels and sectors, with inclusive and gender-responsive approaches.',
      },
    ],
  },
  {
    id: 'experience',
    number: 5,
    key: 'EXPERIENCE',
    title:
      'How would you describe your current level of knowledge or experience in plastic waste management or related fields?',
    instruction: 'Select one.',
    type: 'single',
    maxSelections: 1,
    required: true,
    options: [
      {
        id: 'beginner',
        label: 'Beginner',
        hint: 'New to this topic with limited prior knowledge or experience.',
      },
      {
        id: 'introductory',
        label: 'Introductory',
        hint: 'Some awareness of the topic but limited practical or technical experience.',
      },
      {
        id: 'intermediate',
        label: 'Intermediate',
        hint: 'Working knowledge and some hands-on experience in relevant areas.',
      },
      {
        id: 'advanced',
        label: 'Advanced',
        hint: 'Substantial knowledge and significant field or professional experience.',
      },
      {
        id: 'expert',
        label: 'Expert or specialist',
        hint: 'Deep expertise in a specialized technical or policy area.',
      },
    ],
  },
  {
    id: 'priorTraining',
    number: 6,
    key: 'PREVIOUS TRAINING',
    title:
      'Have you previously completed any training in the following fields and feel comfortable with it?',
    instruction:
      'Select all that apply. This never adds a course, it only marks courses you are already recommended as "take only if a refresher is needed".',
    type: 'multi',
    maxSelections: null,
    required: false,
    options: [
      {
        id: 'none',
        label: 'No prior formal training in this area',
        exclusive: true,
      },
      {
        id: 'general_environmental',
        label: 'General environmental or sustainability training',
        hint: 'Foundational, not specific to plastic waste.',
      },
      {
        id: 'circular_economy',
        label: 'Circular economy or sustainable production and consumption training',
      },
      {
        id: 'waste_3rs',
        label: 'Waste collection, sorting, or recycling (3Rs) training or hands-on experience',
      },
      {
        id: 'community_engagement',
        label:
          'Training related to community engagement, behavior change, or social mobilization',
      },
      {
        id: 'policy_epr',
        label: 'Training related to policy development, EPR, or environmental regulation',
      },
      {
        id: 'data_monitoring',
        label:
          'Training related to data management, monitoring, or environmental technologies',
      },
      {
        id: 'governance_advocacy',
        label: 'Governance, cross-sector coordination, or policy advocacy training or experience',
      },
      {
        id: 'academic_qualification',
        label: 'Academic qualification in a relevant field',
        hint: 'E.g. environmental science, engineering, public policy - not specific to plastic waste.',
      },
    ],
  },
] as const satisfies readonly Question[]);

// results screen copy, lifted from p5 of the pdf
export const RESULT_COPY = Object.freeze({
  title: 'Your Personalized Learning Path Is Ready',
  intro:
    'Thank you for completing the self-assessment. Based on your responses, a recommended learning path has been identified to help you strengthen your knowledge and skills in the areas most relevant to your current needs.',
  mainLearningPath: {
    heading: 'Main Learning Path',
    description:
      'These courses are recommended as your priority learning pathway based on your role and experience.',
  },
  additionalRecommendedCourses: {
    heading: 'Additional Recommended Courses',
    description:
      'These courses may also be valuable based on your intended application, areas of interest, and experience.',
  },
  refresherLabel: 'Take only if a refresher is needed.',
});

export function getQuestion(id: Question['id']): Question {
  const question = QUESTIONS.find((q) => q.id === id);
  if (!question) throw new Error(`Unknown question id: ${id}`);
  return question;
}
