const getOrigin = (request) => {
  const forwardedProtocol = request.headers["x-forwarded-proto"];
  const protocol = String(forwardedProtocol || "https").split(",")[0].trim();
  const host = String(request.headers.host || "").replace(/[^a-zA-Z0-9.:-]/g, "");
  return `${protocol}://${host}`;
};

export default function handler(request, response) {
  if (request.method !== "GET") {
    response.status(405).send("Method not allowed.");
    return;
  }

  response.setHeader("Content-Type", "text/plain; charset=utf-8");
  response.setHeader("Cache-Control", "public, max-age=0, s-maxage=86400");
  response.status(200).send(`User-agent: *
Allow: /
Disallow: /api/
Disallow: /create-checkout-session

Sitemap: ${getOrigin(request)}/sitemap.xml
`);
}
