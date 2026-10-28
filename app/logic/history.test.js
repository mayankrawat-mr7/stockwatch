import { recordIfChanged } from "./history.js";

const rows = [];
const base = { shop: "s1", productId: "p1", threshold: 5, reason: "webhook" };

console.assert(recordIfChanged(rows, { ...base, quantity: 10 }) !== null, "first record should write");
console.assert(recordIfChanged(rows, { ...base, quantity: 12 }) === null, "same status should not write");
console.assert(recordIfChanged(rows, { ...base, quantity: 3 }) !== null, "ok to low should write");
console.assert(recordIfChanged(rows, { ...base, quantity: 2 }) === null, "still low should not write");
console.assert(rows.length === 2, "should have exactly 2 rows");
console.log("history tests done");