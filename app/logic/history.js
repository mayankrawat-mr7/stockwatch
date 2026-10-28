import { getStatus } from "./status.js";

// Find the newest history row for one product in one shop.
// "db" is the Prisma client, which talks to the database.
export async function latestRow(db, shop, productId) {
  return db.historyEvent.findFirst({
    where: { shop, productId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
}

// Work out the status and save a row only if it changed since the last row.
export async function recordIfChanged(db, { shop, productId, quantity, threshold, reason }) {
  const newStatus = getStatus(quantity, threshold);

  // No earlier row means "unknown". This is the first time we see the product.
  const last = await latestRow(db, shop, productId);
  const oldStatus = last ? last.toStatus : "unknown";

  // Same status as before, so nothing to save.
  if (oldStatus === newStatus) {
    return null;
  }

  // Status changed, so save the new row and return it.
  return db.historyEvent.create({
    data: {
      shop,
      productId,
      fromStatus: oldStatus,
      toStatus: newStatus,
      reason,
      totalInventory: quantity,
    },
  });
}