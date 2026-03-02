#!/bin/bash
# deploy.sh — 빌드 검증 → 커밋 → 푸시 → 배포 확인
# Usage: ./scripts/deploy.sh <type> <message>
# Example: ./scripts/deploy.sh feat "새로운 기능 추가"

set -e

TYPE=${1:-"chore"}
MESSAGE=${2:-"update"}

echo "▶ 빌드 검증 중..."
pnpm build > /dev/null 2>&1
echo "✓ 빌드 성공"

echo "▶ 커밋 중..."
git add -A
git commit -m "$TYPE: $MESSAGE"
echo "✓ 커밋 완료"

echo "▶ 푸시 중..."
git push origin main
echo "✓ 푸시 완료"

echo "▶ 배포 모니터링 중..."
RUN_ID=$(gh run list --limit 1 --json databaseId --jq '.[0].databaseId')
gh run watch "$RUN_ID"
echo "✓ 배포 완료"
