#!/usr/bin/env bash
set -e

# Parse command line flags
CUSTOM_ENV_FILE=""
SKIP_BUILD=false
PROMOTE=false
ROLLBACK=false
SHOW_HISTORY=false
CLEAN_ONLY=false

while [ $# -gt 0 ]; do
  case "$1" in
    --env=*)
      CUSTOM_ENV_FILE="${1#*=}"
      shift
      ;;
    --env)
      CUSTOM_ENV_FILE="$2"
      shift 2
      ;;
    --no-build|--skip-build|-n)
      SKIP_BUILD=true
      shift
      ;;
    --promote)
      PROMOTE=true
      shift
      ;;
    --rollback)
      ROLLBACK=true
      shift
      ;;
    --history)
      SHOW_HISTORY=true
      shift
      ;;
    --clean)
      CLEAN_ONLY=true
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [options]"
      echo ""
      echo "Options:"
      echo "  --env <file>          Path to custom .env file (e.g., .env.vps, .env.deploy)"
      echo "  --promote             Promote staging release to live"
      echo "  --rollback            Roll back live release to previous stack release"
      echo "  --history             Show live deployment history stack and active targets"
      echo "  --clean               Clean up old releases (keeps top 5 + protected)"
      echo "  --no-build, -n        Skip local build step and deploy existing build/www/"
      echo "  --help, -h            Show this help message"
      exit 0
      ;;
    *)
      echo "⚠️ Unknown argument: $1 (ignoring)"
      shift
      ;;
  esac
done

# Load environment variables (from custom file, .env.deploy, .env.production, .env.local, or .env)
TARGET_ENV="${CUSTOM_ENV_FILE:-$ENV_FILE}"

if [ -n "$TARGET_ENV" ]; then
  if [ -f "$TARGET_ENV" ]; then
    echo "📋 Loading configuration from $TARGET_ENV"
    set -a
    # shellcheck disable=SC1090
    . "$TARGET_ENV"
    set +a
  else
    echo "❌ Error: Specified env file '$TARGET_ENV' not found."
    exit 1
  fi
elif [ -f .env.deploy ]; then
  echo "📋 Loading configuration from .env.deploy"
  set -a
  . .env.deploy
  set +a
elif [ -f .env.production ]; then
  echo "📋 Loading configuration from .env.production"
  set -a
  . .env.production
  set +a
elif [ -f .env.local ]; then
  echo "📋 Loading configuration from .env.local"
  set -a
  . .env.local
  set +a
elif [ -f .env ]; then
  echo "📋 Loading configuration from .env"
  set -a
  . .env
  set +a
fi

# Verify required environment variables
if [ -z "$VPS_USER" ] || [ -z "$VPS_HOST" ] || [ -z "$VPS_PATH" ]; then
  echo "❌ Error: Missing configuration for VPS deployment."
  echo "Please provide VPS_USER, VPS_HOST, and VPS_PATH via environment or an env file (.env.deploy, .env.production, etc.)."
  echo "See .env.deploy.example for reference."
  exit 1
fi

VPS_PORT="${VPS_PORT:-22}"
VPS_ROOT="${VPS_PATH%/}" # Remove trailing slash if present
SSH_CMD="ssh -p ${VPS_PORT} ${VPS_USER}@${VPS_HOST}"

