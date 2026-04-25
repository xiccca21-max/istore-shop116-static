import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  async rewrites() {
    return [
      // Serve the current static storefront as the homepage.
      { source: "/", destination: "/index.html" },
      // Service landing
      { source: "/iremont116", destination: "/iremont116/index.html" },
      { source: "/iremont116/", destination: "/iremont116/index.html" },
      // Simple landings (later we'll redesign)
      { source: "/installment", destination: "/installment/index.html" },
      { source: "/installment/", destination: "/installment/index.html" },
      { source: "/trade-in", destination: "/trade-in/index.html" },
      { source: "/trade-in/", destination: "/trade-in/index.html" },
      { source: "/gifts", destination: "/gifts/index.html" },
      { source: "/gifts/", destination: "/gifts/index.html" },
      { source: "/raffle", destination: "/raffle/index.html" },
      { source: "/raffle/", destination: "/raffle/index.html" },
      // Checkout / cart
      { source: "/checkout", destination: "/checkout/index.html" },
      { source: "/checkout/", destination: "/checkout/index.html" },
      { source: "/cart", destination: "/checkout/index.html" },
      { source: "/cart/", destination: "/checkout/index.html" },
      // Return catalog to the original static (941-like) layout.
      { source: "/catalog", destination: "/catalog/index.html" },
      { source: "/catalog/", destination: "/catalog/index.html" },
      // Use a single dynamic static template for all categories.
      { source: "/catalog/:slug", destination: "/catalog/_category.html" },
      { source: "/catalog/:slug/", destination: "/catalog/_category.html" },
    ];
  },
};

export default nextConfig;
