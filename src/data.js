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

/**
 * 국토 코스. 거리는 학기 중 모둠(4~6명)이 채워 갈 수 있게
 * 게임 스케일로 줄였습니다. 지리 실거리가 아닙니다.
 * 지역정보는 초등학생이 바로 읽을 한 줄 + 특산물/명소만.
 */
export const CITIES = [
  { id: "jeju", name: "제주", km: 0, x: 92, y: 372, color: "#FFB703", fact: "한라산과 바다가 함께 있는 섬이에요.", food: "감귤", place: "한라산", stamp: "🍊" },
  { id: "busan", name: "부산", km: 40, x: 198, y: 312, color: "#4CC9F0", fact: "우리나라에서 가장 큰 바다 도시예요.", food: "밀면", place: "해운대", stamp: "🌊" },
  { id: "gyeongju", name: "경주", km: 80, x: 208, y: 278, color: "#F4A261", fact: "신라 천년의 이야기가 남아 있어요.", food: "황남빵", place: "불국사", stamp: "🏯" },
  { id: "ulsan", name: "울산", km: 110, x: 228, y: 292, color: "#90E0EF", fact: "고래와 태화강이 유명한 도시예요.", food: "울산 배", place: "대왕암", stamp: "🐋" },
  { id: "daegu", name: "대구", km: 150, x: 172, y: 248, color: "#E76F51", fact: "따뜻한 내륙 도시예요.", food: "사과", place: "83타워", stamp: "🍎" },
  { id: "gwangju", name: "광주", km: 210, x: 88, y: 268, color: "#9B5DE5", fact: "예향이라 불리는 빛고을이에요.", food: "떡갈비", place: "무등산", stamp: "🎨" },
  { id: "yeosu", name: "여수", km: 250, x: 112, y: 302, color: "#00BBF9", fact: "밤바다가 반짝이는 남쪽 항구예요.", food: "갓김치", place: "여수 밤바다", stamp: "🌃" },
  { id: "jeonju", name: "전주", km: 300, x: 98, y: 228, color: "#2A9D8F", fact: "한옥마을에서 비빔밥을 먹어요.", food: "비빔밥", place: "한옥마을", stamp: "🏘️" },
  { id: "daejeon", name: "대전", km: 350, x: 128, y: 198, color: "#577590", fact: "과학을 체험할 수 있는 도시예요.", food: "성심당 빵", place: "엑스포과학공원", stamp: "🔬" },
  { id: "sejong", name: "세종", km: 375, x: 118, y: 178, color: "#F94144", fact: "세종대왕의 이름을 딴 도시예요.", food: "복숭아", place: "세종호수공원", stamp: "📖" },
  { id: "cheongju", name: "청주", km: 410, x: 142, y: 168, color: "#43AA8B", fact: "세계에서 가장 오래된 금속활자가 나온 곳이에요.", food: "직지빵", place: "청남대", stamp: "🖨️" },
  { id: "chungju", name: "충주", km: 450, x: 158, y: 148, color: "#277DA1", fact: "호수가 아름다운 내륙 도시예요.", food: "사과", place: "충주호", stamp: "🏞️" },
  { id: "wonju", name: "원주", km: 495, x: 178, y: 132, color: "#F9844A", fact: "치악산과 한지가 유명해요.", food: "한과", place: "치악산", stamp: "📜" },
  { id: "gangneung", name: "강릉", km: 545, x: 228, y: 128, color: "#4D908E", fact: "경포대 바다와 커피가 유명해요.", food: "초당순두부", place: "경포대", stamp: "☕" },
  { id: "sokcho", name: "속초", km: 585, x: 232, y: 92, color: "#577590", fact: "설악산과 동해바다가 만나요.", food: "오징어순대", place: "설악산", stamp: "⛰️" },
  { id: "chuncheon", name: "춘천", km: 640, x: 178, y: 98, color: "#F72585", fact: "호수와 닭갈비의 도시예요.", food: "닭갈비", place: "남이섬", stamp: "🍗" },
  { id: "suwon", name: "수원", km: 700, x: 132, y: 128, color: "#B5179E", fact: "아름다운 화성 성곽이 있어요.", food: "갈비", place: "수원화성", stamp: "🧱" },
  { id: "incheon", name: "인천", km: 735, x: 98, y: 112, color: "#4895EF", fact: "비행기가 오가는 큰 항구 도시예요.", food: "짜장면", place: "월미도", stamp: "✈️" },
  { id: "seoul", name: "서울", km: 770, x: 138, y: 102, color: "#4361EE", fact: "우리나라의 수도예요.", food: "떡볶이", place: "경복궁", stamp: "👑" },
  { id: "paju", name: "파주", km: 800, x: 122, y: 78, color: "#7209B7", fact: "책과 평화의 도시로 여행을 마쳐요.", food: "장단콩", place: "출판도시", stamp: "📚" },
];

export const COURSE_LENGTH = CITIES[CITIES.length - 1].km;

export const KOREA_LAND =
  "M142 36 C168 32 198 58 208 92 C218 128 232 168 226 208 C222 248 214 286 198 318 C184 346 152 352 128 338 C96 318 72 286 68 246 C62 206 74 168 92 138 C84 108 96 72 118 48 C128 38 136 36 142 36 Z";

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