# Helper function to run remote cleanup
do_cleanup() {
  $SSH_CMD bash -s <<EOF
    set -e
    HISTORY_FILE="${VPS_ROOT}/live_history.txt"
    PROTECTED=()
    [ -d "${VPS_ROOT}/staging" ] && PROTECTED+=("\$(readlink -f ${VPS_ROOT}/staging)")
    [ -d "${VPS_ROOT}/live" ] && PROTECTED+=("\$(readlink -f ${VPS_ROOT}/live)")
    [ -d "${VPS_ROOT}/previous" ] && PROTECTED+=("\$(readlink -f ${VPS_ROOT}/previous)")
    
    if [ -f "\$HISTORY_FILE" ]; then
      while IFS= read -r line || [ -n "\$line" ]; do
        [ -n "\$line" ] && PROTECTED+=("\$line")
      done < "\$HISTORY_FILE"
    fi
    
    cd ${VPS_ROOT}/releases
    REMOVED_COUNT=0
    for rel in \$(ls -1dt */ 2>/dev/null | tail -n +6); do
      FULL_PATH="${VPS_ROOT}/releases/\${rel%/}"
      IS_PROTECTED=false
      for prot in "\${PROTECTED[@]}"; do
        if [ "\$FULL_PATH" = "\$prot" ]; then
          IS_PROTECTED=true
          break
        fi
      done
      if [ "\$IS_PROTECTED" = "false" ]; then
        echo "  - Removing old release: \$(basename \$FULL_PATH)"
        rm -rf "\$FULL_PATH"
        REMOVED_COUNT=\$((REMOVED_COUNT+1))
      fi
    done
    if [ "\$REMOVED_COUNT" -eq 0 ]; then
      echo "  (No old unreferenced releases to clean up)"
    fi
EOF
}

# -------------------------------------------------------------
# MODE: MANUAL CLEANUP ONLY
# -------------------------------------------------------------
if [ "$CLEAN_ONLY" = "true" ]; then
  echo "🧹 Cleaning up old releases in ${VPS_ROOT}/releases/ (keeping top 5 + protected history)..."
  do_cleanup
  echo "✅ Cleanup complete!"
  exit 0
fi

# -------------------------------------------------------------
# MODE: SHOW DEPLOYMENT HISTORY
# -------------------------------------------------------------
if [ "$SHOW_HISTORY" = "true" ]; then
  echo "📜 Live Deployment History Stack (${VPS_ROOT}/live_history.txt):"
  $SSH_CMD bash -s <<EOF
    if [ -f ${VPS_ROOT}/live_history.txt ] && [ -s ${VPS_ROOT}/live_history.txt ]; then
      cat ${VPS_ROOT}/live_history.txt
    else
      echo "(No history recorded yet)"
    fi
    echo ""
    echo "Active Live Target    (live)    : \$(readlink -f ${VPS_ROOT}/live 2>/dev/null || echo 'None')"
    echo "Active Staging Target (staging) : \$(readlink -f ${VPS_ROOT}/staging 2>/dev/null || echo 'None')"
    echo "Active Previous Target(previous): \$(readlink -f ${VPS_ROOT}/previous 2>/dev/null || echo 'None')"
EOF
  exit 0
fi

# -------------------------------------------------------------
# MODE 1: ROLLBACK LIVE SITE TO PREVIOUS STACK RELEASE
# -------------------------------------------------------------
if [ "$ROLLBACK" = "true" ]; then
  echo "🔄 Rolling back live deployment using history stack..."
  $SSH_CMD bash -s <<EOF
    set -e
    HISTORY_FILE="${VPS_ROOT}/live_history.txt"
    CURRENT_LIVE=\$(readlink -f ${VPS_ROOT}/live 2>/dev/null || true)
    
    if [ ! -f "\$HISTORY_FILE" ] || [ ! -s "\$HISTORY_FILE" ]; then
      echo "❌ Error: No previous live releases recorded in live_history.txt."
      exit 1
    fi
    
    TARGET_RELEASE=""
    while [ -s "\$HISTORY_FILE" ]; do
      CANDIDATE=\$(tail -n 1 "\$HISTORY_FILE")
      # Pop the last line
      sed -i '\$d' "\$HISTORY_FILE"
      
      if [ -n "\$CANDIDATE" ] && [ -d "\$CANDIDATE" ] && [ "\$CANDIDATE" != "\$CURRENT_LIVE" ]; then
        TARGET_RELEASE="\$CANDIDATE"
        break
      fi
    done
    
    if [ -z "\$TARGET_RELEASE" ] || [ ! -d "\$TARGET_RELEASE" ]; then
      echo "❌ Error: No valid previous release directory found in history stack."
      exit 1
    fi
    
    # Point live to target release
    ln -sfn "\$TARGET_RELEASE" ${VPS_ROOT}/live
    if [ -n "\$CURRENT_LIVE" ]; then
      ln -sfn "\$CURRENT_LIVE" ${VPS_ROOT}/previous
    fi
    
    echo "✅ Successfully rolled back live site to \$(basename \$TARGET_RELEASE)!"
