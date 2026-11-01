#!/usr/bin/env bash
set -Eeuo pipefail

root_dir="/home/denisakimov/docker/ikorniy_sport_app"
repo_dir="$root_dir/repo"
compose_file="$repo_dir/deploy/compose.prod.yaml"
project_name="ikorniy_sport_app"
container_pb="ikorniy_sport_app-pocketbase-1"
container_web="ikorniy_sport_app-web-1"
image_pb="ghcr.io/akimovdo/ikorniy_sport_app-pocketbase"
image_web="ghcr.io/akimovdo/ikorniy_sport_app-web"
volume_name="ikorniy_sport_app_pb_data"
backup_dir="$root_dir/backups"
health_pb="http://127.0.0.1:8093/api/health"
health_web="http://127.0.0.1:3001/"
state_file="$root_dir/.last-deployed-image"
failed_marker="$root_dir/.deploy-failed"
env_file="$root_dir/.env"

compose() {
  docker compose --project-name "$project_name" --file "$compose_file" --env-file "$env_file" "$@"
}

stop_all() {
  docker stop --time 10 "$container_pb" >/dev/null 2>&1 || true
  docker stop --time 10 "$container_web" >/dev/null 2>&1 || true
}

start_if_stopped() {
  for c in "$container_pb" "$container_web"; do
    docker container inspect "$c" >/dev/null 2>&1 || return 0
  done
  cur_pb="$(docker inspect --format '{{.Image}}' "$container_pb")"
  cur_web="$(docker inspect --format '{{.Image}}' "$container_web")"
  if [ -f "$failed_marker" ] && grep -qF "image=$cur_pb $cur_web" "$failed_marker" 2>/dev/null; then
    return 0
  fi
  if [ "$(docker inspect --format '{{.State.Running}}' "$container_pb")" != "true" ]; then
    printf '%s %s is stopped and no failed deploy is recorded, starting it\n' "$(date -Is)" "$container_pb" >&2
    docker start "$container_pb" >/dev/null 2>&1 || true
  fi
  if [ "$(docker inspect --format '{{.State.Running}}' "$container_web")" != "true" ]; then
    printf '%s %s is stopped and no failed deploy is recorded, starting it\n' "$(date -Is)" "$container_web" >&2
    docker start "$container_web" >/dev/null 2>&1 || true
  fi
}

exec 9>"$root_dir/.deploy.lock"
if ! flock -n 9; then
  printf '%s another deploy holds %s, skipping\n' "$(date -Is)" "$root_dir/.deploy.lock" >&2
  exit 75
fi

if [ ! -f "$env_file" ]; then
  printf '%s env file %s is missing: refusing to deploy\n' "$(date -Is)" "$env_file" >&2
  exit 1
fi

if ! docker volume inspect "$volume_name" >/dev/null 2>&1; then
  printf 'data volume %s is missing: refusing to deploy, a fresh empty volume would be attached\n' "$volume_name" >&2
  exit 1
fi

for image in "$image_pb" "$image_web"; do
  for attempt in $(seq 1 6); do
    if docker pull "$image:latest" >/dev/null 2>&1; then
      break
    fi
    if [ "$attempt" -lt 6 ]; then
      sleep 10
    else
      printf '%s PULL FAILED image=%s:latest (registry unreachable?): containers are left as they are, cron will retry\n' "$(date -Is)" "$image" >&2
      start_if_stopped
      exit 1
    fi
  done
done

target_pb="$(docker image inspect --format '{{.Id}}' "$image_pb:latest")"
target_web="$(docker image inspect --format '{{.Id}}' "$image_web:latest")"

running_pb=""
running_web=""
if docker container inspect "$container_pb" >/dev/null 2>&1; then
  running_pb="$(docker inspect --format '{{.Image}}' "$container_pb")"
fi
if docker container inspect "$container_web" >/dev/null 2>&1; then
  running_web="$(docker inspect --format '{{.Image}}' "$container_web")"
fi

