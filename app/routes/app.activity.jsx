// useLoaderData gives the page the rows that the loader fetched on the server.
import { useLoaderData } from "react-router";

// authenticate checks that the page was opened by a logged-in shop owner.
import { authenticate } from "../shopify.server";

// db is the Prisma client, which reads and writes the database.
import db from "../db.server";

// The loader runs on the server before the page is shown.
export const loader = async ({ request }) => {
  // Confirm the request is from the store, and get the shop's domain.
  const { session } = await authenticate.admin(request);

  // Get the 20 newest history rows for this shop only.
  const rows = await db.historyEvent.findMany({
    where: { shop: session.shop },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  // Send the rows to the page component.
  return { rows };
};

// The page component. It only displays the rows it was given.
export default function ActivityPage() {
  const { rows } = useLoaderData();

  return (
    <div style={{ padding: "16px" }}>
      <h1>Activity</h1>

      {/* If there are no rows yet, show a message instead of an empty table. */}
      {rows.length === 0 ? (
        <p>No status changes yet. Change a product's stock to see them here.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>Product</th>
              <th style={{ textAlign: "left" }}>From</th>
              <th style={{ textAlign: "left" }}>To</th>
              <th style={{ textAlign: "left" }}>Stock</th>
              <th style={{ textAlign: "left" }}>When</th>
            </tr>
          </thead>
          <tbody>
            {/* One table row for each history row. */}
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.productId}</td>
                <td>{row.fromStatus}</td>
                <td>{row.toStatus}</td>
                <td>{row.totalInventory}</td>
                <td>{new Date(row.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}   