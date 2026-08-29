import { seedStudents } from "./data.js";

const KEY = "kukto-marathon-v2";

export function defaultState() {
  return {
    settings: {
      mode: "class",
      startCityId: null,
    },
    students: seedStudents(),
    session: { studentId: null },
    logs: [],
    seenArrivals: [],
    pendingArrivalId: null,
    profile: {
      source: "없음",
      activities: [],
      weak: [],
      strong: [],
      updatedAt: null,
      focusCare: false,
      card: null,
      cardCount: 0,
    },
    papsDraft: null,
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    const base = defaultState();
    return {
      ...base,
      ...parsed,
      settings: { ...base.settings, ...(parsed.settings || {}) },
      session: { ...base.session, ...(parsed.session || {}) },
      students: Array.isArray(parsed.students) && parsed.students.length ? parsed.students : base.students,
      profile: { ...base.profile, ...(parsed.profile || {}) },
    };
  } catch {
    return defaultState();
  }
}

export function saveState(state) {
  const copy = structuredClone(state);
  copy.papsDraft = null;
  localStorage.setItem(KEY, JSON.stringify(copy));
}

export function resetState() {
  localStorage.removeItem(KEY);
  return defaultState();
}

export function todayStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
