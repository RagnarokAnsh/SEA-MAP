import { QUESTIONS } from './questions.js';
import type { Answers, Question, QuestionId, ValidationIssue } from './types.js';

const QUESTION_BY_ID = new Map<QuestionId, Question>(QUESTIONS.map((q) => [q.id, q]));

function optionIds(questionId: QuestionId): Set<string> {
  const question = QUESTION_BY_ID.get(questionId);
  if (!question) throw new Error(`Unknown question id: ${questionId}`);
  return new Set(question.options.map((o) => o.id));
}

function label(questionId: QuestionId): string {
  const question = QUESTION_BY_ID.get(questionId);
  return question ? `Q${question.number} (${question.key})` : questionId;
}

// radio questions - Q1 and Q5
function checkSingle(
  questionId: QuestionId,
  value: unknown,
  issues: ValidationIssue[],
): void {
  const question = QUESTION_BY_ID.get(questionId)!;
  if (value === undefined || value === null || value === '') {
    if (question.required) {
      issues.push({
        questionId,
        code: 'REQUIRED',
        message: `${label(questionId)} is required.`,
      });
    }
    return;
  }
  if (typeof value !== 'string' || !optionIds(questionId).has(value)) {
    issues.push({
      questionId,
      code: 'UNKNOWN_OPTION',
      message: `${label(questionId)} has an unrecognised option: ${JSON.stringify(value)}.`,
    });
  }
}

// checkbox questions - array shape, known ids, no dupes, max count
function checkMulti(
  questionId: QuestionId,
  value: unknown,
  issues: ValidationIssue[],
): void {
  const question = QUESTION_BY_ID.get(questionId)!;

  if (value === undefined || value === null) {
    if (question.required) {
      issues.push({
        questionId,
        code: 'REQUIRED',
        message: `${label(questionId)} is required.`,
      });
    }
    return;
  }

  if (!Array.isArray(value)) {
    issues.push({
      questionId,
      code: 'NOT_AN_ARRAY',
      message: `${label(questionId)} must be an array of option ids.`,
    });
    return;
  }

  if (question.required && value.length === 0) {
    issues.push({
      questionId,
      code: 'REQUIRED',
      message: `${label(questionId)} requires at least one selection.`,
    });
  }

  const known = optionIds(questionId);
  const seen = new Set<string>();

  for (const entry of value) {
    if (typeof entry !== 'string' || !known.has(entry)) {
      issues.push({
        questionId,
        code: 'UNKNOWN_OPTION',
        message: `${label(questionId)} has an unrecognised option: ${JSON.stringify(entry)}.`,
      });
      continue;
    }
    if (seen.has(entry)) {
      issues.push({
        questionId,
        code: 'DUPLICATE_SELECTION',
        message: `${label(questionId)} selects "${entry}" more than once.`,
      });
    }
    seen.add(entry);
  }

  if (question.maxSelections !== null && value.length > question.maxSelections) {
    issues.push({
      questionId,
      code: 'TOO_MANY_SELECTIONS',
      message: `${label(questionId)} allows at most ${question.maxSelections} selection(s); received ${value.length}.`,
    });
  }

  // Q6 "no prior formal training" cant be ticked alongside anything else,
  // it contradicts itself
  const exclusiveIds = question.options.filter((o) => o.exclusive).map((o) => o.id);
  for (const exclusiveId of exclusiveIds) {
    if (seen.has(exclusiveId) && seen.size > 1) {
      issues.push({
        questionId,
        code: 'EXCLUSIVE_OPTION_CONFLICT',
        message: `${label(questionId)}: "${exclusiveId}" cannot be combined with other selections.`,
      });
    }
  }
}

// Returns everything thats wrong with the answers. Empty array = good to go.
// The quiz ui calls this on every change to decide if Next is enabled.
export function validateAnswers(answers: Answers): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (answers === null || typeof answers !== 'object') {
    return [
      {
        questionId: 'audience',
        code: 'REQUIRED',
        message: 'Answers must be an object.',
      },
    ];
  }

  checkSingle('audience', answers.audience, issues);
  checkMulti('application', answers.application, issues);
  checkMulti('challenges', answers.challenges, issues);
  checkMulti('interests', answers.interests, issues);
  checkSingle('experience', answers.experience, issues);
  checkMulti('priorTraining', answers.priorTraining, issues);

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

// thrown by evaluate(). safeEvaluate() gives you the issues instead
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
