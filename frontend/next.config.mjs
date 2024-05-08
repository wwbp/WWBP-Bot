/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true, // Enables strict mode for React (helps with debugging and potential problems in development)
  swcMinify: true, // Use SWC minification (improved performance over Terser)
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL, // Ensures that the API URL is available as an environment variable
  },
  // Optionally, to improve security, you can configure Content Security Policy or other headers
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "no-referrer-when-downgrade" },
          { key: "Content-Security-Policy", value: "default-src 'self';" },
        ],
      },
    ];
  },
};

export default nextConfig;
