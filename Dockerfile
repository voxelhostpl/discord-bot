FROM node:16-alpine AS production_dependencies

COPY package.json yarn.lock ./
RUN yarn install --production --frozen-lockfile



FROM alpine:20220715 AS production

RUN apk add --no-cache nodejs tini

VOLUME /data
WORKDIR /app

ENV NODE_ENV=production
EXPOSE 80/tcp
ENTRYPOINT [ "/sbin/tini", "--" ]
CMD [ "node", "src/main.js" ]

COPY src ./src
COPY .env .
COPY --from=production_dependencies node_modules node_modules