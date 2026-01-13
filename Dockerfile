FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY . .

ARG BUILD_DATABASE_URL=postgresql://postgres:postgres@db:5432/portfolio
RUN DATABASE_URL=${BUILD_DATABASE_URL} npm run build

ENV NODE_ENV=production

EXPOSE 3000

CMD ["npm", "run", "start"]
