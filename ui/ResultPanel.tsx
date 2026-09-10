'use client';

import { Button } from '@mantine/core';

import { RESULT_COPY } from '../src/questions.js';
import type {
  CorePathItem,
  OptionalItem,
  Recommendation,
  ResourceKey,
} from '../src/types.js';

export interface ResultPanelProps {
  result: Recommendation;
  courseHref?: (item: { slug: string }) => string;
  onRestart?: () => void;
}

function AnchorIcon() {
  return (
    <svg
      className="self-assessment__card-icon"
      viewBox="0 0 16 16"
      width="14"
      height="14"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="8" cy="8" r="2.25" fill="currentColor" />
    </svg>
  );
}

function AdditionalIcon() {
  return (
    <svg
      className="self-assessment__card-icon"
      viewBox="0 0 16 16"
      width="14"
      height="14"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M8 1.5l1.5 4L13.5 7l-4 1.5L8 12.5 6.5 8.5 2.5 7l4-1.5z"
        fill="currentColor"
      />
      <path d="M12.75 11l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6z" fill="currentColor" />
    </svg>
  );
}

function PathArrow() {
  return (
    <span className="self-assessment__path-arrow" aria-hidden="true">
      <svg viewBox="0 0 24 12" width="24" height="12" focusable="false">
        <path
          d="M1 6h20M17 2l4 4-4 4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function coreRationale(item: CorePathItem, hasContradiction: boolean): string {
  if (item.reason === 'c1_gate') return RESULT_COPY.coreRationale.c1_gate;
  if (item.reason === 'application') return RESULT_COPY.coreRationale.application;
  return hasContradiction
    ? RESULT_COPY.coreRationale.challengeWithConfidence
    : RESULT_COPY.coreRationale.challenge;
}

function optionalRationale(item: OptionalItem): string {
  if (item.kind === 'resource') {
    return RESULT_COPY.optionalRationale[item.key as ResourceKey];
  }
  return item.tag === 'refresher'
    ? RESULT_COPY.optionalRationale.refresher
    : RESULT_COPY.optionalRationale.role;
}

function CoreCard({
  item,
  hasContradiction,
  href,
}: {
  item: CorePathItem;
  hasContradiction: boolean;
  href?: string;
}) {
  const isAnchor = item.reason === 'challenge';
  const label = isAnchor
    ? RESULT_COPY.coreLabels.anchor
    : RESULT_COPY.coreLabels.additional;

  const body = (
    <>
      <span className="self-assessment__card-label" data-anchor={isAnchor || undefined}>
        {isAnchor ? <AnchorIcon /> : <AdditionalIcon />}
        {label}
      </span>
      <span className="self-assessment__card-number">Course {item.courseNumber}</span>
      <span className="self-assessment__card-topic">{item.title}</span>
      <span className="self-assessment__card-rationale">
        {coreRationale(item, hasContradiction)}
      </span>
    </>
  );

  return (
    <article className="self-assessment__card" data-anchor={isAnchor || undefined}>
      {href ? (
        <a className="self-assessment__card-link" href={href}>
          {body}
        </a>
      ) : (
        <div className="self-assessment__card-link">{body}</div>
      )}
    </article>
  );
}

function OptionalRow({ item, href }: { item: OptionalItem; href?: string }) {
  const heading =
    item.kind === 'course' ? `Course ${item.courseNumber}` : item.title;
  const detail = item.kind === 'course' ? item.title : item.description;

  return (
    <li className="self-assessment__optional-row">
      <div className="self-assessment__optional-body">
        <span className="self-assessment__optional-heading">
          {href ? (
            <a className="self-assessment__optional-link" href={href}>
              {heading}
            </a>
          ) : (
            heading
          )}
        </span>
        <span className="self-assessment__optional-detail">{detail}</span>
        <span className="self-assessment__optional-rationale">
          {optionalRationale(item)}
        </span>
      </div>
      <span className="self-assessment__pill" data-tag={item.tag}>
        {RESULT_COPY.optionalTagLabels[item.tag]}
      </span>
    </li>
  );
}

export function ResultPanel({
  result,
  courseHref = (item) => `/training/${item.slug}`,
  onRestart,
}: ResultPanelProps) {
  const { corePath, optionalResources, flags } = result;
  const hasContradiction = flags.includes('challenge_confidence_contradiction');
  const intro =
    corePath.length > 1 ? RESULT_COPY.intro.multiple : RESULT_COPY.intro.single;

  return (
    <div className="self-assessment__result">
      <h1 className="self-assessment__result-title">{RESULT_COPY.title}</h1>
      <p className="self-assessment__result-intro">{intro}</p>

      <div
        className="self-assessment__path"
        data-single={corePath.length === 1 || undefined}
      >
        {corePath.map((item, i) => (
          <div className="self-assessment__path-step" key={item.courseNumber}>
            {i > 0 && <PathArrow />}
            <CoreCard
              item={item}
              hasContradiction={hasContradiction}
              href={courseHref(item)}
            />
          </div>
        ))}
      </div>

      {optionalResources.length > 0 && (
        <section className="self-assessment__optional">
          <h2 className="self-assessment__optional-title">
            {RESULT_COPY.optional.heading}
          </h2>
          <p className="self-assessment__optional-subtitle">
            {RESULT_COPY.optional.subheading}
          </p>
          <ul className="self-assessment__optional-list">
            {optionalResources.map((item) => (
              <OptionalRow
                key={item.kind === 'course' ? `c${item.courseNumber}` : item.key}
                item={item}
                href={item.kind === 'course' ? courseHref(item) : undefined}
              />
            ))}
          </ul>
        </section>
      )}

      <p className="self-assessment__result-footer">{RESULT_COPY.footer}</p>

      {onRestart && (
        <div className="self-assessment__result-actions">
          <Button variant="default" onClick={onRestart} className="self-assessment__restart">
            Retake assessment
          </Button>
        </div>
      )}
    </div>
  );
}
