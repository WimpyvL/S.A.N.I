#!/usr/bin/env bash
set -euo pipefail

cd /repo

export SANI_STATE_DIR="/tmp/sani-test"
export SANI_CONFIG_PATH="${SANI_STATE_DIR}/sani.json"

echo "==> Build"
pnpm build

echo "==> Seed state"
mkdir -p "${SANI_STATE_DIR}/credentials"
mkdir -p "${SANI_STATE_DIR}/agents/main/sessions"
echo '{}' >"${SANI_CONFIG_PATH}"
echo 'creds' >"${SANI_STATE_DIR}/credentials/marker.txt"
echo 'session' >"${SANI_STATE_DIR}/agents/main/sessions/sessions.json"

echo "==> Reset (config+creds+sessions)"
pnpm sani reset --scope config+creds+sessions --yes --non-interactive

test ! -f "${SANI_CONFIG_PATH}"
test ! -d "${SANI_STATE_DIR}/credentials"
test ! -d "${SANI_STATE_DIR}/agents/main/sessions"

echo "==> Recreate minimal config"
mkdir -p "${SANI_STATE_DIR}/credentials"
echo '{}' >"${SANI_CONFIG_PATH}"

echo "==> Uninstall (state only)"
pnpm sani uninstall --state --yes --non-interactive

test ! -d "${SANI_STATE_DIR}"

echo "OK"
