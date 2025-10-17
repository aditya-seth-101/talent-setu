# Assessment API Documentation

## Overview

The Assessment API provides endpoints for managing assessment templates, creating assessments for candidates, and recording candidate responses (voice transcripts and coding submissions). The API uses JWT authentication and enforces role-based access control.

### Authentication

All endpoints require a valid JWT token in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

### Roles

- **admin**: Full access to all endpoints (create/update/publish templates, view all assessments)
- **recruiter**: Can create and manage templates, create assessments, view assessments they created
- **proctor**: Can record voice transcripts and view assessments
- **student/candidate**: Can view their own assessments, start assessments, and submit responses

---

## 1. Assessment Templates

### 1.1 Create Assessment Template

**Endpoint**: `POST /api/assessments/templates`

**Required Role**: `recruiter`, `admin`

**Description**: Create a new assessment template with multiple phases (voice, coding, MCQ, etc.)

**Request Headers**:

```
Content-Type: application/json
Authorization: Bearer <token>
```

**Request Body**:

```json
{
  "name": "Senior React Engineer Interview",
  "techStack": ["67a1b2c3d4e5f6a7b8c9d0e1"],
  "durationMinutes": 120,
  "phases": [
    {
      "id": "phase-1",
      "type": "voice",
      "title": "System Design Discussion",
      "instructions": "Describe how you would architect a real-time collaboration platform.",
      "weight": 0.4,
      "durationMinutes": 45,
      "aiConfig": {
        "difficulty": "hard",
        "focusAreas": ["scalability", "system_design"],
        "languageKey": "javascript",
        "rubric": [
          "Communication Clarity",
          "Technical Depth",
          "Problem-Solving Approach"
        ]
      }
    },
    {
      "id": "phase-2",
      "type": "coding",
      "title": "Coding Challenge",
      "instructions": "Implement a function to merge k sorted arrays efficiently.",
      "weight": 0.6,
      "durationMinutes": 75,
      "aiConfig": {
        "difficulty": "medium",
        "focusAreas": ["algorithms", "optimization"],
        "languageKey": "javascript"
      }
    }
  ]
}
```

**Response** (201 Created):

