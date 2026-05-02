# Task 2-a: API Routes for Lead Prospecting Platform

## Work Completed

### 1. `/src/app/api/leads/route.ts` - CRUD Operations
- **GET /api/leads**: List leads with filtering by `status`, `niche`, `search` (name/company), pagination with `page` and `limit` params. Returns `{ leads, total, page, totalPages }`.
- **POST /api/leads**: Create a new lead. Requires `name` and `company`, all other fields optional. Returns created lead with status 201.
- **PATCH /api/leads**: Update a lead. Requires `id` in body, only updates provided fields from allowlist. Checks existence before update.
- **DELETE /api/leads**: Delete a lead. Requires `id` in body. Checks existence before deletion. Returns `{ success: true }`.

### 2. `/src/app/api/search/route.ts` - Web Search
- **POST /api/search**: Accepts `{ query, niche?, location? }`. Constructs optimized search query by appending niche, location, and Portuguese contact keywords ("telefone contato site"). Uses `z-ai-web-dev-sdk` `ZAI.create()` + `functions.invoke('web_search', { query, num: 15 })`. Saves search to `SearchHistory` table via Prisma. Returns `{ results: SearchFunctionResultItem[], searchId: string }`.

### 3. `/src/app/api/stats/route.ts` - Dashboard Statistics
- **GET /api/stats**: Returns pipeline statistics:
  - `totalLeads`: Total count
  - `byStatus`: Record of status → count (using Prisma groupBy)
  - `byNiche`: Record of niche → count (null niche → "Não definido")
  - `bySource`: Record of source → count (null source → "Não definido")
  - `recentLeads`: Last 5 leads ordered by createdAt desc
  - `conversionRate`: (fechado count / total) * 100, rounded to 2 decimal places

## Testing
All endpoints tested via curl:
- GET /api/leads → 200, returns paginated results
- POST /api/leads → 201, creates lead successfully
- PATCH /api/leads → 200, updates lead fields
- DELETE /api/leads → 200, deletes lead
- GET /api/stats → 200, returns correct statistics with groupBy aggregations

## Code Quality
- Lint passes with 0 errors, 0 warnings
- All routes use proper error handling with try/catch
- Uses `import { db } from '@/lib/db'` for Prisma access
- Uses `import { NextRequest, NextResponse } from 'next/server'`
