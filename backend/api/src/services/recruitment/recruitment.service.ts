import { ObjectId } from "mongodb";
import { z } from "zod";
import {
  mapProfileToPublic,
  type PublicProfile,
} from "../../models/profile.model.js";
import { searchProfilesForRecruitment } from "../../repositories/profile.repository.js";
import { findTechnologiesByIds } from "../../repositories/technology.repository.js";
import {
  listAssessments,
  type AssessmentDocument,
} from "../../repositories/assessment.repository.js";
import { findTemplatesByIds } from "../../repositories/assessment-template.repository.js";
import { findProfileById } from "../../repositories/profile.repository.js";
import { BadRequestError, NotFoundError } from "../../utils/http-errors.js";

const availabilityEnum = z.enum(["open", "interviewing", "unavailable"]);
const objectIdSchema = z.string().length(24, "Invalid id");

const booleanInputSchema = z
  .preprocess((value) => {
    if (value === undefined) {
      return undefined;
    }
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "number") {
      return value !== 0;
    }
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (["true", "1", "yes", "on"].includes(normalized)) {
        return true;
      }
      if (["false", "0", "no", "off"].includes(normalized)) {
        return false;
      }
    }
    return value;
  }, z.boolean())
  .optional();

const searchTalentQuerySchema = z
  .object({
    q: z.string().trim().min(1).optional(),
    location: z.string().trim().min(1).optional(),
    technology: z
      .union([objectIdSchema, z.array(objectIdSchema).nonempty()])
      .optional(),
    availability: z
      .union([availabilityEnum, z.array(availabilityEnum).nonempty()])
      .optional(),
    minExperience: z.coerce.number().min(0).max(60).optional(),
    maxExperience: z.coerce.number().min(0).max(60).optional(),
    minRecruitmentScore: z.coerce.number().min(0).max(10000).optional(),
    maxRecruitmentScore: z.coerce.number().min(0).max(10000).optional(),
    kioskVerified: booleanInputSchema,
    hasAssessments: booleanInputSchema,
    sort: z.enum(["score", "recent", "experience"]).default("score"),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict();

const profileIdSchema = objectIdSchema;

type TechnologySummary = {
  id: string;
  name: string;
  slug: string;
};

type TalentSearchResult = {
  profile: PublicProfile;
  technologies: TechnologySummary[];
  assessments: {
    total: number;
    completed: number;
    lastAssessmentAt: string | null;
    lastAssessmentId: string | null;
    lastAssessmentStatus: string | null;
    kioskVerified: boolean;
  };
};

type TalentProfileDetail = {
  profile: PublicProfile;
  technologies: TechnologySummary[];
  assessments: {
    total: number;
    completed: number;
    kioskVerified: boolean;
    lastAssessmentAt: string | null;
    lastAssessmentId: string | null;
    lastAssessmentStatus: string | null;
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
  };
};

export async function searchTalent(query: unknown): Promise<{
  talent: TalentSearchResult[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> {
  const parsed = searchTalentQuerySchema.parse(query);

  if (
    parsed.minExperience !== undefined &&
    parsed.maxExperience !== undefined &&
    parsed.minExperience > parsed.maxExperience
  ) {
    throw new BadRequestError(
      "minExperience cannot be greater than maxExperience"
    );
  }

  if (
    parsed.minRecruitmentScore !== undefined &&
    parsed.maxRecruitmentScore !== undefined &&
    parsed.minRecruitmentScore > parsed.maxRecruitmentScore
  ) {
    throw new BadRequestError(
      "minRecruitmentScore cannot be greater than maxRecruitmentScore"
    );
  }

  const page = parsed.page;
  const limit = parsed.limit;
  const skip = (page - 1) * limit;

  const technologyIds = normalizeToArray(parsed.technology).map(
    (value) => new ObjectId(value)
  );
  const availability = normalizeToArray(parsed.availability);

  const { items, total } = await searchProfilesForRecruitment({
    technologyIds: technologyIds.length ? technologyIds : undefined,
    location: parsed.location,
    text: parsed.q,
    minExperience: parsed.minExperience,
    maxExperience: parsed.maxExperience,
    availability: availability.length ? availability : undefined,
    minRecruitmentScore: parsed.minRecruitmentScore,
    maxRecruitmentScore: parsed.maxRecruitmentScore,
    requireAssessments: parsed.hasAssessments,
    requireVerified: parsed.kioskVerified,
    limit,
    skip,
    sortBy: parsed.sort,
  });

  const technologyIdSet = new Set<string>();
  for (const item of items) {
    for (const tech of item.technologies) {
      technologyIdSet.add(tech.toHexString());
    }
  }

  const technologyDocs = await findTechnologiesByIds([...technologyIdSet]);
  const technologyMap = new Map<string, TechnologySummary>();
  for (const tech of technologyDocs) {
    technologyMap.set(tech._id.toHexString(), {
      id: tech._id.toHexString(),
      name: tech.name,
      slug: tech.slug,
    });
  }

  const talent = items.map<TalentSearchResult>((aggregate) => {
    const profile = mapProfileToPublic(aggregate);
    const technologies = aggregate.technologies
      .map((techId) => technologyMap.get(techId.toHexString()))
      .filter((value): value is TechnologySummary => Boolean(value))
      .sort((a, b) => a.name.localeCompare(b.name));

    const summary = aggregate.assessmentSummary;

    return {
      profile,
      technologies,
      assessments: {
        total: summary.totalAssessments,
        completed: summary.completedAssessments,
        lastAssessmentAt: summary.lastAssessmentAt
          ? summary.lastAssessmentAt.toISOString()
          : null,
        lastAssessmentId: summary.lastAssessmentId
          ? summary.lastAssessmentId.toHexString()
          : null,
        lastAssessmentStatus: summary.lastAssessmentStatus,
        kioskVerified: summary.kioskVerified,
      },
    };
  });

  return {
    talent,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

export async function getTalentProfileDetail(
  profileId: string
): Promise<TalentProfileDetail> {
  const parsedProfileId = profileIdSchema.parse(profileId);
  const profile = await findProfileById(parsedProfileId);

  if (!profile) {
    throw new NotFoundError("Profile not found");
  }

  const [technologyDocs, assessments] = await Promise.all([
    findTechnologiesByIds(profile.technologies),
    listAssessments({ candidateId: profile.userId }),
  ]);

  const technologySummaries = technologyDocs
    .map<TechnologySummary>((tech) => ({
      id: tech._id.toHexString(),
      name: tech.name,
      slug: tech.slug,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const summary = buildAssessmentSummary(assessments);

  const templateIds = Array.from(
    new Set(
      assessments.map((assessment) => assessment.templateId.toHexString())
    )
  );
  const templateDocs = await findTemplatesByIds(templateIds);
  const templateMap = new Map<string, { id: string; name: string }>();
  for (const template of templateDocs) {
    templateMap.set(template._id.toHexString(), {
      id: template._id.toHexString(),
      name: template.name,
    });
  }

  const recentAssessments = assessments.slice(0, 10).map((assessment) => {
    const phaseStats = computePhaseStats(assessment);
    const templateInfo = templateMap.get(assessment.templateId.toHexString());

    return {
      id: assessment._id.toHexString(),
      templateId: assessment.templateId.toHexString(),
      templateName: templateInfo?.name ?? null,
      status: assessment.status,
      kioskFlag: assessment.kioskFlag,
      durationMinutes: assessment.durationMinutes,
      startedAt: assessment.startedAt
        ? assessment.startedAt.toISOString()
        : null,
      completedAt: assessment.completedAt
        ? assessment.completedAt.toISOString()
        : null,
      updatedAt: assessment.updatedAt.toISOString(),
      totalPhases: phaseStats.totalPhases,
      completedPhases: phaseStats.completedPhases,
      averageScore: phaseStats.averageScore,
    };
  });

  return {
    profile: mapProfileToPublic(profile),
    technologies: technologySummaries,
    assessments: {
      total: summary.totalAssessments,
      completed: summary.completedAssessments,
      kioskVerified: summary.kioskVerified,
      lastAssessmentAt: summary.lastAssessmentAt,
      lastAssessmentId: summary.lastAssessmentId,
      lastAssessmentStatus: summary.lastAssessmentStatus,
      averageScore: summary.averageScore,
      recent: recentAssessments,
    },
  };
}

function normalizeToArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function buildAssessmentSummary(assessments: AssessmentDocument[]): {
  totalAssessments: number;
  completedAssessments: number;
  kioskVerified: boolean;
  lastAssessmentAt: string | null;
  lastAssessmentId: string | null;
  lastAssessmentStatus: string | null;
  averageScore: number | null;
} {
  if (assessments.length === 0) {
    return {
      totalAssessments: 0,
      completedAssessments: 0,
      kioskVerified: false,
      lastAssessmentAt: null,
      lastAssessmentId: null,
      lastAssessmentStatus: null,
      averageScore: null,
    };
  }

  const totalAssessments = assessments.length;
  const completedAssessments = assessments.filter(
    (assessment) => assessment.status === "completed"
  ).length;
  const kioskVerified = assessments.some(
    (assessment) => assessment.status === "completed" && assessment.kioskFlag
  );

  const lastAssessment = assessments[0] ?? null;

  let aggregateScore = 0;
  let aggregateMaxScore = 0;

  for (const assessment of assessments) {
    const stats = computePhaseStats(assessment);
    if (stats.rawScore !== null && stats.rawMaxScore !== null) {
      aggregateScore += stats.rawScore;
      aggregateMaxScore += stats.rawMaxScore;
    }
  }

  const averageScore =
    aggregateMaxScore > 0
      ? Math.round((aggregateScore / aggregateMaxScore) * 100)
      : null;

  return {
    totalAssessments,
    completedAssessments,
    kioskVerified,
    lastAssessmentAt: lastAssessment?.updatedAt
      ? lastAssessment.updatedAt.toISOString()
      : null,
    lastAssessmentId: lastAssessment?._id.toHexString() ?? null,
    lastAssessmentStatus: lastAssessment?.status ?? null,
    averageScore,
  };
}

function computePhaseStats(assessment: AssessmentDocument): {
  totalPhases: number;
  completedPhases: number;
  averageScore: number | null;
  rawScore: number | null;
  rawMaxScore: number | null;
} {
  const totalPhases = assessment.phases.length;
  const completedPhases = assessment.phases.filter(
    (phase) => phase.status === "completed"
  ).length;

  let scoreAccumulator = 0;
  let maxAccumulator = 0;

  for (const phase of assessment.phases) {
    const evaluation = phase.evaluation;
    if (
      evaluation &&
      typeof evaluation.score === "number" &&
      typeof evaluation.maxScore === "number" &&
      evaluation.maxScore > 0
    ) {
      scoreAccumulator += evaluation.score;
      maxAccumulator += evaluation.maxScore;
    }
  }

  const averageScore =
    maxAccumulator > 0
      ? Math.round((scoreAccumulator / maxAccumulator) * 100)
      : null;

  return {
    totalPhases,
    completedPhases,
    averageScore,
    rawScore: maxAccumulator > 0 ? scoreAccumulator : null,
    rawMaxScore: maxAccumulator > 0 ? maxAccumulator : null,
  };
}
