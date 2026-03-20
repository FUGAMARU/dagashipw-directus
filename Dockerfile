FROM node:22-alpine AS builder
WORKDIR /app/calculated-api

COPY ./calculated-api/ ./
RUN npm install && npm run build

FROM directus/directus:11

COPY --from=builder /app/calculated-api/dist /directus/extensions/calculated-api/dist
COPY --from=builder /app/calculated-api/package.json /directus/extensions/calculated-api/package.json