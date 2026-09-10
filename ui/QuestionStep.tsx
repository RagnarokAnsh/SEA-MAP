'use client';

import { Checkbox, Radio, Stack, Text, Textarea, Title } from '@mantine/core';

import type { Answers, Question, ValidationIssue } from '../src/types.js';

export interface QuestionStepProps {
  question: Question;
  index: number;
  total: number;
  draft: Partial<Answers>;
  issues: ValidationIssue[];
  onChange: (question: Question, value: string | string[]) => void;
  onOtherRoleTextChange: (text: string) => void;
}

export function QuestionStep({
  question,
  index,
  total,
  draft,
  issues,
  onChange,
  onOtherRoleTextChange,
}: QuestionStepProps) {
  const raw = draft[question.id as keyof Answers];
  const single = typeof raw === 'string' ? raw : '';
  const multi = Array.isArray(raw) ? (raw as string[]) : [];

  const cap = question.maxSelections;
  const atCap = question.type === 'multi' && cap !== null && multi.length >= cap;
  const showOtherText = question.id === 'audience' && single === 'other';

  return (
    <div className="self-assessment__question">
      <Text component="p" className="self-assessment__question-eyebrow">
        Question {index + 1} of {total}
        <span className="self-assessment__question-key"> · {question.key}</span>
      </Text>

      <Title order={2} className="self-assessment__question-title">
        {question.title}
      </Title>

      <Text component="p" className="self-assessment__question-instruction">
        {question.instruction}
      </Text>

      {question.type === 'multi' && cap !== null && (
        <Text
          component="p"
          className="self-assessment__question-counter"
          data-at-cap={atCap || undefined}
        >
          {multi.length} of {cap} selected
        </Text>
      )}

      {question.type === 'single' ? (
        <Radio.Group value={single} onChange={(value) => onChange(question, value)}>
          <Stack gap="xs" className="self-assessment__options">
            {question.options.map((option) => (
              <Radio
                key={option.id}
                value={option.id}
                label={option.label}
                description={option.hint}
                className="self-assessment__option"
                data-selected={single === option.id || undefined}
              />
            ))}
          </Stack>
        </Radio.Group>
      ) : (
        <Checkbox.Group value={multi} onChange={(value) => onChange(question, value)}>
          <Stack gap="xs" className="self-assessment__options">
            {question.options.map((option) => {
              const checked = multi.includes(option.id);
              return (
                <Checkbox
                  key={option.id}
                  value={option.id}
                  label={option.label}
                  description={option.hint}
                  // grey out the rest once they hit the limit rather than
                  // letting them pick and then rejecting it
                  disabled={atCap && !checked}
                  className="self-assessment__option"
                  data-selected={checked || undefined}
                />
              );
            })}
          </Stack>
        </Checkbox.Group>
      )}

      {showOtherText && (
        <Textarea
          className="self-assessment__other-text"
          label="Please specify your role"
          placeholder="e.g. independent consultant working with coastal municipalities"
          autosize
          minRows={2}
          value={draft.otherRoleText ?? ''}
          onChange={(event) => onOtherRoleTextChange(event.currentTarget.value)}
        />
      )}

      {issues.length > 0 && (
        <ul className="self-assessment__errors">
          {issues.map((issue) => (
            <li key={`${issue.questionId}-${issue.code}`}>{issue.message}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
