'use client';

import { useCallback } from 'react';

import { catalogFromApiCourses, evaluate, pendingEnrollments } from '../src/index.js';
import type { Answers, Recommendation } from '../src/types.js';
import { SelfAssessment } from '../ui/index.js';

declare const api: {
  getCourses: () => Promise<{ data: unknown }>;
  getUserCourses: () => Promise<{ data: unknown }>;
  enrollCourse: (payload: unknown) => Promise<unknown>;
};

export default function SelfAssessmentPage() {
  const handleSubmit = useCallback(async (answers: Answers): Promise<Recommendation> => {
    const response = await api.getCourses();
    const list = (response as { data?: { data?: unknown[] } | unknown[] }).data;
    const courses = (Array.isArray(list) ? list : (list?.data ?? [])) as {
      _id?: string;
      slug?: string;
    }[];

    const recommendation = evaluate(answers, {
      catalog: catalogFromApiCourses(courses),
    });

    const mine = await api.getUserCourses();
    const pending = pendingEnrollments(recommendation, extractEnrolledIds(mine));

    const failed: string[] = [];
    for (const courseId of pending.courseIds) {
      try {
        await api.enrollCourse({ course: courseId });
      } catch {
        failed.push(courseId);
      }
    }

    if (failed.length > 0) {
      console.error('[self-assessment] enrolment failed for', failed);
    }

    return recommendation;
  }, []);

  return <SelfAssessment onSubmit={handleSubmit} />;
}

function extractEnrolledIds(response: { data: unknown }): string[] {
  const raw = response?.data as { data?: unknown[] } | unknown[] | undefined;
  const list = (Array.isArray(raw) ? raw : (raw?.data ?? [])) as {
    course?: { _id?: string };
  }[];
  return list.map((entry) => entry?.course?._id).filter((id): id is string => !!id);
}
