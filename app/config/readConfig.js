// Import the threshold check we wrote earlier. It returns a safe number, or 5 if the input is bad.
import { validateThreshold } from "./validate.js";

// Reads Maya's config from the shop metafield and returns a clean threshold.
// "admin" is the Admin API client the webhook gives us, so we can call Shopify.
export async function readThreshold(admin) {
  // Ask Shopify for the value of the metafield stockwatch.config on this shop.
  // The metafield is stored as one JSON text string.
  const response = await admin.graphql(`#graphql
    query {
      shop {
        metafield(namespace: "stockwatch", key: "config") {
          value
        }
      }
    }`);

  // Turn the HTTP response into a JavaScript object.
  const { data } = await response.json();

  // Get the raw text. If the metafield doesn't exist, this is undefined.
  const raw = data?.shop?.metafield?.value;

  // The stored text is JSON, so turn it into an object.
  // If it's missing or broken, use an empty object so the defaults apply.
  let config = {};
  try {
    config = raw ? JSON.parse(raw) : {};
  } catch {
    config = {};
  }

  // Check the threshold. A missing or bad value becomes 5.
  return validateThreshold(config.threshold);
}