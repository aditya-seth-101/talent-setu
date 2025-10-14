import { useMemo } from "react";
import type { CourseOutlineSummary } from "../types/course-outline";

export interface CourseOutlineDetailDialogProps {
  outline: CourseOutlineSummary | null;
  onClose: () => void;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function CourseOutlineDetailDialog({
  outline,
  onClose,
  isLoading = false,
  error = null,
  onRetry,
}: CourseOutlineDetailDialogProps) {
  const dialogId = useMemo(
    () => `outline-detail-${outline?.id ?? "pending"}`,
    [outline?.id]
  );

  if (!outline && !isLoading && !error) {
    return null;
  }

  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onClick={handleBackdropClick}
    >
      <section
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${dialogId}-title`}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="dialog-header">
          <div>
            <p className="eyebrow">{outline?.technology ?? "Course outline"}</p>
            <h2 id={`${dialogId}-title`}>
              {outline?.outline.courseTitle ??
                (isLoading ? "Loading outline…" : "Outline unavailable")}
            </h2>
            <p className="dialog-subtitle">
              {outline?.outline.description ??
                (error
                  ? "We couldn't load the outline details right now."
                  : "Fetching the latest outline details.")}
            </p>
          </div>
          <button type="button" className="ghost" onClick={onClose}>
            Close
          </button>
        </header>

        {isLoading && (
          <div className="dialog-status loading">Loading outline details…</div>
        )}

        {error && !isLoading && (
          <div className="dialog-status error">
            <p>{error}</p>
            {onRetry && (
              <button type="button" onClick={onRetry}>
                Try again
              </button>
            )}
          </div>
        )}

        {outline && !isLoading && !error && (
          <>
            <section className="dialog-meta">
              <dl>
                <div>
                  <dt>Request ID</dt>
                  <dd>{outline.requestId}</dd>
                </div>
                <div>
                  <dt>Level</dt>
                  <dd>{outline.requestedLevel}</dd>
                </div>
                <div>
                  <dt>Language key</dt>
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
                {outline.reviewNotes && (
                  <div>
                    <dt>Review notes</dt>
                    <dd>{outline.reviewNotes}</dd>
                  </div>
                )}
              </dl>
            </section>

            <section className="dialog-body">
              {outline.outline.levels.map((level) => (
                <article key={level.level} className="dialog-level">
                  <header>
                    <h3>{level.level}</h3>
                    <p>{level.topics.length} topics</p>
                  </header>

                  <ol>
                    {level.topics.map((topic, index) => (
                      <li
                        key={`${topic.title}-${index}`}
                        className="dialog-topic"
                      >
                        <div className="topic-headline">
                          <h4>{topic.title}</h4>
                          <span>
                            {topic.mcqs.length} MCQ ·{" "}
                            {topic.codingChallenge.languageKey}
                          </span>
                        </div>
                        <p>{topic.description}</p>

                        <details>
                          <summary>
                            Prerequisites ({topic.prerequisites.length})
                          </summary>
                          {topic.prerequisites.length === 0 ? (
                            <p className="muted">No prerequisites recorded.</p>
                          ) : (
                            <ul>
                              {topic.prerequisites.map((item) => (
                                <li key={item}>{item}</li>
                              ))}
                            </ul>
                          )}
                        </details>

                        <details>
                          <summary>MCQs ({topic.mcqs.length})</summary>
                          <ol>
                            {topic.mcqs.map((mcq) => (
                              <li key={mcq.question}>
                                <p className="mcq-question">{mcq.question}</p>
                                <ul className="mcq-options">
                                  {mcq.options.map((option, optionIndex) => (
                                    <li
                                      key={`${mcq.question}-${option}`}
                                      data-correct={
                                        optionIndex === mcq.answerIndex
                                      }
                                    >
                                      {String.fromCharCode(65 + optionIndex)}.{" "}
                                      {option}
                                    </li>
                                  ))}
                                </ul>
                              </li>
                            ))}
                          </ol>
                        </details>

                        <details>
                          <summary>Coding challenge</summary>
                          <div className="coding-block">
                            <p>
                              <strong>Prompt:</strong>{" "}
                              {topic.codingChallenge.prompt}
                            </p>
                            {topic.codingChallenge.sampleInput && (
                              <pre>
                                <code>{topic.codingChallenge.sampleInput}</code>
                              </pre>
                            )}
                            {topic.codingChallenge.sampleOutput && (
                              <pre>
                                <code>
                                  {topic.codingChallenge.sampleOutput}
                                </code>
                              </pre>
                            )}
                          </div>
                        </details>

                        {topic.youtubeLink ? (
                          <a
                            href={topic.youtubeLink}
                            className="topic-link"
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open suggested video
                          </a>
                        ) : (
                          <p className="muted">
                            Suggested search:{" "}
                            <strong>{topic.youtubeSearchQuery}</strong>
                          </p>
                        )}
                      </li>
                    ))}
                  </ol>
                </article>
              ))}
            </section>
          </>
        )}
      </section>
    </div>
  );

  function handleBackdropClick() {
    onClose();
  }
}
