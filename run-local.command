#!/bin/zsh
set -e
script_dir="${0:A:h}"
cd "$script_dir"
exec node scripts/local-server.mjs
