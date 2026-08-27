# CannaAI root Next.js custom server image.
# The NewUI Vite application is a separate development/static target; this
# image serves the supported root application and its Socket.IO endpoint.

FROM node:22-alpine AS dependencies
RUN apk add --no-cache libc6-compat python3 make g++ cairo-dev jpeg-dev pango-dev giflib-dev pixman-dev pangomm-dev libjpeg-turbo-dev freetype-dev vips-dev
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci

FROM dependencies AS builder
COPY . .
RUN npm run db:generate
RUN npm run build:backend
# The builder needs devDependencies for Next/TypeScript compilation, but the
# runtime only needs production packages. Pruning here keeps the pushed image
# small and avoids shipping test/build tooling in production.
RUN npm prune --omit=dev

FROM node:22-alpine AS runner
RUN apk add --no-cache libc6-compat vips dumb-init curl
RUN addgroup -S --gid 1001 nodejs && adduser -S --uid 1001 --ingroup nodejs nextjs
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src ./src
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/package.json ./package.json
RUN mkdir -p /app/db /app/uploads /app/logs && chown -R nextjs:nodejs /app
USER nextjs
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000 NEXT_TELEMETRY_DISABLED=1
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD curl --fail http://127.0.0.1:3000/api/health || exit 1
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "run", "start:backend"]
