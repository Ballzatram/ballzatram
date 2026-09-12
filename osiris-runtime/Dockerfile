FROM node:22-bookworm-slim
WORKDIR /app/osiris-runtime
COPY osiris-runtime/package.json osiris-runtime/package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY osiris-runtime/server.mjs osiris-runtime/codex.mjs ./
COPY osiris-runtime/scripts ./scripts
COPY assets/ai-features.js /app/assets/ai-features.js
USER node
ENV NODE_ENV=production OSIRIS_BIND_HOST=0.0.0.0 PORT=8788
EXPOSE 8788
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD node -e "fetch('http://127.0.0.1:8788/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.mjs"]
