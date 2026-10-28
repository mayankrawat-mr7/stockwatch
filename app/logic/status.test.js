import { getStatus } from "./status.js";

console.assert(getStatus(3, 5) === "low", "3 with threshold 5 should be low");
console.assert(getStatus(5, 5) === "low", "5 with threshold 5 should be low");
console.assert(getStatus(6, 5) === "ok", "6 with threshold 5 should be ok");
console.assert(getStatus(0, 5) === "sold_out", "0 should be sold_out");
console.assert(getStatus(null, 5) === "ed", "null should be ed");
console.log("status tests done");