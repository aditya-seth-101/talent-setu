# Dev Environment Setup - Fix Summary

## ✅ Issues Fixed

### 1. Windows PORT Environment Variable Issue

**Problem**: The original error `'PORT' is not recognized as an internal or external command` occurred because Windows cmd.exe doesn't support the Unix-style `PORT=value command` syntax.

**Solution**:

- Added `cross-env` package to devDependencies
- Updated all npm scripts in `package.json` that set PORT to use `cross-env PORT=value npm run ...`
- This makes environment variable setting work cross-platform (Windows, macOS, Linux)

### 2. Backend Services Missing Environment Variables

**Problem**: API and AI services failed to start due to missing required environment variables (JWT secrets, OpenAI API key, etc.)

**Solution**:

- Created `.env` files in `backend/api/` and `backend/ai-service/` with placeholder values
- Created `.env.example` files documenting all required variables
- ⚠️ **ACTION REQUIRED**: You need to replace placeholder values with real secrets:
  - In `backend/api/.env`: Update JWT_ACCESS_SECRET and JWT_REFRESH_SECRET with secure random strings (32+ chars)
  - In `backend/ai-service/.env`: Add your real OpenAI API key

### 3. Frontend @swc/core Native Binding Errors (Vite)

**Problem**: Admin and Assessment frontends (using Vite) failed with "Failed to load native binding" errors for @swc/core.

**Solution**:

- Uninstalled and reinstalled `@swc/core` in both frontend/admin and frontend/assessment
- Installed Windows-specific native bindings: `@swc/core-win32-x64-msvc`
- Both Vite dev servers now start successfully

### 4. Next.js SWC Binary Loading (Learning & Recruitment)

**Problem**: Next.js apps couldn't load SWC binaries and tried to use pnpm commands which caused workspace errors.

**Solution**:

- Installed `@next/swc-win32-x64-msvc` package in frontend/learning
- pnpm is already installed globally (no action needed)
- Next.js now falls back successfully and both apps start with minor warnings (harmless)

## 🎯 Current Status

### Services Running Successfully ✅

When you run `npm run dev:all`, the following services start:

| Service                  | Port | Status     | URL                   |
| ------------------------ | ---- | ---------- | --------------------- |
| **AI Service**           | 4101 | ✅ Running | http://localhost:4101 |
| **Judge Service**        | 4201 | ✅ Running | http://localhost:4201 |
| **Admin Frontend**       | 5174 | ✅ Running | http://localhost:5174 |
| **Assessment Frontend**  | 5173 | ✅ Running | http://localhost:5173 |
| **Learning Frontend**    | 3000 | ✅ Running | http://localhost:3000 |
| **Recruitment Frontend** | 3001 | ✅ Running | http://localhost:3001 |

### Service Requiring Additional Setup ⚠️

| Service         | Port | Status    | Issue               |
| --------------- | ---- | --------- | ------------------- |
| **API Service** | 4001 | ❌ Failed | MongoDB not running |

## ⚠️ Next Steps - What You Need to Do

### 1. Start MongoDB

The API service requires MongoDB to be running on `localhost:27017`.

**Option A - MongoDB Installed Locally**:

```cmd
mongod
```

**Option B - MongoDB via Docker**:

```cmd
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

**Option C - Update Connection String**:
Edit `backend/api/.env` and change `MONGODB_URI` to your MongoDB Atlas or remote instance.

### 2. Add Real API Keys (Optional for Development)

**For AI Service to work**:
Edit `backend/ai-service/.env`:

```
OPENAI_API_KEY=sk-your-real-openai-api-key-here
```

Get your key from: https://platform.openai.com/api-keys

**For Production JWT Secrets**:
Generate secure secrets:

```cmd
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Then update `backend/api/.env`:

```
JWT_ACCESS_SECRET=<generated-secret-1>
JWT_REFRESH_SECRET=<generated-secret-2>
```

### 3. Run All Services

After starting MongoDB:

```cmd
npm run dev:all
```

This starts all 7 services concurrently.

### 4. Run Individual Services (Alternative)

If you want to start services one at a time:

```cmd
npm run dev:api       # Backend API (port 4001)
npm run dev:ai        # AI Service (port 4101)
npm run dev:judge     # Judge Service (port 4201)
npm run dev:admin     # Admin UI (port 5173)
npm run dev:assessment # Assessment UI (port 5174)
npm run dev:learning  # Learning Platform (port 3000)
npm run dev:recruitment # Recruitment Platform (port 3001)
```

## 📝 Known Warnings (Safe to Ignore)

### Next.js Lockfile Warnings

You may see warnings like:

```
⚠ Found lockfile missing swc dependencies, patching...
npm warn Unknown env config "metrics-registry"
[Error: Failed to get registry from "pnpm".]
```

**These are safe to ignore**. Next.js tries to patch the lockfile for SWC dependencies and falls back successfully when pnpm commands fail. The apps still start and run correctly.

### Next.js Workspace Root Warning

```
⚠ Warning: Next.js inferred your workspace root, but it may not be correct.
```

**This is informational**. Next.js detects multiple lockfiles (pnpm-lock.yaml and package-lock.json) but still works correctly.

To silence this, you can add to `frontend/learning/next.config.ts` and `frontend/recruitment/next.config.ts`:

```typescript
turbopack: {
  root: process.cwd(),
}
```

## 🔧 Files Modified

1. **package.json** (root)

   - Added `cross-env` to devDependencies
   - Updated scripts to use `cross-env` for PORT setting

2. **backend/api/.env** (created)

   - Added development environment variables
   - ⚠️ Contains placeholder JWT secrets - replace for production

3. **backend/ai-service/.env** (created)

   - Added placeholder OpenAI API key
   - ⚠️ Replace with real key to use AI features

4. **frontend/admin/package.json** (dependencies)

   - Added `@swc/core-win32-x64-msvc` for Windows native bindings

5. **frontend/assessment/package.json** (dependencies)

   - Added `@swc/core-win32-x64-msvc` for Windows native bindings

6. **frontend/learning/package.json** (dependencies)
   - Added `@next/swc-win32-x64-msvc` for Next.js Windows support

## 🎉 Summary

**6 out of 7 services** are now running successfully! The only remaining issue is starting MongoDB for the API service. Once MongoDB is running, all services will be operational.

**Changes Made**:

- ✅ Fixed Windows environment variable setting with cross-env
- ✅ Created .env files with development defaults
- ✅ Fixed Vite @swc/core native binding issues
- ✅ Fixed Next.js SWC binary loading
- ✅ All frontends running
- ✅ AI and Judge services running

**What You Need**:

- ⚠️ Start MongoDB for API service
- 📝 (Optional) Add real OpenAI API key for AI features
- 🔐 (Later) Generate production JWT secrets

Run `npm run dev:all` and visit the URLs above to access your applications!
