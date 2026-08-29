import { getCourse } from "./data.js";
import { mapPapsToActivities } from "./paps.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const a = mapPapsToActivities({ 심폐지구력: 2, 유연성: 4, "근력·근지구력": 3, 순발력: 2 }, false);
assert(a.source === "PAPS", "source");
assert(a.weak[0] === "유연성", "weak flexibility");
assert(a.activities[0] === "스트레칭", "stretch first");
assert(JSON.stringify(a.activities) === JSON.stringify(mapPapsToActivities({ 심폐지구력: 2, 유연성: 4, "근력·근지구력": 3, 순발력: 2 }, false).activities), "deterministic");

const b = mapPapsToActivities({ 심폐지구력: 5, 유연성: 4, "근력·근지구력": 2, 순발력: 1 }, true);
assert(b.weak[0] === "심폐지구력", "worse first");
assert(b.activities.includes("걷기") || b.activities.some((x) => ["걷기", "빠르게 걷기", "달리기", "줄넘기"].includes(x)), "cardio when focus");

const c = mapPapsToActivities({ 심폐지구력: 1, 유연성: 2, "근력·근지구력": 1, 순발력: 2 }, false);
assert(c.weak[0] === "유연성", "all strong -> flexibility");
assert(c.activities.includes("스트레칭"), "stretch when all strong");

const d = mapPapsToActivities({}, false);
assert(d.source === "없음", "empty");

const course = getCourse("seoul");
assert(course[0].id === "seoul", "start seoul");
assert(course[0].km === 0, "start km 0");
assert(course.some((c) => c.id === "busan" && c.km > 0), "busan after seoul");

console.log("paps mapping tests passed");
