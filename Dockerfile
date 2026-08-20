# Multi-stage build cho Next.js 16 — deploy SANDBOX trên Synology NAS
# Stage 1: cài deps
FROM node:20-alpine3.18 AS deps

ENV TZ=Asia/Ho_Chi_Minh
RUN apk add --no-cache tzdata libc6-compat

WORKDIR /app
COPY package.json yarn.lock ./
# postinstall của project chạy `cp -r node_modules/tinymce public/tinymce`
# → phải có sẵn thư mục public/ nếu không yarn install sẽ fail
RUN mkdir -p public && yarn install --frozen-lockfile

# Stage 2: build
FROM node:20-alpine3.18 AS builder

ENV TZ=Asia/Ho_Chi_Minh
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .
# tinymce bị gitignore — copy từ node_modules vào public để editor chạy được sau khi deploy
RUN mkdir -p public && cp -r node_modules/tinymce public/tinymce

# NEXT_PUBLIC_* được bake vào bundle lúc build — truyền qua --build-arg
# Mặc định trỏ backend SANDBOX (app-sandbox, port 3061)
ARG NEXT_PUBLIC_API_URL=https://sandbox-api.hisweetievietnam.com/api
ARG NEXT_PUBLIC_TRACKASIA_API_KEY=8e86ff1568b86c178062981349dee4bf35
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_TRACKASIA_API_KEY=$NEXT_PUBLIC_TRACKASIA_API_KEY

RUN yarn build

# Stage 3: runtime — chỉ lấy standalone output (nhẹ, phù hợp NAS)
FROM node:20-alpine3.18 AS runner

ENV TZ=Asia/Ho_Chi_Minh
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3050
ENV HOSTNAME=0.0.0.0

RUN apk add --no-cache tzdata wget \
  && addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

WORKDIR /app

# standalone đã gom server + node_modules tối thiểu
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3050

# /login là trang public, không redirect — dùng làm health endpoint
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3050/login || exit 1

CMD ["node", "server.js"]
