import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTalentSearch } from "../hooks/useTalentSearch";
import type {
  TalentProfileDetail,
  TalentSearchResult,
  TalentAvailability,
} from "../types/recruitment";
import type { TechnologySummary } from "../types/technology";
import { TalentResultCard } from "./TalentResultCard";
import { TalentProfileDrawer } from "./TalentProfileDrawer";
import { TechnologyMultiSelect } from "./TechnologyMultiSelect";

const PAGE_SIZE = 20;
const AVAILABILITY_OPTIONS: TalentAvailability[] = [
  "open",
  "interviewing",
  "unavailable",
];

type AvailabilityState = Record<TalentAvailability, boolean>;

const DEFAULT_AVAILABILITY: AvailabilityState = {
  open: false,
  interviewing: false,
  unavailable: false,
};

interface FormState {
  q: string;
  location: string;
  availability: AvailabilityState;
  kioskOnly: boolean;
  assessmentsOnly: boolean;
  minExperience: string;
  maxExperience: string;
  minScore: string;
  maxScore: string;
  sort: "score" | "recent" | "experience";
  selectedTechnologies: TechnologySummary[];
}

interface QueryState extends FormState {
  page: number;
}

function cloneAvailability(state: AvailabilityState): AvailabilityState {
  return {
    open: state.open,
    interviewing: state.interviewing,
    unavailable: state.unavailable,
  };
}

