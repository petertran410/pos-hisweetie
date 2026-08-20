#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")"

COMPOSE_FILE="docker-compose.yml"
SERVICE_NAME="pos-frontend-sandbox"
CONTAINER_NAME="pos-frontend-sandbox"
MAX_WAIT=120

echo "=== DEPLOY POS FRONTEND (SANDBOX) ==="

# Network Docker dùng chung với backend — phải tồn tại trước
if ! docker network inspect hisweetie-network >/dev/null 2>&1; then
  echo "ERROR: Docker network 'hisweetie-network' chưa tồn tại."
  echo "Tạo bằng: docker network create hisweetie-network"
  exit 1
fi

# Cảnh báo nếu backend sandbox chưa chạy (frontend vẫn deploy được, chỉ là gọi API sẽ lỗi)
if ! docker inspect app-sandbox >/dev/null 2>&1; then
  echo "WARNING: Không tìm thấy container 'app-sandbox' (backend sandbox)."
  echo "         Frontend vẫn deploy nhưng API sandbox có thể chưa sẵn sàng."
fi

# NEXT_PUBLIC_* bake vào bundle lúc build — cần truyền lúc docker-compose build
export NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-https://sandbox-api.hisweetievietnam.com/api}"
export NEXT_PUBLIC_TRACKASIA_API_KEY="${NEXT_PUBLIC_TRACKASIA_API_KEY:-8e86ff1568b86c178062981349dee4bf35}"

echo "Env    : sandbox"
echo "API URL: $NEXT_PUBLIC_API_URL"
echo ""

echo "[1/4] Building sandbox image..."
docker-compose -f "$COMPOSE_FILE" build --no-cache "$SERVICE_NAME"

echo "[2/4] Stopping and recreating sandbox container..."
docker-compose -f "$COMPOSE_FILE" stop "$SERVICE_NAME" 2>/dev/null || true
docker-compose -f "$COMPOSE_FILE" rm -f "$SERVICE_NAME" 2>/dev/null || true
docker-compose -f "$COMPOSE_FILE" up -d "$SERVICE_NAME"

echo "[3/4] Health checking..."
ELAPSED=0
until [ "$(docker inspect --format='{{.State.Health.Status}}' "$CONTAINER_NAME" 2>/dev/null || echo starting)" = "healthy" ]; do
  STATUS=$(docker inspect --format='{{.State.Status}}' "$CONTAINER_NAME" 2>/dev/null || echo "not_found")
  if [ "$STATUS" = "exited" ] || [ "$STATUS" = "dead" ] || [ "$STATUS" = "not_found" ]; then
    echo "ERROR: Container $CONTAINER_NAME đã dừng (status: $STATUS)."
    docker logs --tail 50 "$CONTAINER_NAME" 2>/dev/null || true
    exit 1
  fi
  if [ "$ELAPSED" -ge "$MAX_WAIT" ]; then
    echo "ERROR: Health check thất bại sau ${MAX_WAIT}s."
    docker logs --tail 50 "$CONTAINER_NAME" 2>/dev/null || true
    exit 1
  fi
  sleep 5
  ELAPSED=$((ELAPSED + 5))
  echo "  Waited ${ELAPSED}s..."
done
echo "  $CONTAINER_NAME healthy!"

echo "[4/4] Cleaning up dangling images..."
docker image prune -f --filter "dangling=true" >/dev/null || true

echo ""
echo "=== Sandbox frontend deployed ==="
echo "Local : http://<NAS-IP>:3051"
echo "Public: https://sandbox.hisweetievietnam.com"
docker-compose -f "$COMPOSE_FILE" ps "$SERVICE_NAME"
