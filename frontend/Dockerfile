FROM node:20-slim AS build
WORKDIR /app
COPY src ./src
COPY scripts ./scripts
RUN node scripts/build.mjs

FROM nginx:alpine
COPY --from=build /app/dist/index.html /usr/share/nginx/html/index.html
COPY frontend/nginx.conf.template /etc/nginx/conf.d/default.conf.template
COPY frontend/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENV PORT=8080
EXPOSE 8080

CMD ["/entrypoint.sh"]
