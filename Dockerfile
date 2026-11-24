FROM node:24-bookworm-slim AS build
WORKDIR /gallery
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci
COPY app ./app
COPY lib ./lib
COPY tsconfig.json ./tsconfig.json
RUN npm run build && rm -rf .next/cache && npm prune --omit=dev

FROM node:24-bookworm-slim
WORKDIR /gallery
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
ARG REVISION
LABEL org.opencontainers.image.revision=$REVISION
COPY --from=build --chown=node:node /gallery/package.json ./package.json
COPY --from=build --chown=node:node /gallery/node_modules ./node_modules
COPY --from=build --chown=node:node /gallery/.next ./.next
USER node
EXPOSE 3000
CMD ["node", "node_modules/next/dist/bin/next", "start", "-H", "0.0.0.0", "-p", "3000"]
