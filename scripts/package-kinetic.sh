#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
deploy_dir="${project_dir}/deploy"

for required in \
  "${project_dir}/out/index.html" \
  "${project_dir}/api/dist/server.js" \
  "${project_dir}/api/migrations/001_initial.sql" \
  "${project_dir}/api/shop.catalog.json" \
  "${project_dir}/api/vote-sites.json" \
  "${project_dir}/wiki.default.json" \
  "${project_dir}/news.default.json" \
  "${project_dir}/api/package.json" \
  "${project_dir}/api/package-lock.json"; do
  if [[ ! -f "${required}" ]]; then
    echo "Fichier de build manquant : ${required}" >&2
    exit 1
  fi
done

rm -rf "${deploy_dir}"
mkdir -p "${deploy_dir}/site" "${deploy_dir}/dist" "${deploy_dir}/migrations"

cp -a "${project_dir}/out/." "${deploy_dir}/site/"
cp -a "${project_dir}/api/dist/." "${deploy_dir}/dist/"
cp -a "${project_dir}/api/migrations/." "${deploy_dir}/migrations/"
cp "${project_dir}/api/package.json" "${deploy_dir}/package.json"
cp "${project_dir}/api/package-lock.json" "${deploy_dir}/package-lock.json"
cp "${project_dir}/api/shop.catalog.json" "${deploy_dir}/shop.catalog.json"
cp "${project_dir}/api/vote-sites.json" "${deploy_dir}/vote-sites.json"
cp "${project_dir}/wiki.default.json" "${deploy_dir}/wiki.default.json"
cp "${project_dir}/news.default.json" "${deploy_dir}/news.default.json"
cp "${project_dir}/api/.env.example" "${deploy_dir}/.env.example"
cp "${project_dir}/api/README-KINETIC.md" "${deploy_dir}/README-KINETIC.md"

echo "Artefact Kinetic créé dans ${deploy_dir}"