if [ "${FORCE_DEPLOY:-0}" != "1" ] && [ -n "$running_pb" ] && [ -n "$running_web" ] && [ "$running_pb" = "$target_pb" ] && [ "$running_web" = "$target_web" ]; then
  if [ -f "$failed_marker" ] && grep -qF "image=$target_pb $target_web" "$failed_marker" 2>/dev/null; then
    printf '%s DEPLOY FAILED EARLIER (%s). Service may be stopped. Push a fix or run FORCE_DEPLOY=1.\n' "$(date -Is)" "$target_pb $target_web" >&2
    exit 3
  fi
  if [ "$(docker inspect --format '{{.State.Running}}' "$container_pb")" != "true" ] || [ "$(docker inspect --format '{{.State.Running}}' "$container_web")" != "true" ]; then
    printf '%s %s/%s have the current images but are not both running and no failed deploy is recorded, starting them\n' "$(date -Is)" "$container_pb" "$container_web"
    docker start "$container_pb" >/dev/null 2>&1 || true
    pb_ok=0
    for attempt in $(seq 1 90); do
      if curl -fsS --max-time 3 "$health_pb" >/dev/null 2>&1; then pb_ok=1; break; fi
      sleep 2
    done
    docker start "$container_web" >/dev/null 2>&1 || true
    for attempt in $(seq 1 90); do
      if [ "$pb_ok" = "1" ] && curl -fsS --max-time 3 "$health_web" >/dev/null 2>&1; then
        printf '%s started, healthy pb=%s web=%s\n' "$(date -Is)" "$target_pb" "$target_web"
        exit 0
      fi
      sleep 2
    done
    printf '%s started %s/%s but the health checks did not pass, will look again on the next tick\n' "$(date -Is)" "$container_pb" "$container_web" >&2
    exit 1
  fi
  printf '%s up to date, %s/%s already run %s/%s\n' "$(date -Is)" "$container_pb" "$container_web" "$target_pb" "$target_web"
  exit 0
fi

if [ -n "$running_pb" ]; then
  docker tag "$running_pb" "$image_pb:rollback" >/dev/null 2>&1 || true
fi
if [ -n "$running_web" ]; then
  docker tag "$running_web" "$image_web:rollback" >/dev/null 2>&1 || true
fi

backup_name="ikorniy_sport_pb_data_$(date -u +%Y%m%dT%H%M%SZ).tar.gz"
backup_path="$backup_dir/$backup_name"

if docker container inspect "$container_pb" >/dev/null 2>&1 && [ "$(docker inspect --format '{{.State.Running}}' "$container_pb")" = "true" ]; then
  docker stop --time 30 "$container_pb" >/dev/null
fi

docker run --rm \
  -e BACKUP_NAME="$backup_name" \
  -v "$volume_name:/pb/pb_data:ro" \
  -v "$backup_dir:/backup" \
  alpine:3.22 sh -c 'tar -czf "/backup/$BACKUP_NAME" -C /pb/pb_data .'
tar -tzf "$backup_path" >/dev/null
[ -s "$backup_path" ]

mark_failed() {
  printf '%s %s\n' "$target_pb" "$target_web" > "$state_file.tmp"
  mv "$state_file.tmp" "$state_file"
  printf 'image=%s %s failed_at=%s\n' "$target_pb" "$target_web" "$(date -Is)" > "$failed_marker"
}

loud_fail() {
  reason="$1"
  printf '\n============================================================\n' >&2
  printf 'DEPLOY FAILED (%s)\n' "$reason" >&2
  compose logs --tail=150 >&2 || true
  printf 'stopping %s %s so they do not serve broken code\n' "$container_pb" "$container_web" >&2
  stop_all
  printf 'state marked as deployed; cron will NOT retry until new images or FORCE_DEPLOY=1\n' >&2
  printf 'manual rollback, if you want it: FORCE_DEPLOY=1 IMAGE_TAG=rollback docker compose --project-name %s --file %s --env-file %s up -d --force-recreate\n' "$project_name" "$compose_file" "$env_file" >&2
  printf '============================================================\n' >&2
}

if ! compose up -d --force-recreate; then
  mark_failed
  loud_fail "compose up"
  exit 1
fi

for attempt in $(seq 1 120); do
  if curl -fsS --max-time 3 "$health_pb" >/dev/null 2>&1 && curl -fsS --max-time 3 "$health_web" >/dev/null 2>&1; then
    printf '%s %s\n' "$target_pb" "$target_web" > "$state_file.tmp"
    mv "$state_file.tmp" "$state_file"
    rm -f "$failed_marker"
    printf '%s healthy pb=%s web=%s backup=%s\n' "$(date -Is)" "$target_pb" "$target_web" "$backup_path"
    exit 0
  fi
  sleep 2
done

mark_failed
loud_fail "health check"
exit 1
