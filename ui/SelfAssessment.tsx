'use client';

import { Alert, Button, Group, Progress, Text, Title } from '@mantine/core';

import type { Answers, Recommendation } from '../src/types.js';
import { QuestionStep } from './QuestionStep.js';
import { ResultPanel } from './ResultPanel.js';
import { useAssessment, type Phase } from './useAssessment.js';

const INTRO = {
  title: 'Identify Your Learning Path',
  lead: 'Begin with a short self-assessment to reflect on your current knowledge, learning needs, and priority areas. You will then unlock a recommended learning path and be guided toward the courses most relevant to you.',
  detail:
    'Five questions, about two minutes. There are no right or wrong answers - it just works out which of the seven courses are worth your time.',
  button: 'Begin Self-Assessment',
};

export interface SelfAssessmentProps {
  onSubmit: (answers: Answers) => Promise<Recommendation>;
  onRestart?: () => void;
  courseHref?: (item: { slug: string }) => string;
  startAt?: Phase;
}

export function SelfAssessment({
  onSubmit,
  onRestart,
  courseHref,
  startAt,
}: SelfAssessmentProps) {
  const a = useAssessment({ onSubmit, startAt });

  if (a.phase === 'intro') {
    return (
      <section className="self-assessment self-assessment--intro">
        <div className="self-assessment__intro">
          <Title order={1} className="self-assessment__intro-title">
            {INTRO.title}
          </Title>
          <Text component="p" className="self-assessment__intro-lead">
            {INTRO.lead}
          </Text>
          <Text component="p" className="self-assessment__intro-detail">
            {INTRO.detail}
          </Text>
          <Button size="md" onClick={a.start} className="self-assessment__cta">
            {INTRO.button}
          </Button>
        </div>
      </section>
    );
  }

  if (a.phase === 'result' && a.result) {
    return (
      <section className="self-assessment self-assessment--result">
        <ResultPanel
          result={a.result}
          courseHref={courseHref}
          onRestart={onRestart ?? a.restart}
        />
      </section>
    );
  }

  const percent = ((a.index + 1) / a.total) * 100;

  return (
    <section className="self-assessment self-assessment--questions">
      <div className="self-assessment__progress">
        <Progress
          value={percent}
          size="sm"
          aria-label={`Question ${a.index + 1} of ${a.total}`}
        />
      </div>

      <QuestionStep
        question={a.question}
        index={a.index}
        total={a.total}
        draft={a.draft}
        selection={a.selection}
        issues={a.visibleIssues}
        onChange={a.setSelection}
        onOtherRoleTextChange={a.setOtherRoleText}
      />

      {a.error && (
        <Alert color="red" variant="light" className="self-assessment__notice">
          {a.error}
        </Alert>
      )}

      <Group justify="space-between" className="self-assessment__actions">
        <Button
          variant="subtle"
          onClick={a.back}
          disabled={a.status === 'submitting'}
          className="self-assessment__back"
        >
          Back
        </Button>

        <Button
          onClick={a.next}
          loading={a.status === 'submitting'}
          data-incomplete={a.currentIssues.length > 0 || undefined}
          className="self-assessment__next"
        >
          {a.isLast ? 'See my learning path' : 'Next'}
        </Button>
      </Group>
    </section>
  );
}
