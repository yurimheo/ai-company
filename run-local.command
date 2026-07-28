#!/bin/zsh
set -e
script_dir="${0:A:h}"
cd "$script_dir"

if command -v codex >/dev/null 2>&1; then
  export AI_COMPANY_CODEX_BIN="$(command -v codex)"
else
  for codex_candidate in "$HOME"/.nvm/versions/node/*/bin/codex; do
    if [[ -x "$codex_candidate" ]]; then
      export AI_COMPANY_CODEX_BIN="$codex_candidate"
    fi
  done
fi

exec node scripts/local-server.mjs
