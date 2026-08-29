const KEY = "kukto-marathon-v1";

const emptyTeam = () => ({
  mode: null, // "group" | "class"
  name: "",
  grade: 4,
  members: 5,
  createdAt: null,
});

export function defaultState() {
  return {
    team: emptyTeam(),
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
    return { ...defaultState(), ...JSON.parse(raw) };
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

export function addDays(dateStr, days) {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + days);
  return todayStr(d);
}
