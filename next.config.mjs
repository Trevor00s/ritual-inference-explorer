/** @type {import('next').NextConfig} */
// basePath is empty for local dev; the GitHub Pages build sets
// NEXT_PUBLIC_BASE_PATH=/ritual-inference-explorer (the project-page subpath).
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig = {
  output: "export", // static site (no server) — required for GitHub Pages
  basePath: basePath || undefined,
  assetPrefix: basePath || undefined,
  trailingSlash: true, // each route → folder/index.html (clean on GitHub Pages)
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  reactStrictMode: true,
};

export default nextConfig;
