/** 학년군 하루 목표(km). 개인 차등 없음 — 모둠/반 공통. */
export function dailyGoalKm(grade) {
  return grade <= 4 ? 3 : 4;
}

export const ACTIVITIES = [
  { id: "walk", name: "걷기", emoji: "🚶", type: "지구력", unit: "분", step: 5, min: 5, convert: (n) => n * 0.07, cap34: 60, cap56: 60 },
  { id: "fastwalk", name: "빠르게 걷기", emoji: "👟", type: "지구력", unit: "분", step: 5, min: 5, convert: (n) => n * 0.09, cap34: 50, cap56: 50 },
  { id: "run", name: "달리기", emoji: "🏃", type: "지구력", unit: "분", step: 5, min: 5, convert: (n) => n * 0.12, cap34: 30, cap56: 40 },
  { id: "rope", name: "줄넘기", emoji: "🪢", type: "순발력", unit: "분", step: 1, min: 1, convert: (n) => n * 0.1, cap34: 20, cap56: 25 },
  { id: "stretch", name: "스트레칭", emoji: "🧘", type: "유연성", unit: "분", step: 1, min: 1, convert: (n) => n * 0.04, cap34: 20, cap56: 20 },
  { id: "situp", name: "윗몸말아올리기", emoji: "💪", type: "근력", unit: "회", step: 10, min: 10, convert: (n) => (n / 10) * 0.04, cap34: 60, cap56: 100 },
  { id: "bar", name: "철봉 매달리기", emoji: "🏋️", type: "근력", unit: "초", step: 30, min: 30, convert: (n) => (n / 30) * 0.04, cap34: 300, cap56: 480 },
  { id: "squat", name: "스쿼트", emoji: "🦵", type: "근력", unit: "회", step: 10, min: 10, convert: (n) => (n / 10) * 0.04, cap34: 50, cap56: 80 },
  { id: "plank", name: "플랭크", emoji: "🪵", type: "근력", unit: "초", step: 30, min: 30, convert: (n) => (n / 30) * 0.03, cap34: 300, cap56: 480 },
  { id: "jump", name: "제자리 멀리뛰기", emoji: "🦘", type: "순발력", unit: "회", step: 10, min: 10, convert: (n) => (n / 10) * 0.03, cap34: 40, cap56: 60 },
  { id: "stairs", name: "계단 오르기", emoji: "🪜", type: "순발력", unit: "분", step: 1, min: 1, convert: (n) => n * 0.08, cap34: 20, cap56: 25 },
];

export function activityByName(name) {
  return ACTIVITIES.find((a) => a.name === name);
}

export function capFor(activity, grade) {
  return grade <= 4 ? activity.cap34 : activity.cap56;
}

/** 경위도 → 지도 SVG 좌표. 한반도 실형에 맞춘 단순 투영. */
export function proj(lon, lat) {
  return {
    x: Math.round((lon - 125.7) * 78 + 20),
    y: Math.round((38.65 - lat) * 78 + 22),
  };
}

const COAST = [
  [126.08, 37.78], [126.48, 37.86], [126.95, 37.92], [127.38, 38.10],
  [127.82, 38.28], [128.32, 38.40], [128.56, 38.50], [128.64, 38.22],
  [128.78, 37.88], [129.08, 37.52], [129.28, 37.08], [129.46, 36.58],
  [129.54, 36.08], [129.50, 35.68], [129.42, 35.42], [129.26, 35.18],
  [129.12, 35.04], [128.82, 34.94], [128.42, 34.86], [127.92, 34.70],
  [127.52, 34.60], [127.12, 34.52], [126.68, 34.38], [126.32, 34.26],
  [126.04, 34.36], [126.14, 34.68], [126.34, 35.04], [126.48, 35.44],
  [126.52, 35.88], [126.40, 36.24], [126.18, 36.54], [126.02, 36.76],
  [126.16, 36.96], [126.44, 37.14], [126.56, 37.38], [126.40, 37.52],
  [126.20, 37.64],
];

export const KOREA_LAND = `${COAST.map((p, i) => {
  const { x, y } = proj(p[0], p[1]);
  return `${i ? "L" : "M"} ${x} ${y}`;
}).join(" ")} Z`;

