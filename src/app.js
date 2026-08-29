import { ACTIVITIES, CITIES, COURSE_LENGTH, FACTORS, KOREA_LAND, activityByName, capFor, dailyGoalKm } from "./data.js";
import { buildFitnessCard, fallbackProfileFromLogs, mapPapsToActivities, validateCardText } from "./paps.js";
import { loadState, resetState, saveState, todayStr } from "./store.js";

let state = loadState();
let view = state.team?.name ? "home" : "setup";
let recordPick = ACTIVITIES[0].id;
let recordAmount = ACTIVITIES[0].min;
let toastTimer = null;

const $ = (sel, el = document) => el.querySelector(sel);

function persist() {
  saveState(state);
}

function teamLabel() {
  return state.team.mode === "class" ? "반" : "모둠";
}

function teamDailyGoal() {
  const per = dailyGoalKm(state.team.grade);
  return Math.round(per * Number(state.team.members || 1) * 10) / 10;
}

function totalKm() {
  return Math.round(state.logs.reduce((s, l) => s + l.km, 0) * 100) / 100;
}

function kmOn(date) {
  return Math.round(state.logs.filter((l) => l.date === date).reduce((s, l) => s + l.km, 0) * 100) / 100;
}

function usedAmount(activityName, date) {
  return state.logs
    .filter((l) => l.date === date && l.name === activityName)
    .reduce((s, l) => s + l.amount, 0);
}

function averageKmLastDays(days = 14) {
  const map = new Map();
  for (const log of state.logs) {
    map.set(log.date, (map.get(log.date) || 0) + log.km);
  }
  const dates = [...map.keys()].sort().slice(-days);
  if (!dates.length) return 0;
  const sum = dates.reduce((s, d) => s + map.get(d), 0);
  return Math.round((sum / dates.length) * 10) / 10;
}

function lapInfo(km = totalKm()) {
  const lap = Math.floor(km / COURSE_LENGTH) + 1;
  const pos = km % COURSE_LENGTH;
  return { lap, pos, km };
}

function cityIndexAt(pos) {
  let idx = 0;
  for (let i = 0; i < CITIES.length; i++) {
    if (pos >= CITIES[i].km) idx = i;
  }
  return idx;
}

function nextCity(pos) {
  const idx = cityIndexAt(pos);
  return CITIES[idx + 1] || null;
}

function arrivedCities(km = totalKm()) {
  const { lap, pos } = lapInfo(km);
  const unlocked = [];
  for (let L = 1; L < lap; L++) {
    for (const c of CITIES) unlocked.push({ ...c, lap: L });
  }
  for (const c of CITIES) {
    if (pos >= c.km) unlocked.push({ ...c, lap });
  }
  return unlocked;
}

function mascotAlong(pos) {
  const idx = cityIndexAt(pos);
  const a = CITIES[idx];
  const b = CITIES[idx + 1];
  if (!b) return { x: a.x, y: a.y };
  const t = (pos - a.km) / (b.km - a.km);
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function showToast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
}

function go(next) {
  view = next;
  render();
}

function confettiBurst() {
  const box = $("#confetti");
  box.innerHTML = "";
  const bits = ["⭐", "🎉", "🌸", "💛", "🍀", "✨", "🎈"];
  for (let i = 0; i < 18; i++) {
    const s = document.createElement("span");
    s.textContent = bits[i % bits.length];
    s.style.left = `${Math.random() * 100}%`;
    s.style.animationDelay = `${Math.random() * 0.4}s`;
    s.style.setProperty("--rot", `${Math.random() * 180 - 90}deg`);
    box.appendChild(s);
  }
  setTimeout(() => { box.innerHTML = ""; }, 1800);
}

/* ---------- screens ---------- */

function shell(inner, nav = true) {
  const t = state.team;
  return `
    <div class="sky">
      <div class="cloud c1"></div>
      <div class="cloud c2"></div>
      <div class="cloud c3"></div>
      <div class="sun" aria-hidden="true">☀️</div>
    </div>
    <header class="topbar">
      <div class="brand">
        <span class="mascot-mini" aria-hidden="true">🦊</span>
        <div>
          <p class="eyebrow">국토 체력마라톤</p>
          <h1>${t.name || "토토와 달려요"}</h1>
        </div>
      </div>
      ${t.name ? `<span class="pill">${t.grade}학년 · ${teamLabel()} ${t.members}명</span>` : ""}
    </header>
    <main class="panel">${inner}</main>
    ${nav ? bottomNav() : ""}
    <div id="toast" class="toast" role="status"></div>
    <div id="confetti" class="confetti" aria-hidden="true"></div>
    <div id="modal-root"></div>
  `;
}

