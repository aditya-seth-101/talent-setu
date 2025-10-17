import { beforeEach, describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";

vi.mock("../src/repositories/technology.repository", () => {
  return {
    searchTechnologies: vi.fn(),
    findTechnologiesBySlugOrAlias: vi.fn(),
    addAliasesToTechnology: vi.fn(),
    createTechnology: vi.fn(),
    findTechnologiesByIds: vi.fn(),
  };
});

vi.mock("../src/repositories/technology-request.repository", () => {
  return {
    createTechnologyRequest: vi.fn(),
    findLatestPendingRequestBySlug: vi.fn(),
    findTechnologyRequestById: vi.fn(),
    listTechnologyRequests: vi.fn(),
    updateTechnologyRequest: vi.fn(),
  };
});

vi.mock("../src/repositories/user.repository", () => {
  return {
    findUsersByIds: vi.fn(),
  };
});

vi.mock("../src/repositories/profile.repository", () => {
  return {
    findProfilesByUserIds: vi.fn(),
  };
});

import type { TechnologyDocument } from "../src/models/technology.model";
import type { TechnologyRequestDocument } from "../src/models/technology-request.model";
import type { UserDocument } from "../src/models/user.model";
import {
  listTechnologyRequestQueue,
  requestNewTechnology,
  reviewTechnologyRequest,
  searchTechnologyDirectory,
} from "../src/services/technology/technology.service";
import * as technologyRepository from "../src/repositories/technology.repository";
import * as technologyRequestRepository from "../src/repositories/technology-request.repository";
import * as userRepository from "../src/repositories/user.repository";
import * as profileRepository from "../src/repositories/profile.repository";

function buildTechnology(
  overrides: Partial<TechnologyDocument> = {}
): TechnologyDocument {
  const now = new Date();
  return {
    _id: overrides._id ?? new ObjectId(),
    name: overrides.name ?? "Node.js",
    slug: overrides.slug ?? "node-js",
    judge0_language_key: overrides.judge0_language_key ?? "nodejs",
    judge0_language_id: overrides.judge0_language_id ?? 63,
    aliases: overrides.aliases ?? ["Node"],
    levels: overrides.levels ?? [],
    status: overrides.status ?? "active",
    createdBy: overrides.createdBy ?? null,
    approvedBy: overrides.approvedBy ?? null,
    approvedAt: overrides.approvedAt ?? null,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
  };
}

function buildRequest(
  overrides: Partial<TechnologyRequestDocument> = {}
): TechnologyRequestDocument {
  const now = new Date();
  return {
    _id: overrides._id ?? new ObjectId(),
    name: overrides.name ?? "Bun",
    slug: overrides.slug ?? "bun",
    description: overrides.description ?? null,
    aliases: overrides.aliases ?? ["bun.js"],
    status: overrides.status ?? "pending",
    requestedBy: overrides.requestedBy ?? new ObjectId(),
    reviewerId: overrides.reviewerId ?? null,
    reviewerNotes: overrides.reviewerNotes ?? null,
    mappedTechnologyId: overrides.mappedTechnologyId ?? null,
    createdTechnologyId: overrides.createdTechnologyId ?? null,
    candidateTechnologyIds: overrides.candidateTechnologyIds ?? [],
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
  };
}

function buildUser(overrides: Partial<UserDocument> = {}): UserDocument {
  const now = new Date();
  return {
    _id: overrides._id ?? new ObjectId(),
    email: overrides.email ?? "user@example.com",
    passwordHash: overrides.passwordHash ?? "hash",
    roles: overrides.roles ?? [],
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    emailVerified: overrides.emailVerified ?? true,
    lastLoginAt: overrides.lastLoginAt,
  };
}

describe("technology.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(userRepository.findUsersByIds).mockResolvedValue([]);
    vi.mocked(profileRepository.findProfilesByUserIds).mockResolvedValue([]);
  });

  it("searches the technology directory", async () => {
    const tech = buildTechnology();
    vi.mocked(technologyRepository.searchTechnologies).mockResolvedValue([
      tech,
    ]);

    const result = await searchTechnologyDirectory({ q: "node", limit: 5 });

    expect(technologyRepository.searchTechnologies).toHaveBeenCalledWith(
      "node",
      5
    );
    expect(result.technologies[0]).toMatchObject({
      id: tech._id.toHexString(),
      name: tech.name,
      judge0LanguageKey: tech.judge0_language_key,
      judge0LanguageId: tech.judge0_language_id,
    });
  });

  it("submits a new technology request when there is no duplicate", async () => {
    const requestDoc = buildRequest();
    vi.mocked(
      technologyRepository.findTechnologiesBySlugOrAlias
    ).mockResolvedValue([]);
    vi.mocked(
      technologyRequestRepository.findLatestPendingRequestBySlug
    ).mockResolvedValue(null);
    vi.mocked(
      technologyRequestRepository.createTechnologyRequest
    ).mockResolvedValue(requestDoc);

    const result = await requestNewTechnology(
      {
        name: requestDoc.name,
        description: "Runtime",
        aliases: ["Bun runtime", "bun"],
      },
      new ObjectId().toHexString()
    );

    expect(
      technologyRepository.findTechnologiesBySlugOrAlias
    ).toHaveBeenCalledWith("bun");
    expect(
      technologyRequestRepository.createTechnologyRequest
    ).toHaveBeenCalled();
    expect(result.duplicate).toBe(false);
    expect(result.request.id).toEqual(requestDoc._id.toHexString());
  });

  it("returns duplicate information when a pending request exists", async () => {
    const existing = buildRequest();
    const candidate = buildTechnology({ name: "Bun" });
    vi.mocked(
      technologyRepository.findTechnologiesBySlugOrAlias
    ).mockResolvedValue([candidate]);
    vi.mocked(
      technologyRequestRepository.findLatestPendingRequestBySlug
    ).mockResolvedValue(existing);

    const result = await requestNewTechnology(
      { name: existing.name },
      new ObjectId().toHexString()
    );

    expect(result.duplicate).toBe(true);
    expect(result.duplicateOf).toEqual(existing._id.toHexString());
    expect(result.suggestions[0].id).toEqual(candidate._id.toHexString());
  });

  it("approves a request by mapping to an existing technology", async () => {
    const requestId = new ObjectId();
    const reviewerId = new ObjectId();
    const requestDoc = buildRequest({ _id: requestId });
    const mappedTechnology = buildTechnology();

    vi.mocked(
      technologyRequestRepository.findTechnologyRequestById
    ).mockResolvedValue(requestDoc);
    vi.mocked(technologyRepository.addAliasesToTechnology).mockResolvedValue(
      mappedTechnology as any
    );
    vi.mocked(
      technologyRequestRepository.updateTechnologyRequest
    ).mockImplementation(async () => ({
      ...requestDoc,
      status: "approved",
      reviewerId,
      mappedTechnologyId: mappedTechnology._id,
      updatedAt: new Date(),
    }));

    const result = await reviewTechnologyRequest(
      requestId.toHexString(),
      {
        decision: "approve",
        mapping: {
          type: "mapExisting",
          technologyId: mappedTechnology._id.toHexString(),
          aliases: ["Cool Bun"],
        },
      },
      reviewerId.toHexString()
    );

    expect(technologyRepository.addAliasesToTechnology).toHaveBeenCalled();
    expect(result.request.status).toBe("approved");
    expect(result.technology?.id).toEqual(mappedTechnology._id.toHexString());
  });

  it("creates a new technology when approving with createNew mapping", async () => {
    const requestId = new ObjectId();
    const reviewerId = new ObjectId();
    const requestDoc = buildRequest({ _id: requestId });
    const newTechnology = buildTechnology({
      name: requestDoc.name,
      slug: requestDoc.slug,
    });

    vi.mocked(
      technologyRequestRepository.findTechnologyRequestById
    ).mockResolvedValue(requestDoc);
    vi.mocked(technologyRepository.createTechnology).mockResolvedValue(
      newTechnology
    );
    vi.mocked(
      technologyRequestRepository.updateTechnologyRequest
    ).mockImplementation(async () => ({
      ...requestDoc,
      status: "approved",
      reviewerId,
      createdTechnologyId: newTechnology._id,
      updatedAt: new Date(),
    }));

    const result = await reviewTechnologyRequest(
      requestId.toHexString(),
      {
        decision: "approve",
        mapping: {
          type: "createNew",
          aliases: ["New Bun"],
        },
      },
      reviewerId.toHexString()
    );

    expect(technologyRepository.createTechnology).toHaveBeenCalled();
    const payload = vi.mocked(technologyRepository.createTechnology).mock
      .calls[0][0];
    expect(payload.aliases).toContain("New Bun");
    expect(result.request.status).toBe("approved");
    expect(result.technology?.name).toBe(requestDoc.name);
  });

  it("lists the request queue with hydrated candidate technologies", async () => {
    const requestDoc = buildRequest({
      candidateTechnologyIds: [new ObjectId()],
    });
    const candidateTech = buildTechnology({
      _id: requestDoc.candidateTechnologyIds[0],
    });
    const requesterUser = buildUser({
      _id: requestDoc.requestedBy,
      email: "recruiter@example.com",
    });

    vi.mocked(
      technologyRequestRepository.listTechnologyRequests
    ).mockResolvedValue({
      items: [requestDoc],
      total: 1,
    });
    vi.mocked(technologyRepository.findTechnologiesByIds).mockResolvedValue([
      candidateTech,
    ]);
    vi.mocked(userRepository.findUsersByIds).mockResolvedValue([requesterUser]);
    vi.mocked(profileRepository.findProfilesByUserIds).mockResolvedValue([
      { userId: requestDoc.requestedBy, displayName: "Recruiter Rick" } as any,
    ]);

    const result = await listTechnologyRequestQueue({});

    expect(
      technologyRequestRepository.listTechnologyRequests
    ).toHaveBeenCalled();
    expect(result.requests[0].candidates[0].id).toEqual(
      candidateTech._id.toHexString()
    );
    expect(result.pagination.total).toBe(1);
    expect(result.requests[0].requestedByUser?.displayName).toBe(
      "Recruiter Rick"
    );
    expect(result.requests[0].requestedByUser?.email).toBe(
      "recruiter@example.com"
    );
  });
});
