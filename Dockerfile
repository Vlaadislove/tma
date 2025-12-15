# ---------- build stage ----------
  FROM node:20-alpine AS builder
  WORKDIR /app

# ✅ ВАЖНО: Prisma mirror (обход Cloudflare)
  ENV PRISMA_BINARIES_MIRROR "http://prisma-builds.s3-eu-west-1.amazonaws.com"

  # 1) Dependencies
  COPY package*.json ./
  RUN npm ci

  # 2) Prisma schema + migrations (важно скопировать до остального для кэша)
  COPY prisma ./prisma

  # 3) Generate Prisma Client (у тебя schema НЕ в дефолтном месте)
  RUN npx prisma generate --schema=./prisma/schema/schema.prisma

  # 4) App sources + build
  COPY . .
  RUN npm run build


  # ---------- runtime stage ----------
  FROM node:20-alpine
  WORKDIR /app

  ENV PRISMA_BINARIES_MIRROR "http://prisma-builds.s3-eu-west-1.amazonaws.com"

  # 5) Copy runtime artifacts
  COPY --from=builder /app/node_modules ./node_modules
  COPY --from=builder /app/dist ./dist
  COPY --from=builder /app/prisma ./prisma
  COPY package*.json ./
  COPY --from=builder /app/prisma.config.ts ./

  EXPOSE 3000

  # 6) Apply migrations then start NestJS
  CMD ["sh", "-c", "npx prisma migrate deploy --schema=./prisma/schema/schema.prisma && node dist/src/main.js"]
