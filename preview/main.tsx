import { MantineProvider } from '@mantine/core';
import { StrictMode } from 'react';
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
  const handleSubmit = async (answers: Answers): Promise<Recommendation> => {
    const recommendation = evaluate(answers, { resources: RESOURCES });

    console.log('[self-assessment] answers', answers);
    console.log('[self-assessment] recommendation', recommendation);
    console.log(
      '[self-assessment] would enrol into',
      recommendation.enroll.courseNumbers.length,
      'courses:',
      recommendation.enroll.slugs,
    );

    return recommendation;
  };

  return <SelfAssessment onSubmit={handleSubmit} />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider>
      <SelfAssessmentPage />
    </MantineProvider>
  </StrictMode>,
);
