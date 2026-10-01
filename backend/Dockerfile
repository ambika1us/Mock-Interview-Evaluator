# backend/Dockerfile
FROM node:20

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

EXPOSE 3001

CMD ["node", "src/server.js"]