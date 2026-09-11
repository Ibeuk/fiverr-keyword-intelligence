FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

EXPOSE 10000
ENV PORT=10000
ENV NODE_ENV=production

CMD ["node", "src/server/server.js"]
