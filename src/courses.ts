import type {
  CourseCatalog,
  CourseCode,
  CourseNumber,
  CourseRef,
  ResourceCatalog,
  ResourceKey,
  ResourceRef,
} from './types.js';

export const ALL_COURSE_NUMBERS: readonly CourseNumber[] = Object.freeze([
  1, 2, 3, 4, 5, 6, 7,
] as const);

export const COURSES: readonly CourseRef[] = Object.freeze([
  {
    courseNumber: 1,
    courseId: '6a2b9e4ba25735cfcfe1f269',
    slug: 'foundations-of-plastics-and-plastic-waste-management',
    title: 'Foundations of Plastic Waste Management',
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
    title: 'Behaviour Change, Community Engagement, & Inclusion of the Informal Sector',
  },
  {
    courseNumber: 5,
    courseId: '6a3933d03b7909b39df54f9d',
    slug: 'business-engagement-and-decision-making-tools-for-plastic-waste-management-epr-lca-and-gpp',
    title: 'Business Engagement and Decision-Making Tools for Plastic Waste Management',
  },
  {
    courseNumber: 6,
    courseId: '6a3b4fc920a71b2b8c652265',
    slug: 'technology-innovation-data-and-monitoring-for-plastic-waste-management',
    title: 'Technology and Innovation in Plastic Waste Management',
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

export const RESOURCES: readonly ResourceRef[] = Object.freeze([
  {
    key: 'waste_picker_toolkit',
    title: 'Waste Picker Training Toolkit',
    description: 'Practical companion material for informal-sector engagement',
    assets: [],
  },
  {
    key: 'tot_manual',
    title: 'Training of Trainers (ToT) Manual',
    description: 'Facilitation material for delivering the RTP courses to your own learners',
    assets: [],
  },
] as const satisfies readonly ResourceRef[]);

export const DEFAULT_RESOURCES: ResourceCatalog = Object.freeze(
  Object.fromEntries(RESOURCES.map((r) => [r.key, r])) as ResourceCatalog,
);

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

export function catalogFromApiCourses(
  apiCourses: ReadonlyArray<{ _id?: string; slug?: string }>,
): CourseCatalog {
  const bySlug: Record<string, Partial<Omit<CourseRef, 'courseNumber'>>> = {};
  for (const course of apiCourses) {
    if (!course?.slug) continue;
    if (!course._id) continue;
    bySlug[course.slug] = { courseId: course._id };
  }
  return buildCatalog({ bySlug });
}

export function getCourse(catalog: CourseCatalog, courseNumber: CourseNumber): CourseRef {
  return catalog[courseNumber];
}

export const RESOURCE_ITEM_NAMES: Record<ResourceKey, string> = Object.freeze({
  waste_picker_toolkit: 'Waste Picker Training Toolkit',
  tot_manual: 'Training of Trainers (ToT) Manual',
});

export function courseCode(courseNumber: CourseNumber): CourseCode {
  return `C${courseNumber}` as CourseCode;
}

export function courseNumberFromCode(code: string): CourseNumber | null {
  const match = /^C([1-7])$/.exec(code);
  return match ? (Number(match[1]) as CourseNumber) : null;
}

export function resourceKeyFromItem(item: string): ResourceKey | null {
  const entry = Object.entries(RESOURCE_ITEM_NAMES).find(([, name]) => name === item);
  return entry ? (entry[0] as ResourceKey) : null;
}
