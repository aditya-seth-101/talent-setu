# Quick Start Guide

## Prerequisites Check

- ✅ Node.js installed
- ✅ npm installed
- ✅ All dependencies installed (`npm install --legacy-peer-deps` already run)
- ⚠️ MongoDB needs to be running

## Start MongoDB

### Option 1: MongoDB Installed Locally

Open a new terminal and run:

```cmd
mongod
```

### Option 2: Use a cloud MongoDB (recommended if you don't want to install locally)

If you prefer not to install MongoDB locally, create a free cluster on MongoDB Atlas and add the connection string to `backend/api/.env` as `MONGODB_URI`.

### Option 3: Use MongoDB Atlas (Cloud)

1. Get connection string from https://cloud.mongodb.com
2. Edit `backend/api/.env`
3. Update `MONGODB_URI=your-atlas-connection-string`

## Start All Services

In your project root:

```cmd
npm run dev:all
```

## Access Your Applications

Once all services are running, open these URLs in your browser:

- **Admin Panel**: http://localhost:5174
- **Assessment Platform**: http://localhost:5173
- **Learning Platform**: http://localhost:3000
- **Recruitment Platform**: http://localhost:3001

- **API Service**: http://localhost:4001
- **AI Service**: http://localhost:4101
- **Judge Service**: http://localhost:4201

## Stop All Services

Press `Ctrl+C` in the terminal running `npm run dev:all`

## Troubleshooting

### Port Already in Use

If you see "Port XXXX is in use", either:

1. Stop the process using that port
2. Vite will automatically try the next available port (you'll see it in the output)

### MongoDB Connection Error

```
Failed to start API server
reason: { type: 'Unknown', servers: { 'localhost:27017': ...
```

**Solution**: Start MongoDB (see options above)

### OpenAI API Errors (AI Service)

If AI service starts but features don't work:

1. Edit `backend/ai-service/.env`
2. Add real OpenAI API key: `OPENAI_API_KEY=sk-...`
3. Restart: Press Ctrl+C and run `npm run dev:all` again

## Development Workflow

### Making Changes

The dev servers have hot-reload enabled:

- **Frontend**: Vite and Next.js will auto-reload on file changes
- **Backend**: tsx watch will restart servers on file changes

Just save your files and see changes immediately!

### Running Individual Services

```cmd
npm run dev:api         # Just the API
npm run dev:admin       # Just Admin frontend
npm run dev:learning    # Just Learning frontend
```

See `package.json` for all available scripts.

## Need Help?

Check `DEV_SETUP_FIXES.md` for detailed information about:

- What was fixed
- Environment variables needed
- Known warnings and how to silence them
- Complete service status
