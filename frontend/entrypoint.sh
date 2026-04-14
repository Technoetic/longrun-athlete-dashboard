#!/bin/sh
set -e

: "${PORT:=8080}"
: "${LONGRUN_API_BASE:=}"

envsubst '${PORT}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

if [ -n "$LONGRUN_API_BASE" ]; then
  sed -i "s|</head>|<script>window.LONGRUN_API_BASE=\"${LONGRUN_API_BASE}\";</script></head>|" /usr/share/nginx/html/index.html
fi

exec nginx -g 'daemon off;'