function parseNumberField(value: string): number | null {
  if (!value.trim()) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function extractAvailability(state: AvailabilityState): TalentAvailability[] {
  return AVAILABILITY_OPTIONS.filter((key) => state[key]);
}

export function RecruitmentDashboard() {
  const [query, setQuery] = useState<QueryState>({
    q: "",
    location: "",
    availability: cloneAvailability(DEFAULT_AVAILABILITY),
    kioskOnly: false,
    assessmentsOnly: false,
    minExperience: "",
    maxExperience: "",
    minScore: "",
    maxScore: "",
    sort: "score",
    selectedTechnologies: [],
    page: 1,
  });
  const [formState, setFormState] = useState<FormState>({
    q: "",
    location: "",
    availability: cloneAvailability(DEFAULT_AVAILABILITY),
    kioskOnly: false,
    assessmentsOnly: false,
    minExperience: "",
    maxExperience: "",
    minScore: "",
    maxScore: "",
    sort: "score",
    selectedTechnologies: [],
  });
  const selectedAvailability = useMemo(
    () => extractAvailability(query.availability),
    [query.availability]
  );
  const technologyIds = useMemo(
    () => query.selectedTechnologies.map((item) => item.id),
    [query.selectedTechnologies]
  );
  const technologyLabels = useMemo(
    () => query.selectedTechnologies.map((item) => item.name),
    [query.selectedTechnologies]
  );
  const [lastRequest, setLastRequest] = useState<TechnologySummary[] | null>(
    null
  );
  const {
    talent,
    pagination,
    loading,
    error,
    appliedFilters,
    refresh,
    fetchTalentProfile,
  } = useTalentSearch({
    q: query.q,
    location: query.location,
    technologyIds,
    technologyLabels,
    availability: selectedAvailability,
    kioskVerified: query.kioskOnly ? true : undefined,
    hasAssessments: query.assessmentsOnly ? true : undefined,
    minExperience: parseNumberField(query.minExperience),
    maxExperience: parseNumberField(query.maxExperience),
    minRecruitmentScore: parseNumberField(query.minScore),
    maxRecruitmentScore: parseNumberField(query.maxScore),
    sort: query.sort,
    page: query.page,
    limit: PAGE_SIZE,
  });

  const [selectedResult, setSelectedResult] =
    useState<TalentSearchResult | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(
    null
  );
  const [profileDetail, setProfileDetail] =
    useState<TalentProfileDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const detailAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!selectedProfileId) {
      return;
    }
    const updated = talent.find(
      (result) => result.profile.id === selectedProfileId
    );
    if (updated) {
      setSelectedResult(updated);
    }
  }, [talent, selectedProfileId]);

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = event.target;
    setFormState((prev) => ({ ...prev, [name]: checked }));
  };

  const handleAvailabilityChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { value, checked } = event.target;
    const casted = value as TalentAvailability;
    setFormState((prev) => ({
      ...prev,
      availability: {
        ...prev.availability,
        [casted]: checked,
      },
    }));
  };

  const handleSortChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value as FormState["sort"];
    setFormState((prev) => ({ ...prev, sort: value }));
  };

  const applyFilters = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setQuery((prev) => ({
      ...prev,
      q: formState.q.trim(),
      location: formState.location.trim(),
      availability: cloneAvailability(formState.availability),
      kioskOnly: formState.kioskOnly,
      assessmentsOnly: formState.assessmentsOnly,
      minExperience: formState.minExperience.trim(),
      maxExperience: formState.maxExperience.trim(),
      minScore: formState.minScore.trim(),
      maxScore: formState.maxScore.trim(),
      sort: formState.sort,
      selectedTechnologies: [...formState.selectedTechnologies],
      page: 1,
    }));
  };

  const clearFilters = () => {
    setFormState({
      q: "",
      location: "",
      availability: cloneAvailability(DEFAULT_AVAILABILITY),
      kioskOnly: false,
      assessmentsOnly: false,
      minExperience: "",
      maxExperience: "",
      minScore: "",
      maxScore: "",
      sort: "score",
      selectedTechnologies: [],
    });
    setQuery({
      q: "",
      location: "",
      availability: cloneAvailability(DEFAULT_AVAILABILITY),
      kioskOnly: false,
      assessmentsOnly: false,
      minExperience: "",
      maxExperience: "",
      minScore: "",
      maxScore: "",
      sort: "score",
      selectedTechnologies: [],
      page: 1,
    });
    setLastRequest(null);
  };

  const goToPage = (page: number) => {
    setQuery((prev) => ({ ...prev, page }));
  };

  const closeDetail = useCallback(() => {
    if (detailAbortRef.current) {
      detailAbortRef.current.abort();
      detailAbortRef.current = null;
    }
    setSelectedResult(null);
    setSelectedProfileId(null);
    setProfileDetail(null);
    setDetailError(null);
    setDetailLoading(false);
  }, []);

  const openDetail = useCallback(
    (result: TalentSearchResult) => {
      if (detailAbortRef.current) {
        detailAbortRef.current.abort();
        detailAbortRef.current = null;
      }
      setSelectedResult(result);
      setSelectedProfileId(result.profile.id);
      setDetailError(null);
      setDetailLoading(true);
      setProfileDetail(null);

      const controller = new AbortController();
      detailAbortRef.current = controller;

      fetchTalentProfile(result.profile.id, controller.signal)
        .then((detail) => {
          setProfileDetail(detail);
          setDetailError(null);
        })
        .catch((fetchError) => {
          if ((fetchError as Error).name === "AbortError") {
            return;
          }
          const message =
            fetchError instanceof Error
              ? fetchError.message
              : "Failed to load profile";
          setDetailError(message);
        })
        .finally(() => {
          setDetailLoading(false);
          if (detailAbortRef.current === controller) {
            detailAbortRef.current = null;
          }
        });
    },
    [fetchTalentProfile]
  );

  const retryDetail = useCallback(() => {
    if (!selectedProfileId) {
      return;
    }

    const fromList = talent.find(
      (item) => item.profile.id === selectedProfileId
    );

    if (fromList) {
      openDetail(fromList);
    } else if (selectedResult) {
      openDetail(selectedResult);
    }
  }, [selectedProfileId, talent, selectedResult, openDetail]);

  useEffect(() => {
    if (!selectedProfileId) {
      return;
    }
    const escHandler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDetail();
      }
    };
    window.addEventListener("keydown", escHandler);
    return () => window.removeEventListener("keydown", escHandler);
  }, [selectedProfileId, closeDetail]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    if (!selectedProfileId) {
      return;
    }
    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";
    return () => {
      body.style.overflow = previousOverflow;
    };
  }, [selectedProfileId]);

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Recruitment</p>
          <h1>Talent discovery</h1>
          <p className="lede">
            Search across published profiles, filter by availability, and review
            assessment credibility before reaching out to candidates.
          </p>
        </div>
      </header>

      <section className="filters">
        <form className="filter-form" onSubmit={applyFilters}>
          <div className="field-group">
            <div className="field">
              <label htmlFor="q">Search</label>
              <input
                id="q"
                name="q"
                placeholder="Name or headline keywords"
                value={formState.q}
                onChange={handleInputChange}
              />
            </div>
            <div className="field">
              <label htmlFor="location">Location</label>
              <input
                id="location"
                name="location"
                placeholder="e.g. Remote, Berlin"
                value={formState.location}
                onChange={handleInputChange}
              />
            </div>
            <div className="field">
              <TechnologyMultiSelect
                selected={formState.selectedTechnologies}
                onChange={(next) =>
                  setFormState((prev) => ({
                    ...prev,
                    selectedTechnologies: next,
                  }))
                }
                onRequestCompleted={(result) => {
                  setLastRequest(result.duplicate ? result.suggestions : []);
                }}
              />
            </div>
          </div>

          <div className="field-group">
            <div className="field">
              <label>Availability</label>
              <div className="checkbox-grid">
                {AVAILABILITY_OPTIONS.map((option) => (
                  <label key={option} className="checkbox">
                    <input
                      type="checkbox"
                      value={option}
                      checked={formState.availability[option]}
                      onChange={handleAvailabilityChange}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="field">
              <label htmlFor="minExperience">Experience (years)</label>
              <div className="range-fields">
                <input
                  id="minExperience"
                  name="minExperience"
                  type="number"
                  min={0}
                  max={60}
                  placeholder="Min"
                  value={formState.minExperience}
                  onChange={handleInputChange}
                />
                <input
                  id="maxExperience"
                  name="maxExperience"
                  type="number"
                  min={0}
                  max={60}
                  placeholder="Max"
                  value={formState.maxExperience}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="minScore">Recruitment score</label>
              <div className="range-fields">
                <input
                  id="minScore"
                  name="minScore"
                  type="number"
                  min={0}
                  max={10000}
                  placeholder="Min"
                  value={formState.minScore}
                  onChange={handleInputChange}
                />
                <input
                  id="maxScore"
                  name="maxScore"
                  type="number"
                  min={0}
                  max={10000}
                  placeholder="Max"
                  value={formState.maxScore}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </div>

          <div className="field-group">
            <div className="field checkbox-field">
              <label>
                <input
                  type="checkbox"
                  name="kioskOnly"
                  checked={formState.kioskOnly}
                  onChange={handleCheckboxChange}
                />
                <span>Kiosk verified only</span>
              </label>
              <label>
                <input
                  type="checkbox"
                  name="assessmentsOnly"
                  checked={formState.assessmentsOnly}
                  onChange={handleCheckboxChange}
                />
                <span>Has assessments</span>
              </label>
            </div>
            <div className="field">
              <label htmlFor="sort">Sort</label>
              <select
                id="sort"
                name="sort"
                value={formState.sort}
                onChange={handleSortChange}
              >
                <option value="score">Recruitment score</option>
                <option value="recent">Recent assessments</option>
                <option value="experience">Experience</option>
              </select>
            </div>
          </div>

          <div className="filter-actions">
            <button type="submit" disabled={loading}>
              Run search
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

      {lastRequest && lastRequest.length > 0 && (
        <section className="results">
          <div className="info-banner">
            <p>
              Pending approval. Reviewers will consider your request. In the
              meantime, similar technologies:
            </p>
            <ul className="inline-list">
              {lastRequest.map((tech) => (
                <li key={tech.id}>{tech.name}</li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="results">
        <div className="results-meta">
          <p>
            Showing page {pagination.page} of{" "}
            {Math.max(pagination.totalPages, 1)} · {pagination.total} result
            {pagination.total === 1 ? "" : "s"}
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

        {loading && <div className="loading">Searching profiles…</div>}

        {error && !loading && (
          <div className="error-banner" role="alert">
            <p>{error}</p>
            <button type="button" onClick={refresh}>
              Try again
            </button>
          </div>
        )}

        {!loading && !error && talent.length === 0 && (
          <div className="empty-state">
            <h2>No candidates found</h2>
            <p>Adjust filters or broaden your search keywords.</p>
          </div>
        )}

        <div className="talent-grid">
          {talent.map((result) => (
            <TalentResultCard
              key={result.profile.id}
              result={result}
              onSelect={openDetail}
            />
          ))}
        </div>

        {pagination.totalPages > 1 && (
          <nav className="pagination" aria-label="Talent results pagination">
            <button
              type="button"
              onClick={() => goToPage(Math.max(1, pagination.page - 1))}
              disabled={pagination.page <= 1 || loading}
            >
              Previous
            </button>
            <span>
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              type="button"
              onClick={() =>
                goToPage(Math.min(pagination.totalPages, pagination.page + 1))
              }
              disabled={pagination.page >= pagination.totalPages || loading}
            >
              Next
            </button>
          </nav>
        )}
      </section>

      <TalentProfileDrawer
        open={Boolean(selectedProfileId)}
        summary={selectedResult}
        detail={profileDetail}
        loading={detailLoading}
        error={detailError}
        onClose={closeDetail}
        onRetry={detailError ? retryDetail : undefined}
      />
    </>
  );
}
