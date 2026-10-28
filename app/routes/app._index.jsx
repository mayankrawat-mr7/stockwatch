// Form sends the button click to the action. useActionData holds the result.
import { Form, Link, useActionData, useLoaderData, useNavigation } from "react-router";
import { isAllowed } from "../utils/rateLimit.js";
// authenticate checks the request came from the store.
import { authenticate } from "../shopify.server";

// The database client, used to save history rows.
import db from "../db.server";

// The status rules, the threshold reader, and the history writer.
import { getStatus } from "../logic/status.js";
import { readThreshold } from "../config/readConfig.js";
import { recordIfChanged } from "../logic/history.js";

// Runs when the page opens. It loads one page of products to display.
export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  // The page number is passed as a "cursor" in the web address.
  const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor");

  const threshold = await readThreshold(admin);

  const res = await admin.graphql(
    `#graphql
    query Products($cursor: String) {
      products(first: 20, after: $cursor) {
        edges {
          node {
            id
            title
            totalInventory
            featuredMedia {
              preview { image { url altText } }
            }
            variants(first: 20) {
              nodes {
                inventoryItem { tracked }
              }
            }
          }
        }
        pageInfo { hasNextPage endCursor }
      }
    }`,
    { variables: { cursor } }
  );

  const { data } = await res.json();

  const products = data.products.edges.map(({ node }) => {
    // A product counts as tracked if any of its variants tracks stock.
    const tracked = node.variants.nodes.some((v) => v.inventoryItem.tracked);

    return {
      id: node.id,
      title: node.title,
      totalInventory: node.totalInventory,
      featuredMedia: node.featuredMedia,
      // Untracked products are never marked low or sold out.
      status: tracked ? getStatus(node.totalInventory, threshold) : "not tracked",
    };
  });

  return { products, threshold, pageInfo: data.products.pageInfo };
};

// Runs when "Bring all in line" is clicked. It checks every product in the store.
export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;
  // Bring all in line walks the whole catalogue, so allow only 2 runs per 5 minutes.
  if (!isAllowed(`reconcile:${shop}`, 2, 5 * 60_000)) {
    return { error: "This was run recently. Wait a few minutes and try again." };
  }
  // Use the current threshold for every product.
  const threshold = await readThreshold(admin);

  let cursor = null;
  let hasNext = true;
  let checked = 0;
  let written = 0;

  // Walk through the whole catalogue, 50 products at a time.
  // A bulk operation would be faster for very large stores.
  while (hasNext) {
    const res = await admin.graphql(
      `#graphql
      query Products($cursor: String) {
        products(first: 50, after: $cursor) {
          edges {
            node {
              id
              totalInventory
              variants(first: 20) {
                nodes { inventoryItem { tracked } }
              }
            }
          }
          pageInfo { hasNextPage endCursor }
        }
      }`,
      { variables: { cursor } }
    );

    const { data } = await res.json();

    for (const { node } of data.products.edges) {
      // Skip untracked products, the same as the dashboard does.
      const tracked = node.variants.nodes.some((v) => v.inventoryItem.tracked);
      if (!tracked) continue;

      checked++;

      // Save a row only if the status differs from the last saved row.
      const row = await recordIfChanged(db, {
        shop,
        productId: node.id,
        quantity: node.totalInventory,
        threshold,
        reason: "reconcile",
      });

      if (row) written++;
    }

    hasNext = data.products.pageInfo.hasNextPage;
    cursor = data.products.pageInfo.endCursor;
  }

  return { checked, written };
};

export default function Dashboard() {
  const { products, threshold, pageInfo } = useLoaderData();

  // The result from the last button click, if there was one.
  const result = useActionData();

  const navigation = useNavigation();
  const loading = navigation.state === "loading";
  const busy = navigation.state === "submitting";

  return (
    <div style={{ padding: "16px" }}>
      <h1>Stock dashboard</h1>
      <p>Low means 1 to {threshold} left.</p>

      {/* Sends a POST to this route, which runs the action above. */}
      <Form method="post">
        <button type="submit" disabled={busy}>
          {busy ? "Checking all products..." : "Bring all in line"}
        </button>
      </Form>

      {result?.error && <p style={{ color: "red" }}>{result.error}</p>}

      {result && !result.error && (
        <p>
          Checked {result.checked} tracked products. Recorded {result.written} status changes.
        </p>
      )}

      {loading && <p>Loading...</p>}

      {!loading && products.length === 0 && <p>No products found.</p>}

      {products.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>Image</th>
              <th style={{ textAlign: "left" }}>Title</th>
              <th style={{ textAlign: "left" }}>Stock</th>
              <th style={{ textAlign: "left" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>
                  {p.featuredMedia?.preview?.image?.url ? (
                    <img
                      src={p.featuredMedia.preview.image.url}
                      alt={p.featuredMedia.preview.image.altText || p.title}
                      width="48"
                    />
                  ) : (
                    "No image"
                  )}
                </td>
                <td>{p.title}</td>
                <td>{p.totalInventory}</td>
                <td>{p.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {pageInfo.hasNextPage && (
        <p>
          <Link to={`?cursor=${pageInfo.endCursor}`}>Next page</Link>
        </p>
      )}
    </div>
  );
}