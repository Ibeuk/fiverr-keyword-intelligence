FROM node:22-alpine

# Install Chromium and necessary system libraries for Alpine
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

ENV CHROME_BIN=/usr/bin/chromium-browser \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

EXPOSE 10000
ENV PORT=10000
ENV NODE_ENV=production

CMD ["node", "src/server/server.js"]
