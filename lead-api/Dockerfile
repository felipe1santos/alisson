# better-sqlite3 é um módulo nativo: precisa de compilador no build,
# mas não na imagem final.
FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json ./
RUN npm install --omit=dev

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
COPY scripts ./scripts
# O volume persistente do Coolify é montado aqui. Sem ele, todo redeploy
# apaga a base de leads.
VOLUME ["/data"]
ENV DB_PATH=/data/leads.db
EXPOSE 3000
USER node
CMD ["node", "src/index.js"]
