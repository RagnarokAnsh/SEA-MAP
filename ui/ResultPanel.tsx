'use client';

import { Button } from '@mantine/core';

import {
  courseNumberFromCode,
  DEFAULT_CATALOG,
  DEFAULT_RESOURCES,
  resourceKeyFromItem,
} from '../src/courses.js';
import { RESULT_COPY } from '../src/questions.js';
import type {
  CorePathEntry,
  CourseCatalog,
  CourseRef,
  OptionalEntry,
  Recommendation,
  ResourceCatalog,
} from '../src/types.js';

export interface ResultPanelProps {
  result: Recommendation;
  catalog?: CourseCatalog;
  resources?: ResourceCatalog;
  courseHref?: (course: CourseRef) => string;
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
      <path d="M8 1.5l1.5 4L13.5 7l-4 1.5L8 12.5 6.5 8.5 2.5 7l4-1.5z" fill="currentColor" />
      <path
        d="M12.75 11l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6z"
        fill="currentColor"
      />
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

function coreRationale(entry: CorePathEntry, hasContradiction: boolean): string {
  if (entry.reason === 'c1_gate') return RESULT_COPY.coreRationale.c1_gate;
  if (entry.reason === 'application') return RESULT_COPY.coreRationale.application;
  return hasContradiction
    ? RESULT_COPY.coreRationale.challengeWithConfidence
    : RESULT_COPY.coreRationale.challenge;
}

export function ResultPanel({
  result,
  catalog = DEFAULT_CATALOG,
  resources = DEFAULT_RESOURCES,
  courseHref = (course) => `/training/${course.slug}`,
  onRestart,
}: ResultPanelProps) {
  const corePath = result.core_path;
  const optional = result.optional_resources;
  const hasContradiction = result.flags.includes('challenge_confidence_contradiction');
  const intro = corePath.length > 1 ? RESULT_COPY.intro.multiple : RESULT_COPY.intro.single;

  const renderCard = (entry: CorePathEntry) => {
    const courseNumber = courseNumberFromCode(entry.course);
    if (courseNumber === null) return null;
    const course = catalog[courseNumber];
    const isAnchor = entry.reason === 'challenge';

    return (
      <article className="self-assessment__card" data-anchor={isAnchor || undefined}>
        <a className="self-assessment__card-link" href={courseHref(course)}>
          <span className="self-assessment__card-label" data-anchor={isAnchor || undefined}>
            {isAnchor ? <AnchorIcon /> : <AdditionalIcon />}
            {isAnchor ? RESULT_COPY.coreLabels.anchor : RESULT_COPY.coreLabels.additional}
          </span>
          <span className="self-assessment__card-number">Course {courseNumber}</span>
          <span className="self-assessment__card-topic">{course.title}</span>
          <span className="self-assessment__card-rationale">
            {coreRationale(entry, hasContradiction)}
          </span>
        </a>
      </article>
    );
  };

  const renderOptional = (entry: OptionalEntry) => {
    const courseNumber = courseNumberFromCode(entry.item);
    const resourceKey = courseNumber === null ? resourceKeyFromItem(entry.item) : null;
    const resource = resourceKey === null ? null : resources[resourceKey];

    const heading = courseNumber !== null ? `Course ${courseNumber}` : entry.item;
    const detail =
      courseNumber !== null ? catalog[courseNumber].title : (resource?.description ?? '');

    let rationale = RESULT_COPY.optionalRationale.role;
    if (entry.tag === 'refresher') rationale = RESULT_COPY.optionalRationale.refresher;
    else if (resourceKey !== null) rationale = RESULT_COPY.optionalRationale[resourceKey];

    const href = courseNumber !== null ? courseHref(catalog[courseNumber]) : undefined;

    return (
      <li className="self-assessment__optional-row" key={entry.item}>
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
          {detail && <span className="self-assessment__optional-detail">{detail}</span>}
          <span className="self-assessment__optional-rationale">{rationale}</span>
        </div>
        <span className="self-assessment__pill" data-tag={entry.tag}>
          {RESULT_COPY.optionalTagLabels[entry.tag]}
        </span>
      </li>
    );
  };

  return (
    <div className="self-assessment__result">
      <h1 className="self-assessment__result-title">{RESULT_COPY.title}</h1>
      <p className="self-assessment__result-intro">{intro}</p>

      <div className="self-assessment__path" data-single={corePath.length === 1 || undefined}>
        {corePath.map((entry, i) => (
          <div className="self-assessment__path-step" key={entry.course}>
            {i > 0 && <PathArrow />}
            {renderCard(entry)}
          </div>
        ))}
      </div>

      {optional.length > 0 && (
        <section className="self-assessment__optional">
          <h2 className="self-assessment__optional-title">{RESULT_COPY.optional.heading}</h2>
          <p className="self-assessment__optional-subtitle">
            {RESULT_COPY.optional.subheading}
          </p>
          <ul className="self-assessment__optional-list">{optional.map(renderOptional)}</ul>
        </section>
      )}

      <p className="self-assessment__result-footer">{RESULT_COPY.footer}</p>

      {onRestart && (
        <div className="self-assessment__result-actions">
          <Button
            variant="default"
            onClick={onRestart}
            className="self-assessment__restart"
          >
            Retake assessment
          </Button>
        </div>
      )}
    </div>
  );
}
