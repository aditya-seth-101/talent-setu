import { useEffect, useMemo, useState } from "react";
import type {
  CourseOutlineSummary,
  OutlineReviewStatus,
} from "../types/course-outline";

const STATUS_OPTIONS: OutlineReviewStatus[] = [
  "pending",
  "approved",
  "rejected",
];

export interface CourseOutlineCardProps {
  outline: CourseOutlineSummary;
  onUpdateStatus: (
    id: string,
    payload: {
      reviewStatus: OutlineReviewStatus;
      reviewNotes?: string | null;
    }
  ) => Promise<void>;
  onInspect?: (outline: CourseOutlineSummary) => void;
}

const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

export function CourseOutlineCard({
  outline,
  onUpdateStatus,
  onInspect,
}: CourseOutlineCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState<OutlineReviewStatus>(
    outline.reviewStatus
  );
  const [notes, setNotes] = useState(outline.reviewNotes ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setStatus(outline.reviewStatus);
    setNotes(outline.reviewNotes ?? "");
  }, [outline.id, outline.reviewNotes, outline.reviewStatus]);

  const canSubmit = useMemo(() => {
    if (status !== outline.reviewStatus) {
      return true;
    }

    const normalizedOriginal = (outline.reviewNotes ?? "").trim();
    const normalizedCurrent = notes.trim();

    return normalizedOriginal !== normalizedCurrent;
  }, [outline.reviewNotes, outline.reviewStatus, notes, status]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || submitting) {
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await onUpdateStatus(outline.id, {
        reviewStatus: status,
        reviewNotes: notes.trim().length > 0 ? notes.trim() : null,
      });
      setSuccess("Review status updated");
    } catch (updateError) {
      const message =
        updateError instanceof Error
          ? updateError.message
          : "Failed to update review";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    setStatus(outline.reviewStatus);
    setNotes(outline.reviewNotes ?? "");
    setError(null);
    setSuccess(null);
  }

  return (
    <article className={`outline-card status-${outline.reviewStatus}`}>
      <header className="outline-header">
        <div>
          <h3>{outline.outline.courseTitle}</h3>
          <p className="outline-subtitle">
            <span>{outline.technology}</span>
            <span className="dot" aria-hidden="true" />
            <span className="level">{outline.requestedLevel}</span>
            <span className="dot" aria-hidden="true" />
            <span
              title={`Requested ${DATE_FORMATTER.format(
                new Date(outline.createdAt)
              )}`}
            >
              {DATE_FORMATTER.format(new Date(outline.generatedAt))}
            </span>
          </p>
        </div>
        <div className="status-pill" data-status={outline.reviewStatus}>
          {outline.reviewStatus}
        </div>
      </header>

      <section className="outline-description">
        <p>{outline.outline.description}</p>
        {onInspect && (
          <button
            type="button"
            className="ghost small"
            onClick={() => onInspect(outline)}
          >
            View full outline
          </button>
        )}
      </section>

      <section className="outline-meta">
        <dl>
          <div>
            <dt>Request ID</dt>
            <dd>{outline.requestId}</dd>
          </div>
          <div>
            <dt>Language Key</dt>
            <dd>{outline.outline.languageKey}</dd>
          </div>
          <div>
            <dt>Model</dt>
            <dd>{outline.metadata.model ?? "Unknown"}</dd>
          </div>
          <div>
            <dt>Cached</dt>
            <dd>{outline.metadata.cached ? "Yes" : "No"}</dd>
          </div>
          {outline.requestedByEmail && (
            <div>
              <dt>Requested By</dt>
              <dd>{outline.requestedByEmail}</dd>
            </div>
          )}
          {outline.publishedCourseSlug && (
            <div>
              <dt>Published</dt>
              <dd>{outline.publishedCourseSlug}</dd>
            </div>
          )}
          {outline.publishedAt && (
            <div>
              <dt>Published At</dt>
              <dd>{new Date(outline.publishedAt).toLocaleString()}</dd>
            </div>
          )}
        </dl>
      </section>

      <section className="outline-body">
        <button
          type="button"
          className="toggle-topics"
          onClick={() => setExpanded((prev) => !prev)}
        >
          {expanded ? "Hide topics" : "Show topics"}
        </button>

        {expanded && (
          <div className="levels">
            {outline.outline.levels.map((level) => (
              <div key={level.level} className="level-card">
                <h4>{level.level}</h4>
                <ol>
                  {level.topics.map((topic) => (
                    <li key={topic.title}>
                      <div className="topic-header">
                        <span className="topic-title">{topic.title}</span>
                        <span className="topic-meta">
                          {topic.mcqs.length} MCQ ·{" "}
                          {topic.codingChallenge.languageKey}
                        </span>
                      </div>
                      <p>{topic.description}</p>
                      {topic.youtubeLink && (
                        <a
                          className="topic-link"
                          href={topic.youtubeLink}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Watch suggested video
                        </a>
                      )}
                      {!topic.youtubeLink && topic.youtubeSearchQuery && (
                        <p className="topic-link muted">
                          Search query: {topic.youtubeSearchQuery}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        )}
      </section>

      <form
        className="review-form"
        onSubmit={handleSubmit}
        onReset={handleReset}
      >
        <div className="field">
          <label htmlFor={`status-${outline.id}`}>Review Status</label>
          <select
            id={`status-${outline.id}`}
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as OutlineReviewStatus)
            }
            disabled={submitting}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor={`notes-${outline.id}`}>Review Notes</label>
          <textarea
            id={`notes-${outline.id}`}
            placeholder="Share context for your decision"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            disabled={submitting}
            rows={3}
          />
        </div>

        {error && (
          <p role="alert" className="alert error">
            {error}
          </p>
        )}
        {success && <p className="alert success">{success}</p>}

        <div className="form-actions">
          <button
            type="reset"
            className="ghost"
            disabled={submitting || !canSubmit}
          >
            Reset
          </button>
          <button type="submit" disabled={!canSubmit || submitting}>
            {submitting ? "Saving..." : "Save review"}
          </button>
        </div>
      </form>
    </article>
  );
}
