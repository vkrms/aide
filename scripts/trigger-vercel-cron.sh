#!/bin/sh

set -eu

usage() {
  echo "Usage: $0 <deployment-url-or-host> [env-file]"
  echo "Example: $0 aide.vercel.app .env"
  echo "Example: $0 https://aide.vercel.app/api/cron-checkin .env"
}

target=${1:-}
env_file=${2:-.env}

if [ "$target" = "-h" ] || [ "$target" = "--help" ]; then
  usage
  exit 0
fi

if [ -z "$target" ]; then
  usage >&2
  exit 1
fi

if [ ! -f "$env_file" ]; then
  echo "Env file not found: $env_file" >&2
  exit 1
fi

if ! command -v vercel >/dev/null 2>&1; then
  echo "The Vercel CLI is not installed or not on PATH." >&2
  exit 1
fi

case "$target" in
  http://*|https://*)
    deployment=$target
    ;;
  *)
    deployment="https://$target"
    ;;
esac

case "$deployment" in
  */api/cron-checkin)
    deployment=${deployment%/api/cron-checkin}
    ;;
esac

path=/api/cron-checkin

cron_secret=$(awk -F= '/^CRON_SECRET=/{sub(/^[^=]*=/, ""); print; exit}' "$env_file")

if [ -z "$cron_secret" ]; then
  echo "CRON_SECRET is missing from $env_file" >&2
  exit 1
fi

case "$cron_secret" in
  \"*\")
    cron_secret=${cron_secret#\"}
    cron_secret=${cron_secret%\"}
    ;;
  \'*\')
    cron_secret=${cron_secret#\'}
    cron_secret=${cron_secret%\'}
    ;;
esac

printf 'Deployment URL: %s\n' "$deployment"

vercel curl "$path" --deployment "$deployment" -- \
  --silent \
  --show-error \
  --write-out '\nHTTP %{http_code}\n' \
  --header "Authorization: Bearer $cron_secret"
