// Runs the quiz exactly as it renders in the app - no dev chrome, no toggles.
// Stands in for app/training/self-assessment/page.tsx; the only difference is
// that the enrolment call is stubbed, since there's no session locally.
//
// The recommendation is logged to the browser console on submit.
import { MantineProvider } from '@mantine/core';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@mantine/core/styles.css';

import { DEFAULT_CONFIG, evaluate } from '../src/index.js';
import type { Answers, EngineConfig, Recommendation } from '../src/types.js';
import { SelfAssessment } from '../ui/index.js';
import '../ui/self-assessment.scss';
import './preview.css';

// Stand-ins for the real ToT downloads. Swap these for the actual files -
// see INTEGRATION.md, "the ToT facilitation materials".
const TOT_ASSETS: EngineConfig['totMaterials']['assets'] = [
  { type: 'pdf', title: 'Facilitator handbook', url: '#facilitator-handbook.pdf' },
  { type: 'video', title: 'Running your first session (12 min)', url: '#session-intro.mp4' },
  { type: 'manual', title: 'Workshop activity manual', url: '#workshop-manual.pdf' },
];

function SelfAssessmentPage() {
  const handleSubmit = async (answers: Answers): Promise<Recommendation> => {
    const recommendation = evaluate(answers, {
      totMaterials: { ...DEFAULT_CONFIG.totMaterials, assets: TOT_ASSETS },
    });

    // In the real page this is where you'd bind the catalog to GET /v2/course
    // and loop recommendation.enroll.courseIds calling enrollCourse().
    console.log('[self-assessment] answers', answers);
    console.log('[self-assessment] recommendation', recommendation);
    console.log(
      '[self-assessment] would enrol into',
      recommendation.enroll.courseIds.length,
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
