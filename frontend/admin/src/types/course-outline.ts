export type OutlineReviewStatus = "pending" | "approved" | "rejected";

export interface CourseOutlineSummary {
  id: string;
  requestId: string;
  technology: string;
  technologySlug: string;
  requestedLevel: "beginner" | "intermediate" | "advanced";
  seed?: string;
  forceRefresh?: boolean;
  reviewStatus: OutlineReviewStatus;
  reviewNotes?: string | null;
  requestedBy: string;
  requestedByEmail?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  metadata: {
    aiServiceUrl: string;
    model?: string;
    cached?: boolean;
  };
  outline: CourseOutline;
  createdAt: string;
  updatedAt: string;
  generatedAt: string;
}

export interface CourseOutline {
  courseTitle: string;
  technology: string;
  description: string;
  languageKey: string;
  levels: CourseLevel[];
}

export interface CourseLevel {
  level: "beginner" | "intermediate" | "advanced";
  topics: CourseTopic[];
}

export interface CourseTopic {
  title: string;
  description: string;
  level: "beginner" | "intermediate" | "advanced";
  youtubeSearchQuery: string;
  youtubeLink?: string;
  starterCode: string;
  prerequisites: string[];
  mcqs: CourseMCQ[];
  codingChallenge: CourseCodingChallenge;
}

export interface CourseMCQ {
  question: string;
  options: string[];
  answerIndex: number;
}

export interface CourseCodingChallenge {
  prompt: string;
  sampleInput?: string;
  sampleOutput?: string;
  languageKey: string;
}

export interface CourseOutlineListResponse {
  outlines: CourseOutlineSummary[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ListCourseOutlineParams {
  status?: OutlineReviewStatus | OutlineReviewStatus[];
  technology?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface UpdateCourseOutlineReviewPayload {
  reviewStatus: OutlineReviewStatus;
  reviewNotes?: string | null;
}

export interface CourseOutlineDetailResponse {
  outline: CourseOutlineSummary;
}
