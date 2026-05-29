#!/bin/sh

set -eu

./scripts/trigger-vercel-cron.sh aide-vert.vercel.app .env