function bottomNav() {
  const items = [
    ["home", "🗺️", "지도"],
    ["record", "✏️", "기록"],
    ["stamps", "🏅", "스탬프"],
    ["teacher", "👩‍🏫", "선생님"],
  ];
  return `<nav class="tabbar">${items.map(([id, icon, label]) => `
    <button class="tab ${view === id ? "active" : ""}" data-go="${id}">
      <span>${icon}</span>${label}
    </button>`).join("")}</nav>`;
}

function renderSetup() {
  const t = state.team;
  document.getElementById("app").innerHTML = shell(`
    <section class="hero-card">
      <div class="fox fox-lg" aria-hidden="true">${foxSvg()}</div>
      <h2>안녕! 나는 토토야</h2>
      <p class="lead">모둠이랑, 반이랑 함께 우리나라를 달려 보자!</p>
    </section>
    <section class="card">
      <h3>누구랑 달릴까요?</h3>
      <div class="choice-row">
        <button class="choice ${t.mode === "group" ? "on" : ""}" data-mode="group">
          <span class="big">🦊</span>
          <strong>모둠별</strong>
          <small>4~6명이 함께</small>
        </button>
        <button class="choice ${t.mode === "class" ? "on" : ""}" data-mode="class">
          <span class="big">🏫</span>
          <strong>반별</strong>
          <small>우리 반 모두 함께</small>
        </button>
      </div>
    </section>
    <section class="card">
      <label>이름
        <input id="team-name" maxlength="16" placeholder="${t.mode === "class" ? "예: 햇님반" : "예: 햇살모둠"}" value="${t.name || ""}">
      </label>
      <label>학년
        <div class="grade-row">
          ${[3, 4, 5, 6].map((g) => `<button class="chip ${t.grade === g ? "on" : ""}" data-grade="${g}">${g}학년</button>`).join("")}
        </div>
      </label>
      <label>인원
        <div class="stepper">
          <button data-mem="-1">−</button>
          <strong id="mem-n">${t.members}</strong>
          <button data-mem="1">+</button>
        </div>
      </label>
      <p class="hint">하루 목표는 1명 ${dailyGoalKm(t.grade)}km × 인원 = <b>${Math.round(dailyGoalKm(t.grade) * t.members * 10) / 10}km</b>예요. 모두 같은 목표예요.</p>
      <button class="btn primary" id="start-btn">출발!</button>
    </section>
  `, false);

  document.querySelectorAll("[data-mode]").forEach((b) => b.addEventListener("click", () => {
    state.team.mode = b.dataset.mode;
    if (state.team.mode === "class" && state.team.members < 10) state.team.members = 24;
    if (state.team.mode === "group" && state.team.members > 8) state.team.members = 5;
    renderSetup();
  }));
  document.querySelectorAll("[data-grade]").forEach((b) => b.addEventListener("click", () => {
    state.team.grade = Number(b.dataset.grade);
    renderSetup();
  }));
  document.querySelectorAll("[data-mem]").forEach((b) => b.addEventListener("click", () => {
    const min = state.team.mode === "class" ? 10 : 2;
    const max = state.team.mode === "class" ? 36 : 8;
    state.team.members = Math.min(max, Math.max(min, state.team.members + Number(b.dataset.mem)));
    renderSetup();
  }));
  $("#team-name").addEventListener("input", (e) => { state.team.name = e.target.value; });
  $("#start-btn").addEventListener("click", () => {
    if (!state.team.mode) return showToast("모둠이랑 반 중 하나를 골라 주세요!");
    const name = ($("#team-name").value || "").trim();
    if (name.length < 2) return showToast("이름을 두 글자 이상 적어 주세요!");
    state.team.name = name;
    state.team.createdAt = todayStr();
    state.pendingArrivalId = "1-jeju";
    persist();
    view = "home";
    render();
    showToast(`${name} 출발! 화이팅!`);
  });
}

