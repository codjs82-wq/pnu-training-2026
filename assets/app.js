/* =========================================================
   2026 부산대학교 직무연수 안내 — 공통 로직
   - 구글 시트(data 탭)를 CSV로 실시간 로드 (PapaParse)
   - 메인(index) / 상세(detail) 페이지 공용
   ========================================================= */

/* 구글 시트 CSV — headers=1 필수 (머리글 1행으로 고정) */
const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1qSz3fbUnOspUyiB5wYvpJt6vtxTlRt1yAQ_VXjewLfo/gviz/tq?tqx=out:csv&sheet=data&headers=1";

/* 로컬 테스트용: index.html?src=data/파일.csv 로 열면 해당 CSV를 대신 사용.
   (배포 후 실제 사용자는 파라미터 없이 열어 구글 시트를 실시간 로드) */
const DATA_URL = new URLSearchParams(location.search).get("src") || SHEET_CSV_URL;

/* 필터로 사용할 컬럼 순서(분야는 별도 처리) */
const FILTER_DEFS = [
  { key: "이수구분", label: "이수구분" },
  { key: "교육방식", label: "교육방식" },
  { key: "대상",     label: "대상" },
];

/* 검색 대상 컬럼 */
const SEARCH_KEYS = ["과정명", "한줄소개", "주요내용", "담당부서"];

/* --------- 유틸 --------- */
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, c => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}
function norm(row) {
  const o = {};
  for (const k in row) o[String(k).trim()] = (row[k] == null ? "" : String(row[k]).trim());
  return o;
}
/* 이수구분 → 배지 클래스 */
function reqClass(v) {
  if (v === "필수") return "req";
  if (v.startsWith("필수")) return "req-c";   // 필수(해당자)
  if (v === "권장") return "rec";
  return "opt";                                // 선택 등
}
/* 항목 구분은 공백을 낀 " · " 만 사용.
   ("데이터 분석·시각화", "신고·처리" 처럼 붙은 · 는 용어의 일부이므로 나누지 않음) */
function splitList(v) {
  return String(v || "").split(/\s+·\s+/).map(s => s.trim()).filter(Boolean);
}

/* --------- 데이터 로드 --------- */
function loadCourses(onOk, onErr) {
  Papa.parse(DATA_URL, {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: (res) => {
      try {
        const rows = (res.data || [])
          .map(norm)
          .filter(r => r["과정코드"]); // 코드 없는 빈 행 제거
        if (!rows.length) return onErr && onErr(new Error("빈 데이터"));
        onOk(rows);
      } catch (e) { onErr && onErr(e); }
    },
    error: (err) => onErr && onErr(err),
  });
}

/* =========================================================
   메인 페이지
   ========================================================= */
function initIndex() {
  const skel   = document.getElementById("skeleton");
  const grid   = document.getElementById("grid");
  const stateEl= document.getElementById("state");
  const q       = document.getElementById("search");
  const catRow  = document.getElementById("cat-chips");
  const facetBox= document.getElementById("facets");
  const countEl = document.getElementById("result-count");
  const resetBtn= document.getElementById("reset");

  let all = [];
  const active = { cat: null, 이수구분: null, 교육방식: null, 대상: null, q: "" };

  loadCourses(
    (rows) => {
      all = rows;
      document.dispatchEvent(new CustomEvent("courses:loaded", { detail: rows }));
      buildFilters(); render(); if (skel) skel.hidden = true;
    },
    (err) => {
      if (skel) skel.hidden = true;
      stateEl.hidden = false;
      stateEl.innerHTML =
        '<h2>연수 정보를 불러오지 못했습니다</h2>' +
        '<p>네트워크 상태를 확인한 뒤 새로고침해 주세요.</p>';
      console.error(err);
    }
  );

  function distinct(key) {
    const seen = [];
    for (const r of all) { const v = r[key]; if (v && !seen.includes(v)) seen.push(v); }
    return seen;
  }

  function buildFilters() {
    // 분야 칩
    catRow.innerHTML = "";
    distinct("분야").forEach(cat => {
      const b = document.createElement("button");
      b.className = "chip cat-chip";
      b.type = "button";
      b.textContent = cat;
      b.setAttribute("data-cat", cat);
      b.setAttribute("aria-pressed", "false");
      b.addEventListener("click", () => {
        active.cat = (active.cat === cat) ? null : cat;
        syncPressed(); render();
      });
      catRow.appendChild(b);
    });

    // 이수구분 / 교육방식 / 대상
    facetBox.innerHTML = "";
    FILTER_DEFS.forEach(def => {
      const vals = distinct(def.key);
      if (!vals.length) return;
      const group = document.createElement("div");
      group.className = "filter-group";
      group.innerHTML = `<span class="filter-label">${esc(def.label)}</span>`;
      const chips = document.createElement("div");
      chips.className = "chips";
      vals.forEach(v => {
        const b = document.createElement("button");
        b.className = "chip"; b.type = "button"; b.textContent = v;
        b.setAttribute("aria-pressed", "false");
        b.dataset.key = def.key; b.dataset.val = v;
        b.addEventListener("click", () => {
          active[def.key] = (active[def.key] === v) ? null : v;
          syncPressed(); render();
        });
        chips.appendChild(b);
      });
      group.appendChild(chips);
      facetBox.appendChild(group);
    });
  }

  function syncPressed() {
    catRow.querySelectorAll(".cat-chip").forEach(b =>
      b.setAttribute("aria-pressed", String(b.dataset.cat === active.cat)));
    facetBox.querySelectorAll(".chip").forEach(b =>
      b.setAttribute("aria-pressed", String(active[b.dataset.key] === b.dataset.val)));
  }

  function matches(r) {
    if (active.cat && r["분야"] !== active.cat) return false;
    for (const def of FILTER_DEFS) if (active[def.key] && r[def.key] !== active[def.key]) return false;
    if (active.q) {
      const hay = SEARCH_KEYS.map(k => r[k]).join(" ").toLowerCase();
      if (!hay.includes(active.q)) return false;
    }
    return true;
  }

  function render() {
    const list = all.filter(matches);
    countEl.innerHTML = `<b>${list.length}</b>개 과정`;
    const anyFilter = active.cat || active.q || FILTER_DEFS.some(d => active[d.key]);
    resetBtn.hidden = !anyFilter;

    if (!list.length) {
      grid.innerHTML = "";
      stateEl.hidden = false;
      stateEl.innerHTML =
        '<h2>조건에 맞는 과정이 없습니다</h2><p>검색어나 필터를 바꿔 보세요.</p>';
      return;
    }
    stateEl.hidden = true;
    grid.innerHTML = list.map(cardHTML).join("");
  }

  function cardHTML(r) {
    const cls = reqClass(r["이수구분"]);
    return `
      <a class="course-card" data-cat="${esc(r["분야"])}"
         href="detail.html?code=${encodeURIComponent(r["과정코드"])}">
        <div class="card-top">
          <span class="course-code">${esc(r["과정코드"])}</span>
          <span class="badge ${cls}">${esc(r["이수구분"])}</span>
        </div>
        <h3 class="card-title">${esc(r["과정명"])}</h3>
        <p class="card-desc">${esc(r["한줄소개"])}</p>
        <div class="card-meta">
          <span class="card-cat">${esc(r["분야"])}</span>
          <span class="dot">·</span><span>${esc(r["교육방식"])}</span>
          <span class="dot">·</span><span>${esc(r["교육시간"])}</span>
        </div>
      </a>`;
  }

  // 검색(디바운스)
  let t;
  q.addEventListener("input", () => {
    clearTimeout(t);
    t = setTimeout(() => { active.q = q.value.trim().toLowerCase(); render(); }, 150);
  });

  resetBtn.addEventListener("click", () => {
    active.cat = null; active.q = ""; q.value = "";
    FILTER_DEFS.forEach(d => active[d.key] = null);
    syncPressed(); render();
  });
}

