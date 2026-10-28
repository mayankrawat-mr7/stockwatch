export function getStatus(quantity, threshold) {
  if (typeof quantity !== "number" || Number.isNaN(quantity)) {
    return "not tracked";
  }
  if (quantity === 0) {
    return "sold out";
  }
  if (quantity >= 1 && quantity <= threshold) {
    return "low";
  }
  return "ok";
}