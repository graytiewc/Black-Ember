import "dotenv/config";
import express from "express";
import Stripe from "stripe";

const app = express();
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const shippingRateId = process.env.STRIPE_SINGAPORE_SHIPPING_RATE_ID || "shr_1TfuClHzqKH9HNrFEL0hpbVu";
const port = Number(process.env.PORT || 4242);

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

const allowedPriceIds = new Set([
  "price_1Tfu5yHzqKH9HNrFExicSFpv",
  "price_1Tfu6vHzqKH9HNrFJRanX9Kp",
  "price_1Tfu8GHzqKH9HNrFjGOB2fuv"
]);

const sitemapPaths = [
  "/",
  "/dark-roast.html",
  "/medium-roast.html",
  "/light-roast.html"
];

const getOrigin = (request) => `${request.protocol}://${request.get("host")}`;

app.get("/sitemap.xml", (request, response) => {
  const origin = getOrigin(request);
  const urls = sitemapPaths
    .map((path) => `  <url><loc>${origin}${path}</loc></url>`)
    .join("\n");

  response.type("application/xml").send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`);
});

app.get("/robots.txt", (request, response) => {
  response.type("text/plain").send(`User-agent: *
Allow: /
Disallow: /api/
Disallow: /create-checkout-session

Sitemap: ${getOrigin(request)}/sitemap.xml
`);
});

app.use(express.json());
app.use(express.static("."));

app.post("/create-checkout-session", async (request, response) => {
  if (!stripe) {
    response.status(500).json({ error: "Missing STRIPE_SECRET_KEY in .env." });
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

    const origin = getOrigin(request);
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

    response.json({ url: session.url });
  } catch (error) {
    response.status(400).json({ error: error.message || "Unable to create checkout session." });
  }
});

app.listen(port, () => {
  console.log(`Black Ember checkout server running at http://localhost:${port}`);
});
