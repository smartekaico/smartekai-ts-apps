FROM node:22-alpine AS base

FROM base AS pruner
WORKDIR /app
RUN npm install -g turbo
COPY . .
RUN turbo prune medical-os --docker

FROM base AS installer
WORKDIR /app
COPY --from=pruner /app/out/json/ .
RUN npm install
COPY --from=pruner /app/out/full/ .
RUN npx turbo run build --filter=medical-os

FROM base AS runner
WORKDIR /app
COPY --from=installer /app/apps/medical-os/.output ./.output
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
