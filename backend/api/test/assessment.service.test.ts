import { describe, it, expect, vi, beforeEach } from "vitest";
import { ObjectId } from "mongodb";
import * as assessmentRepository from "../src/repositories/assessment.repository.js";
import * as assessmentTemplateRepository from "../src/repositories/assessment-template.repository.js";
import * as profileRepository from "../src/repositories/profile.repository.js";
import * as technologyRepository from "../src/repositories/technology.repository.js";
import * as assessmentService from "../src/services/assessment/assessment.service.js";

vi.mock("../src/repositories/assessment.repository.js");
vi.mock("../src/repositories/assessment-template.repository.js");
vi.mock("../src/repositories/profile.repository.js");
vi.mock("../src/repositories/technology.repository.js");
vi.mock("../src/services/judge/judge.service.js");

// Mock global fetch for AI service calls
global.fetch = vi.fn();

describe("assessment service flow", () => {
  const recruiterId = new ObjectId().toHexString();
  const candidateUserId = new ObjectId().toHexString();
  const templateId = new ObjectId().toHexString();
  const assessmentId = new ObjectId().toHexString();
  const phaseId = new ObjectId().toHexString();
  const techId = new ObjectId().toHexString();

  const mockTech = {
    _id: new ObjectId(techId),
    name: "JavaScript",
    slug: "javascript",
    judge0_language_key: "javascript",
    judge0_language_id: 63,
    aliases: [],
    levels: ["beginner"],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTemplate = {
    _id: new ObjectId(templateId),
    name: "Interview Template",
    createdBy: new ObjectId(recruiterId),
    techStack: [mockTech._id],
    durationMinutes: 120,
    phases: [
      {
        id: phaseId,
        type: "voice" as const,
        title: "Technical Discussion",
        instructions: "Discuss your recent projects",
        weight: 0.5,
        durationMinutes: 30,
      },
      {
        id: "phase-2",
        type: "coding" as const,
        title: "Code Challenge",
        weight: 0.5,
        durationMinutes: 90,
      },
    ],
    status: "published" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    publishedAt: new Date(),
  };

  const mockProfile = {
    _id: new ObjectId(),
    userId: new ObjectId(candidateUserId),
    displayName: "John Doe",
    headline: "Senior Developer",
    experienceYears: 5,
    technologies: [mockTech._id],
    learningProgress: {
      courses: {},
      totals: { baseXp: 0, netXp: 0, hintPenalty: 0, completedTopics: 0 },
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates assessment from published template with unique seeding", async () => {
    vi.mocked(assessmentTemplateRepository.findTemplateById).mockResolvedValue(
      mockTemplate
    );

    vi.mocked(profileRepository.findProfileByUserId).mockResolvedValue(
      mockProfile
    );

    vi.mocked(technologyRepository.findTechnologiesByIds).mockResolvedValue([
      mockTech,
      mockTech,
    ]);

    // Mock AI service response for phase content generation
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        prompt: "Tell us about a complex system you've designed",
        summary: "System design discussion",
        voiceScript: {
          opener: "Let's discuss a complex system you've built",
          followUps: [
            "What challenges did you face?",
            "How did you overcome them?",
          ],
          closing: "Thank you for sharing",
        },
        rubric: [],
        hints: [],
        evaluationNotes: [],
        additional: {},
      }),
    });

    const mockAssessment = {
      _id: new ObjectId(assessmentId),
      templateId: mockTemplate._id,
      recruiterId: new ObjectId(recruiterId),
      candidateId: mockProfile.userId,
      techStack: mockTemplate.techStack,
      durationMinutes: mockTemplate.durationMinutes,
      status: "scheduled" as const,
      uniqueSeed: "seeded-value",
      kioskFlag: false,
      phases: mockTemplate.phases.map((phase, idx) => ({
        id: `phase-instance-${idx}`,
        templatePhaseId: phase.id,
        type: phase.type,
        title: phase.title,
        instructions: phase.instructions,
        status: "pending" as const,
        weight: phase.weight,
        durationMinutes: phase.durationMinutes,
        aiSeed: "phaseseed",
        aiConfig: phase.aiConfig,
        content: {
          prompt: `Phase ${idx + 1} prompt`,
        },
        attemptIds: [],
      })),
      candidateSnapshot: {
        userId: mockProfile.userId,
        displayName: mockProfile.displayName,
        headline: mockProfile.headline,
        experienceYears: mockProfile.experienceYears,
        technologies: mockProfile.technologies,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(assessmentRepository.createAssessment).mockResolvedValue(
      mockAssessment
    );

    const result = await assessmentService.createAssessmentFromTemplate(
      recruiterId,
      {
        templateId,
        candidateId: candidateUserId,
      }
    );

    expect(result.status).toBe("scheduled");
    expect(result.phases).toHaveLength(2);
    expect(result.phases[0].type).toBe("voice");
    expect(result.phases[1].type).toBe("coding");
    expect(assessmentRepository.createAssessment).toHaveBeenCalled();
  });

  it("throws error when creating assessment from unpublished template", async () => {
    const unpublishedTemplate = { ...mockTemplate, status: "draft" as const };

    vi.mocked(assessmentTemplateRepository.findTemplateById).mockResolvedValue(
      unpublishedTemplate
    );

    await expect(
      assessmentService.createAssessmentFromTemplate(recruiterId, {
        templateId,
        candidateId: candidateUserId,
      })
    ).rejects.toThrow("Template must be published");
  });

  it("throws error when candidate profile not found", async () => {
    vi.mocked(assessmentTemplateRepository.findTemplateById).mockResolvedValue(
      mockTemplate
    );

    vi.mocked(profileRepository.findProfileByUserId).mockResolvedValue(null);

    await expect(
      assessmentService.createAssessmentFromTemplate(recruiterId, {
        templateId,
        candidateId: candidateUserId,
      })
    ).rejects.toThrow("Candidate profile not found");
  });

  it("starts assessment and transitions first phase to active", async () => {
    const mockAssessment = {
      _id: new ObjectId(assessmentId),
      templateId: mockTemplate._id,
      recruiterId: new ObjectId(recruiterId),
      candidateId: new ObjectId(candidateUserId),
      techStack: mockTemplate.techStack,
      durationMinutes: 120,
      status: "scheduled" as const,
      uniqueSeed: "seed",
      kioskFlag: false,
      phases: [
        {
          id: "phase-1",
          templatePhaseId: phaseId,
          type: "voice" as const,
          title: "Voice",
          status: "pending" as const,
          weight: 0.5,
          aiSeed: "seed",
          content: { prompt: "Talk" },
          attemptIds: [],
        },
      ],
      candidateSnapshot: {
        userId: mockProfile.userId,
        displayName: mockProfile.displayName,
        technologies: mockProfile.technologies,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updatedAssessment = {
      ...mockAssessment,
      status: "in-progress" as const,
      startedAt: new Date(),
      phases: [
        {
          ...mockAssessment.phases[0],
          status: "active" as const,
          startedAt: new Date(),
        },
      ],
    };

    vi.mocked(assessmentRepository.findAssessmentById).mockResolvedValue(
      mockAssessment
    );

    vi.mocked(assessmentRepository.updateAssessmentById).mockResolvedValue(
      updatedAssessment
    );

    const result = await assessmentService.startAssessment(
      assessmentId,
      candidateUserId
    );

    expect(result.status).toBe("in-progress");
    expect(result.startedAt).toBeDefined();
    expect(result.phases[0].status).toBe("active");
  });

  it("records voice transcript and updates phase", async () => {
    const mockAssessment = {
      _id: new ObjectId(assessmentId),
      templateId: mockTemplate._id,
      recruiterId: new ObjectId(recruiterId),
      candidateId: new ObjectId(candidateUserId),
      techStack: mockTemplate.techStack,
      durationMinutes: 120,
      status: "in-progress" as const,
      uniqueSeed: "seed",
      kioskFlag: false,
      phases: [
        {
          id: "phase-1",
          templatePhaseId: phaseId,
          type: "voice" as const,
          title: "Voice",
          status: "active" as const,
          weight: 0.5,
          aiSeed: "seed",
          content: { prompt: "Talk" },
          attemptIds: [],
          startedAt: new Date(),
        },
      ],
      candidateSnapshot: {
        userId: mockProfile.userId,
        displayName: mockProfile.displayName,
        technologies: mockProfile.technologies,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      startedAt: new Date(),
    };

    const updatedAssessment = {
      ...mockAssessment,
      phases: [
        {
          ...mockAssessment.phases[0],
          status: "completed" as const,
          transcript: "Candidate discussed implementation patterns...",
          completedAt: new Date(),
        },
      ],
    };

    vi.mocked(assessmentRepository.findAssessmentById).mockResolvedValue(
      mockAssessment
    );

    vi.mocked(assessmentTemplateRepository.findTemplateById).mockResolvedValue(
      mockTemplate
    );

    vi.mocked(assessmentRepository.updateAssessmentById).mockResolvedValue(
      updatedAssessment
    );

    const result = await assessmentService.recordVoiceTranscript(
      assessmentId,
      "phase-1",
      candidateUserId,
      ["student"],
      {
        transcript: "Candidate discussed implementation patterns...",
      }
    );

    expect(result.phases[0].status).toBe("completed");
    expect(result.phases[0].transcript).toBe(
      "Candidate discussed implementation patterns..."
    );
    expect(assessmentRepository.updateAssessmentById).toHaveBeenCalled();
  });

  it("throws error when recording transcript for non-voice phase", async () => {
    const mockAssessment = {
      _id: new ObjectId(assessmentId),
      templateId: mockTemplate._id,
      recruiterId: new ObjectId(recruiterId),
      candidateId: new ObjectId(candidateUserId),
      techStack: mockTemplate.techStack,
      durationMinutes: 120,
      status: "in-progress" as const,
      uniqueSeed: "seed",
      kioskFlag: false,
      phases: [
        {
          id: "phase-1",
          templatePhaseId: phaseId,
          type: "coding" as const,
          title: "Coding",
          status: "active" as const,
          weight: 0.5,
          aiSeed: "seed",
          content: { prompt: "Code" },
          attemptIds: [],
          startedAt: new Date(),
        },
      ],
      candidateSnapshot: {
        userId: mockProfile.userId,
        displayName: mockProfile.displayName,
        technologies: mockProfile.technologies,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      startedAt: new Date(),
    };

    vi.mocked(assessmentRepository.findAssessmentById).mockResolvedValue(
      mockAssessment
    );

    await expect(
      assessmentService.recordVoiceTranscript(
        assessmentId,
        "phase-1",
        candidateUserId,
        ["student"],
        { transcript: "Should fail" }
      )
    ).rejects.toThrow("This phase does not accept voice transcripts");
  });

  it("throws error when only the candidate can start their assessment", async () => {
    const mockAssessment = {
      _id: new ObjectId(assessmentId),
      templateId: mockTemplate._id,
      recruiterId: new ObjectId(recruiterId),
      candidateId: new ObjectId(candidateUserId),
      techStack: mockTemplate.techStack,
      durationMinutes: 120,
      status: "scheduled" as const,
      uniqueSeed: "seed",
      kioskFlag: false,
      phases: [],
      candidateSnapshot: {
        userId: new ObjectId(candidateUserId),
        displayName: "Jane",
        technologies: [],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(assessmentRepository.findAssessmentById).mockResolvedValue(
      mockAssessment
    );

    const otherUserId = new ObjectId().toHexString();

    await expect(
      assessmentService.startAssessment(assessmentId, otherUserId)
    ).rejects.toThrow("Only the candidate can start the assessment");
  });
});
