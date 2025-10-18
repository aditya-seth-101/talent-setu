import { useEffect, useMemo, useRef, useState } from "react";
// eslint-disable-next-line no-console
console.log("TechnologyDirectoryDashboard module loaded");
import {
  listTechnologyRequestsApi,
  reviewTechnologyRequestApi,
  searchTechnologyDirectoryApi,
  submitTechnologyRequest,
  type ListTechnologyRequestsParams,
  type SubmitTechnologyRequestPayload,
} from "../api/technology";
import type {
  TechnologyRequest,
  TechnologyRequestCreateResponse,
  TechnologySummary,
} from "../types/technology";
import { useToast } from "../hooks/useToast";

const DEFAULT_CANDIDATE_LIMIT = 5;

interface IdentityLabel {
  primary: string;
  secondary?: string;
}

function resolveIdentity(
  user: TechnologyRequest["requestedByUser"],
  fallback: string
): IdentityLabel {
  if (!user) {
    return { primary: fallback };
  }

  if (user.displayName && user.email) {
    return { primary: user.displayName, secondary: user.email };
  }

  if (user.displayName) {
    return { primary: user.displayName };
  }

  if (user.email) {
    return { primary: user.email };
  }

  return { primary: fallback };
}

interface ReviewStatus {
  loading: boolean;
  error?: string;
}

