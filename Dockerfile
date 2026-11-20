FROM node:22-bookworm-slim AS base

WORKDIR /app

# Match PostgreSQL client major to the existing PostgreSQL 16 service.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates curl fonts-dejavu-core fonts-liberation2 \
  && mkdir -p /usr/share/postgresql-common/pgdg \
  && curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc \
  && printf '%s\n' 'deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt bookworm-pgdg main' > /etc/apt/sources.list.d/pgdg.list \
  && apt-get update \
  && apt-get install -y --no-install-recommends postgresql-client-16 \
  && rm -rf /var/lib/apt/lists/*

FROM base AS build

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

RUN mkdir -p storage/originals storage/final-stickers storage/previews storage/generated-stripes storage/generated-sheets storage/settings
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build
ENV NODE_ENV=production
RUN npm prune --omit=dev \
  && rm -rf .next/cache

FROM base AS runtime

ENV NEXT_TELEMETRY_DISABLED=1 NODE_ENV=production
COPY --from=build /app/ ./

HEALTHCHECK --interval=15s --timeout=5s --start-period=90s --retries=4 CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

EXPOSE 3000

CMD ["sh", "-c", "mkdir -p storage/originals storage/final-stickers storage/previews storage/generated-stripes storage/generated-sheets storage/settings && npm run prisma:deploy && npm run prisma:seed && exec npm run start"]
