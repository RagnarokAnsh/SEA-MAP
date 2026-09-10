'use client';

import { Alert, Badge, Button, Text, Title } from '@mantine/core';

import { RESULT_COPY } from '../src/questions.js';
import type { Recommendation, RecommendedCourse } from '../src/types.js';

export interface ResultPanelProps {
  result: Recommendation;
  // course urls are /training/<slug> - matches buildCoursePath in the app
  courseHref?: (course: RecommendedCourse) => string;
  onRestart?: () => void;
  // Where "Open training" goes. The mockup on p5/p10 of the pdf has this as
  // the primary button but never says what it opens, so it defaults to the
  // first course of the main path and falls back to the catalogue.
  openTrainingHref?: string;
}

function CourseList({
  courses,
  courseHref,
}: {
  courses: RecommendedCourse[];
  courseHref: (course: RecommendedCourse) => string;
}) {
  return (
    <ul className="self-assessment__course-list">
      {courses.map((course) => (
        <li key={course.courseNumber} className="self-assessment__course">
          <a className="self-assessment__course-link" href={courseHref(course)}>
            <span className="self-assessment__course-number">
              Course {course.courseNumber}
            </span>
            <span className="self-assessment__course-title">{course.title}</span>
          </a>
          {course.isRefresher && (
            <Badge
              variant="light"
              color="gray"
              className="self-assessment__course-badge"
              title="You told us you already have training in this area"
            >
              {RESULT_COPY.refresherLabel}
            </Badge>
          )}
        </li>
      ))}
    </ul>
  );
}

export function ResultPanel({
  result,
  courseHref = (course) => `/training/${course.slug}`,
  onRestart,
  openTrainingHref,
}: ResultPanelProps) {
  const firstCourse = result.mainLearningPath[0] ?? result.additionalRecommendedCourses[0];
  const openHref = openTrainingHref ?? (firstCourse ? courseHref(firstCourse) : '/training');
  const sections = [
    { copy: RESULT_COPY.mainLearningPath, courses: result.mainLearningPath },
    {
      copy: RESULT_COPY.additionalRecommendedCourses,
      courses: result.additionalRecommendedCourses,
    },
  ].filter((section) => section.courses.length > 0);

  const nothingAtAll =
    sections.length === 0 && result.supplementaryResources.length === 0;

  return (
    <div className="self-assessment__result">
      <Title order={1} className="self-assessment__result-title">
        {RESULT_COPY.title}
      </Title>
      <Text component="p" className="self-assessment__result-intro">
        {RESULT_COPY.intro}
      </Text>

      {/* internal notices are for us, not the learner - don't render those */}
      {result.notices
        .filter((notice) => notice.audience === 'learner')
        .map((notice) => (
          <Alert
            key={notice.code}
            variant="light"
            color={notice.code === 'EMPTY_RECOMMENDATION' ? 'yellow' : 'blue'}
            className="self-assessment__notice"
          >
            {notice.message}
          </Alert>
        ))}

      {nothingAtAll && (
        <div className="self-assessment__empty">
          <Text component="p">
            Your answers dont point to a specific course. Have a look through the full
            catalogue and pick whatever fits.
          </Text>
          <Button component="a" href="/training" variant="filled">
            Browse all courses
          </Button>
        </div>
      )}

      {sections.map(({ copy, courses }) => (
        <section key={copy.heading} className="self-assessment__section">
          <Title order={2} className="self-assessment__section-title">
            {copy.heading}
          </Title>
          <Text component="p" className="self-assessment__section-description">
            {copy.description}
          </Text>
          <CourseList courses={courses} courseHref={courseHref} />
        </section>
      ))}

      {result.supplementaryResources.length > 0 && (
        <section className="self-assessment__section self-assessment__section--resources">
          <Title order={2} className="self-assessment__section-title">
            Also included
          </Title>
          <ul className="self-assessment__course-list">
            {result.supplementaryResources.map((resource) => (
              <li key={resource.key} className="self-assessment__course">
                <span className="self-assessment__course-title">{resource.title}</span>
                <Text component="p" className="self-assessment__resource-description">
                  {resource.description}
                </Text>
                {/* pdfs, videos, manuals - downloads, nothing to enrol into */}
                {resource.assets.length > 0 && (
                  <ul className="self-assessment__asset-list">
                    {resource.assets.map((asset) => (
                      <li key={asset.url} className="self-assessment__asset">
                        <a href={asset.url} className="self-assessment__asset-link">
                          {asset.title}
                        </a>
                        <span className="self-assessment__asset-type">{asset.type}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* two buttons side by side, same as the mockup on p5/p10 */}
      <div className="self-assessment__result-actions">
        {onRestart && (
          <Button
            variant="default"
            onClick={onRestart}
            className="self-assessment__restart"
          >
            Retake assessment
          </Button>
        )}
        {!nothingAtAll && (
          <Button
            component="a"
            href={openHref}
            variant="filled"
            className="self-assessment__open-training"
          >
            Open training
          </Button>
        )}
      </div>
    </div>
  );
}
