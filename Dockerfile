# GS Manpower website, form backend and admin panel. No npm dependencies.
FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production \
    PORT=8080 \
    DATA_DIR=/data

COPY package.json build.js ./
COPY server ./server
COPY scripts ./scripts
COPY src ./src

# Build once at image time (the server rebuilds again at start-up with any admin-panel changes).
RUN node build.js \
 && mkdir -p /data \
 && chown -R node:node /app /data

USER node
EXPOSE 8080
VOLUME ["/data"]
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
CMD ["node", "server/index.js"]
