# Recruitment API Documentation

## Overview

The Recruitment API enables recruiters and admins to search for talent and inspect candidate profiles enriched with assessment history. All endpoints require authentication and recruiter or admin role permissions.

Base path: `/api/recruitment`

Common headers:

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

## 1. Search Talent

**Endpoint**: `GET /api/recruitment/talent`

**Roles**: `recruiter`, `admin`

**Description**: Returns paginated talent results with aggregated assessment credibility metrics.

**Query Parameters**:

| Parameter             | Type                                       | Description                                                           |
| --------------------- | ------------------------------------------ | --------------------------------------------------------------------- |
| `q`                   | string                                     | Full-text search across display name and headline.                    |
| `location`            | string                                     | Case-insensitive substring match on candidate location.               |
| `technology`          | string or string[]                         | Technology ObjectId(s); results must include all specified IDs.       |
| `availability`        | `open\|interviewing\|unavailable` or array | Filter by availability status.                                        |
| `minExperience`       | number                                     | Minimum experience in years (0-60).                                   |
| `maxExperience`       | number                                     | Maximum experience in years (0-60).                                   |
| `minRecruitmentScore` | number                                     | Minimum recruitment score (0-10000).                                  |
| `maxRecruitmentScore` | number                                     | Maximum recruitment score (0-10000).                                  |
| `kioskVerified`       | boolean                                    | If true, only include candidates with kiosk-verified assessments.     |
| `hasAssessments`      | boolean                                    | If true, only include candidates with at least one assessment.        |
| `sort`                | `score\|recent\|experience`                | Primary sort: score (default), most recent assessment, or experience. |
| `page`                | number (>=1)                               | Page number (default 1).                                              |
| `limit`               | number (1-50)                              | Page size (default 20).                                               |

**Sample Request**:

```
curl -X GET "http://localhost:4000/api/recruitment/talent?technology=67a1b2c3d4e5f6a7b8c9d0e1&sort=recent&kioskVerified=true" \
  -H "Authorization: Bearer <recruiter_token>"
```

**Response** `200 OK`:

```json
{
  "talent": [
    {
      "profile": {
        "id": "67a1b2c3d4e5f6a7b8c9d0e2",
        "userId": "67a1b2c3d4e5f6a7b8c9d0e0",
        "displayName": "Alice Johnson",
        "headline": "Senior Fullstack Engineer",
        "location": "Remote",
        "experienceYears": 7,
        "technologies": ["67a1b2c3d4e5f6a7b8c9d0e1"],
        "availability": "open",
        "recruitmentScore": 780,
        "createdAt": "2024-01-02T10:00:00.000Z",
        "updatedAt": "2024-01-05T10:00:00.000Z",
        "resumeUrl": null,
        "learningProgress": { "courses": {}, "totals": { ... } }
      },
      "technologies": [
        {
          "id": "67a1b2c3d4e5f6a7b8c9d0e1",
          "name": "JavaScript",
          "slug": "javascript"
        }
      ],
      "assessments": {
        "total": 3,
        "completed": 2,
        "lastAssessmentAt": "2024-01-04T10:00:00.000Z",
        "lastAssessmentId": "67a1b2c3d4e5f6a7b8c9d0f0",
        "lastAssessmentStatus": "completed",
        "kioskVerified": true
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

**Error Responses**:

- `400 Bad Request` — invalid query parameter combinations (e.g., minExperience > maxExperience).
- `401 Unauthorized` — missing or invalid JWT.
- `403 Forbidden` — caller lacks recruiter/admin role.

## 2. Get Talent Profile Detail

**Endpoint**: `GET /api/recruitment/talent/:profileId`

**Roles**: `recruiter`, `admin`

**Description**: Returns a candidate’s public profile enriched with technology tags and recent assessment summaries (up to 10 assessments, ordered by `updatedAt`).

**Path Parameters**:

- `profileId` — Mongo ObjectId of the profile document.

**Sample Request**:

```
curl -X GET "http://localhost:4000/api/recruitment/talent/67a1b2c3d4e5f6a7b8c9d0e2" \
  -H "Authorization: Bearer <recruiter_token>"
```

**Response** `200 OK`:

```json
{
  "profile": {
    "id": "67a1b2c3d4e5f6a7b8c9d0e2",
    "userId": "67a1b2c3d4e5f6a7b8c9d0e0",
    "displayName": "Charlie Rivera",
    "headline": "Backend Specialist",
    "location": "NYC",
    "experienceYears": 5,
    "technologies": ["67a1b2c3d4e5f6a7b8c9d0e9"],
    "availability": "open",
    "recruitmentScore": 640,
    "createdAt": "2024-02-01T12:00:00.000Z",
    "updatedAt": "2024-02-03T12:00:00.000Z",
    "learningProgress": { "courses": {}, "totals": { ... } }
  },
  "technologies": [
    {
      "id": "67a1b2c3d4e5f6a7b8c9d0e9",
      "name": "Go",
      "slug": "golang"
    }
  ],
  "assessments": {
    "total": 1,
    "completed": 1,
    "kioskVerified": true,
    "lastAssessmentAt": "2024-03-01T11:00:00.000Z",
    "lastAssessmentId": "67a1b2c3d4e5f6a7b8c9d1f0",
    "lastAssessmentStatus": "completed",
    "averageScore": 90,
    "recent": [
      {
        "id": "67a1b2c3d4e5f6a7b8c9d1f0",
        "templateId": "67a1b2c3d4e5f6a7b8c9d1a0",
        "templateName": "Backend Interview",
        "status": "completed",
        "kioskFlag": true,
        "durationMinutes": 90,
        "startedAt": "2024-03-01T09:15:00.000Z",
        "completedAt": "2024-03-01T10:45:00.000Z",
        "updatedAt": "2024-03-01T11:00:00.000Z",
        "totalPhases": 2,
        "completedPhases": 2,
        "averageScore": 90
      }
    ]
  }
}
```

**Error Responses**:

- `400 Bad Request` — invalid `profileId` format.
- `401 Unauthorized` — missing or invalid JWT.
- `403 Forbidden` — caller lacks recruiter/admin role.
- `404 Not Found` — profile not found.

## 3. Pagination & Sorting

- Paging is controlled via `page` and `limit` parameters.
- Sorting options:
  - `score`: `recruitmentScore` desc, completed assessments desc, updatedAt desc (default).
  - `recent`: latest assessment timestamp desc, updatedAt desc.
  - `experience`: experienceYears desc, recruitmentScore desc, updatedAt desc.

## 4. Assessment Credibility Metrics

Each talent result includes aggregated counters derived from the `assessments` collection:

- `total`: total assessments assigned to the candidate.
- `completed`: number of completed assessments.
- `lastAssessmentAt`: timestamp of the most recent assessment update.
- `lastAssessmentStatus`: status of the most recent assessment.
- `kioskVerified`: `true` if any completed assessment has `kioskFlag=true` (proctored/verified).

Detailed profile responses also expose:

- `averageScore`: normalized percentage of all completed phases where evaluation scores are available.
- `recent`: array of up to 10 recent assessments with phase completion and average score per assessment.

## 5. Error Format

Errors follow the standard API shape:

```json
{
  "statusCode": 400,
  "message": "Invalid query parameter",
  "details": { "field": "more info" }
}
```

## 6. Future Enhancements

- Surface manual score overrides and proctor notes once Sprint 7 tooling is complete.
- Extend filtering to include technology proficiency levels (`profiles.learningProgress`) and recruiter-defined tags.
- Add caching for popular queries (e.g., kiosk-verified candidates per technology).
- Expand summary to include average time-to-complete and hint usage penalties.
  ``
