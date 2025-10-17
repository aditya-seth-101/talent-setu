import { describe, it, expect, vi, beforeEach } from "vitest";
import { ObjectId } from "mongodb";
import { createEmptyLearningProgress } from "../src/models/learning-progress.model.js";
import type { RecruitmentProfileAggregate } from "../src/repositories/profile.repository.js";
import type { AssessmentDocument } from "../src/repositories/assessment.repository.js";
import type { AssessmentTemplateDocument } from "../src/models/assessment-template.model.js";
import * as profileRepository from "../src/repositories/profile.repository.js";
import * as technologyRepository from "../src/repositories/technology.repository.js";
import * as assessmentRepository from "../src/repositories/assessment.repository.js";
import * as assessmentTemplateRepository from "../src/repositories/assessment-template.repository.js";
import * as recruitmentService from "../src/services/recruitment/recruitment.service.js";
import { NotFoundError } from "../src/utils/http-errors.js";

vi.mock("../src/repositories/profile.repository.js");
vi.mock("../src/repositories/technology.repository.js");
vi.mock("../src/repositories/assessment.repository.js");
vi.mock("../src/repositories/assessment-template.repository.js");

describe("recruitment service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns aggregated talent search results", async () => {
    const profileId = new ObjectId();
    const userId = new ObjectId();
    const technologyId = new ObjectId();
    const summaryId = new ObjectId();

    const aggregate: RecruitmentProfileAggregate = {
      _id: profileId,
      userId,
      displayName: "Alice Johnson",
      headline: "Senior Fullstack Engineer",
      location: "Remote",
      experienceYears: 7,
      technologies: [technologyId],
      resumeUrl: undefined,
      availability: "open",
      learningProgress: createEmptyLearningProgress(),
      recruitmentScore: 780,
      createdAt: new Date("2024-01-02T10:00:00Z"),
      updatedAt: new Date("2024-01-05T10:00:00Z"),
      assessmentSummary: {
        totalAssessments: 3,
        completedAssessments: 2,
        lastAssessmentAt: new Date("2024-01-04T10:00:00Z"),
        lastAssessmentId: summaryId,
        lastAssessmentStatus: "completed",
        kioskVerified: true,
      },
    };

    vi.mocked(profileRepository.searchProfilesForRecruitment).mockResolvedValue(
      {
        items: [aggregate],
        total: 1,
      }
    );

    vi.mocked(technologyRepository.findTechnologiesByIds).mockResolvedValue([
      {
        _id: technologyId,
        name: "JavaScript",
        slug: "javascript",
        judge0_language_key: "javascript",
        aliases: [],
        levels: ["beginner"],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const result = await recruitmentService.searchTalent({});

    expect(result.pagination.total).toBe(1);
    expect(result.talent).toHaveLength(1);
    const [talent] = result.talent;

    expect(talent.profile.id).toBe(profileId.toHexString());
    expect(talent.assessments.total).toBe(3);
    expect(talent.assessments.completed).toBe(2);
    expect(talent.assessments.kioskVerified).toBe(true);
    expect(talent.assessments.lastAssessmentId).toBe(summaryId.toHexString());
    expect(talent.technologies).toEqual([
      {
        id: technologyId.toHexString(),
        name: "JavaScript",
        slug: "javascript",
      },
    ]);
  });

  it("returns detailed talent profile with assessments", async () => {
    const profileId = new ObjectId();
    const userId = new ObjectId();
    const technologyId = new ObjectId();
    const templateId = new ObjectId();
    const assessmentId = new ObjectId();

    vi.mocked(profileRepository.findProfileById).mockResolvedValue({
      _id: profileId,
      userId,
      displayName: "Charlie Rivera",
      headline: "Backend Specialist",
      location: "NYC",
      experienceYears: 5,
      technologies: [technologyId],
      resumeUrl: undefined,
      availability: "open",
      learningProgress: createEmptyLearningProgress(),
      recruitmentScore: 640,
      createdAt: new Date("2024-02-01T12:00:00Z"),
      updatedAt: new Date("2024-02-03T12:00:00Z"),
    });

    const assessment: AssessmentDocument = {
      _id: assessmentId,
      templateId,
      recruiterId: new ObjectId(),
      candidateId: userId,
      techStack: [technologyId],
      durationMinutes: 90,
      status: "completed",
      uniqueSeed: "seed",
      kioskFlag: true,
      phases: [
        {
          id: "phase-1",
          templatePhaseId: "phase-1",
          type: "voice",
          title: "Voice Interview",
          status: "completed",
          weight: 0.5,
          aiSeed: "seed-1",
          attemptIds: [],
          content: {
            prompt: "Tell me about a challenge",
          },
          evaluation: {
            score: 42,
            maxScore: 50,
          },
        },
        {
          id: "phase-2",
          templatePhaseId: "phase-2",
          type: "coding",
          title: "Coding Challenge",
          status: "completed",
          weight: 0.5,
          aiSeed: "seed-2",
          attemptIds: [],
          content: {
            prompt: "Implement merge sort",
          },
          evaluation: {
            score: 48,
            maxScore: 50,
          },
        },
      ],
      candidateSnapshot: {
        userId,
        displayName: "Charlie Rivera",
        headline: "Backend Specialist",
        technologies: [technologyId],
      },
      createdAt: new Date("2024-03-01T09:00:00Z"),
      updatedAt: new Date("2024-03-01T11:00:00Z"),
      startedAt: new Date("2024-03-01T09:15:00Z"),
      completedAt: new Date("2024-03-01T10:45:00Z"),
    };

    vi.mocked(assessmentRepository.listAssessments).mockResolvedValue([
      assessment,
    ]);

    const templateDoc: AssessmentTemplateDocument = {
      _id: templateId,
      name: "Backend Interview",
      description: "A two-phase backend assessment",
      createdBy: new ObjectId(),
      techStack: [technologyId],
      durationMinutes: 90,
      phases: [],
      status: "published",
      createdAt: new Date(),
      updatedAt: new Date(),
      publishedAt: new Date(),
    };

    vi.mocked(
      assessmentTemplateRepository.findTemplatesByIds
    ).mockResolvedValue([templateDoc]);

    vi.mocked(technologyRepository.findTechnologiesByIds).mockResolvedValue([
      {
        _id: technologyId,
        name: "Go",
        slug: "golang",
        judge0_language_key: "go",
        aliases: [],
        levels: ["intermediate"],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const result = await recruitmentService.getTalentProfileDetail(
      profileId.toHexString()
    );

    expect(result.profile.id).toBe(profileId.toHexString());
    expect(result.assessments.total).toBe(1);
    expect(result.assessments.completed).toBe(1);
    expect(result.assessments.kioskVerified).toBe(true);
    expect(result.assessments.averageScore).toBe(90);
    expect(result.assessments.recent).toHaveLength(1);
    expect(result.assessments.recent[0].templateName).toBe("Backend Interview");
  });

  it("throws when profile is not found", async () => {
    vi.mocked(profileRepository.findProfileById).mockResolvedValue(null);

    await expect(
      recruitmentService.getTalentProfileDetail(new ObjectId().toHexString())
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
