// Drop-in for app/training/self-assessment/page.tsx.
//
// That route already exists and is auth gated (it 307s to
// /training?login=required), and the CTA on /training already points at it, so
// this is really just filling in what sits behind the door.
//
// The api calls use the existing service object - check the import path, and
// see the note on enrollCourse before shipping.
'use client';

import { useCallback } from 'react';

import { SelfAssessment } from '../ui/index.js';
import { catalogFromApiCourses, evaluate, pendingEnrollments } from '../src/index.js';
import type { Answers, Recommendation } from '../src/types.js';

// import api from '@/services/api';
declare const api: {
  getCourses: () => Promise<{ data: unknown }>;
  getUserCourses: () => Promise<{ data: unknown }>;
  enrollCourse: (payload: unknown) => Promise<unknown>;
};

export default function SelfAssessmentPage() {
  const handleSubmit = useCallback(async (answers: Answers): Promise<Recommendation> => {
    // Pull the live course list and rebind the catalog to it, so this uses the
    // current environment's ids rather than the staging ones in courses.ts.
    // Matches on slug, which doesn't change between environments.
    const response = await api.getCourses();
    const list = (response as { data?: { data?: unknown[] } | unknown[] }).data;
    const courses = (Array.isArray(list) ? list : (list?.data ?? [])) as {
      _id?: string;
      slug?: string;
      title?: string;
    }[];

    const recommendation = evaluate(answers, {
      catalog: catalogFromApiCourses(courses),
    });

    // Skip anything they're already enrolled in. Matters on a retake, where
    // most of the list will already be there - and it means we never send a
    // duplicate, so we don't have to care what the endpoint does with one.
    const mine = await api.getUserCourses();
    const enrolledIds = extractEnrolledIds(mine);
    const pending = pendingEnrollments(recommendation, enrolledIds);

    // One at a time on purpose. Promise.all just hammers the api and makes
    // partial failures harder to report.
    const failed: string[] = [];
    for (const courseId of pending.courseIds) {
      try {
        // TODO: double check this payload against the existing enrollCourse
        // call in the repo. Endpoint is POST /v2/user/course but I couldn't
        // see the body shape from outside.
        await api.enrollCourse({ course: courseId });
      } catch {
        failed.push(courseId);
      }
    }

    if (failed.length > 0) {
      // don't throw - they've done the quiz, show them the result anyway and
      // let them enrol manually from the course cards
      console.error('[self-assessment] enrolment failed for', failed);
    }

    // Nothing ever gets un-enrolled, including on a retake. Dropping someone
    // out of a course they're halfway through would lose their progress.
    //
    // recommendation.flags.requiresManualReview means Q1 was "Other" - the
    // learner still gets their Q2-Q6 courses, but the free text is worth a
    // look. The matching notice is tagged 'internal' so it isn't shown to them.

    return recommendation;
  }, []);

  return <SelfAssessment onSubmit={handleSubmit} />;
}

// GET /v2/user/course comes back as a list of enrolments, each wrapping a
// course object - see the userCourses slice in their redux store.
function extractEnrolledIds(response: { data: unknown }): string[] {
  const raw = response?.data as { data?: unknown[] } | unknown[] | undefined;
  const list = (Array.isArray(raw) ? raw : (raw?.data ?? [])) as {
    course?: { _id?: string };
  }[];
  return list.map((entry) => entry?.course?._id).filter((id): id is string => !!id);
}
