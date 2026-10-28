// The last job for each key. New jobs wait behind it, so one item runs one job at a time.
const tails = new Map();

// Keys that already have a job waiting to start. Extra events for them are merged.
const waiting = new Set();

// Add a job for a key, and return straight away.
export function enqueueJob(key, job) {
  // A job is already waiting for this key. It will read the newest data when it runs,
  // so this event doesn't need its own job.
  if (waiting.has(key)) return;
  waiting.add(key);

  // Start after the previous job for this key finishes.
  const previous = tails.get(key) ?? Promise.resolve();

  const current = previous.then(async () => {
    // The job is starting now, so a new event can queue another run.
    waiting.delete(key);

    try {
      await job();
    } catch (err) {
      // A failed job logs the error. It doesn't stop the queue.
      console.error(`Job for ${key} failed:`, err);
    }
  });

  tails.set(key, current);

  // Clean up once this job is the last one for the key.
  current.finally(() => {
    if (tails.get(key) === current) tails.delete(key);
  });
}