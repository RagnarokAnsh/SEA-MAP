import type { CourseCatalog, CourseNumber, CourseRef } from './types.js';

export const ALL_COURSE_NUMBERS: readonly CourseNumber[] = Object.freeze([
  1, 2, 3, 4, 5, 6, 7,
] as const);

// The seven RTP courses, pulled from GET /v2/course on staging.
//
// Two things worth knowing:
//
//  - These are STAGING ids. Production will be different, so bind the catalog
//    to the live api with catalogFromApiCourses() instead of trusting them.
//
//  - The assessment pdf only ever says "Course 1".."Course 7" - it never names
//    them. The numbering below was worked out by matching subject matter
//    (Course 2 = circular economy, Course 3 = 3Rs, and so on). All seven line
//    up cleanly, but it is worth someone who knows the course content casting
//    an eye over it. Fixing one is a one-line change here.
export const COURSES: readonly CourseRef[] = Object.freeze([
  {
    courseNumber: 1,
    courseId: '6a2b9e4ba25735cfcfe1f269',
    slug: 'foundations-of-plastics-and-plastic-waste-management',
    title: 'Foundations of Plastics and Plastic Waste Management',
  },
  {
    courseNumber: 2,
    courseId: '6a3b4a8220a71b2b8c65188d',
    slug: 'circular-economy-approaches-for-plastic-waste-management',
    title: 'Circular Economy Approaches for Plastic Waste Management',
  },
  {
    courseNumber: 3,
    courseId: '6a3b4c4d20a71b2b8c651b4e',
    slug: 'applied-3rs-in-plastic-waste-management',
    title: 'Applied 3Rs in Plastic Waste Management',
  },
  {
    courseNumber: 4,
    courseId: '6a3b4d7220a71b2b8c651e4b',
    slug: 'community-engagement-behaviour-change-and-informal-sector-inclusion',
    title: 'Community Engagement, Behaviour Change, and Informal Sector Inclusion',
  },
  {
    courseNumber: 5,
    courseId: '6a3933d03b7909b39df54f9d',
    slug: 'business-engagement-and-decision-making-tools-for-plastic-waste-management-epr-lca-and-gpp',
    title:
      'Business Engagement and Decision-Making Tools for Plastic Waste Management: EPR, LCA and GPP',
  },
  {
    courseNumber: 6,
    courseId: '6a3b4fc920a71b2b8c652265',
    slug: 'technology-innovation-data-and-monitoring-for-plastic-waste-management',
    title: 'Technology, Innovation, Data, and Monitoring for Plastic Waste Management',
  },
  {
    courseNumber: 7,
    courseId: '6a3b502c20a71b2b8c652287',
    slug: 'inclusive-policy-governance-and-gender-responsive-implementation',
    title: 'Inclusive Policy, Governance, and Gender-Responsive Implementation',
  },
] as const satisfies readonly CourseRef[]);

export const DEFAULT_CATALOG: CourseCatalog = Object.freeze(
  Object.fromEntries(COURSES.map((c) => [c.courseNumber, c])) as CourseCatalog,
);

// Override ids/slugs/titles for another environment. Anything you leave out
// keeps whats in COURSES above.
//
//   buildCatalog({ byCourseNumber: { 3: { courseId: 'prod-id-here' } } })
export function buildCatalog(overrides: {
  byCourseNumber?: Partial<Record<CourseNumber, Partial<Omit<CourseRef, 'courseNumber'>>>>;
  bySlug?: Record<string, Partial<Omit<CourseRef, 'courseNumber'>>>;
}): CourseCatalog {
  const entries = COURSES.map((course) => {
    const byNumber = overrides.byCourseNumber?.[course.courseNumber] ?? {};
    const bySlug = overrides.bySlug?.[course.slug] ?? {};
    return [course.courseNumber, { ...course, ...bySlug, ...byNumber }] as const;
  });
  return Object.fromEntries(entries) as CourseCatalog;
}

// Bind the catalog to a live GET /v2/course response, matching on slug.
// Slugs are stable across environments, ids arent - so this is how you make
// the same build work on staging and prod.
//
// Courses missing from the response keep their defaults, so a partial or
// failed response wont break anything.
export function catalogFromApiCourses(
  apiCourses: ReadonlyArray<{ _id?: string; slug?: string; title?: string }>,
): CourseCatalog {
  const bySlug: Record<string, Partial<Omit<CourseRef, 'courseNumber'>>> = {};
  for (const course of apiCourses) {
    if (!course?.slug) continue;
    const patch: Partial<Omit<CourseRef, 'courseNumber'>> = { slug: course.slug };
    if (course._id) patch.courseId = course._id;
    if (course.title) patch.title = course.title;
    bySlug[course.slug] = patch;
  }
  return buildCatalog({ bySlug });
}

export function getCourse(catalog: CourseCatalog, courseNumber: CourseNumber): CourseRef {
  return catalog[courseNumber];
}