```json
{
  "id": "67a1b2c3d4e5f6a7b8c9d0e2",
  "name": "Senior React Engineer Interview",
  "createdBy": "67a1b2c3d4e5f6a7b8c9d0e0",
  "status": "draft",
  "techStack": ["67a1b2c3d4e5f6a7b8c9d0e1"],
  "durationMinutes": 120,
  "phases": [
    {
      "id": "phase-1",
      "type": "voice",
      "title": "System Design Discussion",
      "instructions": "Describe how you would architect a real-time collaboration platform.",
      "weight": 0.4,
      "durationMinutes": 45,
      "aiConfig": {
        "difficulty": "hard",
        "focusAreas": ["scalability", "system_design"],
        "languageKey": "javascript",
        "rubric": [
          "Communication Clarity",
          "Technical Depth",
          "Problem-Solving Approach"
        ]
      }
    },
    {
      "id": "phase-2",
      "type": "coding",
      "title": "Coding Challenge",
      "weight": 0.6,
      "durationMinutes": 75,
      "aiConfig": {
        "difficulty": "medium",
        "focusAreas": ["algorithms", "optimization"],
        "languageKey": "javascript"
      }
    }
  ],
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

**Error Responses**:

- `400 Bad Request`: Invalid phase configuration, missing required fields, non-positive weight, or invalid technology IDs
- `401 Unauthorized`: Missing or invalid JWT token
- `403 Forbidden`: User does not have recruiter or admin role

---

### 1.2 List Assessment Templates

**Endpoint**: `GET /api/assessments/templates`

**Required Role**: `recruiter`, `admin`

**Description**: List all assessment templates (admins see all, recruiters see only their own)

**Query Parameters**:

- `status` (optional): Filter by template status (`draft`, `published`). Example: `?status=published`
- `limit` (optional): Number of templates to return. Default: 20
- `skip` (optional): Number of templates to skip for pagination. Default: 0

**Response** (200 OK):

```json
{
  "templates": [
    {
      "id": "67a1b2c3d4e5f6a7b8c9d0e2",
      "name": "Senior React Engineer Interview",
      "status": "published",
      "phases": [
        {
          "id": "phase-1",
          "type": "voice",
          "title": "System Design Discussion",
          "weight": 0.4,
          "durationMinutes": 45
        },
        {
          "id": "phase-2",
          "type": "coding",
          "title": "Coding Challenge",
          "weight": 0.6,
          "durationMinutes": 75
        }
      ],
      "durationMinutes": 120,
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 1
}
```

**Error Responses**:

- `401 Unauthorized`: Missing or invalid JWT token

---

### 1.3 Get Assessment Template by ID

**Endpoint**: `GET /api/assessments/templates/:templateId`

**Required Role**: None (public endpoint for published templates)

**Description**: Retrieve a single assessment template by ID. Returns full phase details with AI configuration.

**Response** (200 OK):

```json
{
  "id": "67a1b2c3d4e5f6a7b8c9d0e2",
  "name": "Senior React Engineer Interview",
  "status": "published",
  "techStack": [
    {
      "id": "67a1b2c3d4e5f6a7b8c9d0e1",
      "name": "JavaScript",
      "slug": "javascript"
    }
  ],
  "durationMinutes": 120,
  "phases": [
    {
      "id": "phase-1",
      "type": "voice",
      "title": "System Design Discussion",
      "instructions": "Describe how you would architect a real-time collaboration platform.",
      "weight": 0.4,
      "durationMinutes": 45,
      "aiConfig": {
        "difficulty": "hard",
        "focusAreas": ["scalability", "system_design"],
        "languageKey": "javascript",
        "rubric": [
          "Communication Clarity",
          "Technical Depth",
          "Problem-Solving Approach"
        ]
      }
    }
  ],
  "createdAt": "2024-01-15T10:30:00Z",
  "publishedAt": "2024-01-15T11:00:00Z"
}
```

**Error Responses**:

- `404 Not Found`: Template with specified ID does not exist

---

### 1.4 Publish Assessment Template

**Endpoint**: `POST /api/assessments/templates/:templateId/publish`

**Required Role**: `admin`

**Description**: Publish a draft template, making it available for creating assessments. Template must have at least one phase.

**Response** (200 OK):

```json
{
  "id": "67a1b2c3d4e5f6a7b8c9d0e2",
  "name": "Senior React Engineer Interview",
  "status": "published",
  "publishedAt": "2024-01-15T11:00:00Z",
  "phases": [
    {
      "id": "phase-1",
      "type": "voice",
      "title": "System Design Discussion",
      "weight": 0.4
    }
  ]
}
```

**Error Responses**:

- `400 Bad Request`: Template has no phases
- `404 Not Found`: Template with specified ID does not exist
- `401 Unauthorized`: Missing or invalid JWT token
- `403 Forbidden`: User does not have admin role

---

## 2. Assessments

### 2.1 Create Assessment

**Endpoint**: `POST /api/assessments`

**Required Role**: `recruiter`, `admin`

**Description**: Create a new assessment for a candidate from a published template. The system automatically generates unique phase content via AI seeding.

**Request Body**:

```json
{
  "templateId": "67a1b2c3d4e5f6a7b8c9d0e2",
  "candidateId": "67a1b2c3d4e5f6a7b8c9d0e3"
}
```

**Response** (201 Created):

```json
{
  "id": "67a1b2c3d4e5f6a7b8c9d0e4",
  "templateId": "67a1b2c3d4e5f6a7b8c9d0e2",
  "recruiterId": "67a1b2c3d4e5f6a7b8c9d0e0",
  "candidateId": "67a1b2c3d4e5f6a7b8c9d0e3",
  "status": "scheduled",
  "durationMinutes": 120,
  "uniqueSeed": "sha256-hash-of-template-and-candidate",
  "phases": [
    {
      "id": "phase-instance-1",
      "templatePhaseId": "phase-1",
      "type": "voice",
      "title": "System Design Discussion",
      "instructions": "Describe how you would architect a real-time collaboration platform.",
      "status": "pending",
      "weight": 0.4,
      "durationMinutes": 45,
      "content": {
        "prompt": "Tell us about a system you've designed that handled high throughput and concurrency. What were the key challenges?",
        "voiceScript": {
          "opener": "Let's discuss system design. Tell us about a complex system you've architected.",
          "followUps": [
            "What were the performance bottlenecks you encountered?",
            "How did you scale the system?"
          ],
          "closing": "Thank you for sharing your experience."
        },
        "rubric": [
          "Communication Clarity",
          "Technical Depth",
          "Problem-Solving Approach"
        ]
      },
      "attemptIds": []
    },
    {
      "id": "phase-instance-2",
      "templatePhaseId": "phase-2",
      "type": "coding",
      "title": "Coding Challenge",
      "instructions": "Implement a function to merge k sorted arrays efficiently.",
      "status": "pending",
      "weight": 0.6,
      "durationMinutes": 75,
      "content": {
        "prompt": "Implement a function mergeKSortedArrays(arrays) that merges k sorted arrays into one sorted array. Optimize for both time and space complexity.",
        "testCases": [
          {
            "input": "[[1, 3], [2, 4], [5, 6]]",
            "expectedOutput": "[1, 2, 3, 4, 5, 6]",
            "explanation": "Basic merge case"
          }
        ],
        "starterCode": "function mergeKSortedArrays(arrays) {\n  // Implementation goes here\n}"
      },
      "attemptIds": []
    }
  ],
  "candidateSnapshot": {
    "userId": "67a1b2c3d4e5f6a7b8c9d0e3",
    "displayName": "John Doe",
    "headline": "Senior Software Engineer",
    "experienceYears": 5,
    "technologies": ["67a1b2c3d4e5f6a7b8c9d0e1"]
  },
  "createdAt": "2024-01-15T12:00:00Z",
  "updatedAt": "2024-01-15T12:00:00Z"
}
```

**Error Responses**:

- `400 Bad Request`: Template not published or candidate profile not found
- `404 Not Found`: Template with specified ID does not exist
- `401 Unauthorized`: Missing or invalid JWT token
- `403 Forbidden`: User does not have recruiter or admin role

---

### 2.2 Get Assessment

**Endpoint**: `GET /api/assessments/:assessmentId`

**Required Role**: Candidate (their own), recruiter (created), admin, proctor

**Description**: Retrieve a single assessment. Response includes phase solutions only if user is recruiter/admin/proctor (not shown to candidates).

**Response** (200 OK):

```json
{
  "id": "67a1b2c3d4e5f6a7b8c9d0e4",
  "templateId": "67a1b2c3d4e5f6a7b8c9d0e2",
  "recruiterId": "67a1b2c3d4e5f6a7b8c9d0e0",
  "candidateId": "67a1b2c3d4e5f6a7b8c9d0e3",
  "status": "in-progress",
  "startedAt": "2024-01-15T13:00:00Z",
  "durationMinutes": 120,
  "phases": [
    {
      "id": "phase-instance-1",
      "type": "voice",
      "title": "System Design Discussion",
      "status": "completed",
      "transcript": "I would use a microservices architecture with load balancing...",
      "transcriptSegments": [
        {
          "timestamp": "00:00:05",
          "text": "I would use a microservices architecture",
          "speakerId": "candidate"
        }
      ],
      "evaluation": {
        "score": 85,
        "maxScore": 100,
        "rubricNotes": [
          {
            "criterion": "Communication Clarity",
            "score": 90,
            "notes": "Clear explanation with good terminology"
          },
          {
            "criterion": "Technical Depth",
            "score": 80,
            "notes": "Good understanding but missed some edge cases"
          }
        ],
        "summary": "Strong technical discussion with minor gaps",
        "recommendation": "move_forward",
        "completedAt": "2024-01-15T13:45:00Z"
      },
      "completedAt": "2024-01-15T13:45:00Z"
    }
  ],
  "candidateSnapshot": {
    "userId": "67a1b2c3d4e5f6a7b8c9d0e3",
    "displayName": "John Doe",
    "headline": "Senior Software Engineer"
  },
  "createdAt": "2024-01-15T12:00:00Z",
  "updatedAt": "2024-01-15T13:50:00Z"
}
```

**Error Responses**:

- `404 Not Found`: Assessment with specified ID does not exist
- `401 Unauthorized`: Missing or invalid JWT token
- `403 Forbidden`: User cannot view this assessment

---

### 2.3 Start Assessment

**Endpoint**: `POST /api/assessments/:assessmentId/start`

**Required Role**: Candidate (their own)

**Description**: Start an assessment, marking it as in-progress and activating the first phase.

**Request Body**: (empty or `{}`)

**Response** (200 OK):

```json
{
  "id": "67a1b2c3d4e5f6a7b8c9d0e4",
  "status": "in-progress",
  "startedAt": "2024-01-15T13:00:00Z",
  "phases": [
    {
      "id": "phase-instance-1",
      "status": "active",
      "startedAt": "2024-01-15T13:00:00Z",
      "type": "voice",
      "title": "System Design Discussion"
    }
  ]
}
```

**Error Responses**:

- `404 Not Found`: Assessment with specified ID does not exist
- `400 Bad Request`: Assessment already started or status is not scheduled
- `401 Unauthorized`: Missing or invalid JWT token
- `403 Forbidden`: User is not the candidate for this assessment

---

## 3. Assessment Responses

### 3.1 Record Voice Transcript

**Endpoint**: `POST /api/assessments/:assessmentId/phases/:phaseId/transcripts`

**Required Role**: Candidate, proctor

**Description**: Record a voice transcript for a voice phase. The system automatically evaluates the transcript using AI and stores the evaluation results.

**Request Body**:

```json
{
  "transcript": "I would use a microservices architecture with load balancing. Each service would handle a specific domain...",
  "segments": [
    {
      "timestamp": "00:00:05",
      "text": "I would use a microservices architecture",
      "speakerId": "candidate"
    },
    {
      "timestamp": "00:10:15",
      "text": "Each service would handle a specific domain",
      "speakerId": "candidate"
    }
  ]
}
```

**Response** (200 OK):

```json
{
  "id": "67a1b2c3d4e5f6a7b8c9d0e4",
  "status": "in-progress",
  "phases": [
    {
      "id": "phase-instance-1",
      "type": "voice",
      "status": "completed",
      "transcript": "I would use a microservices architecture with load balancing...",
      "transcriptSegments": [
        {
          "timestamp": "00:00:05",
          "text": "I would use a microservices architecture",
          "speakerId": "candidate"
        }
      ],
      "evaluation": {
        "score": 82,
        "maxScore": 100,
        "rubricNotes": [
          {
            "criterion": "Communication Clarity",
            "score": 85,
            "notes": "Clear and articulate explanation"
          },
          {
            "criterion": "Technical Depth",
            "score": 80,
            "notes": "Good technical understanding with minor gaps"
          },
          {
            "criterion": "Collaboration Mindset",
            "score": 80,
            "notes": "Shows willingness to discuss trade-offs"
          }
        ],
        "summary": "Solid technical discussion demonstrating architecture knowledge",
        "recommendation": "move_forward",
        "completedAt": "2024-01-15T13:45:00Z"
      },
      "completedAt": "2024-01-15T13:45:00Z"
    }
  ]
}
```

**Error Responses**:

- `400 Bad Request`: Phase type is not voice or assessment/phase not found
- `404 Not Found`: Assessment or phase with specified ID does not exist
- `401 Unauthorized`: Missing or invalid JWT token
- `403 Forbidden`: User cannot submit responses for this assessment

---

### 3.2 Submit Coding Attempt

**Endpoint**: `POST /api/assessments/:assessmentId/phases/:phaseId/coding`

**Required Role**: Candidate

**Description**: Submit a coding solution. The system compiles and executes the code against test cases via Judge0.

**Request Body**:

```json
{
  "sourceCode": "function mergeKSortedArrays(arrays) {\n  const result = [];\n  const heap = [];\n  for (let i = 0; i < arrays.length; i++) {\n    if (arrays[i].length > 0) {\n      heap.push({value: arrays[i][0], arrayIdx: i, elemIdx: 0});\n    }\n  }\n  heap.sort((a, b) => a.value - b.value);\n  while (heap.length > 0) {\n    const {value, arrayIdx, elemIdx} = heap.shift();\n    result.push(value);\n    if (elemIdx + 1 < arrays[arrayIdx].length) {\n      const next = {value: arrays[arrayIdx][elemIdx + 1], arrayIdx, elemIdx: elemIdx + 1};\n      heap.push(next);\n      heap.sort((a, b) => a.value - b.value);\n    }\n  }\n  return result;\n}",
  "languageId": 63
}
```

**Response** (201 Created):

```json
{
  "attemptId": "67a1b2c3d4e5f6a7b8c9d0e5",
  "assessmentId": "67a1b2c3d4e5f6a7b8c9d0e4",
  "phaseId": "phase-instance-2",
  "languageId": 63,
  "status": "completed",
  "submittedAt": "2024-01-15T14:00:00Z",
  "testResults": {
    "passed": 5,
    "total": 5,
    "results": [
      {
        "testIndex": 0,
        "input": "[[1, 3], [2, 4], [5, 6]]",
        "expectedOutput": "[1, 2, 3, 4, 5, 6]",
        "actualOutput": "[1, 2, 3, 4, 5, 6]",
        "passed": true,
        "executionTime": "12ms",
        "memory": "2048KB"
      }
    ]
  }
}
```

**Error Responses**:

- `400 Bad Request`: Phase type is not coding, invalid language ID, or assessment/phase not found
- `404 Not Found`: Assessment or phase with specified ID does not exist
- `401 Unauthorized`: Missing or invalid JWT token
- `403 Forbidden`: User cannot submit responses for this assessment
- `500 Internal Server Error`: Judge0 service unavailable

---

## 4. Error Response Format

All error responses follow this format:

```json
{
  "statusCode": 400,
  "message": "Error description",
  "details": {
    "field": "error details if applicable"
  }
}
```

### Common Status Codes

- `200 OK`: Request successful
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request parameters or business logic validation failed
- `401 Unauthorized`: JWT token missing, expired, or invalid
- `403 Forbidden`: User lacks required role or access to resource
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Unexpected server error

---

## 5. Pagination

Endpoints that return lists support pagination via query parameters:

- `limit`: Number of items per page (default: 20, max: 100)
- `skip`: Number of items to skip (default: 0)

Example: `GET /api/assessments/templates?limit=10&skip=20`

---

## 6. Example Workflows

### Workflow 1: Create and Assign an Assessment

```bash
# 1. Create a template (as recruiter)
curl -X POST http://localhost:3000/api/assessments/templates \
  -H "Authorization: Bearer <recruiter_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Senior React Engineer",
    "techStack": ["67a1b2c3d4e5f6a7b8c9d0e1"],
    "durationMinutes": 120,
    "phases": [...]
  }'

# Response: 201 Created with template ID

# 2. Publish the template (as admin)
curl -X POST http://localhost:3000/api/assessments/templates/67a1b2c3d4e5f6a7b8c9d0e2/publish \
  -H "Authorization: Bearer <admin_token>"

# Response: 200 OK, status changed to "published"

# 3. Create assessment for candidate (as recruiter)
curl -X POST http://localhost:3000/api/assessments \
  -H "Authorization: Bearer <recruiter_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "templateId": "67a1b2c3d4e5f6a7b8c9d0e2",
    "candidateId": "67a1b2c3d4e5f6a7b8c9d0e3"
  }'

