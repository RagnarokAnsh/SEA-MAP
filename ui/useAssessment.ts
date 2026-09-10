'use client';

import { useCallback, useMemo, useState } from 'react';

import { QUESTIONS } from '../src/questions.js';
import type {
  Answers,
  ApplicationId,
  Question,
  Recommendation,
  ValidationIssue,
} from '../src/types.js';
import { validateAnswers } from '../src/validate.js';

export type Phase = 'intro' | 'questions' | 'result';
export type SubmitStatus = 'idle' | 'submitting' | 'error';

const TRAINING_OPTION_ID = 'deliver_training';

export interface UseAssessmentOptions {
  onSubmit: (answers: Answers) => Promise<Recommendation>;
  startAt?: Phase;
}

export function applyExclusive(
  question: Question,
  prev: string[],
  next: string[],
): string[] {
  const exclusive = question.options.find((o) => o.exclusive)?.id;
  if (!exclusive || next.length <= 1) return next;
  if (next.includes(exclusive) && !prev.includes(exclusive)) return [exclusive];
  return next.filter((id) => id !== exclusive);
}

export function splitApplicationSelection(selected: string[]): {
  application: ApplicationId[];
  deliverTraining: boolean;
} {
  return {
    application: selected.filter((id) => id !== TRAINING_OPTION_ID) as ApplicationId[],
    deliverTraining: selected.includes(TRAINING_OPTION_ID),
  };
}

export function useAssessment({ onSubmit, startAt = 'intro' }: UseAssessmentOptions) {
  const [phase, setPhase] = useState<Phase>(startAt);
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState<Partial<Answers>>({});
  const [status, setStatus] = useState<SubmitStatus>('idle');
  const [result, setResult] = useState<Recommendation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);

  const question = QUESTIONS[index]!;
  const isLast = index === QUESTIONS.length - 1;

  const issues: ValidationIssue[] = useMemo(
    () => validateAnswers(draft as Answers),
    [draft],
  );

  const currentIssues = useMemo(
    () =>
      issues.filter(
        (i) =>
          i.questionId === question.id ||
          (i.questionId === 'otherRoleText' && question.id === 'audience'),
      ),
    [issues, question.id],
  );

  const selection = useMemo<string | string[]>(() => {
    if (question.id === 'application') {
      const chosen = [...(draft.application ?? [])] as string[];
      if (draft.deliverTraining) chosen.push(TRAINING_OPTION_ID);
      return chosen;
    }
    const raw = draft[question.id as keyof Answers];
    if (question.type === 'single') return typeof raw === 'string' ? raw : '';
    return Array.isArray(raw) ? (raw as string[]) : [];
  }, [draft, question.id, question.type]);

  const setSelection = useCallback(
    (target: Question, value: string | string[]) => {
      setShowErrors(false);
      setDraft((prev) => {
        if (target.type === 'single') {
          return { ...prev, [target.id]: value };
        }

        const before = (prev[target.id as keyof Answers] as string[] | undefined) ?? [];
        const next = applyExclusive(target, before, value as string[]);

        if (target.id === 'application') {
          const { application, deliverTraining } = splitApplicationSelection(next);
          return { ...prev, application, deliverTraining };
        }

        return { ...prev, [target.id]: next };
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
      setError(e instanceof Error ? e.message : 'Something went wrong, please try again.');
      setStatus('error');
    }
  }, [draft, issues.length, onSubmit]);

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
    selection,
    setSelection,
    setOtherRoleText,
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
