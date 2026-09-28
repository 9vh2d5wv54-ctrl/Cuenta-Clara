import type { MetadataRoute } from "next";

// Makes Cuenta Clara installable on the home screen (iPhone: Share → Add to Home
// Screen; Android/desktop Chrome: Install app). Opens full screen, straight to the app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Cuenta Clara",
    short_name: "Cuenta Clara",
    description: "Tu dinero, claro. En español, en inglés, o en los dos. / Your money, made clear.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    background_color: "#f8f8f4",
    theme_color: "#0f6b5f",
    lang: "es",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
