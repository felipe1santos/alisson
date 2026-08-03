# Sem módulo nativo: o SQLite vem do próprio Node (node:sqlite), então não há
# estágio de build, nem compilador, nem node-gyp. A única dependência é o Express.
#
# O major está pinado de propósito: node:sqlite ainda é marcado experimental e
# só o src/db.js toca essa API. Ao subir de major, revisar aquele arquivo.
FROM node:24-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY src ./src
COPY scripts ./scripts

# O volume persistente do Coolify é montado aqui. Sem ele, todo redeploy
# apaga a base de leads.
VOLUME ["/data"]
ENV DB_PATH=/data/leads.db

EXPOSE 3000
USER node
CMD ["node", "src/index.js"]
