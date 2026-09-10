import { describe, expect, it } from 'vitest';

import { getQuestion } from '../src/questions.js';
import type { Answers } from '../src/types.js';
import { validateAnswers } from '../src/validate.js';
import { applyExclusive, splitApplicationSelection } from '../ui/useAssessment.js';

const BASE: Omit<Answers, 'confidence' | 'application' | 'deliverTraining'> = {
  audience: 'private_sector',
  challenge: 'operate_waste_systems',
  experience: 'some_experience',
};

describe('exclusive option handling', () => {
  const confidence = getQuestion('confidence');

  it('ticking none clears everything else', () => {
    expect(applyExclusive(confidence, ['waste_3rs'], ['waste_3rs', 'none'])).toEqual([
      'none',
    ]);
  });

  it('ticking something else drops none', () => {
    expect(
      applyExclusive(confidence, ['none'], ['none', 'policy_business_instruments']),
    ).toEqual(['policy_business_instruments']);
  });

  it('leaves normal combinations alone', () => {
    const picked = ['waste_3rs', 'policy_business_instruments'];
    expect(applyExclusive(confidence, ['waste_3rs'], picked)).toEqual(picked);
  });

  it('is a no-op on a question with no exclusive option', () => {
    const application = getQuestion('application');
    const picked = ['improve_collection_systems', 'design_behaviour_change'];
    expect(applyExclusive(application, ['improve_collection_systems'], picked)).toEqual(
      picked,
    );
  });

  it('produces something the engine accepts', () => {
    const result = applyExclusive(confidence, ['waste_3rs'], ['waste_3rs', 'none']);
    expect(validateAnswers({ ...BASE, confidence: result as never })).toEqual([]);
  });
});

describe('application selection splitting', () => {
  it('separates the training option from the capped selections', () => {
    expect(
      splitApplicationSelection([
        'improve_collection_systems',
        'deliver_training',
        'design_behaviour_change',
      ]),
    ).toEqual({
      application: ['improve_collection_systems', 'design_behaviour_change'],
      deliverTraining: true,
    });
  });

  it('reports no training when the option is absent', () => {
    expect(splitApplicationSelection(['improve_collection_systems'])).toEqual({
      application: ['improve_collection_systems'],
      deliverTraining: false,
    });
  });

  it('handles the training option on its own', () => {
    expect(splitApplicationSelection(['deliver_training'])).toEqual({
      application: [],
      deliverTraining: true,
    });
  });

  it('keeps two capped selections valid alongside the training option', () => {
    const split = splitApplicationSelection([
      'improve_collection_systems',
      'design_behaviour_change',
      'deliver_training',
    ]);
    expect(validateAnswers({ ...BASE, ...split })).toEqual([]);
  });
});
