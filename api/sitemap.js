const paths = [
  "/",
  "/dark-roast.html",
  "/medium-roast.html",
  "/light-roast.html"
];

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

  const origin = getOrigin(request);
  const urls = paths
    .map((path) => `  <url><loc>${origin}${path}</loc></url>`)
    .join("\n");

  response.setHeader("Content-Type", "application/xml; charset=utf-8");
  response.setHeader("Cache-Control", "public, max-age=0, s-maxage=86400");
  response.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`);
}
