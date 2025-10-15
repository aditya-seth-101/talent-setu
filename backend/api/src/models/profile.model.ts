import type { ObjectId } from "mongodb";
import {
  mergeLegacyLearningProgress,
  type LearningProgressState,
} from "./learning-progress.model.js";

export type AvailabilityStatus = "open" | "interviewing" | "unavailable";

export interface ProfileDocument {
  _id: ObjectId;
  userId: ObjectId;
  displayName: string;
  headline?: string;
  location?: string;
  experienceYears?: number;
  technologies: ObjectId[];
  resumeUrl?: string;
  availability?: AvailabilityStatus;
  learningProgress: LearningProgressState;
  recruitmentScore?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProfileInput {
  userId: ObjectId;
  displayName: string;
  headline?: string;
  location?: string;
  experienceYears?: number;
  technologies?: ObjectId[];
  resumeUrl?: string;
  availability?: AvailabilityStatus;
  learningProgress?: LearningProgressState;
  recruitmentScore?: number;
}

export interface UpdateProfileInput {
  displayName?: string | null;
  headline?: string | null;
  location?: string | null;
  experienceYears?: number | null;
  technologies?: ObjectId[] | null;
  resumeUrl?: string | null;
  availability?: AvailabilityStatus | null;
  learningProgress?: LearningProgressState | null;
  recruitmentScore?: number | null;
}

export type PublicProfile = {
  id: string;
  userId: string;
  displayName: string;
  headline?: string | null;
  location?: string | null;
  experienceYears?: number | null;
  technologies: string[];
  resumeUrl?: string | null;
  availability?: AvailabilityStatus | null;
  learningProgress: LearningProgressState;
  recruitmentScore?: number | null;
  createdAt: string;
  updatedAt: string;
};

export function mapProfileToPublic(profile: ProfileDocument): PublicProfile {
  return {
    id: profile._id.toHexString(),
    userId: profile.userId.toHexString(),
    displayName: profile.displayName,
    headline: profile.headline ?? null,
    location: profile.location ?? null,
    experienceYears: profile.experienceYears ?? null,
    technologies: profile.technologies.map((id) => id.toHexString()),
    resumeUrl: profile.resumeUrl ?? null,
    availability: profile.availability ?? null,
    learningProgress: mergeLegacyLearningProgress(profile.learningProgress),
    recruitmentScore: profile.recruitmentScore ?? null,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  };
}
