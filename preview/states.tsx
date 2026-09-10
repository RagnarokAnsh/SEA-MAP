import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { renderToStaticMarkup } from 'react-dom/server';
import * as sass from 'sass';

import { evaluate } from '../src/index.js';
import type { Answers } from '../src/types.js';
import { ResultPanel } from '../ui/ResultPanel.js';

interface State {
  id: string;
  title: string;
  note: string;
  answers: Answers;
}

const STATES: State[] = [
  {
    id: 'a',
    title: 'One core course, no optional section',
    note: 'Single card, not stretched to fill the row. Optional section omitted entirely.',
    answers: {
      audience: 'other',
      otherRoleText: 'Independent consultant',
      challenge: 'technology_uncertainty',
      experience: 'experienced',
    },
  },
  {
    id: 'b',
    title: 'One core course, two optional',
    note: 'Audience contributes to the optional tier only.',
    answers: {
      audience: 'national_government',
      challenge: 'operate_waste_systems',
      experience: 'experienced',
    },
  },
  {
    id: 'c',
    title: 'Two core courses, two optional',
    note: 'One arrow between the cards, uniform weight.',
    answers: {
      audience: 'ngo_cso',
      challenge: 'operate_waste_systems',
      experience: 'some_experience',
      application: ['choose_recycling_technology'],
    },
  },
  {
    id: 'd',
    title: 'Four core courses',
    note: 'The longest path the algorithm can produce. Check wrapping at narrow widths.',
    answers: {
      audience: 'national_government',
      challenge: 'coordination_governance',
      experience: 'new_to_field',
      application: ['design_policy_instruments', 'improve_collection_systems'],
      deliverTraining: true,
    },
  },
  {
    id: 'e',
    title: 'Challenge and confidence on the same topic',
    note: 'The anchor keeps its position and its label. No badge; only the rationale changes.',
    answers: {
      audience: 'waste_practitioner',
      challenge: 'technology_uncertainty',
      experience: 'some_experience',
      confidence: ['technology_solutions'],
    },
  },
  {
    id: 'f',
    title: 'All three optional tags',
    note: 'Refresher outranks role, and both companion resources appear once each.',
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

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const mantineCss = readFileSync(require.resolve('@mantine/core/styles.css'), 'utf8');
const panelCss = sass.compile(join(here, '..', 'ui', 'self-assessment.scss')).css;

const sections = STATES.map((state) => {
  const result = evaluate(state.answers);
  const markup = renderToStaticMarkup(<ResultPanel result={result} />);
  return `
    <section class="state">
      <header class="state__header">
        <p class="state__id">State ${state.id.toUpperCase()}</p>
        <h2 class="state__title">${state.title}</h2>
        <p class="state__note">${state.note}</p>
        <p class="state__data">core_path ${result.core_path.length} &middot; optional_resources ${result.optional_resources.length} &middot; flags ${result.flags.join(', ') || 'none'}</p>
      </header>
      <div class="state__render">
        <section class="self-assessment self-assessment--result">${markup}</section>
      </div>
    </section>`;
}).join('\n');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Recommendation layout states</title>
<style>${mantineCss}</style>
<style>${panelCss}</style>
<style>
  body { margin: 0; background: #f4f5f7; font-family: system-ui, sans-serif; color: #1a1b1e; }
  .page { max-width: 78rem; margin-inline: auto; padding: 2.5rem 1.5rem 4rem; }
  .page__title { font-size: 1.75rem; margin: 0 0 .35rem; }
  .page__lead { color: #5c5f66; margin: 0 0 2.5rem; max-width: 46rem; line-height: 1.55; }
  .state { margin-bottom: 2.5rem; }
  .state__header { margin-bottom: .75rem; }
  .state__id { font-size: .7rem; letter-spacing: .08em; text-transform: uppercase; font-weight: 700; color: #4c6ef5; margin: 0 0 .2rem; }
  .state__title { font-size: 1.05rem; margin: 0 0 .2rem; }
  .state__note { color: #5c5f66; font-size: .85rem; margin: 0 0 .2rem; }
  .state__data { color: #868e96; font-size: .75rem; font-family: ui-monospace, monospace; margin: 0; }
  .state__render { background: #fff; border: 1px solid #dee2e6; border-radius: 10px; overflow: hidden; }
  .state__render .self-assessment { padding: 1.75rem; }
</style>
</head>
<body>
<main class="page">
  <h1 class="page__title">Recommendation layout states</h1>
  <p class="page__lead">Every state the results page has to handle, rendered from real engine output. Resize the window to check wrapping — the card row stacks below 48rem.</p>
${sections}
</main>
</body>
</html>
`;

const out = join(here, '..', 'examples', 'layout-states.html');
writeFileSync(out, html, 'utf8');
console.log(`Wrote ${out}`);