function renderHome() {
  const { lap, pos } = lapInfo();
  const idx = cityIndexAt(pos);
  const here = CITIES[idx];
  const next = nextCity(pos);
  const remain = next ? Math.max(0, Math.round((next.km - pos) * 10) / 10) : 0;
  const today = kmOn(todayStr());
  const goal = teamDailyGoal();
  const pct = Math.min(100, Math.round((today / goal) * 100));
  const rec = state.profile.activities || [];
  const fox = mascotAlong(pos);

  document.getElementById("app").innerHTML = shell(`
    <section class="speech">
      <div class="fox fox-md">${foxSvg()}</div>
      <div class="bubble">
        <p>지금 <b>${here.name}</b>에 있어요${lap > 1 ? ` (${lap}바퀴)` : ""}!</p>
        <p>${next ? `다음 ${next.name}까지 <b>${remain}km</b>!` : "완주했어요! 한 바퀴 더 돌까요?"}</p>
      </div>
    </section>
    <section class="card map-card">
      ${koreaMapSvg(fox, pos)}
      <div class="legend">
        <span>📍 지금 ${here.name}</span>
        ${next ? `<span>🚩 다음 ${next.name}</span>` : `<span>🏆 ${lap}바퀴 완주</span>`}
      </div>
    </section>
    <section class="card">
      <div class="row-between">
        <h3>오늘 우리 ${teamLabel()}</h3>
        <span class="km">${today} / ${goal} km</span>
      </div>
      <div class="bar"><i style="width:${pct}%"></i></div>
      <p class="hint">목표는 모두 같아요. 누구는 덜, 누구는 더 하지 않아요.</p>
      ${rec.length ? `
        <p class="rec-label">오늘 함께 하면 좋은 활동</p>
        <div class="chips">${rec.map((n) => {
          const a = activityByName(n);
          return `<span class="chip soft">${a?.emoji || "⭐"} ${n}</span>`;
        }).join("")}</div>` : `<p class="hint">선생님이 체력 안내를 정하면 추천 활동이 나와요. 없어도 기록은 할 수 있어요!</p>`}
      <button class="btn primary" data-go="record">오늘 운동 기록하기</button>
    </section>
    <section class="card stats-mini">
      <div><b>${totalKm()}</b><span>모은 거리</span></div>
      <div><b>${arrivedCities().length}</b><span>찍은 도장</span></div>
      <div><b>${new Set(state.logs.map((l) => l.date)).size}</b><span>함께한 날</span></div>
    </section>
  `);

  maybeShowArrival();
}

function koreaMapSvg(fox, pos) {
  const path = CITIES.map((c, i) => `${i ? "L" : "M"} ${c.x} ${c.y}`).join(" ");
  const dots = CITIES.map((c) => {
    const done = pos >= c.km;
    return `<g class="city-dot ${done ? "done" : ""}">
      <circle cx="${c.x}" cy="${c.y}" r="${done ? 7 : 5}" fill="${done ? c.color : "#fff"}" stroke="${c.color}" stroke-width="3"/>
      <text x="${c.x}" y="${c.y - 12}" text-anchor="middle">${c.name}</text>
    </g>`;
  }).join("");
  return `<svg class="korea-map" viewBox="0 20 280 390" role="img" aria-label="우리나라 여행 지도">
    <ellipse cx="92" cy="372" rx="28" ry="16" fill="#C8E7A8"/>
    <path d="${KOREA_LAND}" fill="#B7E4C7" stroke="#2D6A4F" stroke-width="4" stroke-linejoin="round"/>
    <path d="${path}" fill="none" stroke="#F4A261" stroke-width="4" stroke-linecap="round" stroke-dasharray="6 8"/>
    ${dots}
    <g transform="translate(${fox.x}, ${fox.y})">
      <g class="runner-bob">
        <circle r="14" fill="#FF9F1C" stroke="#7A3E00" stroke-width="2"/>
        <text x="0" y="5" text-anchor="middle" font-size="14">🦊</text>
      </g>
    </g>
  </svg>`;
}

