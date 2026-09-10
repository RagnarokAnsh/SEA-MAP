'use client';

import { useCallback, useMemo, useState } from 'react';

import { QUESTIONS } from '../src/questions.js';
import type { Answers, Question, Recommendation, ValidationIssue } from '../src/types.js';
import { validateAnswers } from '../src/validate.js';

export type Phase = 'intro' | 'questions' | 'result';
export type SubmitStatus = 'idle' | 'submitting' | 'error';

export interface UseAssessmentOptions {
  // Does whatever the host app needs - run evaluate(), hit the api, enrol,
  // then hand back the recommendation. Kept out here so this hook doesnt
  // need to know about axios or the api client.
  onSubmit: (answers: Answers) => Promise<Recommendation>;
  // skip the intro screen if you already have your own
  startAt?: Phase;
}

// Ticking Q6's "no prior formal training" clears everything else, and ticking
// anything else clears it. Stops the learner submitting something the engine
// would just reject.
export function applyExclusive(question: Question, prev: string[], next: string[]): string[] {
  const exclusive = question.options.find((o) => o.exclusive)?.id;
  if (!exclusive || next.length <= 1) return next;
  if (next.includes(exclusive) && !prev.includes(exclusive)) return [exclusive];
  return next.filter((id) => id !== exclusive);
}

export function useAssessment({ onSubmit, startAt = 'intro' }: UseAssessmentOptions) {
  const [phase, setPhase] = useState<Phase>(startAt);
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState<Partial<Answers>>({});
  const [status, setStatus] = useState<SubmitStatus>('idle');
  const [result, setResult] = useState<Recommendation | null>(null);
  const [error, setError] = useState<string | null>(null);
  // don't nag them about a question they havent answered yet - only show the
  // errors once they've actually tried to move on
  const [showErrors, setShowErrors] = useState(false);

  const question = QUESTIONS[index]!;
  const isLast = index === QUESTIONS.length - 1;

  // whole-form issues, re-run on every keystroke. cheap, its just object checks
  const issues: ValidationIssue[] = useMemo(
    () => validateAnswers(draft as Answers),
    [draft],
  );

  // only the ones for the question thats on screen
  const currentIssues = useMemo(
    () =>
      issues.filter(
        (i) =>
          i.questionId === question.id ||
          // the "please specify" text belongs to Q1
          (i.questionId === 'otherRoleText' && question.id === 'audience'),
      ),
    [issues, question.id],
  );

  const setSelection = useCallback(
    (target: Question, value: string | string[]) => {
      setShowErrors(false);
      setDraft((prev) => {
        if (target.type === 'single') {
          return { ...prev, [target.id]: value };
        }
        const before = (prev[target.id as keyof Answers] as string[] | undefined) ?? [];
        return { ...prev, [target.id]: applyExclusive(target, before, value as string[]) };
      });
    },
    [],
  );

  const setOtherRoleText = useCallback((text: string) => {
    setShowErrors(false);
    setDraft((prev) => ({ ...prev, otherRoleText: text }));
  }, []);

  const submit = useCallback(async () => {
    if (issues.length > 0) return;
    setStatus('submitting');
    setError(null);
    try {
      const recommendation = await onSubmit(draft as Answers);
      setResult(recommendation);
      setPhase('result');
      setStatus('idle');
    } catch (e) {
      // don't lose their answers, let them hit retry
      setError(e instanceof Error ? e.message : 'Something went wrong, please try again.');
      setStatus('error');
    }
  }, [draft, issues.length, onSubmit]);

  // Button stays clickable even when the question isnt answered - clicking it
  // surfaces why, which beats a dead greyed out button with no explanation.
  const next = useCallback(() => {
    if (currentIssues.length > 0) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    if (isLast) {
      void submit();
      return;
    }
    setIndex((i) => Math.min(i + 1, QUESTIONS.length - 1));
  }, [currentIssues.length, isLast, submit]);

  const back = useCallback(() => {
    setShowErrors(false);
    if (index === 0) {
      setPhase('intro');
      return;
    }
    setIndex((i) => Math.max(i - 1, 0));
  }, [index]);

  const restart = useCallback(() => {
    setDraft({});
    setIndex(0);
    setResult(null);
    setError(null);
    setStatus('idle');
    setShowErrors(false);
    setPhase('intro');
  }, []);

  return {
    phase,
    start: () => setPhase('questions'),
    question,
    index,
    total: QUESTIONS.length,
    isLast,
    draft,
    setSelection,
    setOtherRoleText,
    // what the step should actually render under the options
    visibleIssues: showErrors ? currentIssues : [],
    currentIssues,
    next,
    back,
    submit,
    status,
    result,
    error,
    restart,
  };
}
