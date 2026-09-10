import { describe, expect, it } from 'vitest';

import { getQuestion } from '../src/questions.js';
import { validateAnswers } from '../src/validate.js';
import { applyExclusive } from '../ui/useAssessment.js';

// The quiz ui has to stop the learner building an answer the engine would
// reject. Q6 is the only question with an exclusive option so far.
describe('Q6 exclusive option handling in the ui', () => {
  const q6 = getQuestion('priorTraining');

  it('ticking "none" clears everything else', () => {
    expect(applyExclusive(q6, ['waste_3rs'], ['waste_3rs', 'none'])).toEqual(['none']);
  });

  it('ticking something else drops "none"', () => {
    expect(applyExclusive(q6, ['none'], ['none', 'policy_epr'])).toEqual(['policy_epr']);
  });

  it('leaves normal combinations alone', () => {
    const picked = ['waste_3rs', 'policy_epr'];
    expect(applyExclusive(q6, ['waste_3rs'], picked)).toEqual(picked);
  });

  it('is a no-op on questions with no exclusive option', () => {
    const q3 = getQuestion('challenges');
    const picked = ['circular_economy', 'policy_advocacy'];
    expect(applyExclusive(q3, ['circular_economy'], picked)).toEqual(picked);
  });

  it('whatever it returns actually passes validation', () => {
    const result = applyExclusive(q6, ['waste_3rs'], ['waste_3rs', 'none']);
    const issues = validateAnswers({
      audience: 'private_sector',
      experience: 'beginner',
      priorTraining: result as never,
    });
    expect(issues).toEqual([]);
  });
});
