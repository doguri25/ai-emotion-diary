import { ACTIVITIES, CITIES, FACTORS, JEJU, KOREA_LAND, activityByName, capFor, courseLength, dailyGoalKm, getCourse } from "./data.js";
import { buildFitnessCard, fallbackProfileFromLogs, mapPapsToActivities, validateCardText } from "./paps.js";
import { loadState, resetState, saveState, todayStr } from "./store.js";

let state = loadState();
let view = state.session?.studentId ? "home" : "login";
let recordPick = ACTIVITIES[0].id;
let recordAmount = ACTIVITIES[0].min;
let loginPick = { grade: 4, classNo: 2, studentId: "" };
let toastTimer = null;
let startPickId = null;
let startReturnView = "home";

const $ = (sel, el = document) => el.querySelector(sel);

function persist() {
  saveState(state);
}

function currentStudent() {
  return state.students.find((s) => s.id === state.session.studentId) || null;
}

function teamMode() {
  return state.settings.mode === "group" ? "group" : "class";
}

function teamLabel() {
  return teamMode() === "group" ? "모둠" : "반";
}

function teamName() {
  const s = currentStudent();
  if (!s) return "우리 반";
  if (teamMode() === "group" && s.groupName) return `${s.groupName}모둠`;
  return `${s.grade}학년 ${s.classNo}반`;
}

function teammates() {
  const s = currentStudent();
  if (!s) return [];
  if (teamMode() === "group" && s.groupName) {
    return state.students.filter((x) => x.grade === s.grade && x.classNo === s.classNo && x.groupName === s.groupName);
  }
  return state.students.filter((x) => x.grade === s.grade && x.classNo === s.classNo);
}

function scopeKey() {
  const s = currentStudent();
  if (!s) return "none";
  if (teamMode() === "group" && s.groupName) return `group:${s.grade}-${s.classNo}-${s.groupName}`;
  return `class:${s.grade}-${s.classNo}`;
}

function scopedLogs() {
  const key = scopeKey();
  return state.logs.filter((l) => (l.scope || key) === key);
}

function teamDailyGoal() {
  const s = currentStudent();
  const grade = s?.grade || 4;
  const n = Math.max(1, teammates().length);
  return Math.round(dailyGoalKm(grade) * n * 10) / 10;
}

function course() {
  return getCourse(state.settings.startCityId || CITIES[0].id);
}

function totalKm() {
  return Math.round(scopedLogs().reduce((sum, l) => sum + l.km, 0) * 100) / 100;
}

function kmOn(date) {
  return Math.round(scopedLogs().filter((l) => l.date === date).reduce((sum, l) => sum + l.km, 0) * 100) / 100;
}

function usedAmount(activityName, date) {
  return scopedLogs()
    .filter((l) => l.date === date && l.name === activityName)
    .reduce((sum, l) => sum + l.amount, 0);
}

function averageKmLastDays(days = 14) {
  const map = new Map();
  for (const log of scopedLogs()) {
    map.set(log.date, (map.get(log.date) || 0) + log.km);
  }
  const dates = [...map.keys()].sort().slice(-days);
  if (!dates.length) return 0;
  const sum = dates.reduce((s, d) => s + map.get(d), 0);
  return Math.round((sum / dates.length) * 10) / 10;
}

function lapInfo(km = totalKm()) {
  const len = courseLength(state.settings.startCityId || CITIES[0].id);
  const lap = Math.floor(km / len) + 1;
  const pos = km % len;
  return { lap, pos, km };
}

function cityIndexAt(pos) {
  const list = course();
  let idx = 0;
  for (let i = 0; i < list.length; i++) {
    if (pos >= list[i].km) idx = i;
  }
  return idx;
}

function nextCity(pos) {
  const list = course();
  return list[cityIndexAt(pos) + 1] || null;
}

function arrivedCities(km = totalKm()) {
  const { lap, pos } = lapInfo(km);
  const list = course();
  const unlocked = [];
  for (let L = 1; L < lap; L++) {
    for (const c of list) unlocked.push({ ...c, lap: L });
  }
  for (const c of list) {
    if (pos >= c.km) unlocked.push({ ...c, lap });
  }
  return unlocked;
}

