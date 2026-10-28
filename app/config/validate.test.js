import { validateThreshold } from "./validate.js";

console.assert(validateThreshold(3) === 3, "3 should stay 3");
console.assert(validateThreshold("7") === 7, "'7' should become 7");
console.assert(validateThreshold("abc") === 5, "'abc' should fall back to 5");
console.assert(validateThreshold(0) === 5, "0 should fall back to 5");
console.assert(validateThreshold(5000) === 5, "5000 should fall back to 5");
console.log("threshold tests done");

import { validateMessage } from "./validate.js";

console.assert(validateMessage("Only {count} left!").message === "Only {count} left!", "valid message should pass");
console.assert(validateMessage("").message === "Only {count} left!", "empty should fall back");
console.assert(validateMessage("x".repeat(121)).message === "Only {count} left!", "too long should fall back");
console.assert(validateMessage("Hurry!").warning !== null, "missing {count} should warn");
console.log("message tests done");