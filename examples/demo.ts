// Prints the JSON for a handful of representative learners and writes
// examples/sample-output.json.
//
//   npm run demo
//
// To see the actual quiz instead, npm run preview.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { evaluate } from '../src/index.js';
import type { Answers, Recommendation } from '../src/types.js';

interface Persona {
  name: string;
  note: string;
  answers: Answers;
}

const PERSONAS: Persona[] = [
  {
    name: 'National government policy adviser',
    note: 'Q1 drives a three-course Main path; Q6 marks the EPR course as a refresher.',
    answers: {
      audience: 'national_government',
      application: ['epr_compliance', 'social_inclusion'],
      challenges: ['data_technology_monitoring'],
      interests: ['governance_coordination'],
      experience: 'intermediate',
      priorTraining: ['policy_epr'],
    },
  },
  {
    name: 'SME product and packaging lead',
    note: 'Beginner, so Course 1 is added to the Main path as the required entry point.',
    answers: {
      audience: 'private_sector',
      application: ['product_design', 'operational_efficiency'],
      challenges: ['circular_economy'],
      interests: ['practical_waste_reduction'],
      experience: 'beginner',
      priorTraining: ['none'],
    },
  },
  {
    name: 'Community NGO programme officer',
    note: 'Several answers all point at Course 4; it still only appears once.',
    answers: {
      audience: 'ngo_cso',
      application: ['engage_communities', 'social_inclusion'],
      challenges: ['community_informal_sector'],
      interests: ['community_behaviour_change'],
      experience: 'introductory',
      priorTraining: ['community_engagement'],
    },
  },
  {
    name: 'Trainer-of-trainers partner',
    note: 'All seven courses plus the ToT facilitation materials.',
    answers: {
      audience: 'tot_partner',
      experience: 'advanced',
      priorTraining: ['general_environmental'],
    },
  },
  {
    name: 'Local official who also runs training',
    note: 'Q2 "deliver training" grants the full set too, so the Q1 role no longer caps it.',
    answers: {
      audience: 'sub_national_government',
      application: ['deliver_training'],
      experience: 'intermediate',
    },
  },
  {
    name: 'Unlisted role, no matching topics (edge case)',
    note: '"Other" contributes nothing and every other answer is a no-op, so the path is empty.',
    answers: {
      audience: 'other',
      otherRoleText: 'Marine biology researcher',
      application: ['professional_development'],
      challenges: ['scale_sources_impacts'],
      interests: ['scope_of_plastic_waste'],
      experience: 'expert',
    },
  },
];

function summarise(recommendation: Recommendation): string {
  const line = (label: string, courses: Recommendation['mainLearningPath']) => {
    if (courses.length === 0) return `  ${label}: (none)`;
    const rendered = courses
      .map(
        (c) =>
          `Course ${c.courseNumber} - ${c.title.slice(0, 40)}${
            c.isRefresher ? ' [refresher]' : ''
          }`,
      )
      .join('\n' + ' '.repeat(label.length + 4));
    return `  ${label}: ${rendered}`;
  };

  return [
    line('Main Learning Path    ', recommendation.mainLearningPath),
    line('Additional Recommended', recommendation.additionalRecommendedCourses),
    `  Also included         : ${
      recommendation.supplementaryResources.map((r) => r.title).join(', ') || '(none)'
    }`,
    `  Enrol                 : ${
      recommendation.enroll.courseNumbers.length
        ? `${recommendation.enroll.courseNumbers.length} courses (${recommendation.enroll.courseNumbers.join(', ')})`
        : '(none)'
    }`,
    recommendation.notices.length > 0
      ? `  Notices               : ${recommendation.notices.map((n) => `${n.code}[${n.audience}]`).join(', ')}`
      : '  Notices               : (none)',
  ].join('\n');
}

const output = PERSONAS.map((persona) => {
  const recommendation = evaluate(persona.answers);
  console.log(`\n${'='.repeat(74)}\n${persona.name}\n${persona.note}\n${'-'.repeat(74)}`);
  console.log(summarise(recommendation));
  return { persona: persona.name, note: persona.note, answers: persona.answers, recommendation };
});

const here = dirname(fileURLToPath(import.meta.url));
writeFileSync(
  join(here, 'sample-output.json'),
  `${JSON.stringify(
    {
      readMe: [
        'Sample output from `npm run demo`.',
        '',
        '"persona" and "note" label the samples in this file - they are NOT part of',
        'the engine response. The contract is the "recommendation" object.',
        '',
        'Course ids are staging ids. Rebind per environment with catalogFromApiCourses().',
      ].join('\n'),
      personas: output,
    },
    null,
    2,
  )}\n`,
  'utf8',
);

console.log(`\n${'='.repeat(74)}`);
console.log('Full JSON written to examples/sample-output.json');
