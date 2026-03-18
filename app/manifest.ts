// app/manifest.ts — PWA manifest for "Add to Home Screen"
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "InvoSafi",
    short_name: "InvoSafi",
    description: "Invoice & Receipt Generator for Kenya",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1f8ea3",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