function mascotAlong(pos) {
  const list = course();
  const idx = cityIndexAt(pos);
  const a = list[idx];
  const b = list[idx + 1];
  if (!b) return { x: a.x, y: a.y };
  const t = (pos - a.km) / (b.km - a.km);
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function showToast(msg) {
  const el = $("#toast");
  if (!el) return;
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
  if (!box) return;
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

function shell(inner, { nav = true } = {}) {
  const s = currentStudent();
  const title = s ? `${s.grade}학년 ${s.classNo}반 ${s.name}` : "토토와 달려요";
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
          <p class="eyebrow">국토 체력마라톤${s ? ` · ${teamName()}` : ""}</p>
          <h1>${title}</h1>
        </div>
      </div>
      <button class="teacher-btn ${view === "teacher" ? "on" : ""}" data-go="teacher" type="button">👩‍🏫 선생님</button>
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
  ];
  return `<nav class="tabbar">${items.map(([id, icon, label]) => `
    <button class="tab ${view === id ? "active" : ""}" data-go="${id}" type="button">
      <span>${icon}</span>${label}
    </button>`).join("")}</nav>`;
}

function classStudents(grade, classNo) {
  return state.students.filter((s) => s.grade === Number(grade) && s.classNo === Number(classNo));
}

function renderLogin() {
  const names = classStudents(loginPick.grade, loginPick.classNo);
  document.getElementById("app").innerHTML = shell(`
    <section class="hero-card">
      <div class="fox fox-lg" aria-hidden="true">${foxSvg()}</div>
      <h2>안녕! 나는 토토야</h2>
      <p class="lead">학년, 반, 이름을 고르고 함께 달려요.</p>
    </section>
    <section class="card">
      <h3>나 로그인</h3>
      <label>학년
        <div class="grade-row">
          ${[3, 4, 5, 6].map((g) => `<button class="chip ${loginPick.grade === g ? "on" : ""}" data-login-grade="${g}" type="button">${g}학년</button>`).join("")}
        </div>
      </label>
      <label>반
        <div class="grade-row">
          ${[1, 2, 3, 4, 5, 6].map((n) => `<button class="chip ${loginPick.classNo === n ? "on" : ""}" data-login-class="${n}" type="button">${n}반</button>`).join("")}
        </div>
      </label>
      <label>이름
        <select id="login-name">
          <option value="">이름을 골라 주세요</option>
          ${names.map((s) => `<option value="${s.id}" ${loginPick.studentId === s.id ? "selected" : ""}>${s.name}</option>`).join("")}
        </select>
      </label>
      ${names.length ? "" : `<p class="hint">이 반에 이름이 없어요. 오른쪽 위 선생님 메뉴에서 친구를 넣어 주세요.</p>`}
      <button class="btn primary" id="login-btn" type="button">들어가기</button>
    </section>
  `, { nav: false });

  document.querySelectorAll("[data-login-grade]").forEach((b) => b.addEventListener("click", () => {
    loginPick = { ...loginPick, grade: Number(b.dataset.loginGrade), studentId: "" };
    renderLogin();
  }));
  document.querySelectorAll("[data-login-class]").forEach((b) => b.addEventListener("click", () => {
    loginPick = { ...loginPick, classNo: Number(b.dataset.loginClass), studentId: "" };
    renderLogin();
  }));
  $("#login-name")?.addEventListener("change", (e) => { loginPick.studentId = e.target.value; });
  $("#login-btn").addEventListener("click", () => {
    const id = $("#login-name").value;
    if (!id) return showToast("학년, 반, 이름을 모두 골라 주세요!");
    state.session.studentId = id;
    persist();
    view = "home";
    render();
    const s = currentStudent();
    showToast(`${s.name} 안녕! 화이팅!`);
  });
}

function renderHome() {
  if (!state.settings.startCityId) {
    renderStartSetup(true);
    return;
  }
  const { lap, pos } = lapInfo();
  const list = course();
  const here = list[cityIndexAt(pos)];
  const next = nextCity(pos);
  const remain = next ? Math.max(0, Math.round((next.km - pos) * 10) / 10) : 0;
  const today = kmOn(todayStr());
  const goal = teamDailyGoal();
  const pct = Math.min(100, Math.round((today / goal) * 100));
  const rec = state.profile.activities || [];
  const fox = mascotAlong(pos);
  const s = currentStudent();
  const groupWarn = teamMode() === "group" && s && !s.groupName;

  document.getElementById("app").innerHTML = shell(`
    <section class="speech">
      <div class="fox fox-md">${foxSvg()}</div>
      <div class="bubble">
        <p>지금 <b>${here.name}</b>에 있어요${lap > 1 ? ` (${lap}바퀴)` : ""}!</p>
        <p>${next ? `다음 ${next.name}까지 <b>${remain}km</b>!` : "완주했어요! 한 바퀴 더 돌까요?"}</p>
      </div>
    </section>
    ${groupWarn ? `<p class="hint warn-inline">아직 모둠이 없어요. 선생님에게 말해 주세요. 지금은 반이랑 함께 달려요.</p>` : ""}
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
      <p class="hint">목표는 ${teammates().length}명이 모두 같아요. 누구는 덜, 누구는 더 하지 않아요.</p>
      ${rec.length ? `
        <p class="rec-label">오늘 함께 하면 좋은 활동</p>
        <div class="chips">${rec.map((n) => {
          const a = activityByName(n);
          return `<span class="chip soft">${a?.emoji || "⭐"} ${n}</span>`;
        }).join("")}</div>` : `<p class="hint">선생님이 체력 안내를 정하면 추천 활동이 나와요. 없어도 기록은 할 수 있어요!</p>`}
      <button class="btn primary" data-go="record" type="button">오늘 운동 기록하기</button>
    </section>
    <section class="card stats-mini">
      <div><b>${totalKm()}</b><span>모은 거리</span></div>
      <div><b>${arrivedCities().length}</b><span>찍은 도장</span></div>
      <div><b>${new Set(scopedLogs().map((l) => l.date)).size}</b><span>함께한 날</span></div>
    </section>
    <p class="logout-wrap"><button class="btn ghost" id="logout-btn" type="button">다른 친구로 들어가기</button></p>
  `);

  $("#logout-btn")?.addEventListener("click", logout);
  maybeShowArrival();
}

function logout() {
  state.session.studentId = null;
  persist();
  view = "login";
  render();
}

function koreaMapSvg(fox, pos) {
  const list = course();
  const path = list.map((c, i) => `${i ? "L" : "M"} ${c.x} ${c.y}`).join(" ");
  const dots = list.map((c) => {
    const done = pos >= c.km;
    return `<g class="city-dot ${done ? "done" : ""}">
      <circle cx="${c.x}" cy="${c.y}" r="${done ? 5.5 : 4}" fill="${done ? c.color : "#fff"}" stroke="${c.color}" stroke-width="2.2"/>
      <text x="${c.x + (c.lx || 0)}" y="${c.y + (c.ly || -8)}">${c.name}</text>
    </g>`;
  }).join("");
  return `<svg class="korea-map" viewBox="0 0 320 460" role="img" aria-label="대한민국 지도">
    <rect width="320" height="460" fill="#c8f0ff"/>
    <path d="${KOREA_LAND}" fill="#7BC67E" stroke="#2D6A4F" stroke-width="3.2" stroke-linejoin="round"/>
    <ellipse cx="${JEJU.x}" cy="${JEJU.y}" rx="${JEJU.rx}" ry="${JEJU.ry}" fill="#7BC67E" stroke="#2D6A4F" stroke-width="3.2"/>
    <path d="${path}" fill="none" stroke="#F4A261" stroke-width="3" stroke-linecap="round" stroke-dasharray="5 7"/>
    ${dots}
    <g transform="translate(${fox.x}, ${fox.y})">
      <g class="runner-bob">
        <circle r="13" fill="#FF9F1C" stroke="#7A3E00" stroke-width="2"/>
        <text x="0" y="5" text-anchor="middle" font-size="13">🦊</text>
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

function renderStartSetup(required) {
  startPickId = startPickId || state.settings.startCityId || "";
  const s = currentStudent();
  document.getElementById("app").innerHTML = shell(`
    <section class="card">
      <h3>출발 도시를 정해요</h3>
      <p class="hint">${required
    ? "아직 출발 도시가 없어요. 선생님이 우리 반이 어디서 출발할지 골라 주세요."
    : "여행이 시작되는 도시를 고를 수 있어요."}</p>
      <div class="stamp-grid start-grid">
        ${CITIES.map((c) => `
          <button class="stamp ${startPickId === c.id ? "on" : ""}" data-start="${c.id}" type="button">
            <span class="seal">${c.stamp}</span>
            <b>${c.name}</b>
          </button>`).join("")}
      </div>
      <button class="btn primary" id="save-start" type="button">여기서 출발!</button>
      ${!required && s ? `<button class="btn ghost" data-go="home" type="button">취소</button>` : ""}
    </section>
  `, { nav: Boolean(s) && !required });

  document.querySelectorAll("[data-start]").forEach((b) => b.addEventListener("click", () => {
    startPickId = b.dataset.start;
    renderStartSetup(required);
  }));
  $("#save-start").addEventListener("click", () => {
    if (!startPickId) return showToast("출발 도시를 하나 골라 주세요!");
    const changed = state.settings.startCityId !== startPickId;
    state.settings.startCityId = startPickId;
    if (changed && !state.seenArrivals.includes(`1-${startPickId}`)) {
      state.pendingArrivalId = `1-${startPickId}`;
    }
    persist();
    const me = currentStudent();
    if (required) view = me ? "home" : "login";
    else view = startReturnView || "teacher";
    render();
    const city = CITIES.find((c) => c.id === startPickId);
    showToast(`${city.name}에서 출발해요!`);
  });
}

function renderRecord() {
  if (!state.settings.startCityId) return renderStartSetup(true);
  const s = currentStudent();
  const act = ACTIVITIES.find((a) => a.id === recordPick) || ACTIVITIES[0];
  const cap = capFor(act, s?.grade || 4);
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
          <button class="act ${a.id === act.id ? "on" : ""}" data-act="${a.id}" type="button">
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
        <button data-amt="-${act.step}" type="button">−</button>
        <div class="amt"><b>${recordAmount}</b><small>${act.unit}</small></div>
        <button data-amt="${act.step}" type="button">+</button>
      </div>
      <p class="km-preview">≈ <b>${km}km</b> · 오늘 남은 한도 ${left}${act.unit}</p>
      <button class="btn primary" id="save-log" ${left < act.min ? "disabled" : ""} type="button">우리 ${teamLabel()} 기록하기</button>
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
  const logs = scopedLogs().filter((l) => l.date === todayStr()).slice().reverse();
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
    scope: scopeKey(),
  });
  maybeRefreshFallbackProfile();
  persist();
  const after = arrivedCities(totalKm());
  const startId = state.settings.startCityId;
  const fresh = after.find((c) => !before.includes(`${c.lap}-${c.id}`) && !(c.id === startId && c.lap === 1 && c.km === 0));
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
  const days = new Set(scopedLogs().map((l) => l.date)).size;
  if (days >= 10) {
    const mapped = fallbackProfileFromLogs(scopedLogs());
    if (mapped.source !== "없음") {
      state.profile = {
        ...state.profile,
        ...mapped,
        updatedAt: todayStr(),
        card: buildFitnessCard({
          teamName: teamName(),
          grade: currentStudent()?.grade || 4,
          profile: mapped,
          avgKm: averageKmLastDays(),
        }),
      };
    }
  }
}

function renderStamps() {
  if (!state.settings.startCityId) return renderStartSetup(true);
  const unlocked = new Set(arrivedCities().map((c) => c.id));
  document.getElementById("app").innerHTML = shell(`
    <section class="card">
      <h3>여행 도장 모음</h3>
      <p class="hint">도착한 곳만 열어 볼 수 있어요. 정보는 짧게만 보여 줄게요.</p>
      <div class="stamp-grid">
        ${course().map((c) => {
          const on = unlocked.has(c.id);
          return `<button class="stamp ${on ? "on" : ""}" data-city="${c.id}" ${on ? "" : "disabled"} type="button">
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
  if (!root) return;
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
        <button class="btn primary" id="close-arr" type="button">${replay ? "닫기" : start ? `${city.name}에서 출발!` : "다음 도시로 고고!"}</button>
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
  const startId = state.settings.startCityId;
  if (city) openArrival(city, { start: state.pendingArrivalId === `1-${startId}` });
}

function renderTeacher() {
  const draft = state.papsDraft || { 심폐지구력: "", 유연성: "", "근력·근지구력": "", 순발력: "", focusCare: false };
  const preview = hasFullDraft(draft) ? mapPapsToActivities(draft, draft.focusCare) : null;
  const card = state.profile.card;
  const days = [...new Set(scopedLogs().map((l) => l.date))];
  const types = new Set(scopedLogs().map((l) => activityByName(l.name)?.type).filter(Boolean));
  const recDone = recCompliance();
  const startCity = CITIES.find((c) => c.id === state.settings.startCityId);
  const logged = currentStudent();

  document.getElementById("app").innerHTML = shell(`
    <section class="card">
      <h3>참여 단위</h3>
      <p class="hint">기본은 학급(반)이에요. 모둠으로 바꾸면 같은 모둠 친구끼리 거리를 모아요.</p>
      <div class="choice-row">
        <button class="choice ${teamMode() === "class" ? "on" : ""}" id="mode-class" type="button">
          <span class="big">🏫</span>
          <strong>학급</strong>
          <small>반 모두 함께</small>
        </button>
        <button class="choice ${teamMode() === "group" ? "on" : ""}" id="mode-group" type="button">
          <span class="big">🦊</span>
          <strong>모둠</strong>
          <small>모둠끼리 함께</small>
        </button>
      </div>
    </section>
    <section class="card">
      <h3>출발 도시</h3>
      <p class="hint">지금 출발: <b>${startCity ? startCity.name : "아직 없음"}</b></p>
      <button class="btn" id="open-start" type="button">${startCity ? "출발 도시 바꾸기" : "출발 도시 정하기"}</button>
    </section>
    <section class="card">
      <h3>학생 이름</h3>
      <p class="hint">로그인할 때 고르는 학년-반-이름이에요.</p>
      <div class="roster">${state.students.map((s) => `
        <div class="roster-row">
          <span>${s.grade}학년 ${s.classNo}반 ${s.name}${s.groupName ? ` · ${s.groupName}모둠` : ""}</span>
          <button class="tiny" data-del="${s.id}" type="button">삭제</button>
        </div>`).join("")}</div>
      <div class="add-row">
        <select id="add-grade">${[3, 4, 5, 6].map((g) => `<option value="${g}" ${g === 4 ? "selected" : ""}>${g}학년</option>`).join("")}</select>
        <select id="add-class">${[1, 2, 3, 4, 5, 6].map((n) => `<option value="${n}" ${n === 2 ? "selected" : ""}>${n}반</option>`).join("")}</select>
        <input id="add-name" maxlength="8" placeholder="이름">
        <input id="add-group" maxlength="8" placeholder="모둠(선택)">
      </div>
      <button class="btn" id="add-student" type="button">친구 넣기</button>
    </section>
    <section class="card warn">
      <h3>우리 ${teamLabel()} PAPS</h3>
      <p>등급은 저장하지 않아요. 입력하면 바로 추천 활동으로 바꾼 뒤 버려요. 체지방(BMI) 칸은 없어요.</p>
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
        <button class="btn" id="map-paps" ${preview ? "" : "disabled"} type="button">매핑하고 등급 버리기</button>
      </div>
    </section>
    <section class="card print-only-card">
      <h3>우리 ${teamLabel()} 체력 카드</h3>
      ${card ? fitnessCardHtml(card) : `<p class="hint">매핑을 확정하면 카드가 생겨요.</p>`}
      ${card ? `<div class="btn-row">
        <button class="btn primary" id="print-card" type="button">A5로 인쇄</button>
        <button class="btn ghost" id="new-card" ${state.profile.cardCount >= 2 ? "disabled" : ""} type="button">문장 다시 만들기 (${state.profile.cardCount}/2)</button>
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
      <p class="hint">수업에서 도착 장면을 보여 줄 때 써요.</p>
      <button class="btn" id="demo-next" type="button" ${logged && state.settings.startCityId ? "" : "disabled"}>시연: 다음 도시에 도착</button>
      <button class="btn ghost danger" id="reset" type="button">처음부터 다시</button>
    </section>
    ${logged ? `<button class="btn ghost" data-go="home" type="button">학생 화면으로</button>` : `<button class="btn ghost" data-go="login" type="button">로그인 화면으로</button>`}
  `, { nav: Boolean(logged) });

  $("#mode-class").addEventListener("click", () => {
    state.settings.mode = "class";
    persist();
    renderTeacher();
    showToast("학급(반)으로 달릴게요.");
  });
  $("#mode-group").addEventListener("click", () => {
    state.settings.mode = "group";
    persist();
    renderTeacher();
    showToast("모둠으로 달릴게요.");
  });
  $("#open-start").addEventListener("click", () => {
    startReturnView = "teacher";
    view = "start";
    render();
  });
  document.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", () => {
    if (state.session.studentId === b.dataset.del) state.session.studentId = null;
    state.students = state.students.filter((s) => s.id !== b.dataset.del);
    persist();
    renderTeacher();
  }));
  $("#add-student").addEventListener("click", () => {
    const name = ($("#add-name").value || "").trim();
    if (name.length < 1) return showToast("이름을 적어 주세요!");
    const grade = Number($("#add-grade").value);
    const classNo = Number($("#add-class").value);
    const groupName = ($("#add-group").value || "").trim();
    if (state.students.some((s) => s.grade === grade && s.classNo === classNo && s.name === name)) {
      return showToast("이미 있는 이름이에요.");
    }
    state.students.push({
      id: crypto.randomUUID(),
      grade,
      classNo,
      name,
      groupName,
    });
    persist();
    renderTeacher();
    showToast(`${grade}학년 ${classNo}반 ${name}을 넣었어요.`);
  });
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
      loginPick = { grade: 4, classNo: 2, studentId: "" };
      startPickId = null;
      view = "login";
      render();
    }
  });
}