# Response: 201 Created with assessment ID
```

### Workflow 2: Candidate Takes Assessment

```bash
# 1. Start assessment (as candidate)
curl -X POST http://localhost:3000/api/assessments/67a1b2c3d4e5f6a7b8c9d0e4/start \
  -H "Authorization: Bearer <candidate_token>"

# Response: 200 OK, status changed to "in-progress", first phase "active"

# 2. Record voice transcript (as candidate)
curl -X POST http://localhost:3000/api/assessments/67a1b2c3d4e5f6a7b8c9d0e4/phases/phase-instance-1/transcripts \
  -H "Authorization: Bearer <candidate_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "transcript": "I would use a microservices architecture...",
    "segments": [...]
  }'

# Response: 200 OK, phase completed with AI evaluation

# 3. Submit coding attempt (as candidate)
curl -X POST http://localhost:3000/api/assessments/67a1b2c3d4e5f6a7b8c9d0e4/phases/phase-instance-2/coding \
  -H "Authorization: Bearer <candidate_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceCode": "function mergeKSortedArrays(...) { ... }",
    "languageId": 63
  }'

# Response: 201 Created with attempt results
```

### Workflow 3: Recruiter Reviews Assessment

```bash
# Get full assessment details (as recruiter)
curl -X GET http://localhost:3000/api/assessments/67a1b2c3d4e5f6a7b8c9d0e4 \
  -H "Authorization: Bearer <recruiter_token>"

# Response: 200 OK with full assessment including candidate solutions and evaluations
```

---

## 7. Technology Stack

- **Framework**: Express.js 4.21.2 (Node.js)
- **Language**: TypeScript 5.7.2
- **Database**: MongoDB 6.20.0
- **AI Service**: OpenAI GPT-4 (Turbo) with JSON schema validation
- **Code Execution**: Judge0 API (remote execution service)
- **Validation**: Zod 3.25.76
- **Authentication**: JWT with separate access (15m) and refresh (7d) tokens

---

## 8. Rate Limiting

Currently no rate limiting is enforced. Future versions will implement:

- 100 requests per minute per user for template endpoints
- 500 requests per minute per candidate for assessment endpoints

---

## 9. Changelog

### v0.1.0 (2024-01-15)

- Initial release
- Template CRUD operations
- Assessment creation and tracking
- Voice transcript recording with AI evaluation
- Coding submission with Judge0 integration
- Role-based access control
