#!/usr/bin/env bash

set -e

DIST="./dist"
mkdir -p "${DIST}"
cat package.json | sed "s|/dist/src/|/|g" > "${DIST}/package.json"
if [[ -f "${AUX_PREPARE_SCRIPT}" ]]; then
  "${AUX_PREPARE_SCRIPT}" "${DIST}/"
fi