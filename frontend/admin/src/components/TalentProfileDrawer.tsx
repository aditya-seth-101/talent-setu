import type {
  TalentProfileDetail,
  TalentSearchResult,
} from "../types/recruitment";

interface TalentProfileDrawerProps {
  open: boolean;
  summary: TalentSearchResult | null;
  detail: TalentProfileDetail | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onRetry?: () => void;
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

export function TalentProfileDrawer({
  open,
  summary,
  detail,
  loading,
  error,
  onClose,
  onRetry,
}: TalentProfileDrawerProps) {
  if (!open || !summary) {
    return null;
  }

  const profile = detail?.profile ?? summary.profile;
  const technologies = detail?.technologies ?? summary.technologies;
  const assessments = detail?.assessments ?? {
    ...summary.assessments,
    averageScore: null,
    recent: [],
  };

  return (
    <div
      className="dialog-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="dialog talent-dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="dialog-header">
          <div>
            <h2>{profile.displayName}</h2>
            {profile.headline && (
              <p className="dialog-subtitle">{profile.headline}</p>
            )}
          </div>
          <button type="button" className="ghost small" onClick={onClose}>
            Close
          </button>
        </header>

        <section className="dialog-meta">
          <dl>
            <div>
              <dt>Availability</dt>
              <dd>{profile.availability ?? "Not specified"}</dd>
            </div>
            <div>
              <dt>Location</dt>
              <dd>{profile.location ?? "Not specified"}</dd>
            </div>
            <div>
              <dt>Experience</dt>
              <dd>
                {typeof profile.experienceYears === "number"
                  ? `${profile.experienceYears} ${
                      profile.experienceYears === 1 ? "year" : "years"
                    }`
                  : "Not provided"}
              </dd>
            </div>
            <div>
              <dt>Recruitment score</dt>
              <dd>{profile.recruitmentScore ?? "—"}</dd>
            </div>
            <div>
              <dt>Assessments</dt>
              <dd>
                {assessments.completed}/{assessments.total} completed
                {assessments.kioskVerified ? " · kiosk verified" : ""}
              </dd>
            </div>
            <div>
              <dt>Last assessment</dt>
              <dd>{formatDateTime(assessments.lastAssessmentAt)}</dd>
            </div>
            <div>
              <dt>Average score</dt>
              <dd>
                {typeof assessments.averageScore === "number"
                  ? `${assessments.averageScore}%`
                  : "—"}
              </dd>
            </div>
          </dl>
        </section>

        {technologies.length > 0 && (
          <section className="talent-tech-section">
            <h3>Technologies</h3>
            <ul className="talent-tech-list large" aria-label="Technologies">
              {technologies.map((tech) => (
                <li key={tech.id}>{tech.name}</li>
              ))}
            </ul>
          </section>
        )}

        {profile.resumeUrl && (
          <section className="talent-resume">
            <a href={profile.resumeUrl} target="_blank" rel="noreferrer">
              View resume
            </a>
          </section>
        )}

        {loading && (
          <div className="dialog-status loading">
            Loading assessment history…
          </div>
        )}

        {error && !loading && (
          <div className="dialog-status error">
            <p>{error}</p>
            {onRetry && (
              <button type="button" onClick={onRetry}>
                Retry
              </button>
            )}
          </div>
        )}

        {!loading && !error && detail?.assessments?.recent?.length ? (
          <section className="talent-assessments">
            <header>
              <h3>Recent assessments</h3>
              <p>
                Showing {detail.assessments.recent.length} of{" "}
                {detail.assessments.total} assessments
              </p>
            </header>
            <ul className="assessment-list">
              {detail.assessments.recent.map((assessment) => (
                <li key={assessment.id}>
                  <div className="assessment-header">
                    <div>
                      <h4>{assessment.templateName ?? "Untitled template"}</h4>
                      <p>
                        {assessment.status} · updated{" "}
                        {formatDateTime(assessment.updatedAt)}
                      </p>
                    </div>
                    <div className="assessment-pill-group">
                      <span className="assessment-pill">
                        {assessment.completedPhases}/{assessment.totalPhases}{" "}
                        phases
                      </span>
                      {typeof assessment.averageScore === "number" && (
                        <span className="assessment-pill score">
                          {assessment.averageScore}%
                        </span>
                      )}
                      {assessment.kioskFlag && (
                        <span className="assessment-pill success">
                          Kiosk verified
                        </span>
                      )}
                    </div>
                  </div>
                  <dl className="assessment-meta">
                    <div>
                      <dt>Duration</dt>
                      <dd>{assessment.durationMinutes} minutes</dd>
                    </div>
                    <div>
                      <dt>Started</dt>
                      <dd>{formatDateTime(assessment.startedAt)}</dd>
                    </div>
                    <div>
                      <dt>Completed</dt>
                      <dd>{formatDateTime(assessment.completedAt)}</dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}
