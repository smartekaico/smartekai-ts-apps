FROM node:22-alpine AS base

FROM base AS pruner
WORKDIR /app
RUN npm install -g turbo
COPY . .
RUN turbo prune cars-4by4-builder --docker

FROM base AS installer
WORKDIR /app
COPY --from=pruner /app/out/json/ .
RUN npm install
COPY --from=pruner /app/out/full/ .
RUN npx turbo run build --filter=cars-4by4-builder

FROM base AS runner
WORKDIR /app
COPY --from=installer /app/apps/cars-4by4-builder/.output ./.output
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
