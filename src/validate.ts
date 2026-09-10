import { QUESTIONS } from './questions.js';
import type { Answers, Question, QuestionId, ValidationIssue } from './types.js';

const QUESTION_BY_ID = new Map<QuestionId, Question>(QUESTIONS.map((q) => [q.id, q]));

function getQuestionOrThrow(questionId: QuestionId): Question {
  const question = QUESTION_BY_ID.get(questionId);
  if (!question) throw new Error(`Unknown question id: ${questionId}`);
  return question;
}

function selectableOptionIds(question: Question): Set<string> {
  return new Set(
    question.options.filter((o) => !o.outsideSelectionLimit).map((o) => o.id),
  );
}

function label(question: Question): string {
  return `Q${question.number} (${question.key})`;
}

function checkSingle(
  questionId: QuestionId,
  value: unknown,
  issues: ValidationIssue[],
): void {
  const question = getQuestionOrThrow(questionId);

  if (value === undefined || value === null || value === '') {
    if (question.required) {
      issues.push({
        questionId,
        code: 'REQUIRED',
        message: `${label(question)} is required.`,
      });
    }
    return;
  }

  if (typeof value !== 'string' || !selectableOptionIds(question).has(value)) {
    issues.push({
      questionId,
      code: 'UNKNOWN_OPTION',
      message: `${label(question)} has an unrecognised option: ${JSON.stringify(value)}.`,
    });
  }
}

function checkMulti(
  questionId: QuestionId,
  value: unknown,
  issues: ValidationIssue[],
): void {
  const question = getQuestionOrThrow(questionId);

  if (value === undefined || value === null) {
    if (question.required) {
      issues.push({
        questionId,
        code: 'REQUIRED',
        message: `${label(question)} is required.`,
      });
    }
    return;
  }

  if (!Array.isArray(value)) {
    issues.push({
      questionId,
      code: 'NOT_AN_ARRAY',
      message: `${label(question)} must be an array of option ids.`,
    });
    return;
  }

  if (question.required && value.length === 0) {
    issues.push({
      questionId,
      code: 'REQUIRED',
      message: `${label(question)} requires at least one selection.`,
    });
  }

  const known = selectableOptionIds(question);
  const seen = new Set<string>();

  for (const entry of value) {
    if (typeof entry !== 'string' || !known.has(entry)) {
      issues.push({
        questionId,
        code: 'UNKNOWN_OPTION',
        message: `${label(question)} has an unrecognised option: ${JSON.stringify(entry)}.`,
      });
      continue;
    }
    if (seen.has(entry)) {
      issues.push({
        questionId,
        code: 'DUPLICATE_SELECTION',
        message: `${label(question)} selects "${entry}" more than once.`,
      });
    }
    seen.add(entry);
  }

  if (question.maxSelections !== null && value.length > question.maxSelections) {
    issues.push({
      questionId,
      code: 'TOO_MANY_SELECTIONS',
      message: `${label(question)} allows at most ${question.maxSelections} selection(s); received ${value.length}.`,
    });
  }

  for (const option of question.options) {
    if (!option.exclusive) continue;
    if (seen.has(option.id) && seen.size > 1) {
      issues.push({
        questionId,
        code: 'EXCLUSIVE_OPTION_CONFLICT',
        message: `${label(question)}: "${option.id}" cannot be combined with other selections.`,
      });
    }
  }
}

export function validateAnswers(answers: Answers): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (answers === null || typeof answers !== 'object') {
    return [
      { questionId: 'audience', code: 'REQUIRED', message: 'Answers must be an object.' },
    ];
  }

  checkSingle('audience', answers.audience, issues);
  checkMulti('application', answers.application, issues);
  checkSingle('challenge', answers.challenge, issues);
  checkSingle('experience', answers.experience, issues);
  checkMulti('confidence', answers.confidence, issues);

  if (answers.audience === 'other') {
    const text = answers.otherRoleText;
    if (typeof text !== 'string' || text.trim() === '') {
      issues.push({
        questionId: 'otherRoleText',
        code: 'MISSING_OTHER_TEXT',
        message: 'Q1 (AUDIENCE): selecting "Other" requires the role to be specified.',
      });
    }
  }

  return issues;
}

export class AssessmentValidationError extends Error {
  readonly issues: ValidationIssue[];

  constructor(issues: ValidationIssue[]) {
    super(
      `Self-assessment answers are invalid:\n${issues.map((i) => `  - ${i.message}`).join('\n')}`,
    );
    this.name = 'AssessmentValidationError';
    this.issues = issues;
  }
}
