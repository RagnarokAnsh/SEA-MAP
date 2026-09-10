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
    name: 'One core course, nothing optional',
    note: 'Layout state (a). The challenge alone carries the recommendation.',
    answers: {
      audience: 'other',
      otherRoleText: 'Independent consultant',
      challenge: 'technology_uncertainty',
      experience: 'experienced',
    },
  },
  {
    name: 'One core course, two role suggestions',
    note: 'Layout state (b). Audience contributes only to the optional tier.',
    answers: {
      audience: 'national_government',
      challenge: 'operate_waste_systems',
      experience: 'experienced',
    },
  },
  {
    name: 'Two core courses, two role suggestions',
    note: 'Layout state (c). One application adds a second card to the path.',
    answers: {
      audience: 'ngo_cso',
      challenge: 'operate_waste_systems',
      experience: 'some_experience',
      application: ['choose_recycling_technology'],
    },
  },
  {
    name: 'Four core courses',
    note: 'Layout state (d), the longest path the algorithm can produce.',
    answers: {
      audience: 'national_government',
      challenge: 'coordination_governance',
      experience: 'new_to_field',
      application: ['design_policy_instruments', 'improve_collection_systems'],
      deliverTraining: true,
    },
  },
  {
    name: 'Challenge and confidence on the same topic',
    note: 'Layout state (e). The anchor stays put and the rationale copy switches.',
    answers: {
      audience: 'waste_practitioner',
      challenge: 'technology_uncertainty',
      experience: 'some_experience',
      confidence: ['technology_solutions'],
    },
  },
  {
    name: 'All three optional tags at once',
    note: 'Refresher outranks role, and both companion resources appear.',
    answers: {
      audience: 'community_informal_sector',
      challenge: 'community_participation',
      experience: 'some_experience',
      application: ['engage_informal_sector', 'integrate_circular_principles'],
      confidence: ['circular_economy'],
      deliverTraining: true,
    },
  },
];

function summarise(recommendation: Recommendation): string {
  const path = recommendation.core_path
    .map((entry) => `${entry.course} (${entry.reason})`)
    .join(' -> ');

  const optional =
    recommendation.optional_resources
      .map((entry) => `${entry.item} [${entry.tag}]`)
      .join(', ') || '(none)';

  return [
    `  core_path         : ${path}`,
    `  optional_resources: ${optional}`,
    `  flags             : ${recommendation.flags.join(', ') || '(none)'}`,
    `  enrol             : ${recommendation.enroll.courseNumbers.join(', ')}`,
  ].join('\n');
}

const output = PERSONAS.map((persona) => {
  const recommendation = evaluate(persona.answers);
  console.log(`\n${'='.repeat(74)}\n${persona.name}\n${persona.note}\n${'-'.repeat(74)}`);
  console.log(summarise(recommendation));
  return {
    persona: persona.name,
    note: persona.note,
    answers: persona.answers,
    recommendation,
  };
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
        'the engine response. The contract is the "recommendation" object, whose',
        'core_path / optional_resources / flags fields are the shape documented in',
        'the specification. "enroll" is an addition for the platform integration.',
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
