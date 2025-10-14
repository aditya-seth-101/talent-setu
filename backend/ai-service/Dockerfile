FROM node:22-bookworm-slim AS base
WORKDIR /app

COPY package.json package-lock.json* ./
COPY tsconfig.json tsconfig.build.json ./
COPY eslint.config.mjs ./
COPY src ./src

RUN npm install && npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=base /app/dist ./dist
COPY package.json package-lock.json* ./

RUN npm install --omit=dev

CMD ["node", "dist/server.js"]
