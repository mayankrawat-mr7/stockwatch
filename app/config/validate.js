const DEFAULT_THRESHOLD = 5;

export function validateThreshold(value) {
  const n = Number(value);

  if (!Number.isInteger(n) || n < 1 || n > 1000) {
    return DEFAULT_THRESHOLD;
  }

  return n;
}

const DEFAULT_MESSAGE = "Only {count} left!";
const MAX_MESSAGE_LENGTH = 120;

export function validateMessage(value) {
  if (typeof value !== "string") {
    return { message: DEFAULT_MESSAGE, warning: "Message must be text" };
  }

  const trimmed = value.trim();

  if (trimmed.length === 0 || trimmed.length > MAX_MESSAGE_LENGTH) {
    return { message: DEFAULT_MESSAGE, warning: "Message must be 1 to 120 characters" };
  }

  if (!trimmed.includes("{count}")) {
    return { message: trimmed, warning: "Message has no {count} placeholder" };
  }

  return { message: trimmed, warning: null };
}