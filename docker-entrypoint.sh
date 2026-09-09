#!/bin/sh
set -e

# Il volume dati è montato da Docker con l'ownership che aveva al momento della creazione:
# su un volume preesistente (creato quando il container girava come root) i file restano di
# root e l'utente non privilegiato non potrebbe scrivere il database. Correggiamo qui, da
# root, e solo dopo cediamo i privilegi.
mkdir -p /data

if [ "$(id -u)" = "0" ]; then
  chown -R node:node /data
  exec gosu node "$0" "$@"
fi

cd /app

if ! prisma migrate deploy; then
  echo 'Prisma migration failed' >&2
  exit 1
fi

exec node server.js