EOF
  exit 0
fi

# -------------------------------------------------------------
# MODE 2: PROMOTE STAGING TO LIVE
# -------------------------------------------------------------
if [ "$PROMOTE" = "true" ]; then
  echo "🚀 Promoting staging build to live site..."
  $SSH_CMD bash -s <<EOF
    set -e
    HISTORY_FILE="${VPS_ROOT}/live_history.txt"
    STAGING_TARGET=\$(readlink -f ${VPS_ROOT}/staging 2>/dev/null || true)
    CURRENT_LIVE=\$(readlink -f ${VPS_ROOT}/live 2>/dev/null || true)
    
    if [ -z "\$STAGING_TARGET" ] || [ ! -d "\$STAGING_TARGET" ]; then
      echo "❌ Error: Staging target (${VPS_ROOT}/staging) does not exist or is not a valid directory."
      exit 1
    fi
    
    if [ -n "\$CURRENT_LIVE" ] && [ "\$CURRENT_LIVE" != "\$STAGING_TARGET" ]; then
      LAST_HIST=\$(tail -n 1 "\$HISTORY_FILE" 2>/dev/null || true)
      if [ "\$LAST_HIST" != "\$CURRENT_LIVE" ]; then
        echo "\$CURRENT_LIVE" >> "\$HISTORY_FILE"
      fi
      ln -sfn "\$CURRENT_LIVE" ${VPS_ROOT}/previous
    fi
    
    ln -sfn "\$STAGING_TARGET" ${VPS_ROOT}/live
    echo "✅ Successfully promoted staging (\$(basename \$STAGING_TARGET)) to live!"
EOF
  exit 0
fi

# -------------------------------------------------------------
# MODE 3: DEPLOY TO STAGING
# -------------------------------------------------------------
RELEASE_TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REMOTE_RELEASE_DIR="${VPS_ROOT}/releases/${RELEASE_TIMESTAMP}"

if [ "$SKIP_BUILD" = "true" ]; then
  echo "⏩ Skipping build step (--no-build)..."
  if [ ! -d "build/www" ]; then
    echo "❌ Error: build/www/ directory does not exist. Please run 'npm run build:www' first."
    exit 1
  fi
else
  export BASE_PATH="${BASE_PATH:-}"
  echo "🔨 Building site for WWW deployment (BASE_PATH='${BASE_PATH}')..."
  npm run build:www
fi

echo "📦 Creating release directory on remote VPS (${REMOTE_RELEASE_DIR})..."
$SSH_CMD "mkdir -p ${REMOTE_RELEASE_DIR} ${VPS_ROOT}/releases"

echo "🚀 Syncing build/www/ to release directory..."
rsync -avz --delete -e "ssh -p ${VPS_PORT}" build/www/ ${VPS_USER}@${VPS_HOST}:${REMOTE_RELEASE_DIR}/

echo "🔗 Updating staging symlink (${VPS_ROOT}/staging -> ${REMOTE_RELEASE_DIR})..."
$SSH_CMD "ln -sfn ${REMOTE_RELEASE_DIR} ${VPS_ROOT}/staging"

echo "🧹 Running automatic release cleanup..."
do_cleanup

echo ""
echo "✅ Staging deployment successful!"
if [ -n "$STAGING_URL" ]; then
  echo "🌐 Preview staging build at: ${STAGING_URL}"
fi
echo "👉 To make this build live, run: npm run deploy:www:promote"
