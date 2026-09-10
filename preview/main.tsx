import { MantineProvider } from '@mantine/core';
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';

import '@mantine/core/styles.css';

import { DEFAULT_RESOURCES, evaluate } from '../src/index.js';
import type { Answers, Recommendation, ResourceCatalog } from '../src/types.js';
import { SelfAssessment } from '../ui/index.js';
import '../ui/self-assessment.scss';
import './preview.css';

const RESOURCES: ResourceCatalog = {
  waste_picker_toolkit: {
    ...DEFAULT_RESOURCES.waste_picker_toolkit,
    assets: [
      { type: 'pdf', title: 'Waste picker training toolkit', url: '#toolkit.pdf' },
      { type: 'manual', title: 'Field facilitation cards', url: '#field-cards.pdf' },
    ],
  },
  tot_manual: {
    ...DEFAULT_RESOURCES.tot_manual,
    assets: [
      { type: 'manual', title: 'Training of Trainers manual', url: '#tot-manual.pdf' },
      { type: 'video', title: 'Running your first session (12 min)', url: '#session.mp4' },
    ],
  },
};

function SelfAssessmentPage() {
  const [answers, setAnswers] = useState<Answers | null>(null);
  const [result, setResult] = useState<Recommendation | null>(null);

  const handleSubmit = async (submitted: Answers): Promise<Recommendation> => {
    const recommendation = evaluate(submitted);

    setAnswers(submitted);
    setResult(recommendation);

    Object.assign(window, { answers: submitted, recommendation });
    console.log('[self-assessment] answers\n' + JSON.stringify(submitted, null, 2));
    console.log(
      '[self-assessment] recommendation\n' + JSON.stringify(recommendation, null, 2),
    );

    return recommendation;
  };

  return (
    <>
      <SelfAssessment onSubmit={handleSubmit} resources={RESOURCES} />
      {result && (
        <div className="preview-json">
          <details open>
            <summary>Engine response</summary>
            <p className="preview-json__hint">
              Also on the console, and as <code>window.recommendation</code> /{' '}
              <code>window.answers</code>.
            </p>
            <pre>{JSON.stringify(result, null, 2)}</pre>
          </details>
          <details>
            <summary>Answers that produced it</summary>
            <pre>{JSON.stringify(answers, null, 2)}</pre>
          </details>
        </div>
      )}
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider>
      <SelfAssessmentPage />
    </MantineProvider>
  </StrictMode>,
);