/* =========================================================
   상세 페이지
   ========================================================= */
function initDetail() {
  const root = document.getElementById("detail-root");
  const code = new URLSearchParams(location.search).get("code");

  loadCourses(
    (rows) => {
      const r = rows.find(x => x["과정코드"] === code);
      if (!r) return notFound();
      renderDetail(r);
    },
    () => {
      root.innerHTML =
        '<div class="state"><h2>연수 정보를 불러오지 못했습니다</h2>' +
        '<p>잠시 후 새로고침해 주세요. <a href="index.html">← 목록으로</a></p></div>';
    }
  );

  function notFound() {
    root.innerHTML =
      '<div class="state"><h2>과정을 찾을 수 없습니다</h2>' +
      '<p>주소가 올바른지 확인해 주세요. <a href="index.html">← 목록으로</a></p></div>';
  }

  function infoRow(k, v) {
    if (!v) return "";
    return `<div class="info-row"><span class="k">${esc(k)}</span><span class="v">${esc(v)}</span></div>`;
  }

  function renderDetail(r) {
    document.title = `${r["과정명"]} — 2026 부산대학교 직무연수`;
    const cls = reqClass(r["이수구분"]);
    const goals = splitList(r["학습목표"]);
    const topics = splitList(r["주요내용"]);
    const link = r["신청링크"];

    root.innerHTML = `
      <div data-cat="${esc(r["분야"])}">
        <header class="detail-head">
          <div class="wrap">
            <a class="back-link" href="index.html">← 전체 과정 목록</a>
            <div class="detail-badges">
              <span class="card-cat">${esc(r["분야"])}</span>
              <span class="badge ${cls}">${esc(r["이수구분"])}</span>
              <span class="badge">${esc(r["교육방식"])}</span>
              <span class="detail-code">${esc(r["과정코드"])}</span>
            </div>
            <h1>${esc(r["과정명"])}</h1>
            <p class="detail-lead">${esc(r["한줄소개"])}</p>
          </div>
        </header>

        <div class="wrap">
          <div class="detail-body">
            <div class="detail-main">
              <div class="section-block">
                <h2>과정 소개</h2>
                <p>${esc(r["상세소개"])}</p>
              </div>
              ${goals.length ? `<div class="section-block"><h2>학습 목표</h2>
                <ul class="bullets">${goals.map(g => `<li>${esc(g)}</li>`).join("")}</ul></div>` : ""}
              ${topics.length ? `<div class="section-block"><h2>주요 내용</h2>
                <ul class="bullets">${topics.map(t => `<li>${esc(t)}</li>`).join("")}</ul></div>` : ""}
            </div>

            <aside>
              <div class="info-card">
                ${infoRow("대상", r["대상"])}
                ${infoRow("교육방식", r["교육방식"])}
                ${infoRow("교육시간", r["교육시간"])}
                ${infoRow("정원", r["정원"])}
                ${infoRow("교육기간", r["교육기간"])}
                ${infoRow("신청기간", r["신청기간"])}
                ${infoRow("담당부서", r["담당부서"])}
                ${link ? `<a class="cta" href="${esc(link)}" target="_blank" rel="noopener">신청하기 ↗</a>` : ""}
                ${r["문의"] ? `<p class="contact">문의 · ${esc(r["문의"])}</p>` : ""}
              </div>
            </aside>
          </div>
        </div>
      </div>`;
  }
}

/* --------- 부트스트랩 --------- */
document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;
  if (page === "index") initIndex();
  else if (page === "detail") initDetail();
});