function foxSvg() {
  return `<svg viewBox="0 0 80 80" class="fox-svg" aria-hidden="true">
    <circle cx="40" cy="44" r="22" fill="#FF9F1C"/>
    <path d="M18 28 L28 8 L36 30 Z" fill="#FF9F1C"/><path d="M62 28 L52 8 L44 30 Z" fill="#FF9F1C"/>
    <path d="M22 26 L28 12 L34 28 Z" fill="#FFE8D6"/><path d="M58 26 L52 12 L46 28 Z" fill="#FFE8D6"/>
    <circle cx="32" cy="42" r="3.2" fill="#3D1F00"/><circle cx="48" cy="42" r="3.2" fill="#3D1F00"/>
    <ellipse cx="40" cy="50" rx="4" ry="3" fill="#F94144"/>
    <path d="M28 54 Q40 62 52 54" fill="none" stroke="#7A3E00" stroke-width="2" stroke-linecap="round"/>
    <text x="40" y="76" text-anchor="middle" font-size="9" fill="#7A3E00">토토</text>
  </svg>`;
}

function renderRecord() {
  const act = ACTIVITIES.find((a) => a.id === recordPick) || ACTIVITIES[0];
  const cap = capFor(act, state.team.grade);
  const used = usedAmount(act.name, todayStr());
  const left = Math.max(0, cap - used);
  recordAmount = Math.min(Math.max(act.min, recordAmount), left || act.min);
  const km = Math.round(act.convert(recordAmount) * 100) / 100;

  document.getElementById("app").innerHTML = shell(`
    <section class="card">
      <h3>오늘 무엇을 했나요?</h3>
      <p class="hint">우리 ${teamLabel()}이 함께 한 활동을 골라요. 사람마다 다른 칸을 강조하지 않아요.</p>
      <div class="act-grid">
        ${ACTIVITIES.map((a) => `
          <button class="act ${a.id === act.id ? "on" : ""}" data-act="${a.id}">
            <span>${a.emoji}</span>${a.name}
          </button>`).join("")}
      </div>
    </section>
    <section class="card">
      <div class="row-between">
        <h3>${act.emoji} ${act.name}</h3>
        <span class="pill">${act.type}</span>
      </div>
      <div class="stepper lg">
        <button data-amt="-${act.step}">−</button>
        <div class="amt"><b>${recordAmount}</b><small>${act.unit}</small></div>
        <button data-amt="${act.step}">+</button>
      </div>
      <p class="km-preview">≈ <b>${km}km</b> · 오늘 남은 한도 ${left}${act.unit}</p>
      <button class="btn primary" id="save-log" ${left < act.min ? "disabled" : ""}>우리 ${teamLabel()} 기록하기</button>
    </section>
    <section class="card">
      <h3>오늘의 기록</h3>
      ${renderTodayLogs()}
    </section>
  `);

  document.querySelectorAll("[data-act]").forEach((b) => b.addEventListener("click", () => {
    recordPick = b.dataset.act;
    const next = ACTIVITIES.find((a) => a.id === recordPick);
    recordAmount = next.min;
    renderRecord();
  }));
  document.querySelectorAll("[data-amt]").forEach((b) => b.addEventListener("click", () => {
    const next = recordAmount + Number(b.dataset.amt);
    recordAmount = Math.min(left, Math.max(act.min, next));
    renderRecord();
  }));
  $("#save-log")?.addEventListener("click", () => saveLog(act, cap, used));
}

function renderTodayLogs() {
  const logs = state.logs.filter((l) => l.date === todayStr()).slice().reverse();
  if (!logs.length) return `<p class="hint">아직 오늘 기록이 없어요. 작게라도 시작해 봐요!</p>`;
  return `<ul class="log-list">${logs.map((l) => `
    <li><span>${l.emoji} ${l.name} ${l.amount}${l.unit}</span><b>+${l.km}km</b></li>
  `).join("")}</ul>`;
}

