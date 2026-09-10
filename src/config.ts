import { DEFAULT_CATALOG } from './courses.js';
import type { EngineConfig } from './types.js';

// Each flag below is a spot where the assessment pdf contradicts itself or
// just doesn't say. The defaults are the readings we went with - change them
// here rather than touching the engine. README has the reasoning.
export const DEFAULT_CONFIG: EngineConfig = Object.freeze({
  // Q2 "design or deliver training for others" grants the whole set + ToT
  // materials, same as picking ToT in Q1. Page 2 of the pdf says this; the
  // page 6 table says it grants nothing. Set false for the page 6 reading.
  deliverTrainingGrantsFullSet: true,

  // Page 8 says only Q5 places course 1, but the Q1 trainer answer grants 1-7.
  // Page 6 calls the trainer pathway an exception, so it wins - a trainer
  // keeps course 1 no matter how experienced they say they are.
  totOverridesCourse1Placement: true,

  // A course can qualify for both lists. The pdf never says which wins; main
  // is the priority list so it keeps it.
  duplicatePrecedence: 'main',

  // Refresher-labelled courses still get enrolled. Arguable, since the label
  // literally means "you can skip this" - flip to true to leave them out.
  excludeRefreshersFromEnrollment: false,

  // Some answer combinations qualify for nothing at all. Returning an empty
  // path plus a notice beats inventing a recommendation the pdf doesn't
  // support. Flip to true to always fall back to course 1.
  fallbackToCourse1WhenEmpty: false,

  // Downloads, not a course. Drop the real files in and they render as a
  // download list on the results screen:
  //
  //   totMaterials: { ...DEFAULT_CONFIG.totMaterials, assets: [
  //     { type: 'pdf', title: 'Facilitator handbook', url: '/files/...' },
  //   ]}
  totMaterials: {
    title: 'Trainer-of-Trainers Facilitation Materials',
    description:
      'Facilitation guides, manuals and short videos for running the RTP courses with your own learners.',
    assets: [],
  },

  // Staging ids. Rebind per environment with catalogFromApiCourses().
  catalog: DEFAULT_CATALOG,
});

export function resolveConfig(overrides?: Partial<EngineConfig>): EngineConfig {
  return { ...DEFAULT_CONFIG, ...(overrides ?? {}) };
}
