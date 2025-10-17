export type TalentAvailability = "open" | "interviewing" | "unavailable";

export interface LearningProgressState {
  courses: Record<string, unknown>;
  totals: Record<string, unknown>;
}

export interface PublicProfile {
  id: string;
  userId: string;
  displayName: string;
  headline: string | null;
  location: string | null;
  experienceYears: number | null;
  technologies: string[];
  resumeUrl: string | null;
  availability: TalentAvailability | null;
  learningProgress: LearningProgressState;
  recruitmentScore: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface TechnologySummary {
  id: string;
  name: string;
  slug: string;
}

export interface AssessmentSummary {
  total: number;
  completed: number;
  lastAssessmentAt: string | null;
  lastAssessmentId: string | null;
  lastAssessmentStatus: string | null;
  kioskVerified: boolean;
}

export interface TalentSearchResult {
  profile: PublicProfile;
  technologies: TechnologySummary[];
  assessments: AssessmentSummary;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface TalentSearchResponse {
  talent: TalentSearchResult[];
  pagination: PaginationInfo;
}

export interface TalentAssessmentDetail extends AssessmentSummary {
  averageScore: number | null;
  recent: Array<{
    id: string;
    templateId: string;
    templateName: string | null;
    status: string;
    kioskFlag: boolean;
    durationMinutes: number;
    startedAt: string | null;
    completedAt: string | null;
    updatedAt: string;
    totalPhases: number;
    completedPhases: number;
    averageScore: number | null;
  }>;
}

export interface TalentProfileDetail {
  profile: PublicProfile;
  technologies: TechnologySummary[];
  assessments: TalentAssessmentDetail;
}

export interface TalentSearchFilters {
  q?: string;
  location?: string;
  technology?: string | string[];
  availability?: TalentAvailability | TalentAvailability[];
  minExperience?: number;
  maxExperience?: number;
  minRecruitmentScore?: number;
  maxRecruitmentScore?: number;
  kioskVerified?: boolean;
  hasAssessments?: boolean;
  sort?: "score" | "recent" | "experience";
  page?: number;
  limit?: number;
}