function saveLog(act, cap, used) {
  if (used + recordAmount > cap) return showToast("오늘은 이 활동 한도에 닿았어요!");
  const before = arrivedCities(totalKm()).map((c) => `${c.lap}-${c.id}`);
  const km = Math.round(act.convert(recordAmount) * 100) / 100;
  state.logs.push({
    id: crypto.randomUUID(),
    date: todayStr(),
    name: act.name,
    emoji: act.emoji,
    amount: recordAmount,
    unit: act.unit,
    km,
  });
  maybeRefreshFallbackProfile();
  persist();
  const after = arrivedCities(totalKm());
  const fresh = after.find((c) => !before.includes(`${c.lap}-${c.id}`) && c.km !== 0);
  renderRecord();
  showToast(`${act.name} ${recordAmount}${act.unit} → ${km}km!`);
  if (fresh) {
    state.pendingArrivalId = `${fresh.lap}-${fresh.id}`;
    persist();
    confettiBurst();
    openArrival(fresh);
  }
}

function maybeRefreshFallbackProfile() {
  if (state.profile.source === "PAPS") return;
  const days = new Set(state.logs.map((l) => l.date)).size;
  if (days >= 10) {
    const mapped = fallbackProfileFromLogs(state.logs);
    if (mapped.source !== "없음") {
      state.profile = {
        ...state.profile,
        ...mapped,
        updatedAt: todayStr(),
        card: buildFitnessCard({
          teamName: state.team.name,
          grade: state.team.grade,
          profile: mapped,
          avgKm: averageKmLastDays(),
        }),
      };
    }
  }
}

function renderStamps() {
  const unlocked = new Set(arrivedCities().map((c) => c.id));
  document.getElementById("app").innerHTML = shell(`
    <section class="card">
      <h3>여행 도장 모음</h3>
      <p class="hint">도착한 곳만 열어 볼 수 있어요. 정보는 짧게만 보여 줄게요.</p>
      <div class="stamp-grid">
        ${CITIES.map((c) => {
          const on = unlocked.has(c.id);
          return `<button class="stamp ${on ? "on" : ""}" data-city="${c.id}" ${on ? "" : "disabled"}>
            <span class="seal">${on ? c.stamp : "🔒"}</span>
            <b>${c.name}</b>
          </button>`;
        }).join("")}
      </div>
    </section>
  `);
  document.querySelectorAll(".stamp.on").forEach((b) => b.addEventListener("click", () => {
    const city = CITIES.find((c) => c.id === b.dataset.city);
    openArrival(city, { replay: true });
  }));
}

function openArrival(city, { replay = false, start = false } = {}) {
  const root = $("#modal-root");
  const kicker = start ? "출발해요!" : replay ? "" : "도착했어요!";
  root.innerHTML = `
    <div class="modal-bg" role="dialog" aria-labelledby="arr-title">
      <div class="modal cute">
        ${kicker ? `<p class="arrive-kicker">${kicker}</p>` : ""}
        <div class="seal huge">${city.stamp}</div>
        <h2 id="arr-title">${city.name}</h2>
        <p class="fact">${city.fact}</p>
        <div class="info-mini">
          <div><span>🍴</span><b>먹거리</b><p>${city.food}</p></div>
          <div><span>📍</span><b>가볼 곳</b><p>${city.place}</p></div>
        </div>
        <button class="btn primary" id="close-arr">${replay ? "닫기" : start ? "제주에서 출발!" : "다음 도시로 고고!"}</button>
      </div>
    </div>`;
  $("#close-arr").addEventListener("click", () => {
    if (state.pendingArrivalId) {
      if (!state.seenArrivals.includes(state.pendingArrivalId)) {
        state.seenArrivals.push(state.pendingArrivalId);
      }
      state.pendingArrivalId = null;
      persist();
    }
    root.innerHTML = "";
  });
}

function maybeShowArrival() {
  if (!state.pendingArrivalId) return;
  const id = state.pendingArrivalId.split("-").slice(1).join("-");
  const city = CITIES.find((c) => c.id === id);
  if (city) openArrival(city, { start: state.pendingArrivalId === "1-jeju" });
}

