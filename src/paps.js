import {
  ACTIVITIES,
  BANNED_WORDS,
  FACTOR_ACTIVITIES,
  FACTOR_NICK,
  FACTORS,
  activityByName,
  capFor,
  dailyGoalKm,
} from "./data.js";

/**
 * 결정적 매핑. 동일 등급 조합 → 항상 동일 추천.
 * 원본 등급은 호출부에서 즉시 폐기한다.
 */
export function mapPapsToActivities(grades, focusCare) {
  const rows = FACTORS.map((name) => ({ name, grade: Number(grades[name]) }))
    .filter((r) => r.grade >= 1 && r.grade <= 5);

  if (!rows.length) return { activities: [], weak: [], strong: [], source: "없음" };

  let weak = rows
    .filter((r) => r.grade >= 4)
    .sort((a, b) => b.grade - a.grade || FACTORS.indexOf(a.name) - FACTORS.indexOf(b.name))
    .slice(0, 2);

  if (!weak.length) {
    const mid = rows.filter((r) => r.grade === 3);
    weak = mid.length ? [mid[0]] : [{ name: "유연성", grade: 3 }];
  }

  const strong = rows.filter((r) => r.grade <= 2).sort((a, b) => a.grade - b.grade);

  const picked = [];
  const pushFrom = (factorName) => {
    for (const act of FACTOR_ACTIVITIES[factorName] || []) {
      if (!picked.includes(act)) {
        picked.push(act);
        return;
      }
    }
  };

  for (const w of weak) pushFrom(w.name);
  if (focusCare) {
    const hasCardio = picked.some((a) => FACTOR_ACTIVITIES.심폐지구력.includes(a));
    if (!hasCardio) pushFrom("심폐지구력");
  }
  while (picked.length < 2) {
    for (const name of FACTORS) {
      pushFrom(name);
      if (picked.length >= 2) break;
    }
  }
  if (picked.length < 3) {
    for (const name of FACTORS) {
      pushFrom(name);
      if (picked.length >= 3) break;
    }
  }

  return {
    activities: picked.slice(0, 3),
    weak: weak.map((w) => w.name),
    strong: strong.map((s) => s.name),
    source: "PAPS",
  };
}

export function fallbackProfileFromLogs(logs) {
  const typeCount = { 지구력: 0, 근력: 0, 순발력: 0, 유연성: 0 };
  for (const log of logs) {
    const act = activityByName(log.name);
    if (act) typeCount[act.type] += 1;
  }
  const total = Object.values(typeCount).reduce((a, b) => a + b, 0);
  if (total < 4) return { activities: [], weak: [], strong: [], source: "없음" };

  const typeToFactor = {
    지구력: "심폐지구력",
    유연성: "유연성",
    근력: "근력·근지구력",
    순발력: "순발력",
  };
  const ranked = Object.entries(typeCount).sort((a, b) => a[1] - b[1]);
  const low = ranked.filter(([, n]) => n / total < 0.15).slice(0, 2);
  const targets = (low.length ? low : [ranked[0]]).map(([t]) => typeToFactor[t]);
  const high = ranked.filter(([, n]) => n > 0).at(-1)?.[0];

  const picked = [];
  for (const factor of targets) {
    for (const act of FACTOR_ACTIVITIES[factor]) {
      if (!picked.includes(act)) {
        picked.push(act);
        break;
      }
    }
  }
  while (picked.length < 2) {
    for (const act of ACTIVITIES) {
      if (!picked.includes(act.name)) picked.push(act.name);
      if (picked.length >= 2) break;
    }
  }

  return {
    activities: picked.slice(0, 3),
    weak: targets,
    strong: high ? [typeToFactor[high]] : [],
    source: "활동기록",
  };
}

function defaultAmount(activityName, grade) {
  const act = activityByName(activityName);
  if (!act) return "";
  const cap = capFor(act, grade);
  if (act.unit === "분") return `${Math.min(5, cap)}분`;
  if (act.unit === "회") return `${Math.min(20, cap)}회`;
  return `${Math.min(30, cap)}초`;
}

export function buildFitnessCard({ teamName, grade, profile, avgKm }) {
  const goal = dailyGoalKm(grade);
  const pace = avgKm > 0 ? Math.round(avgKm * 1.1 * 10) / 10 : goal;
  const rec = profile.activities || [];
  const strong = profile.strong[0];
  const weak = profile.weak[0];
  const first = rec[0];

  if (profile.source === "PAPS") {
    return {
      title: `${teamName}의 체력 카드`,
      summary: strong ? `${FACTOR_NICK[strong]}이 좋아요!` : "함께 잘 하고 있어요!",
      strength: strong ? `${FACTOR_NICK[strong]}을 참 잘해요` : "꾸준히 움직이는 힘",
      grow: weak ? `${FACTOR_NICK[weak]}을 키우면 더 좋아요` : "몸을 부드럽게 하는 힘을 키워요",
      recs: rec.map((name) => ({ name, amount: defaultAmount(name, grade) })),
      cheer: `우리 ${teamName} 하루 목표는 ${goal}km예요.`,
      paceLine: avgKm > 0
        ? `지난 2주 하루 평균 ${avgKm}km! 이번 주는 ${pace}km 어때요?`
        : `오늘은 ${first || "걷기"}부터 함께 해볼까요?`,
      source: "PAPS",
    };
  }

  if (profile.source === "활동기록") {
    return {
      title: `${teamName}의 체력 카드`,
      summary: "아직 안 해본 활동이 있어요",
      strength: strong ? `${FACTOR_NICK[strong]} 활동을 꾸준히 했어요` : "함께 잘 모였어요",
      grow: first ? `아직 안 해본 ${first}도 한번 해볼까요?` : "여러 가지 활동을 골고루 해봐요",
      recs: rec.map((name) => ({ name, amount: defaultAmount(name, grade) })),
      cheer: `우리 ${teamName} 하루 목표는 ${goal}km예요.`,
      paceLine: avgKm > 0
        ? `지난 2주 하루 평균 ${avgKm}km! 이번 주는 ${pace}km 어때요?`
        : "오늘은 새로운 활동에 도전해 볼까요?",
      source: "활동기록",
    };
  }

  return {
    title: `${teamName}의 체력 카드`,
    summary: "함께 달리기를 시작해요!",
    strength: "아직 추천 활동이 없어요",
    grow: "운동을 기록하면 모둠 활동을 골라 줄게요",
    recs: [],
    cheer: `우리 ${teamName} 하루 목표는 ${goal}km예요.`,
    paceLine: "프로필이 없어도 국토 여행은 바로 할 수 있어요.",
    source: "없음",
  };
}

export function validateCardText(text) {
  return !BANNED_WORDS.some((w) => text.includes(w));
}
