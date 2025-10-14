export type Role = "student" | "recruiter" | "admin" | "proctor";

export interface PublicUser {
  id: string;
  email: string;
  roles: Role[];
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export interface PublicProfile {
  id: string;
  userId: string;
  displayName: string;
  headline?: string | null;
  location?: string | null;
  experienceYears?: number | null;
  technologies: string[];
  resumeUrl?: string | null;
  availability?: "open" | "interviewing" | "unavailable" | null;
  learningProgress: Record<string, unknown>;
  recruitmentScore?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthTokensResponse {
  tokens: TokenPair;
}

export interface LoginResponse extends AuthTokensResponse {
  user: PublicUser;
  profile?: PublicProfile;
  emailVerificationRequired?: boolean;
}

export interface SignupResponse extends AuthTokensResponse {
  user: PublicUser;
  profile?: PublicProfile;
  emailVerificationSent: boolean;
}

export interface CurrentUserResponse {
  user: PublicUser;
  profile: PublicProfile;
}

export interface PublicRole {
  id: string;
  slug: Role;
  name: string;
  description: string | null;
  assignable: boolean;
}
