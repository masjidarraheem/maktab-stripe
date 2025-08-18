# Build & run a tiny Node image
FROM node:20-alpine

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm i --omit=dev

COPY . .
EXPOSE 8788

# Healthcheck with retry logic
# --interval=30s: Check every 30 seconds
# --timeout=3s: Wait 3 seconds for response
# --start-period=30s: Give container 30 seconds to start before first check
# --retries=3: Mark unhealthy after 3 failed checks
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:8788/health || exit 1

CMD ["npm", "start"]
