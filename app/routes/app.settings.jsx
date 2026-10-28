// Hooks that read the loader data, the action result, and handle the form.
import { Form, useActionData, useLoaderData, useNavigation } from "react-router";
import { useState } from "react";
import { isAllowed } from "../utils/rateLimit.js";

// authenticate checks the request came from the store.
import { authenticate } from "../shopify.server";

// The same checks we tested earlier.
import { validateThreshold, validateMessage } from "../config/validate.js";

// Runs when the page first opens. It reads the current settings from Shopify.
export const loader = async ({ request }) => {
    const { admin } = await authenticate.admin(request);

    // Ask Shopify for the stored config value.
    const response = await admin.graphql(`#graphql
    query {
      shop {
        metafield(namespace: "stockwatch", key: "config") { value }
      }
    }`);
    const { data } = await response.json();
    const raw = data?.shop?.metafield?.value;

    // Turn the stored JSON into an object. If it's missing or broken, use defaults.
    let config = {};
    try {
        config = raw ? JSON.parse(raw) : {};
    } catch {
        config = {};
    }

    // Send the current values to the form. Fall back to defaults for missing fields.
    return {
        threshold: validateThreshold(config.threshold),
        message: validateMessage(config.message).message,
    };
};

// Runs when Maya clicks Save.
export const action = async ({ request }) => {
    const { admin, session } = await authenticate.admin(request);

    // Allow 5 saves per minute per shop.
    if (!isAllowed(`save:${session.shop}`, 5, 60_000)) {
        return { error: "Too many saves. Wait a minute and try again." };
    }

    // Read the values the form sent.
    const form = await request.formData();

    // Validate each value. Bad values fall back to defaults.
    const threshold = validateThreshold(form.get("threshold"));
    const msg = validateMessage(form.get("message"));

    // The shop's ID is needed to know where to save the metafield.
    // The query must start on a new line after the #graphql tag.
    const shopRes = await admin.graphql(`#graphql
    query { shop { id } }`);
    const shopId = (await shopRes.json()).data.shop.id;

    // Build the config object. Its shape matches what the storefront expects.
    const config = {
        version: 1,
        threshold,
        message: msg.message,
        show_when_zero: false,
    };

    // Save it to the shop metafield. Variables keep the JSON text safe from quote errors.
    const saveRes = await admin.graphql(
        `#graphql
    mutation SaveConfig($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        userErrors { message }
      }
    }`,
        {
            variables: {
                metafields: [
                    {
                        ownerId: shopId,
                        namespace: "stockwatch",
                        key: "config",
                        type: "json",
                        value: JSON.stringify(config),
                    },
                ],
            },
        }
    );

    // If Shopify rejected the save, show its message.
    const { userErrors } = (await saveRes.json()).data.metafieldsSet;
    if (userErrors.length) {
        return { error: userErrors[0].message };
    }

    // Tell the page it saved, and pass along any warning about the message.
    return { saved: true, warning: msg.warning };
};

export default function SettingsPage() {
    const { threshold, message } = useLoaderData();
    const result = useActionData();

    // The navigation state tells us if the form is being saved right now.
    const navigation = useNavigation();
    const saving = navigation.state === "submitting";

    // Keep what Maya is typing, so the preview updates as she types.
    const [draftThreshold, setDraftThreshold] = useState(threshold);
    const [draftMessage, setDraftMessage] = useState(message);

    // Show the message the way a shopper would see it, with a sample count of 3.
    const preview = draftMessage.replace("{count}", "3");

    return (
        <div style={{ padding: "16px", maxWidth: "640px" }}>
            <h1>Stock badge settings</h1>

            <Form method="post">
                <label>
                    Low when stock is at or below
                    <input
                        type="number"
                        name="threshold"
                        min="1"
                        max="1000"
                        value={draftThreshold}
                        onChange={(e) => setDraftThreshold(e.target.value)}
                        style={{ display: "block", margin: "6px 0 16px" }}
                    />
                </label>

                <label>
                    Message shoppers see
                    <input
                        type="text"
                        name="message"
                        maxLength={120}
                        value={draftMessage}
                        onChange={(e) => setDraftMessage(e.target.value)}
                        style={{ display: "block", width: "100%", margin: "6px 0 8px" }}
                    />
                </label>

                {/* Live preview: shows the badge text with a sample stock of 3. */}
                <p>
                    <strong>Preview:</strong>{" "}
                    <span style={{ background: "#B5432A", color: "#fff", padding: "4px 10px", borderRadius: "12px" }}>
                        {preview}
                    </span>
                </p>

                <button type="submit" disabled={saving}>
                    {saving ? "Saving..." : "Save"}
                </button>
            </Form>

            {/* Show the result of the last save. */}
            {result?.saved && <p style={{ color: "green" }}>Saved.</p>}
            {result?.warning && <p style={{ color: "orange" }}>Warning: {result.warning}</p>}
            {result?.error && <p style={{ color: "red" }}>Error: {result.error}</p>}
        </div>
    );
}