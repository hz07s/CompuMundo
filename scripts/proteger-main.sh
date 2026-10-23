#!/usr/bin/env bash
# Protege la rama main (ST-01/ST-03): PR obligatorio con 1 aprobación,
# checks de CI obligatorios y sin push directo (tampoco para admins).
# Uso: ./scripts/proteger-main.sh <owner>/<repo>   (requiere gh autenticado)
set -euo pipefail
REPO="${1:?Uso: $0 <owner>/<repo>}"

gh api -X PUT "repos/${REPO}/branches/main/protection" \
  -H "Accept: application/vnd.github+json" \
  --input - <<JSON
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["Backend (build, lint, tests)", "Frontend (lint, tests, build)"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": true
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
JSON
echo "main protegida en ${REPO}"
