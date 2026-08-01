#!/bin/bash
# scripts/h3-generate.sh
# Submit a prompt to minimax/hailuo-3 via OpenRouter's async video
# endpoint, poll until completion, and download the result.
#
# Usage:
#   scripts/h3-generate.sh <prompt-file> [output-slug]
#
# - prompt-file: a markdown file. The full file contents (minus a
#   small "render params" header) are sent as the prompt. The file
#   is committed alongside this script; prompts are project
#   artifacts, not shell-quoted strings.
# - output-slug: a short slug for the output filename. Defaults
#   to the prompt-file stem.
#
# Output: assets/videos/prototype-2026-08/<slug>.mp4
#
# Cost: ~$0.13/sec of generated video at h3 default rates. A 5s
# render is ~$0.65. A 15s render is ~$1.95.
#
# Env:
# - OPENROUTER_API_KEY required (loaded from .env if present).
#
# Exit codes:
#   0 = video downloaded successfully
#   1 = usage or env error
#   2 = submission rejected by API
#   3 = generation failed (model returned failed status)
#   4 = timed out waiting for completion
#   5 = download failed

set -uo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT" || exit 99

# ── args ────────────────────────────────────────────────────────
if [ $# -lt 1 ]; then
  echo "usage: $0 <prompt-file> [output-slug]" >&2
  exit 1
fi

PROMPT_FILE="$1"
if [ ! -f "$PROMPT_FILE" ]; then
  echo "error: prompt file not found: $PROMPT_FILE" >&2
  exit 1
fi

SLUG="${2:-$(basename "$PROMPT_FILE" .md)}"
OUTPUT_DIR="$PROJECT_ROOT/assets/videos/prototype-2026-08"
OUTPUT_PATH="$OUTPUT_DIR/${SLUG}.mp4"
mkdir -p "$OUTPUT_DIR"

# ── env ─────────────────────────────────────────────────────────
# Load .env if present (don't overwrite already-exported vars).
if [ -f "$PROJECT_ROOT/.env" ] && [ -z "${OPENROUTER_API_KEY:-}" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$PROJECT_ROOT/.env"
  set +a
fi

if [ -z "${OPENROUTER_API_KEY:-}" ]; then
  echo "error: OPENROUTER_API_KEY not set (not in env, not in .env)" >&2
  exit 1
fi

# ── extract prompt text from markdown file ──────────────────────
# Strategy: find the FIRST fenced code block (with or without a
# language tag) and use its contents. If no fenced block, strip
# markdown and use the whole body. This lets prompts be authored
# as code blocks (literal, no markdown noise) or as prose-with-
# rationale.
PROMPT_TEXT=""
PROMPT_TEXT=$(awk '
  /^```/ {
    if (in_block) { in_block = 0; exit }
    else          { in_block = 1; next }
  }
  in_block { print }
' "$PROMPT_FILE")

if [ -z "$PROMPT_TEXT" ] || [ "$(echo -n "$PROMPT_TEXT" | tr -d '[:space:]' | wc -c)" -lt 20 ]; then
  # Fallback: strip frontmatter + headings, use body prose.
  PROMPT_TEXT=$(awk '
    /^---$/{f++; next}
    f<2 && /^#/ {next}
    {print}
  ' "$PROMPT_FILE")
fi

if [ -z "$PROMPT_TEXT" ] || [ "$(echo -n "$PROMPT_TEXT" | tr -d '[:space:]' | wc -c)" -lt 20 ]; then
  echo "error: extracted prompt is empty or too short" >&2
  echo "       (the prompt file should contain a fenced block OR prose body)" >&2
  exit 1
fi

# ── render params (override via env if needed) ──────────────────
DURATION="${H3_DURATION:-5}"
ASPECT_RATIO="${H3_ASPECT_RATIO:-16:9}"
RESOLUTION="${H3_RESOLUTION:-2K}"
GENERATE_AUDIO="${H3_GENERATE_AUDIO:-true}"
MODEL="${H3_MODEL:-minimax/hailuo-3}"

# ── submit ──────────────────────────────────────────────────────
echo "─── h3-generate ───"
echo "  prompt file: $PROMPT_FILE"
echo "  slug:        $SLUG"
echo "  output:      $OUTPUT_PATH"
echo "  model:       $MODEL"
echo "  duration:    ${DURATION}s @ $RESOLUTION $ASPECT_RATIO"
echo "  audio:       $GENERATE_AUDIO"
echo "  prompt length: $(echo -n "$PROMPT_TEXT" | wc -c) chars"
echo

PAYLOAD=$(cat <<EOF
{
  "model": "$MODEL",
  "prompt": $(printf '%s' "$PROMPT_TEXT" | python3 <<'PYEOF'
import sys, json
print(json.dumps(sys.stdin.read()))
PYEOF
),
  "duration": $DURATION,
  "aspect_ratio": "$ASPECT_RATIO",
  "resolution": "$RESOLUTION",
  "generate_audio": $GENERATE_AUDIO
}
EOF
)

echo "  submitting job..."
SUBMIT_RESPONSE=$(curl -sS -X POST \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  "https://openrouter.ai/api/v1/videos")

if [ -z "$SUBMIT_RESPONSE" ]; then
  echo "error: empty response from submit endpoint" >&2
  exit 2
fi

JOB_ID=$(printf '%s' "$SUBMIT_RESPONSE" | python3 -c '
import sys, json
try:
    d = json.load(sys.stdin)
except Exception as e:
    print("PARSE_ERROR:" + str(e), file=sys.stderr)
    sys.exit(2)
if "id" not in d:
    print("NO_ID:" + json.dumps(d), file=sys.stderr)
    sys.exit(2)
print(d["id"])
')

if [ $? -ne 0 ] || [ -z "$JOB_ID" ]; then
  echo "error: failed to parse job id from response" >&2
  echo "$SUBMIT_RESPONSE" >&2
  exit 2
fi

POLLING_URL=$(printf '%s' "$SUBMIT_RESPONSE" | python3 <<'PYEOF'
import sys, json
d = json.load(sys.stdin)
if d.get("polling_url"):
    print(d["polling_url"])
else:
    print(f'https://openrouter.ai/api/v1/videos/{d["id"]}')
PYEOF
)

echo "  job id: $JOB_ID"
echo "  polling: $POLLING_URL"
echo

# ── poll ────────────────────────────────────────────────────────
MAX_ATTEMPTS="${H3_MAX_ATTEMPTS:-40}"  # 40 * 15s = 10 minutes
SLEEP_SECONDS="${H3_POLL_INTERVAL:-15}"

ATTEMPT=0
while [ "$ATTEMPT" -lt "$MAX_ATTEMPTS" ]; do
  ATTEMPT=$((ATTEMPT + 1))

  POLL_RESPONSE=$(curl -sS \
    -H "Authorization: Bearer $OPENROUTER_API_KEY" \
    "$POLLING_URL" 2>&1)
  CURL_EXIT=$?

  if [ "$CURL_EXIT" -ne 0 ]; then
    echo "  [$ATTEMPT] curl error (exit $CURL_EXIT), retrying: $POLL_RESPONSE" >&2
    sleep "$SLEEP_SECONDS"
    continue
  fi

  if [ -z "$POLL_RESPONSE" ]; then
    echo "  [$ATTEMPT] empty poll response, retrying..."
    sleep "$SLEEP_SECONDS"
    continue
  fi

  STATUS=$(printf '%s' "$POLL_RESPONSE" | python3 -c '
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get("status", "unknown"))
except Exception:
    print("parse_error")
')

  echo "  [$ATTEMPT/$MAX_ATTEMPTS] status: $STATUS"

  if [ "$STATUS" = "completed" ]; then
    VIDEO_URL=$(printf '%s' "$POLL_RESPONSE" | python3 -c '
import sys, json
d = json.load(sys.stdin)
urls = d.get("unsigned_urls") or []
if urls:
    print(urls[0])
else:
    print(f"https://openrouter.ai/api/v1/videos/{d[\"id\"]}/content?index=0")
')
    break
  fi

  if [ "$STATUS" = "failed" ]; then
    echo "error: generation failed" >&2
    printf '%s\n' "$POLL_RESPONSE" >&2
    exit 3
  fi

  sleep "$SLEEP_SECONDS"
done

if [ "$ATTEMPT" -ge "$MAX_ATTEMPTS" ]; then
  echo "error: timed out after $MAX_ATTEMPTS polls" >&2
  exit 4
fi

# ── download ────────────────────────────────────────────────────
echo
echo "  downloading video..."
if [[ "$VIDEO_URL" == https://openrouter.ai/* ]]; then
  curl -sS -L \
    -H "Authorization: Bearer $OPENROUTER_API_KEY" \
    -o "$OUTPUT_PATH" \
    "$VIDEO_URL"
else
  curl -sS -L -o "$OUTPUT_PATH" "$VIDEO_URL"
fi

if [ ! -s "$OUTPUT_PATH" ]; then
  echo "error: download produced empty file at $OUTPUT_PATH" >&2
  exit 5
fi

BYTES=$(stat -c %s "$OUTPUT_PATH" 2>/dev/null || stat -f %z "$OUTPUT_PATH")
echo "  saved: $OUTPUT_PATH ($BYTES bytes)"
echo "─── done ───"