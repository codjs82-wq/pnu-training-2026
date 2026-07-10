#!/usr/bin/env bash
# 구글 시트(data 탭)를 CSV로 내려받는 참고용 스크립트 (2026-07-10 작성)
# - 실제 웹사이트는 브라우저에서 PapaParse로 실시간 로드하므로 이 스크립트는 "데이터 확인/스냅샷"용입니다.
# - 서버 환경(curl)에서는 구글이 쿠키 동의 페이지를 반환하므로 CONSENT 쿠키를 넣어 우회합니다.
#   (일반 사용자 브라우저에서는 쿠키가 자동 처리되므로 이 우회가 필요 없습니다.)
# - headers=1 : gviz가 모든 열이 텍스트일 때 여러 행을 머리글로 오인해 병합하는 문제를 방지합니다. (필수)

SHEET_ID="1qSz3fbUnOspUyiB5wYvpJt6vtxTlRt1yAQ_VXjewLfo"
SHEET_NAME="data"
OUT="${1:-data-sample.csv}"

URL="https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${SHEET_NAME}&headers=1"

curl -sL -b "CONSENT=YES+cb" -A "Mozilla/5.0" "$URL" -o "$OUT"
echo "saved -> $OUT ($(wc -l < "$OUT") lines)"
