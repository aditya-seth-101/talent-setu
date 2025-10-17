export interface TechnologySummary {
  id: string;
  name: string;
  slug: string;
  aliases: string[];
  judge0LanguageKey: string;
  judge0LanguageId: number | null;
  status: "active" | "deprecated";
}

export interface TechnologyRequestUser {
  id: string;
  email: string;
  displayName: string | null;
}

export interface TechnologySearchResponse {
  technologies: TechnologySummary[];
}

export interface TechnologyRequest {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  aliases: string[];
  status: "pending" | "approved" | "rejected";
  requestedBy: string;
  requestedByUser: TechnologyRequestUser | null;
  reviewerId: string | null;
  reviewer: TechnologyRequestUser | null;
  reviewerNotes: string | null;
  mappedTechnologyId: string | null;
  createdTechnologyId: string | null;
  candidateTechnologyIds: string[];
  candidates: TechnologySummary[];
  createdAt: string;
  updatedAt: string;
}

export interface TechnologyRequestListResponse {
  requests: TechnologyRequest[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface TechnologyRequestCreateResponse {
  request: TechnologyRequest;
  suggestions: TechnologySummary[];
  duplicate: boolean;
  duplicateOf?: string;
}

export type TechnologyRequestDecisionPayload =
  | {
      decision: "reject";
      notes?: string;
    }
  | {
      decision: "approve";
      notes?: string;
      mapping:
        | {
            type: "mapExisting";
            technologyId: string;
            aliases?: string[];
          }
        | {
            type: "createNew";
            aliases?: string[];
            judge0LanguageKey?: string;
            judge0LanguageId?: number;
          };
    };
