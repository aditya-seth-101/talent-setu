Recruitment query index recommendations

Added indexes to support the recruitment marketplace aggregation and common recruiter queries. These are lightweight, low-risk indexes that improve sort and filter performance.

Indexes added

- `profiles.recruitmentScore` (descending)

  - Speeds up sorting by recruitment score when listing candidates.

- `profiles.technologies + recruitmentScore` (technologies ascending, recruitmentScore descending)

  - Supports efficient filtering by technology while sorting by score.

- `assessments.candidateId + updatedAt` (candidateId ascending, updatedAt descending)
  - Enables fast retrieval of most recent assessments for a candidate.
- `technology_requests.slug` (partial on `status: "pending"`)
  - Guarantees a single pending request per slug and speeds up duplicate detection when recruiters submit aliases.
- `technology_requests.status + createdAt` (status ascending, createdAt descending)
  - Keeps the admin review queue responsive when filtering by status and sorting newest first.
- `technology_requests.requestedBy + createdAt` (requestedBy ascending, createdAt descending)
  - Enables recruiter dashboards to show each user's submissions without full collection scans.

Monitoring & operational notes

- Measure index usage in production with `db.collection.getIndexes()` and MongoDB's `explain()` on heavy queries to confirm these indexes are being used.
- If recruitment queries filter on additional fields (e.g., `location`, `experienceYears`), consider adding compound indexes tuned to the most common query shapes.
- Keep an eye on index size and write amplification: each new index increases write cost. If write throughput becomes constrained, consider partial indexes, TTL, or periodically building specialized reporting indexes offline.
- Consider adding a cache (Redis) for the top N queries (popular technology filters) if read latency becomes critical.

How to revert

- Remove index by name: `db.profiles.dropIndex("profiles_recruitment_score")` (run in the appropriate database context).
