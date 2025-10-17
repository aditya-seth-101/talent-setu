import { useCallback, useEffect, useRef, useState } from "react";
import { CourseOutlineCard } from "./CourseOutlineCard";
import {
  useCourseOutlines,
  type StatusFilter,
} from "../hooks/useCourseOutlines";
import type {
  CourseOutlineSummary,
  PublishedCourseDetail,
} from "../types/course-outline";
import { CourseOutlineDetailDialog } from "./CourseOutlineDetailDialog";

const STATUS_FILTERS: StatusFilter[] = [
  "pending",
  "approved",
  "rejected",
  "all",
];
const PAGE_SIZE = 10;

export function CourseOutlineDashboard() {
  const [query, setQuery] = useState({
    status: "pending" as StatusFilter,
    search: "",
    technology: "",
    page: 1,
  });
  const [formState, setFormState] = useState({
    status: "pending" as StatusFilter,
    search: "",
    technology: "",
  });
  const {
    outlines,
    totalPages,
    totalResults,
    loading,
    error,
    appliedFilters,
    updateStatus,
    refresh,
    fetchOutlineById,
    publishOutline,
  } = useCourseOutlines({
    status: query.status,
    search: query.search,
    technology: query.technology,
    page: query.page,
    limit: PAGE_SIZE,
  });
  const [selectedOutline, setSelectedOutline] =
    useState<CourseOutlineSummary | null>(null);
  const [selectedOutlineId, setSelectedOutlineId] = useState<string | null>(
    null
  );
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const detailAbortRef = useRef<AbortController | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishSuccess, setPublishSuccess] = useState<string | null>(null);
  const [publishedCourse, setPublishedCourse] =
    useState<PublishedCourseDetail | null>(null);

  const resetPublishState = useCallback(() => {
    setPublishError(null);
    setPublishSuccess(null);
    setPublishedCourse(null);
    setPublishing(false);
  }, []);

  function handleFormChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  }

  function handleStatusChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const value = event.target.value as StatusFilter;
    setFormState((prev) => ({ ...prev, status: value }));
  }

  function handleFilterSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuery((prev) => ({
      ...prev,
      status: formState.status,
      search: formState.search.trim(),
      technology: formState.technology.trim(),
      page: 1,
    }));
  }

  function clearFilters() {
    setFormState({ status: "pending", search: "", technology: "" });
    setQuery({ status: "pending", search: "", technology: "", page: 1 });
  }

  function goToPage(page: number) {
    setQuery((prev) => ({ ...prev, page }));
  }

  const updateUrlSelection = useCallback(
    (id: string | null, replace = true) => {
      if (typeof window === "undefined") {
        return;
      }

      const url = new URL(window.location.href);

      if (id) {
        url.searchParams.set("outline", id);
      } else {
        url.searchParams.delete("outline");
      }

      if (replace) {
        window.history.replaceState({}, "", url);
      } else {
        window.history.pushState({}, "", url);
      }
    },
    []
  );

  const clearSelection = useCallback(
    (options?: { skipUrlUpdate?: boolean }) => {
      if (detailAbortRef.current) {
        detailAbortRef.current.abort();
        detailAbortRef.current = null;
      }

      setSelectedOutline(null);
      setSelectedOutlineId(null);
      setDetailError(null);
      setDetailLoading(false);
      resetPublishState();

      if (!options?.skipUrlUpdate) {
        updateUrlSelection(null, true);
      }
    },
    [resetPublishState, updateUrlSelection]
  );

  const openOutlineSummary = useCallback(
    (outline: CourseOutlineSummary, options?: { replaceUrl?: boolean }) => {
      if (detailAbortRef.current) {
        detailAbortRef.current.abort();
        detailAbortRef.current = null;
      }

      setSelectedOutline(outline);
      setSelectedOutlineId(outline.id);
      setDetailError(null);
      setDetailLoading(false);
      resetPublishState();

      updateUrlSelection(outline.id, options?.replaceUrl ?? false);
    },
    [resetPublishState, updateUrlSelection]
  );

  const fetchOutlineForId = useCallback(
    async (
      id: string,
      options: { updateUrl?: boolean; replaceUrl?: boolean } = {}
    ) => {
      if (detailAbortRef.current) {
        detailAbortRef.current.abort();
      }

      const controller = new AbortController();
      detailAbortRef.current = controller;

      setSelectedOutline((current) => (current?.id === id ? current : null));
      setSelectedOutlineId(id);
      setDetailError(null);
      setDetailLoading(true);
      resetPublishState();

      try {
        const outline = await fetchOutlineById(id, controller.signal);
        setSelectedOutline(outline);
        setDetailError(null);

        if (options.updateUrl ?? true) {
          updateUrlSelection(id, options.replaceUrl ?? true);
        }
      } catch (fetchError) {
        if ((fetchError as Error).name !== "AbortError") {
          const message =
            fetchError instanceof Error
              ? fetchError.message
              : "Failed to load outline details";
          setDetailError(message);
        }
      } finally {
        setDetailLoading(false);
        if (detailAbortRef.current === controller) {
          detailAbortRef.current = null;
        }
      }
    },
    [fetchOutlineById, resetPublishState, updateUrlSelection]
  );

  const handleInspectOutline = useCallback(
    (outline: CourseOutlineSummary) => {
      openOutlineSummary(outline, { replaceUrl: false });
    },
    [openOutlineSummary]
  );

  const syncSelectionFromUrl = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    const url = new URL(window.location.href);
    const id = url.searchParams.get("outline");

    if (!id) {
      if (selectedOutlineId !== null) {
        clearSelection({ skipUrlUpdate: true });
      }
      return;
    }

    if (id === selectedOutlineId && (selectedOutline || detailLoading)) {
      return;
    }

    const outlineFromList = outlines.find((outline) => outline.id === id);

    if (outlineFromList) {
      openOutlineSummary(outlineFromList, { replaceUrl: true });
      return;
    }

    setSelectedOutline(null);
    setSelectedOutlineId(id);
    void fetchOutlineForId(id, { updateUrl: false });
  }, [
    outlines,
    selectedOutlineId,
    selectedOutline,
    detailLoading,
    clearSelection,
    openOutlineSummary,
    fetchOutlineForId,
  ]);

  useEffect(() => {
    syncSelectionFromUrl();

    const handler = () => syncSelectionFromUrl();
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, [syncSelectionFromUrl]);

  useEffect(() => {
    if (!selectedOutlineId) {
      return;
    }

    const outlineFromList = outlines.find(
      (outline) => outline.id === selectedOutlineId
    );
    if (outlineFromList) {
      setSelectedOutline(outlineFromList);
    }
  }, [outlines, selectedOutlineId]);

  useEffect(() => {
    if (!selectedOutlineId) {
      return;
    }

    const keyHandler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        clearSelection();
      }
    };

    window.addEventListener("keydown", keyHandler);
    return () => window.removeEventListener("keydown", keyHandler);
  }, [selectedOutlineId, clearSelection]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    if (!selectedOutlineId) {
      return;
    }

    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    return () => {
      body.style.overflow = previousOverflow;
    };
  }, [selectedOutlineId]);

  const handleDialogClose = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

  const handleDialogRetry = useCallback(() => {
    if (!selectedOutlineId) {
      return;
    }
    void fetchOutlineForId(selectedOutlineId, {
      updateUrl: false,
      replaceUrl: true,
    });
  }, [selectedOutlineId, fetchOutlineForId]);

  const handlePublishOutline = useCallback(
    async (outlineId: string) => {
      if (publishing) {
        return;
      }

      setPublishing(true);
      setPublishError(null);
      setPublishSuccess(null);

      try {
        const result = await publishOutline(outlineId);
        const messageBase = `${result.course.title} (${result.course.slug})`;
        const alreadyPublished = Boolean(
          selectedOutline?.publishedCourseId || selectedOutline?.publishedAt
        );
        if (!selectedOutlineId) {
          refresh();
          return;
        }

        if (selectedOutlineId !== outlineId) {
          refresh();
          return;
        }
        setSelectedOutline(result.outline);
        setSelectedOutlineId(result.outline.id);
        setPublishedCourse(result.course);
        setPublishSuccess(
          alreadyPublished
            ? `Course already published as ${messageBase}`
            : `Course published as ${messageBase}`
        );
        refresh();
      } catch (publishErr) {
        const message =
          publishErr instanceof Error
            ? publishErr.message
            : "Failed to publish course";
        setPublishError(message);
      } finally {
        setPublishing(false);
      }
    },
    [publishOutline, publishing, refresh, selectedOutline, selectedOutlineId]
  );

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Course generation</p>
          <h1>Outline review queue</h1>
          <p className="lede">
            Review AI-generated curricula before they reach the learning
            catalog. Filter by status, inspect topic structure, and record
            review decisions.
          </p>
        </div>
      </header>

      <section className="filters">
        <form className="filter-form" onSubmit={handleFilterSubmit}>
          <div className="field-group">
            <div className="field">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                name="status"
                value={formState.status}
                onChange={handleStatusChange}
              >
                {STATUS_FILTERS.map((statusOption) => (
                  <option key={statusOption} value={statusOption}>
                    {statusOption}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="technology">Technology</label>
              <input
                id="technology"
                name="technology"
                placeholder="e.g. Node.js"
                value={formState.technology}
                onChange={handleFormChange}
              />
            </div>

            <div className="field">
              <label htmlFor="search">Search</label>
              <input
                id="search"
                name="search"
                placeholder="Course title keywords"
                value={formState.search}
                onChange={handleFormChange}
              />
            </div>
          </div>

          <div className="filter-actions">
            <button type="submit" disabled={loading}>
              Apply filters
            </button>
            <button
              type="button"
              className="ghost"
              onClick={clearFilters}
              disabled={loading}
            >
              Reset
            </button>
          </div>
        </form>

        {appliedFilters.length > 0 && (
          <ul className="applied-filters" aria-label="Active filters">
            {appliedFilters.map((filter) => (
              <li key={`${filter.label}-${filter.value}`}>
                <span className="filter-chip">
                  <span className="chip-label">{filter.label}:</span>
                  <span>{filter.value}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="results">
        <div className="results-meta">
          <p>
            Showing page {query.page} of {Math.max(totalPages, 1)} ·{" "}
            {totalResults} result
            {totalResults === 1 ? "" : "s"}
          </p>
          <button
            type="button"
            className="ghost"
            onClick={refresh}
            disabled={loading}
          >
            Refresh
          </button>
        </div>

        {loading && <div className="loading">Loading course outlines…</div>}

        {error && !loading && (
          <div className="error-banner" role="alert">
            <p>{error}</p>
            <button type="button" onClick={refresh}>
              Try again
            </button>
          </div>
        )}

        {!loading && !error && outlines.length === 0 && (
          <div className="empty-state">
            <h2>No outlines to review</h2>
            <p>
              Adjust your filters or trigger a new AI generation request from
              the API service.
            </p>
          </div>
        )}

        <div className="outline-grid">
          {outlines.map((outline) => (
            <CourseOutlineCard
              key={outline.id}
              outline={outline}
              onUpdateStatus={updateStatus}
              onInspect={handleInspectOutline}
            />
          ))}
        </div>

        {totalPages > 1 && (
          <nav className="pagination" aria-label="Outline results pagination">
            <button
              type="button"
              onClick={() => goToPage(Math.max(1, query.page - 1))}
              disabled={query.page <= 1 || loading}
            >
              Previous
            </button>
            <span>
              Page {query.page} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => goToPage(Math.min(totalPages, query.page + 1))}
              disabled={query.page >= totalPages || loading}
            >
              Next
            </button>
          </nav>
        )}
      </section>

      <CourseOutlineDetailDialog
        outline={selectedOutline}
        isLoading={detailLoading}
        error={detailError}
        onClose={handleDialogClose}
        onRetry={detailError ? handleDialogRetry : undefined}
        onPublish={handlePublishOutline}
        isPublishing={publishing}
        publishError={publishError}
        publishSuccess={publishSuccess}
        publishedCourse={publishedCourse}
      />
    </>
  );
}