function renderTeacher() {
  const draft = state.papsDraft || { 심폐지구력: "", 유연성: "", "근력·근지구력": "", 순발력: "", focusCare: false };
  const preview = hasFullDraft(draft) ? mapPapsToActivities(draft, draft.focusCare) : null;
  const card = state.profile.card;
  const days = [...new Set(state.logs.map((l) => l.date))];
  const types = new Set(state.logs.map((l) => activityByName(l.name)?.type).filter(Boolean));
  const recDone = recCompliance();

  document.getElementById("app").innerHTML = shell(`
    <section class="card warn">
      <h3>선생님 안내</h3>
      <p>PAPS 등급은 저장하지 않아요. 입력하면 바로 우리 ${teamLabel()} 추천 활동으로 바꾼 뒤 버려요. 체지방(BMI) 칸은 없어요.</p>
    </section>
    <section class="card">
      <h3>우리 ${teamLabel()} PAPS 한 줄 입력</h3>
      <p class="hint">학생 한 명씩이 아니라 ${teamLabel()} 전체를 대표하는 값만 넣어요. 비워 두면 지금 추천을 유지해요.</p>
      <div class="paps-grid">
        ${FACTORS.map((f) => `
          <label>${f.replace("·근지구력", "")}
            <select data-factor="${f}">
              <option value="">선택</option>
              ${[1, 2, 3, 4, 5].map((n) => `<option value="${n}" ${String(draft[f]) === String(n) ? "selected" : ""}>${n}</option>`).join("")}
            </select>
          </label>`).join("")}
      </div>
      <label class="check"><input type="checkbox" id="focus" ${draft.focusCare ? "checked" : ""}> 중점관리 (학생 화면에는 안 보여요)</label>
      ${preview ? `<div class="preview">추천 미리보기: ${preview.activities.join(" · ")}</div>` : ""}
      <div class="btn-row">
        <button class="btn" id="map-paps" ${preview ? "" : "disabled"}>매핑하고 등급 버리기</button>
      </div>
    </section>
    <section class="card print-only-card">
      <h3>우리 ${teamLabel()} 체력 카드</h3>
      ${card ? fitnessCardHtml(card) : `<p class="hint">매핑을 확정하면 카드가 생겨요. AI 없이 안전한 문장으로 만들어요.</p>`}
      ${card ? `<div class="btn-row">
        <button class="btn primary" id="print-card">A5로 인쇄</button>
        <button class="btn ghost" id="new-card" ${state.profile.cardCount >= 2 ? "disabled" : ""}>문장 다시 만들기 (${state.profile.cardCount}/2)</button>
      </div>` : ""}
    </section>
    <section class="card">
      <h3>학기 성장 리포트</h3>
      <ul class="report">
        <li>모은 거리 <b>${totalKm()}km</b></li>
        <li>도착한 도시 <b>${new Set(arrivedCities().map((c) => c.id)).size}곳</b></li>
        <li>함께한 날 <b>${days.length}일</b></li>
        <li>활동 종류 <b>${types.size}가지</b></li>
        <li>추천 활동 이행률 <b>${recDone}%</b></li>
      </ul>
      <p class="hint">앱은 PAPS가 올랐다고 말하지 않아요. 활동량만 보여 드려요.</p>
    </section>
    <section class="card">
      <h3>교실 시연</h3>
      <p class="hint">수업에서 도착 장면을 보여 줄 때 써요. 다음 도시까지 거리가 채워집니다.</p>
      <button class="btn" id="demo-next">시연: 다음 도시에 도착</button>
      <button class="btn ghost danger" id="reset">처음부터 다시</button>
    </section>
  `);

  document.querySelectorAll("[data-factor]").forEach((sel) => sel.addEventListener("change", () => {
    state.papsDraft = { ...draft, [sel.dataset.factor]: sel.value, focusCare: $("#focus").checked };
    renderTeacher();
  }));
  $("#focus")?.addEventListener("change", (e) => {
    state.papsDraft = { ...draft, focusCare: e.target.checked };
    renderTeacher();
  });
  $("#map-paps")?.addEventListener("click", () => confirmPaps(draft));
  $("#print-card")?.addEventListener("click", () => window.print());
  $("#new-card")?.addEventListener("click", () => rebuildCard());
  $("#demo-next")?.addEventListener("click", demoArriveNext);
  $("#reset")?.addEventListener("click", () => {
    if (confirm("모든 기록이 사라져요. 다시 시작할까요?")) {
      state = resetState();
      view = "setup";
      render();
    }
  });
}

