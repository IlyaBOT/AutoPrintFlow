FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

RUN mkdir -p storage/originals storage/final-stickers storage/previews storage/generated-stripes storage/generated-sheets
RUN npm run build

EXPOSE 3000

CMD ["sh", "-c", "mkdir -p storage/originals storage/final-stickers storage/previews storage/generated-stripes storage/generated-sheets && npm run prisma:deploy && npm run prisma:seed && npm run start"]
