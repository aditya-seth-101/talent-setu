import type { TalentSearchResult } from "../types/recruitment";

interface TalentResultCardProps {
  result: TalentSearchResult;
  onSelect: (result: TalentSearchResult) => void;
}

export function TalentResultCard({ result, onSelect }: TalentResultCardProps) {
  const { profile, technologies, assessments } = result;
  const availability = profile.availability ?? "unknown";
  const score = profile.recruitmentScore ?? 0;
  const experienceLabel =
    typeof profile.experienceYears === "number"
      ? `${profile.experienceYears} ${
          profile.experienceYears === 1 ? "year" : "years"
        }`
      : "Not provided";

  return (
    <article className="talent-card">
      <header className="talent-card-header">
        <div>
          <div className="talent-name-row">
            <h3>{profile.displayName}</h3>
            <span className="availability-pill" data-status={availability}>
              {availability}
            </span>
          </div>
          {profile.headline && (
            <p className="talent-headline">{profile.headline}</p>
          )}
        </div>
        <div className="talent-score">
          <span className="score-label">Recruitment score</span>
          <strong>{score}</strong>
        </div>
      </header>

      <dl className="talent-meta">
        <div>
          <dt>Location</dt>
          <dd>{profile.location || "Not specified"}</dd>
        </div>
        <div>
          <dt>Experience</dt>
          <dd>{experienceLabel}</dd>
        </div>
        <div>
          <dt>Assessments</dt>
          <dd>
            {assessments.completed}/{assessments.total} completed
            {assessments.kioskVerified ? " · kiosk verified" : ""}
          </dd>
        </div>
      </dl>

      {technologies.length > 0 && (
        <ul className="talent-tech-list" aria-label="Technologies">
          {technologies.map((tech) => (
            <li key={tech.id}>{tech.name}</li>
          ))}
        </ul>
      )}

      <footer className="talent-actions">
        <button type="button" onClick={() => onSelect(result)}>
          View profile
        </button>
      </footer>
    </article>
  );
}
