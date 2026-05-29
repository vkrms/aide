#!/bin/sh

set -eu

usage() {
  echo "Usage: $0 [production|preview|development|custom-environment] [env-file]"
  echo "Example: $0 production .env"
}

target_env=${1:-production}
env_file=${2:-.env}

if [ "$target_env" = "-h" ] || [ "$target_env" = "--help" ]; then
  usage
  exit 0
fi

if [ ! -f "$env_file" ]; then
  echo "Env file not found: $env_file" >&2
  exit 1
fi

if ! command -v vercel >/dev/null 2>&1; then
  echo "The Vercel CLI is not installed or not on PATH." >&2
  exit 1
fi

if [ ! -d .vercel ]; then
  echo "This project is not linked yet. Run 'vercel' or 'vercel link' first." >&2
  exit 1
fi

count=0

while IFS= read -r raw_line || [ -n "$raw_line" ]; do
  line=$(printf '%s' "$raw_line" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

  [ -z "$line" ] && continue

  case "$line" in
    \#*)
      continue
      ;;
    export[[:space:]]*)
      line=$(printf '%s' "$line" | sed 's/^export[[:space:]]*//')
      ;;
  esac

  case "$line" in
    *=*)
      ;;
    *)
      echo "Skipping invalid line: $raw_line" >&2
      continue
      ;;
  esac

  key=$(printf '%s' "${line%%=*}" | sed 's/[[:space:]]*$//')
  value=${line#*=}

  case "$value" in
    \#*)
      value=
      ;;
  esac

  if [ -z "$key" ]; then
    echo "Skipping line with empty key: $raw_line" >&2
    continue
  fi

  case "$value" in
    \"*\")
      value=${value#\"}
      value=${value%\"}
      ;;
    \'*\')
      value=${value#\'}
      value=${value%\'}
      ;;
  esac

  printf 'Uploading %s to %s\n' "$key" "$target_env"

  if [ "$target_env" = "development" ]; then
    printf '%s' "$value" | vercel env add "$key" "$target_env" --force
  else
    printf '%s' "$value" | vercel env add "$key" "$target_env" --force --sensitive
  fi

  count=$((count + 1))
done < "$env_file"

printf 'Uploaded %s environment variables from %s to %s\n' "$count" "$env_file" "$target_env"