export const JEJU = { ...proj(126.53, 33.38), rx: 30, ry: 16 };

/**
 * 국토 코스. km는 게임 스케일(실거리 아님).
 * x,y는 실제 도시 위치에 가깝게 두었습니다.
 */
const CITY_META = [
  { id: "jeju", name: "제주", km: 0, lon: 126.53, lat: 33.38, color: "#FFB703", fact: "한라산과 감귤의 섬이에요.", food: "감귤", place: "한라산", stamp: "🍊", lx: 8, ly: 18 },
  { id: "busan", name: "부산", km: 40, lon: 129.08, lat: 35.18, color: "#4CC9F0", fact: "바다가 넓은 항구 도시예요.", food: "밀면", place: "해운대", stamp: "🌊", lx: 12, ly: 4 },
  { id: "gyeongju", name: "경주", km: 80, lon: 129.22, lat: 35.86, color: "#F4A261", fact: "신라 이야기가 남은 도시예요.", food: "황남빵", place: "불국사", stamp: "🏯", lx: 12, ly: -6 },
  { id: "ulsan", name: "울산", km: 110, lon: 129.31, lat: 35.54, color: "#90E0EF", fact: "고래가 유명한 도시예요.", food: "울산 배", place: "대왕암", stamp: "🐋", lx: 12, ly: 4 },
  { id: "daegu", name: "대구", km: 150, lon: 128.60, lat: 35.87, color: "#E76F51", fact: "따뜻한 내륙 도시예요.", food: "사과", place: "83타워", stamp: "🍎", lx: -22, ly: -6 },
  { id: "gwangju", name: "광주", km: 210, lon: 126.85, lat: 35.16, color: "#9B5DE5", fact: "맛과 예술의 빛고을이에요.", food: "떡갈비", place: "무등산", stamp: "🎨", lx: -22, ly: 4 },
  { id: "yeosu", name: "여수", km: 250, lon: 127.73, lat: 34.76, color: "#00BBF9", fact: "밤바다가 예쁜 항구예요.", food: "갓김치", place: "밤바다", stamp: "🌃", lx: 10, ly: 14 },
  { id: "jeonju", name: "전주", km: 300, lon: 127.15, lat: 35.82, color: "#2A9D8F", fact: "한옥마을이 있는 도시예요.", food: "비빔밥", place: "한옥마을", stamp: "🏘️", lx: -22, ly: -4 },
  { id: "daejeon", name: "대전", km: 350, lon: 127.38, lat: 36.35, color: "#577590", fact: "과학을 체험하는 도시예요.", food: "빵", place: "엑스포공원", stamp: "🔬", lx: -22, ly: 10 },
  { id: "sejong", name: "세종", km: 375, lon: 127.29, lat: 36.48, color: "#F94144", fact: "세종대왕 이름의 도시예요.", food: "복숭아", place: "호수공원", stamp: "📖", lx: -24, ly: -6 },
  { id: "cheongju", name: "청주", km: 410, lon: 127.49, lat: 36.64, color: "#43AA8B", fact: "오래된 활자가 나온 곳이에요.", food: "직지빵", place: "청남대", stamp: "🖨️", lx: 10, ly: -8 },
  { id: "chungju", name: "충주", km: 450, lon: 127.93, lat: 36.99, color: "#277DA1", fact: "호수가 예쁜 도시예요.", food: "사과", place: "충주호", stamp: "🏞️", lx: 10, ly: 12 },
  { id: "wonju", name: "원주", km: 495, lon: 127.95, lat: 37.34, color: "#F9844A", fact: "치악산이 있는 도시예요.", food: "한과", place: "치악산", stamp: "📜", lx: 10, ly: 12 },
  { id: "gangneung", name: "강릉", km: 545, lon: 128.88, lat: 37.75, color: "#4D908E", fact: "바다와 커피가 유명해요.", food: "순두부", place: "경포대", stamp: "☕", lx: 12, ly: 4 },
  { id: "sokcho", name: "속초", km: 585, lon: 128.59, lat: 38.20, color: "#577590", fact: "설악산과 바다가 만나요.", food: "오징어순대", place: "설악산", stamp: "⛰️", lx: 12, ly: -8 },
  { id: "chuncheon", name: "춘천", km: 640, lon: 127.73, lat: 37.88, color: "#F72585", fact: "호수와 닭갈비 도시예요.", food: "닭갈비", place: "남이섬", stamp: "🍗", lx: -8, ly: -12 },
  { id: "suwon", name: "수원", km: 700, lon: 127.00, lat: 37.26, color: "#B5179E", fact: "화성 성곽이 예뻐요.", food: "갈비", place: "수원화성", stamp: "🧱", lx: 12, ly: 12 },
  { id: "incheon", name: "인천", km: 735, lon: 126.70, lat: 37.46, color: "#4895EF", fact: "비행기가 오가는 항구예요.", food: "짜장면", place: "월미도", stamp: "✈️", lx: -22, ly: 4 },
  { id: "seoul", name: "서울", km: 770, lon: 126.98, lat: 37.57, color: "#4361EE", fact: "우리나라의 수도예요.", food: "떡볶이", place: "경복궁", stamp: "👑", lx: 10, ly: -10 },
  { id: "paju", name: "파주", km: 800, lon: 126.82, lat: 37.76, color: "#7209B7", fact: "책과 평화의 도시예요.", food: "장단콩", place: "출판도시", stamp: "📚", lx: -18, ly: -10 },
];

