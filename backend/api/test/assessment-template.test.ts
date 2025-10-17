import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ObjectId } from "mongodb";
import * as technologyRepository from "../src/repositories/technology.repository.js";
import * as assessmentTemplateRepository from "../src/repositories/assessment-template.repository.js";
import * as templateService from "../src/services/assessment/template.service.js";

vi.mock("../src/repositories/technology.repository.js");
vi.mock("../src/repositories/assessment-template.repository.js");

describe("assessment template service", () => {
  const creatorId = new ObjectId().toHexString();
  const techId1 = new ObjectId().toHexString();
  const techId2 = new ObjectId().toHexString();

  const mockTech1 = {
    _id: new ObjectId(techId1),
    name: "JavaScript",
    slug: "javascript",
    judge0_language_key: "javascript",
    judge0_language_id: 63,
    aliases: ["js"],
    levels: ["beginner", "intermediate", "advanced"],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTech2 = {
    _id: new ObjectId(techId2),
    name: "Python",
    slug: "python",
    judge0_language_key: "python3",
    judge0_language_id: 71,
    aliases: ["py"],
    levels: ["beginner", "intermediate", "advanced"],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a template with valid phases and tech stack", async () => {
    const mockTemplate = {
      _id: new ObjectId(),
      name: "Full-Stack Interview",
      description: "A complete interview template",
      createdBy: new ObjectId(creatorId),
      techStack: [mockTech1._id, mockTech2._id],
      durationMinutes: 180,
      phases: [
        {
          id: "phase-1",
          type: "voice" as const,
          title: "Technical Discussion",
          weight: 0.3,
          durationMinutes: 60,
        },
        {
          id: "phase-2",
          type: "coding" as const,
          title: "Code Challenge",
          weight: 0.7,
          durationMinutes: 120,
        },
      ],
      status: "draft" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(technologyRepository.findTechnologiesByIds).mockResolvedValue([
      mockTech1,
      mockTech2,
    ]);

    vi.mocked(assessmentTemplateRepository.createTemplate).mockResolvedValue(
      mockTemplate
    );

    const result = await templateService.createTemplate(creatorId, {
      name: "Full-Stack Interview",
      description: "A complete interview template",
      techStack: [techId1, techId2],
      durationMinutes: 180,
      phases: [
        {
          type: "voice",
          title: "Technical Discussion",
          weight: 0.3,
          durationMinutes: 60,
        },
        {
          type: "coding",
          title: "Code Challenge",
          weight: 0.7,
          durationMinutes: 120,
        },
      ],
    });

    expect(result.name).toBe("Full-Stack Interview");
    expect(result.phases).toHaveLength(2);
    expect(result.status).toBe("draft");
    expect(technologyRepository.findTechnologiesByIds).toHaveBeenCalled();
    expect(assessmentTemplateRepository.createTemplate).toHaveBeenCalled();
  });

  it("throws error when template has no phases", async () => {
    await expect(
      templateService.createTemplate(creatorId, {
        name: "Empty Template",
        techStack: [techId1],
        durationMinutes: 60,
        phases: [],
      })
    ).rejects.toThrow("Template must include at least one phase");
  });

  it("throws error when referenced technologies do not exist", async () => {
    vi.mocked(technologyRepository.findTechnologiesByIds).mockResolvedValue([
      mockTech1,
    ]);

    await expect(
      templateService.createTemplate(creatorId, {
        name: "Test Template",
        techStack: [techId1, techId2],
        durationMinutes: 60,
        phases: [
          {
            type: "mcq",
            title: "Quiz",
            weight: 1,
          },
        ],
      })
    ).rejects.toThrow("One or more technologies referenced");
  });

  it("throws error when phase weight is non-positive", async () => {
    vi.mocked(technologyRepository.findTechnologiesByIds).mockResolvedValue([
      mockTech1,
    ]);

    await expect(
      templateService.createTemplate(creatorId, {
        name: "Test Template",
        techStack: [techId1],
        durationMinutes: 60,
        phases: [
          {
            type: "mcq",
            title: "Quiz",
            weight: 0,
          },
        ],
      })
    ).rejects.toThrow("must have a positive weight");
  });

  it("lists templates by creator and status", async () => {
    const mockTemplates = [
      {
        _id: new ObjectId(),
        name: "Template 1",
        createdBy: new ObjectId(creatorId),
        techStack: [mockTech1._id],
        durationMinutes: 60,
        phases: [],
        status: "draft" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new ObjectId(),
        name: "Template 2",
        createdBy: new ObjectId(creatorId),
        techStack: [mockTech1._id],
        durationMinutes: 120,
        phases: [],
        status: "published" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        publishedAt: new Date(),
      },
    ];

    vi.mocked(assessmentTemplateRepository.listTemplates).mockResolvedValue(
      mockTemplates
    );

    const result = await templateService.listTemplates({
      createdBy: creatorId,
      status: "draft",
    });

    expect(result).toHaveLength(2);
    expect(assessmentTemplateRepository.listTemplates).toHaveBeenCalled();
  });

  it("publishes a template and sets publishedAt timestamp", async () => {
    const templateId = new ObjectId().toHexString();
    const mockTemplate = {
      _id: new ObjectId(templateId),
      name: "Template to Publish",
      createdBy: new ObjectId(creatorId),
      techStack: [mockTech1._id],
      durationMinutes: 60,
      phases: [
        {
          id: "p1",
          type: "voice" as const,
          title: "Phase 1",
          weight: 1,
        },
      ],
      status: "draft" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const publishedTemplate = {
      ...mockTemplate,
      status: "published" as const,
      publishedAt: new Date(),
    };

    vi.mocked(assessmentTemplateRepository.findTemplateById).mockResolvedValue(
      mockTemplate
    );

    vi.mocked(
      assessmentTemplateRepository.updateTemplateById
    ).mockResolvedValue(publishedTemplate);

    const result = await templateService.publishTemplate(templateId);

    expect(result.status).toBe("published");
    expect(result.publishedAt).toBeDefined();
    expect(assessmentTemplateRepository.updateTemplateById).toHaveBeenCalled();
  });

  it("throws error when publishing template with no phases", async () => {
    const templateId = new ObjectId().toHexString();
    const mockTemplate = {
      _id: new ObjectId(templateId),
      name: "Empty Template",
      createdBy: new ObjectId(creatorId),
      techStack: [mockTech1._id],
      durationMinutes: 60,
      phases: [],
      status: "draft" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(assessmentTemplateRepository.findTemplateById).mockResolvedValue(
      mockTemplate
    );

    await expect(templateService.publishTemplate(templateId)).rejects.toThrow(
      "Template must have at least one phase"
    );
  });

  it("retrieves a template by id", async () => {
    const templateId = new ObjectId().toHexString();
    const mockTemplate = {
      _id: new ObjectId(templateId),
      name: "Retrieved Template",
      createdBy: new ObjectId(creatorId),
      techStack: [mockTech1._id],
      durationMinutes: 90,
      phases: [
        {
          id: "p1",
          type: "coding" as const,
          title: "Coding",
          weight: 1,
        },
      ],
      status: "published" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      publishedAt: new Date(),
    };

    vi.mocked(assessmentTemplateRepository.findTemplateById).mockResolvedValue(
      mockTemplate
    );

    const result = await templateService.getTemplate(templateId);

    expect(result.id).toBe(templateId);
    expect(result.name).toBe("Retrieved Template");
    expect(assessmentTemplateRepository.findTemplateById).toHaveBeenCalledWith(
      new ObjectId(templateId)
    );
  });

  it("throws error when retrieving non-existent template", async () => {
    const templateId = new ObjectId().toHexString();

    vi.mocked(assessmentTemplateRepository.findTemplateById).mockResolvedValue(
      null
    );

    await expect(templateService.getTemplate(templateId)).rejects.toThrow(
      "Template not found"
    );
  });
});