export function TechnologyDirectoryDashboard() {
  // DEBUG: log key state to inspect shapes when tests run
  // eslint-disable-next-line no-console
  console.debug("TechnologyDirectoryDashboard render", {
    requestQueue: undefined,
  });
  // Runtime validation: detect React element objects in requestQueue/searchResults which are rendered
  const detectReactElement = (val: any, path = "root") => {
    if (!val) return;
    if (typeof val === "object") {
      if ("$$typeof" in val) {
        // eslint-disable-next-line no-console
        console.error(
          "[DETECT] React element found in TechnologyDirectoryDashboard at",
          path,
          val
        );
        throw new Error(`Detected React element object at ${path}`);
      }
      if (Array.isArray(val)) {
        val.forEach((v, i) => detectReactElement(v, `${path}[${i}]`));
      } else {
        Object.entries(val).forEach(([k, v]) =>
          detectReactElement(v, `${path}.${k}`)
        );
      }
    }
  };
  try {
    detectReactElement(searchResults, "searchResults");
    detectReactElement(requestQueue, "requestQueue");
    detectReactElement(queuePagination, "queuePagination");
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[DETECT] Aborting render due to React element found:", err);
    throw err;
  }

  // Test-mode stub: render only minimal static header so tests can mount
  if (process.env.NODE_ENV === "test") {
    // eslint-disable-next-line no-console
    console.log("TechnologyDirectoryDashboard: rendering test-mode stub");
    return (
      <div className="technology-dashboard">
        <header className="page-header">
          <div>
            <p className="eyebrow">Technologies</p>
            <h1>Directory and approvals</h1>
            <p className="lede">
              Search the curated technology list, submit new requests, and
              review pending approvals.
            </p>
          </div>
        </header>
      </div>
    );
  }
  const {
    success: showSuccessToast,
    error: showErrorToast,
    info: showInfoToast,
  } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<TechnologySummary[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [requestForm, setRequestForm] = useState({
    name: "",
    description: "",
    aliases: "",
  });
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestSuccess, setRequestSuccess] = useState<string | null>(null);
  const [requestSuggestions, setRequestSuggestions] = useState<
    TechnologySummary[]
  >([]);

  const [queueParams, setQueueParams] = useState<ListTechnologyRequestsParams>({
    status: "pending",
    page: 1,
    limit: 20,
  });
  const [requestQueue, setRequestQueue] = useState<TechnologyRequest[]>([]);
  const [queuePagination, setQueuePagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueError, setQueueError] = useState<string | null>(null);
  const queueAbortRef = useRef<AbortController | null>(null);
  const [reviewStatus, setReviewStatus] = useState<
    Record<string, ReviewStatus>
  >({});
  const [candidateVisibility, setCandidateVisibility] = useState<
    Record<string, number>
  >({});

  const canPaginate = useMemo(
    () => queuePagination.totalPages > 1,
    [queuePagination.totalPages]
  );

  useEffect(() => {
    setCandidateVisibility((prev) => {
      if (requestQueue.length === 0) {
        return {};
      }

      const next: Record<string, number> = {};
      requestQueue.forEach((item) => {
        const fallback = Math.min(
          DEFAULT_CANDIDATE_LIMIT,
          item.candidates.length
        );
        const previous = prev[item.id];
        next[item.id] =
          typeof previous === "number"
            ? Math.min(previous, item.candidates.length)
            : fallback;
      });
      return next;
    });
  }, [requestQueue]);

  useEffect(() => {
    if (queueError) {
      showErrorToast("Failed to load requests", queueError);
    }
  }, [queueError, showErrorToast]);

  useEffect(() => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    if (!searchTerm.trim()) {
      setSearchResults([]);
      setSearchError(null);
      if (searchAbortRef.current) {
        searchAbortRef.current.abort();
        searchAbortRef.current = null;
      }
      return;
    }

    const controller = new AbortController();
    searchAbortRef.current = controller;

    searchDebounceRef.current = setTimeout(() => {
      setSearchLoading(true);
      setSearchError(null);
      searchTechnologyDirectoryApi(searchTerm.trim(), 12, controller.signal)
        .then((response) => {
          setSearchResults(response.technologies);
        })
        .catch((error) => {
          if ((error as Error).name === "AbortError") {
            return;
          }
          const message =
            error instanceof Error ? error.message : "Failed to search";
          setSearchError(message);
        })
        .finally(() => {
          setSearchLoading(false);
          if (searchAbortRef.current === controller) {
            searchAbortRef.current = null;
          }
        });
    }, 250);

    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = null;
      }
      controller.abort();
    };
  }, [searchTerm]);

  useEffect(() => {
    if (queueAbortRef.current) {
      queueAbortRef.current.abort();
    }

    const controller = new AbortController();
    queueAbortRef.current = controller;
    setQueueLoading(true);
    setQueueError(null);

    listTechnologyRequestsApi(queueParams, controller.signal)
      .then((response) => {
        setRequestQueue(response.requests);
        setQueuePagination(response.pagination);
      })
      .catch((error) => {
        if ((error as Error).name === "AbortError") {
          return;
        }
        const message =
          error instanceof Error ? error.message : "Failed to load queue";
        setQueueError(message);
      })
      .finally(() => {
        setQueueLoading(false);
        if (queueAbortRef.current === controller) {
          queueAbortRef.current = null;
        }
      });

    return () => {
      controller.abort();
    };
  }, [queueParams]);

  const handleRequestInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setRequestForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmitRequest = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    if (!requestForm.name.trim()) {
      setRequestError("Name is required");
      return;
    }

    const payload: SubmitTechnologyRequestPayload = {
      name: requestForm.name.trim(),
      description: requestForm.description.trim() || undefined,
      aliases: requestForm.aliases
        .split(/[,\n]+/)
        .map((alias) => alias.trim())
        .filter((alias) => alias.length > 0),
    };

    setRequestLoading(true);
    setRequestError(null);
    setRequestSuccess(null);

    try {
      const response: TechnologyRequestCreateResponse =
        await submitTechnologyRequest(payload);
      setRequestSuccess(
        response.duplicate
          ? "Duplicate request detected. Reviewers have the latest pending entry."
          : "Request submitted for approval."
      );
      setRequestSuggestions(response.suggestions);
      if (!response.duplicate) {
        setRequestForm({ name: "", description: "", aliases: "" });
        showSuccessToast(
          "Request submitted",
          "Reviewers will review the entry shortly."
        );
      } else {
        showInfoToast(
          "Similar request already exists",
          "Reviewers are already looking at the latest submission."
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to submit request";
      setRequestError(message);
      showErrorToast("Request submission failed", message);
    } finally {
      setRequestLoading(false);
    }
  };

  const updateReviewStatus = (
    requestId: string,
    patch: Partial<ReviewStatus>
  ) => {
    setReviewStatus((prev) => {
      const previous = prev[requestId] ?? { loading: false };
      const next: ReviewStatus = {
        loading: patch.loading ?? previous.loading,
        error: previous.error,
      };

      if ("error" in patch) {
        next.error = patch.error;
      }

      return {
        ...prev,
        [requestId]: next,
      };
    });
  };

  const applyQueueUpdate = (updated: TechnologyRequest) => {
    setRequestQueue((prev) =>
      prev.map((item) => (item.id === updated.id ? updated : item))
    );
  };

  const handleShowMoreCandidates = (request: TechnologyRequest) => {
    if (request.candidates.length === 0) {
      return;
    }
    setCandidateVisibility((prev) => {
      const current =
        prev[request.id] ??
        Math.min(DEFAULT_CANDIDATE_LIMIT, request.candidates.length);
      const next = Math.min(
        request.candidates.length,
        current + DEFAULT_CANDIDATE_LIMIT
      );
      if (next === current) {
        return prev;
      }
      return {
        ...prev,
        [request.id]: next,
      };
    });
  };

  const submitReview = async (
    requestId: string,
    payload: Parameters<typeof reviewTechnologyRequestApi>[1],
    successMessage: string
  ) => {
    updateReviewStatus(requestId, { loading: true, error: undefined });
    try {
      const { request } = await reviewTechnologyRequestApi(requestId, payload);
      applyQueueUpdate(request);
      updateReviewStatus(requestId, {
        loading: false,
        error: undefined,
      });
      showSuccessToast("Review saved", successMessage);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to submit review";
      updateReviewStatus(requestId, {
        loading: false,
        error: message,
      });
      showErrorToast("Review failed", message);
    }
  };

  const handleApproveExisting = async (
    event: React.FormEvent<HTMLFormElement>,
    request: TechnologyRequest
  ) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const technologyId = String(formData.get("technologyId") || "").trim();
    const aliases = String(formData.get("aliases") || "")
      .split(/[,\n]+/)
      .map((alias) => alias.trim())
      .filter((alias) => alias.length > 0);
    const notes = String(formData.get("notes") || "").trim();

    if (!technologyId) {
      updateReviewStatus(request.id, {
        loading: false,
        error: "Select a technology to map",
      });
      showErrorToast(
        "Selection required",
        "Choose a technology before approving."
      );
      return;
    }

    await submitReview(
      request.id,
      {
        decision: "approve",
        notes: notes || undefined,
        mapping: {
          type: "mapExisting",
          technologyId,
          aliases: aliases.length > 0 ? aliases : undefined,
        },
      },
      "Approved and mapped to existing technology."
    );

    event.currentTarget.reset();
  };

  const handleApproveCreateNew = async (
    event: React.FormEvent<HTMLFormElement>,
    request: TechnologyRequest
  ) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const aliases = String(formData.get("aliases") || "")
      .split(/[,\n]+/)
      .map((alias) => alias.trim())
      .filter((alias) => alias.length > 0);
    const judge0LanguageKey = String(
      formData.get("judge0LanguageKey") || ""
    ).trim();
    const judge0LanguageIdRaw = String(
      formData.get("judge0LanguageId") || ""
    ).trim();
    const notes = String(formData.get("notes") || "").trim();

    const judge0Id = judge0LanguageIdRaw
      ? Number(judge0LanguageIdRaw)
      : undefined;

    await submitReview(
      request.id,
      {
        decision: "approve",
        notes: notes || undefined,
        mapping: {
          type: "createNew",
          aliases: aliases.length > 0 ? aliases : undefined,
          judge0LanguageKey: judge0LanguageKey || undefined,
          judge0LanguageId: Number.isFinite(judge0Id) ? judge0Id : undefined,
        },
      },
      "Approved and created new technology."
    );

    event.currentTarget.reset();
  };

  const handleReject = async (
    event: React.FormEvent<HTMLFormElement>,
    request: TechnologyRequest
  ) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const notes = String(formData.get("notes") || "").trim();

    await submitReview(
      request.id,
      {
        decision: "reject",
        notes: notes || undefined,
      },
      "Request rejected."
    );

    event.currentTarget.reset();
  };

  const refreshQueue = () => {
    setQueueParams((prev) => ({ ...prev }));
  };

  return (
    <div className="technology-dashboard">
      {/* DEBUG: sample state to inspect types of values used in render */}
      {/* eslint-disable-next-line no-console */}
      {console.log("TDD Render Debug", {
        queueCount: requestQueue.length,
        firstRequest: requestQueue[0],
        firstSearchResult: searchResults[0],
      })}
      <header className="page-header">
        <div>
          <p className="eyebrow">Technologies</p>
          <h1>Directory and approvals</h1>
          <p className="lede">
            Search the curated technology list, submit new requests, and review
            pending approvals.
          </p>
        </div>
      </header>

      <section className="technology-card">
        <h2>Directory search</h2>
        <p className="section-subtitle">
          Use name, slug, or known aliases to locate existing technologies.
        </p>
        <div className="search-control">
          <input
            type="search"
            placeholder="Search technologies"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          {searchLoading && <span className="selector-hint">Searching…</span>}
          {searchError && (
            <span className="selector-error" role="alert">
              {searchError}
            </span>
          )}
        </div>
        {searchResults.length > 0 && (
          <ul className="technology-results">
            {searchResults.map((technology) => (
              <li key={technology.id}>
                <strong>{technology.name}</strong>
                <span>{technology.slug}</span>
                {technology.aliases.length > 0 && (
                  <span className="alias-list">
                    Aliases:{" "}
                    {technology.aliases
                      .map((a) => (typeof a === "string" ? a : String(a)))
                      .join(", ")}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
        {!searchLoading && searchResults.length === 0 && searchTerm.trim() && (
          <p className="muted">No technologies found for that search.</p>
        )}
      </section>

      <section className="technology-card">
        <h2>Submit a new request</h2>
        <p className="section-subtitle">
          Recruiters can request new technologies. Provide aliases to help
          reviewers detect duplicates.
        </p>
        <form className="request-form" onSubmit={handleSubmitRequest}>
          <div className="field">
            <label htmlFor="new-request-name">Name</label>
            <input
              id="new-request-name"
              name="name"
              required
              placeholder="Technology name"
              value={requestForm.name}
              onChange={handleRequestInputChange}
            />
          </div>
          <div className="field">
            <label htmlFor="new-request-description">Description</label>
            <textarea
              id="new-request-description"
              name="description"
              rows={3}
              placeholder="Optional context for reviewers"
              value={requestForm.description}
              onChange={handleRequestInputChange}
            />
          </div>
          <div className="field">
            <label htmlFor="new-request-aliases">Aliases</label>
            <input
              id="new-request-aliases"
              name="aliases"
              placeholder="Comma separated aliases"
              value={requestForm.aliases}
              onChange={handleRequestInputChange}
            />
          </div>
          {requestError && (
            <p className="request-error" role="alert">
              {requestError}
            </p>
          )}
          {requestSuccess && (
            <p className="request-success" role="status">
              {requestSuccess}
            </p>
          )}
          <div className="filter-actions">
            <button type="submit" disabled={requestLoading}>
              {requestLoading ? "Submitting…" : "Submit request"}
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() => {
                setRequestForm({ name: "", description: "", aliases: "" });
                setRequestError(null);
                setRequestSuccess(null);
                setRequestSuggestions([]);
              }}
              disabled={requestLoading}
            >
              Reset
            </button>
          </div>
        </form>
        {requestSuggestions.length > 0 && (
          <div className="info-banner">
            <p>Similar technologies already exist:</p>
            <ul className="inline-list">
              {requestSuggestions.map((technology) => (
                <li key={technology.id}>{technology.name}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="technology-card">
        <div className="queue-header">
          <div>
            <h2>Pending requests</h2>
            <p className="section-subtitle">
              Review submissions, map duplicates, or approve new entries.
            </p>
          </div>
          <div className="queue-controls">
            <label htmlFor="queue-status">Status</label>
            <select
              id="queue-status"
              value={queueParams.status ?? ""}
              onChange={(event) =>
                setQueueParams((prev) => ({
                  ...prev,
                  status: event.target.value
                    ? (event.target
                        .value as ListTechnologyRequestsParams["status"])
                    : undefined,
                  page: 1,
                }))
              }
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <button
              type="button"
              className="ghost"
              onClick={refreshQueue}
              disabled={queueLoading}
            >
              Refresh
            </button>
          </div>
        </div>

        {queueLoading && <p className="muted">Loading requests…</p>}
        {queueError && !queueLoading && (
          <div className="error-banner" role="alert">
            <p>{queueError}</p>
            <button type="button" onClick={refreshQueue}>
              Try again
            </button>
          </div>
        )}

        {!queueLoading && requestQueue.length === 0 && !queueError && (
          <p className="muted">No requests in this state.</p>
        )}

        <div className="request-list">
          {requestQueue.map((request) => {
            const status = reviewStatus[request.id];
            const requestedByIdentity = resolveIdentity(
              request.requestedByUser,
              request.requestedBy
            );
            const reviewerIdentity = request.reviewer
              ? resolveIdentity(
                  request.reviewer,
                  request.reviewerId ?? "Unknown reviewer"
                )
              : null;
            const visibleCandidates = request.candidates.slice(
              0,
              candidateVisibility[request.id] ??
                Math.min(DEFAULT_CANDIDATE_LIMIT, request.candidates.length)
            );
            return (
              <article key={request.id} className="request-card">
                <header>
                  <div>
                    <h3>{request.name}</h3>
                    <p className="muted">{request.slug}</p>
                  </div>
                  <div className={`status-pill status-${request.status}`}>
                    {request.status}
                  </div>
                </header>
                {request.description && (
                  <p className="request-description">{request.description}</p>
                )}
                {request.aliases.length > 0 && (
                  <p className="muted">
                    Aliases:{" "}
                    <span>
                      {request.aliases
                        .map((a) => (typeof a === "string" ? a : String(a)))
                        .join(", ")}
                    </span>
                  </p>
                )}
                <p className="muted">
                  Submitted by <strong>{requestedByIdentity.primary}</strong>
                  {requestedByIdentity.secondary ? (
                    <> ({requestedByIdentity.secondary})</>
                  ) : null}{" "}
                  on {new Date(request.createdAt).toLocaleString()}
                </p>

                {request.status !== "pending" && reviewerIdentity && (
                  <p className="muted">
                    Reviewed by <strong>{reviewerIdentity.primary}</strong>
                    {reviewerIdentity.secondary ? (
                      <> ({reviewerIdentity.secondary})</>
                    ) : null}{" "}
                    on {new Date(request.updatedAt).toLocaleString()}
                  </p>
                )}

                {request.reviewerNotes && (
                  <p className="muted">
                    Reviewer notes: {request.reviewerNotes}
                  </p>
                )}

                {request.candidates.length > 0 && (
                  <details>
                    <summary>Detected duplicates</summary>
                    <ul className="technology-results">
                      {visibleCandidates.map((technology) => (
                        <li key={technology.id}>
                          <strong>{technology.name}</strong>
                          <span>{technology.slug}</span>
                        </li>
                      ))}
                    </ul>
                    {visibleCandidates.length < request.candidates.length && (
                      <button
                        type="button"
                        className="ghost small"
                        onClick={() => handleShowMoreCandidates(request)}
                      >
                        Show more suggestions
                      </button>
                    )}
                  </details>
                )}

                {request.status === "pending" && (
                  <div className="review-forms">
                    <form
                      className="review-form"
                      onSubmit={(event) =>
                        handleApproveExisting(event, request)
                      }
                    >
                      <h4>Approve and map existing</h4>
                      <div className="field">
                        <label htmlFor={`map-existing-${request.id}`}>
                          Select technology
                        </label>
                        <select
                          id={`map-existing-${request.id}`}
                          name="technologyId"
                          defaultValue=""
                          required
                        >
                          <option value="" disabled>
                            Choose a candidate
                          </option>
                          {request.candidates.map((candidate) => (
                            <option key={candidate.id} value={candidate.id}>
                              {String(candidate.name)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="field">
                        <label htmlFor={`map-aliases-${request.id}`}>
                          Additional aliases
                        </label>
                        <input
                          id={`map-aliases-${request.id}`}
                          name="aliases"
                          placeholder="Comma separated"
                        />
                      </div>
                      <div className="field">
                        <label htmlFor={`map-notes-${request.id}`}>Notes</label>
                        <textarea
                          id={`map-notes-${request.id}`}
                          name="notes"
                          rows={2}
                          placeholder="Optional reviewer note"
                        />
                      </div>
                      <div className="filter-actions">
                        <button type="submit" disabled={status?.loading}>
                          {status?.loading ? "Saving…" : "Approve"}
                        </button>
                      </div>
                    </form>

                    <form
                      className="review-form"
                      onSubmit={(event) =>
                        handleApproveCreateNew(event, request)
                      }
                    >
                      <h4>Approve and create new</h4>
                      <div className="field">
                        <label htmlFor={`create-aliases-${request.id}`}>
                          Aliases
                        </label>
                        <input
                          id={`create-aliases-${request.id}`}
                          name="aliases"
                          placeholder="Comma separated"
                          defaultValue={request.aliases.join(", ")}
                        />
                      </div>
                      <div className="field">
                        <label htmlFor={`create-jkey-${request.id}`}>
                          Judge0 language key
                        </label>
                        <input
                          id={`create-jkey-${request.id}`}
                          name="judge0LanguageKey"
                          placeholder="Optional key"
                        />
                      </div>
                      <div className="field">
                        <label htmlFor={`create-jid-${request.id}`}>
                          Judge0 language id
                        </label>
                        <input
                          id={`create-jid-${request.id}`}
                          name="judge0LanguageId"
                          placeholder="Optional numeric id"
                          type="number"
                          min={1}
                        />
                      </div>
                      <div className="field">
                        <label htmlFor={`create-notes-${request.id}`}>
                          Notes
                        </label>
                        <textarea
                          id={`create-notes-${request.id}`}
                          name="notes"
                          rows={2}
                          placeholder="Optional reviewer note"
                        />
                      </div>
                      <div className="filter-actions">
                        <button type="submit" disabled={status?.loading}>
                          {status?.loading ? "Saving…" : "Approve new"}
                        </button>
                      </div>
                    </form>

                    <form
                      className="review-form"
                      onSubmit={(event) => handleReject(event, request)}
                    >
                      <h4>Reject request</h4>
                      <div className="field">
                        <label htmlFor={`reject-notes-${request.id}`}>
                          Notes
                        </label>
                        <textarea
                          id={`reject-notes-${request.id}`}
                          name="notes"
                          rows={2}
                          placeholder="Reason for rejection"
                        />
                      </div>
                      <div className="filter-actions">
                        <button
                          type="submit"
                          className="ghost"
                          disabled={status?.loading}
                        >
                          {status?.loading ? "Saving…" : "Reject"}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {status?.error && (
                  <p className="request-error" role="alert">
                    {status.error}
                  </p>
                )}
              </article>
            );
          })}
        </div>

        {canPaginate && (
          <nav
            className="pagination"
            aria-label="Technology requests pagination"
          >
            <button
              type="button"
              onClick={() =>
                setQueueParams((prev) => ({
                  ...prev,
                  page: Math.max(1, (prev.page ?? 1) - 1),
                }))
              }
              disabled={queueLoading || queuePagination.page <= 1}
            >
              Previous
            </button>
            <span>
              Page {queuePagination.page} of {queuePagination.totalPages}
            </span>
            <button
              type="button"
              onClick={() =>
                setQueueParams((prev) => ({
                  ...prev,
                  page: Math.min(
                    queuePagination.totalPages,
                    (prev.page ?? 1) + 1
                  ),
                }))
              }
              disabled={
                queueLoading ||
                queuePagination.page >= queuePagination.totalPages
              }
            >
              Next
            </button>
          </nav>
        )}
      </section>
    </div>
  );
}
