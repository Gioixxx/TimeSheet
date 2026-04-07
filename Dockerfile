# syntax=docker/dockerfile:1

FROM node:20-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
# Avoid postinstall (prisma generate): schema is not copied until the builder stage.
RUN npm ci --ignore-scripts

FROM node:20-bookworm-slim AS builder
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
# Fail fast if the project copy omits prisma/ (COPY . . alone still "succeeds" without it).
COPY prisma ./prisma
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=file:./timesheet.db
RUN npx prisma generate
RUN npm run build
RUN cp -r .next/static .next/standalone/.next/static && cp -r public .next/standalone/public

FROM node:20-bookworm-slim AS runner
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV DATABASE_URL=file:/data/timesheet.db

RUN npm install -g prisma@6.7.0

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

EXPOSE 3000
ENTRYPOINT ["sh", "-c", "mkdir -p /data && cd /app && prisma migrate deploy && exec node server.js"]
