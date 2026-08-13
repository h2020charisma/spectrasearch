#!/bin/sh
set -eu

config_file="${SPECTRASEARCH_CONFIG_FILE:-spectra.json}"

case "$config_file" in
  */*|*..*)
    echo "Invalid SPECTRASEARCH_CONFIG_FILE: $config_file" >&2
    exit 1
    ;;
esac

source_config="/usr/share/nginx/html/configs/$config_file"
target_config="/usr/share/nginx/html/config.json"

if [ ! -f "$source_config" ]; then
  echo "Frontend config not found: $source_config" >&2
  exit 1
fi

cat "$source_config" > "$target_config"
echo "Selected frontend config: $config_file"
