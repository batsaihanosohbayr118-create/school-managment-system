/** @type {import('next').NextConfig} */
export default {
  reactStrictMode: false,
  // Lets a phone on the same Wi-Fi reach the dev server's HMR websocket via
  // the LAN IP — Next.js blocks cross-origin dev requests by default, which
  // otherwise hangs the client mid-hydration (stuck on "Checking session...")
  // for anyone not on localhost. Dev-only; unrelated to CORS on /api/mobile/*.
  allowedDevOrigins: ["192.168.10.197"]
};
