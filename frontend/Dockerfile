FROM nginx:alpine
RUN apk add --no-cache gettext
COPY dist/index.html /usr/share/nginx/html/index.html
COPY nginx.conf.template /etc/nginx/conf.d/default.conf.template
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENV PORT=8080
EXPOSE 8080

CMD ["/entrypoint.sh"]
