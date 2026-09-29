import type { MetadataRoute } from "next";

// Makes Cuenta Clara installable on the home screen (iPhone: Share → Add to Home
// Screen; Android/desktop Chrome: Install app). Opens full screen, straight to the app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Cuenta Clara",
    short_name: "Cuenta Clara",
    description: "Your AI money coach: know what's safe to spend, plan side-hustle and self-employed pay, and reach your goals. In English or Spanish.",
    categories: ["finance", "business", "productivity", "education"],
    start_url: "/app",
    scope: "/",
    display: "standalone",
    background_color: "#07152f",
    theme_color: "#07152f",
    lang: "en",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
