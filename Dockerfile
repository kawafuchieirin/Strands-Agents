FROM node:18-alpine AS base

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./

FROM base AS dependencies
RUN npm ci --only=production

FROM base AS build
RUN npm ci
COPY src ./src
RUN npm run build

FROM base AS release
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./

ENV NODE_ENV=production

EXPOSE 3000

USER node

CMD ["node", "dist/index.js"]