function demoArriveNext() {
  if (!currentStudent() || !state.settings.startCityId) return showToast("학생 로그인과 출발 도시가 필요해요.");
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
    scope: scopeKey(),
  });
  persist();
  const after = arrivedCities(totalKm());
  const startId = state.settings.startCityId;
  const fresh = after.find((c) => !before.includes(`${c.lap}-${c.id}`) && !(c.id === startId && c.lap === 1 && c.km === 0));
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
    teamName: teamName(),
    grade: currentStudent()?.grade || 4,
    profile: mapped,
    avgKm: averageKmLastDays(),
  });
  const blob = `${card.summary}${card.strength}${card.grow}${card.cheer}${card.paceLine}`;
  const safeCard = validateCardText(blob) ? card : card;
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
    teamName: teamName(),
    grade: currentStudent()?.grade || 4,
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
  const logs = scopedLogs();
  if (!rec.length || !logs.length) return 0;
  const byDate = new Map();
  for (const log of logs) {
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

function render() {
  if (view === "teacher") {
    renderTeacher();
    return;
  }
  if (view === "start") {
    renderStartSetup(false);
    return;
  }
  if (!state.session?.studentId) {
    view = "login";
    renderLogin();
    return;
  }
  if (!state.settings.startCityId && view !== "start") {
    renderStartSetup(true);
    return;
  }
  if (view === "record") renderRecord();
  else if (view === "stamps") renderStamps();
  else renderHome();
}

document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-go]");
  if (btn) go(btn.dataset.go);
});

window.addEventListener("beforeunload", () => {
  state.papsDraft = null;
});

render();
