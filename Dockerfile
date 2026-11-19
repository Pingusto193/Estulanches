FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server.js db.js validacoes.js ./
COPY public ./public
COPY tests ./tests

USER node
EXPOSE 3000
CMD ["npm", "start"]
