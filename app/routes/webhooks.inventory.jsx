import { authenticate } from "../shopify.server";
import { getStatus } from "../logic/status.js";
import { recordIfChanged } from "../logic/history.js";
import { readThreshold } from "../config/readConfig.js";
import db from "../db.server";
import { enqueueJob } from "../utils/productQueue.js";

// The newest stock value seen for each inventory item.
// When several events arrive together, the job uses the latest one.
const latestAvailable = new Map();

export const action = async ({ request }) => {
  const { shop, payload, admin } = await authenticate.webhook(request);
  const itemId = payload.inventory_item_id;

  // Remember the newest value, then queue the work. Don't wait for it.
  latestAvailable.set(itemId, payload.available);

  enqueueJob(String(itemId), async () => {
    // Read the newest value at the time the job runs.
    const eventQuantity = latestAvailable.get(itemId);
    latestAvailable.delete(itemId);

    // Find the product this inventory item belongs to.
    const response = await admin.graphql(
      `#graphql
      query ($id: ID!) {
        inventoryItem(id: $id) {
          variant {
            product { id title totalInventory }
          }
        }
      }`,
      { variables: { id: `gid://shopify/InventoryItem/${itemId}` } }
    );

    const { data } = await response.json();
    const product = data?.inventoryItem?.variant?.product;
    if (!product) return;

    // Use the event's value if we have one, otherwise the product total.
    const quantity = eventQuantity ?? product.totalInventory;
    const threshold = await readThreshold(admin);

    const row = await recordIfChanged(db, {
      shop,
      productId: product.id,
      quantity,
      threshold,
      reason: "webhook",
    });

    console.log(
      `${product.title}: stock ${quantity}, status ${getStatus(quantity, threshold)}`,
      row ? "-> history row written" : "-> no change"
    );
  });

  // Reply straight away, so Shopify doesn't retry.
  return new Response(null, { status: 200 });
};