export const CITIES = CITY_META.map((c) => {
  const { x, y } = proj(c.lon, c.lat);
  return { ...c, x, y };
});

export const COURSE_LENGTH = CITIES[CITIES.length - 1].km;

/** 선생님이 고른 출발 도시부터 한 바퀴. */
export function getCourse(startId) {
  const startIndex = Math.max(0, CITIES.findIndex((c) => c.id === startId));
  const rotated = [...CITIES.slice(startIndex), ...CITIES.slice(0, startIndex)];
  let acc = 0;
  return rotated.map((city, i) => {
    if (i === 0) return { ...city, km: 0 };
    const prev = rotated[i - 1];
    const prevOrig = CITIES.find((c) => c.id === prev.id);
    const curOrig = CITIES.find((c) => c.id === city.id);
    let delta = curOrig.km - prevOrig.km;
    if (delta <= 0) delta = 40;
    acc += delta;
    return { ...city, km: acc };
  });
}

export function courseLength(startId) {
  const course = getCourse(startId);
  return course[course.length - 1].km;
}

export const FACTORS = ["심폐지구력", "유연성", "근력·근지구력", "순발력"];

export const FACTOR_ACTIVITIES = {
  심폐지구력: ["걷기", "빠르게 걷기", "달리기", "줄넘기"],
  유연성: ["스트레칭"],
  "근력·근지구력": ["윗몸말아올리기", "철봉 매달리기", "스쿼트", "플랭크"],
  순발력: ["제자리 멀리뛰기", "계단 오르기", "줄넘기"],
};

export const FACTOR_NICK = {
  심폐지구력: "오래 움직이는 힘",
  유연성: "몸을 부드럽게 하는 힘",
  "근력·근지구력": "튼튼한 힘",
  순발력: "빠르게 움직이는 힘",
};

export const BANNED_WORDS = [
  "살", "체중", "몸무게", "비만", "뚱뚱", "날씬", "다이어트", "식단", "칼로리", "BMI",
  "등급", "순위", "1등", "꼴찌", "부족", "미달", "못해", "못하", "뒤처",
];

export function seedStudents() {
  const a = ["민준", "서연", "하준", "지아", "도윤", "수아", "준서", "하윤"];
  const b = ["시우", "예린", "주원"];
  return [
    ...a.map((name, i) => ({
      id: `s-4-2-${i}`,
      grade: 4,
      classNo: 2,
      name,
      groupName: i < 4 ? "햇살" : "달님",
    })),
    ...b.map((name, i) => ({
      id: `s-4-1-${i}`,
      grade: 4,
      classNo: 1,
      name,
      groupName: "별",
    })),
  ];
}