function demoArriveNext() {
  const before = arrivedCities(totalKm()).map((c) => `${c.lap}-${c.id}`);
  const { pos } = lapInfo();
  const next = nextCity(pos);
  const need = next ? Math.max(0.1, Math.round((next.km - pos + 0.05) * 100) / 100) : 1;
  state.logs.push({
    id: crypto.randomUUID(),
    date: todayStr(),
    name: "걷기",
    emoji: "🚶",
    amount: 0,
    unit: "분",
    km: need,
    demo: true,
  });
  persist();
  const after = arrivedCities(totalKm());
  const fresh = after.find((c) => !before.includes(`${c.lap}-${c.id}`) && !(c.km === 0 && c.lap === 1));
  view = "home";
  render();
  if (fresh) {
    state.pendingArrivalId = `${fresh.lap}-${fresh.id}`;
    persist();
    confettiBurst();
    openArrival(fresh);
  } else {
    showToast("한 바퀴를 모두 돌았어요! 기록이 이어집니다.");
  }
}

function hasFullDraft(d) {
  return FACTORS.every((f) => Number(d[f]) >= 1 && Number(d[f]) <= 5);
}

function confirmPaps(draft) {
  const mapped = mapPapsToActivities(draft, draft.focusCare);
  const card = buildFitnessCard({
    teamName: state.team.name,
    grade: state.team.grade,
    profile: mapped,
    avgKm: averageKmLastDays(),
  });
  const blob = `${card.summary}${card.strength}${card.grow}${card.cheer}${card.paceLine}`;
  const safeCard = validateCardText(blob) ? card : buildFitnessCard({
    teamName: state.team.name,
    grade: state.team.grade,
    profile: mapped,
    avgKm: averageKmLastDays(),
  });
  state.profile = {
    source: mapped.source,
    activities: mapped.activities,
    weak: mapped.weak,
    strong: mapped.strong,
    updatedAt: todayStr(),
    focusCare: !!draft.focusCare,
    card: safeCard,
    cardCount: Math.min(2, (state.profile.cardCount || 0) + 1),
  };
  state.papsDraft = null;
  persist();
  renderTeacher();
  showToast("추천 활동을 정했어요. 등급은 저장하지 않았어요.");
}

function rebuildCard() {
  if (state.profile.cardCount >= 2) return showToast("학기에 두 번만 다시 만들 수 있어요.");
  const card = buildFitnessCard({
    teamName: state.team.name,
    grade: state.team.grade,
    profile: state.profile,
    avgKm: averageKmLastDays(),
  });
  state.profile.card = card;
  state.profile.cardCount += 1;
  persist();
  renderTeacher();
}

function recCompliance() {
  const rec = state.profile.activities || [];
  if (!rec.length || !state.logs.length) return 0;
  const byDate = new Map();
  for (const log of state.logs) {
    const set = byDate.get(log.date) || new Set();
    set.add(log.name);
    byDate.set(log.date, set);
  }
  let ok = 0;
  for (const set of byDate.values()) {
    if (rec.some((r) => set.has(r))) ok += 1;
  }
  return Math.round((ok / byDate.size) * 100);
}

function fitnessCardHtml(card) {
  return `<article class="fit-card" id="print-area">
    <p class="eyebrow">국토 체력마라톤</p>
    <h2>${card.title}</h2>
    <p class="summary">${card.summary}</p>
    <div class="fit-block"><h4>잘하는 점</h4><p>${card.strength}</p></div>
    <div class="fit-block"><h4>키우면 좋은 점</h4><p>${card.grow}</p></div>
    <div class="fit-block"><h4>오늘의 추천</h4>
      ${card.recs.length ? `<ul>${card.recs.map((r) => `<li>${r.name} ${r.amount}</li>`).join("")}</ul>` : "<p>아직 없어요</p>"}
    </div>
    <p class="cheer">${card.cheer}</p>
    <p class="pace">${card.paceLine}</p>
  </article>`;
}

function bindNav() {
  document.querySelectorAll("[data-go]").forEach((b) => b.addEventListener("click", () => go(b.dataset.go)));
}

function render() {
  if (!state.team?.name || !state.team.mode) view = "setup";
  if (view === "setup") renderSetup();
  else if (view === "record") renderRecord();
  else if (view === "stamps") renderStamps();
  else if (view === "teacher") renderTeacher();
  else renderHome();
  bindNav();
}

window.addEventListener("beforeunload", () => {
  state.papsDraft = null;
});

render();
