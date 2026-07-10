# 2026 부산대학교 직무연수 안내

부산대학교 교직원을 위한 2026년 직무연수 안내 사이트 (메인 · 상세 2페이지, 정적 웹사이트).

- **메인** `index.html` — 과정 개요 · 검색 · 필터(분야/이수구분/교육방식/대상)
- **상세** `detail.html?code=PNU-2026-XXX` — 개별 과정 상세

## 데이터

과정 데이터는 코드에 넣지 않고 **구글 시트에서 실시간(CSV)으로** 불러옵니다. 시트를 수정하면
새로고침 시 사이트에 반영됩니다. CSV 파싱은 [PapaParse](https://www.papaparse.com/)를 사용합니다.

```
https://docs.google.com/spreadsheets/d/1qSz3fbUnOspUyiB5wYvpJt6vtxTlRt1yAQ_VXjewLfo/gviz/tq?tqx=out:csv&sheet=data&headers=1
```

> `&headers=1` 은 필수입니다 — 모든 열이 텍스트라 gviz가 앞쪽 여러 행을 머리글로 오인해
> 병합하는 문제를 방지합니다.

## 로컬 실행

```bash
python -m http.server 8000
# http://localhost:8000/  (로컬 CSV 테스트: index.html?src=data/data-sample_...csv)
```

배포: GitHub Pages (Settings → Pages → Branch: `main` / root).
