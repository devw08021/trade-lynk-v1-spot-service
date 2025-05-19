FROM oven/bun:latest

WORKDIR /app

COPY package.json .
COPY bun.lockb .

RUN bun install --production

COPY . .

ENV PORT=3002
ENV NODE_ENV=production

EXPOSE 3002

CMD ["bun", "run", "start"] 