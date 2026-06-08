import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const shippingRateId = process.env.STRIPE_SINGAPORE_SHIPPING_RATE_ID || "shr_1TfuClHzqKH9HNrFEL0hpbVu";
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

const allowedPriceIds = new Set([
  "price_1Tfu5yHzqKH9HNrFExicSFpv",
  "price_1Tfu6vHzqKH9HNrFJRanX9Kp",
  "price_1Tfu8GHzqKH9HNrFjGOB2fuv"
]);

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed." });
    return;
  }

  if (!stripe) {
    response.status(500).json({ error: "Missing STRIPE_SECRET_KEY environment variable." });
    return;
  }

  try {
    const lineItems = Array.isArray(request.body?.lineItems) ? request.body.lineItems : [];

    const stripeLineItems = lineItems.map((item) => {
      const price = String(item.price || "");
      const quantity = Number(item.quantity || 0);

      if (!allowedPriceIds.has(price)) {
        throw new Error("Invalid Stripe price ID.");
      }

      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
        throw new Error("Invalid quantity.");
      }

      return { price, quantity };
    });

    if (stripeLineItems.length === 0) {
      response.status(400).json({ error: "Cart is empty." });
      return;
    }

    const origin = `https://${request.headers.host}`;
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: stripeLineItems,
      shipping_address_collection: {
        allowed_countries: ["SG"]
      },
      phone_number_collection: {
        enabled: true
      },
      shipping_options: [
        {
          shipping_rate: shippingRateId
        }
      ],
      success_url: `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/#products`
    });

    response.status(200).json({ url: session.url });
  } catch (error) {
    response.status(400).json({ error: error.message || "Unable to create checkout session." });
  }
}
