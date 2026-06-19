#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  push-deploy.sh — Déploiement MaMaison depuis la machine locale
#  Usage  : bash scripts/push-deploy.sh
#           bash scripts/push-deploy.sh --api-only
#           bash scripts/push-deploy.sh --web-only
# ═══════════════════════════════════════════════════════════════
set -e
cd "$(dirname "$0")/.."

SERVER="root@157.180.42.119"
REMOTE_DIR="/opt/mamaison"
ARCHIVE="/tmp/mamaison-deploy.tar.gz"

BUILD_API=true
BUILD_WEB=true
[ "$1" = "--api-only" ] && BUILD_WEB=false
[ "$1" = "--web-only" ] && BUILD_API=false

echo ""
echo "🚀 MaMaison — Push-deploy (local → serveur)"
echo "════════════════════════════════════════════"
[ "$BUILD_API" = false ] && echo "   Mode : Web uniquement"
[ "$BUILD_WEB" = false ] && echo "   Mode : API uniquement"

# ── Vérifications ──────────────────────────────────────────────
command -v ssh >/dev/null || { echo "❌ ssh requis."; exit 1; }
[ -f ".env" ] || { echo "❌ .env introuvable. Copier depuis .env.example."; exit 1; }

# ── 1. Archive ─────────────────────────────────────────────────
echo ""
echo "📦 [1/6] Création de l'archive..."
tar \
  --exclude='.git' \
  --exclude='.vs' \
  --exclude='.github' \
  --exclude='**/bin' \
  --exclude='**/obj' \
  --exclude='**/node_modules' \
  --exclude='**/*.user' \
  --exclude='.env' \
  --exclude='*.md' \
  --exclude='mobile' \
  --exclude='tests' \
  --exclude='docs' \
  --exclude='assets' \
  --exclude='viewer-3d' \
  -czf "$ARCHIVE" \
  backend/MaMaison.Api \
  backend/MaMaison.Application \
  backend/MaMaison.Domain \
  backend/MaMaison.Infrastructure \
  frontend/MaMaison.Web/src \
  frontend/MaMaison.Web/public \
  frontend/MaMaison.Web/angular.json \
  frontend/MaMaison.Web/package.json \
  frontend/MaMaison.Web/package-lock.json \
  frontend/MaMaison.Web/tsconfig.json \
  frontend/MaMaison.Web/tsconfig.app.json \
  frontend/MaMaison.Web/ngsw-config.json \
  frontend/MaMaison.Web/Dockerfile \
  frontend/MaMaison.Web/nginx.conf \
  Dockerfile \
  .dockerignore \
  docker-compose.yml \
  2>/dev/null || true

echo "   ✅ $(du -sh $ARCHIVE | cut -f1)"

# ── 2. Réseau db-net (déjà créé par ALO) ───────────────────────
echo ""
echo "🔗 [2/6] Vérification réseau db-net..."
ssh "$SERVER" "
  docker network create db-net 2>/dev/null && echo '   Réseau db-net créé.' || echo '   Réseau db-net déjà existant.'
  docker network connect db-net momo_db 2>/dev/null && echo '   momo_db connecté à db-net.' || echo '   momo_db déjà sur db-net.'
"
echo "   ✅ (MoMo Manager non redémarré)"

# ── 3. Envoi ───────────────────────────────────────────────────
echo ""
echo "📤 [3/6] Envoi vers le serveur..."
ssh "$SERVER" "mkdir -p $REMOTE_DIR"
scp "$ARCHIVE" "$SERVER:/tmp/mamaison-deploy.tar.gz"
ssh "$SERVER" "cd $REMOTE_DIR && tar -xzf /tmp/mamaison-deploy.tar.gz && rm -f /tmp/mamaison-deploy.tar.gz"
scp .env "$SERVER:$REMOTE_DIR/.env"
echo "   ✅ Code + .env synchronisés"

# ── 4. Build ───────────────────────────────────────────────────
echo ""
echo "🔨 [4/6] Build Docker sur le serveur..."
echo "   ⚠️  Le build Angular (npm ci + ng build) prend 3-5 min..."

BUILD_TARGETS=""
[ "$BUILD_API" = true ] && BUILD_TARGETS="$BUILD_TARGETS api"
[ "$BUILD_WEB" = true ] && BUILD_TARGETS="$BUILD_TARGETS web"

ssh "$SERVER" "
  cd $REMOTE_DIR
  docker compose build --no-cache $BUILD_TARGETS 2>&1 \
    | grep -E '(ERROR|error|Step|DONE|=>|Built)' \
    | grep -v 'npm warn\|npm notice' \
    | tail -30
"

# ── 5. Démarrage ───────────────────────────────────────────────
echo ""
echo "🔄 [5/6] Démarrage des services MaMaison..."
ssh "$SERVER" "cd $REMOTE_DIR && docker compose up -d --remove-orphans 2>&1"

# ── 6. Vérification ────────────────────────────────────────────
echo ""
echo "⏳ [6/6] Vérification (migrations + API)..."
MAX=20; ATTEMPT=0
until ssh "$SERVER" "curl -sf http://localhost:5001/swagger/index.html > /dev/null 2>&1"; do
  ATTEMPT=$((ATTEMPT + 1))
  [ $ATTEMPT -ge $MAX ] && {
    echo "   ⚠️  Délai dépassé. Vérifier :"
    echo "      ssh $SERVER 'docker logs mamaison_api --tail=40'"
    break
  }
  echo "   Tentative $ATTEMPT/$MAX — attente démarrage API..."
  sleep 6
done
[ $ATTEMPT -lt $MAX ] && echo "   ✅ API répond (HTTP 200)"

# Nettoyage
rm -f "$ARCHIVE"
ssh "$SERVER" "docker image prune -f > /dev/null 2>&1" &

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  ✅ MaMaison déployé !                                    ║"
echo "║                                                          ║"
echo "║  API  : http://157.180.42.119:5001/swagger               ║"
echo "║  Web  : http://157.180.42.119:8081                       ║"
echo "║  Logs : ssh $SERVER 'docker logs mamaison_api -f'       ║"
echo "╚══════════════════════════════════════════════════════════╝"
