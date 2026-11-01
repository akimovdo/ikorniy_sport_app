#!/bin/sh
set -e

# Автосоздание/обновление суперпользователя из env, чтобы админ-аккаунт
# существовал на полностью свежем томе без ручных шагов.
if [ -n "$POCKETBASE_ADMIN_EMAIL" ] && [ -n "$POCKETBASE_ADMIN_PASSWORD" ]; then
  echo "Ensuring PocketBase superuser ${POCKETBASE_ADMIN_EMAIL} exists..."
  /pb/pocketbase superuser upsert "$POCKETBASE_ADMIN_EMAIL" "$POCKETBASE_ADMIN_PASSWORD" --dir /pb/pb_data
fi

exec /pb/pocketbase serve \
  --http=0.0.0.0:8090 \
  --dir /pb/pb_data \
  --migrationsDir /pb/pb_migrations \
  --automigrate=true
