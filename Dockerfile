# ステージ1: 拡張機能のビルド環境
FROM node:22-alpine AS builder
WORKDIR /app

COPY ./custom-api/ ./
RUN npm install && npm run build

FROM directus/directus:11

COPY --from=builder /app/dist /directus/extensions/endpoints/custom-api