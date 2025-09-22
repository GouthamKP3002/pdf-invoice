// apps/web/next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable webpack 5 features
  webpack: (config, { isServer }) => {
    // Handle PDF.js worker
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    };
    
    if (!isServer) {
      config.externals = [...(config.externals || []), { canvas: 'canvas' }];
    }
    
    return config;
  },
  
  // API rewrites for development
  async rewrites() {
    return process.env.NODE_ENV === 'development' 
      ? [
          {
            source: '/api/:path*',
            destination: 'http://localhost:3001/:path*',
          },
        ]
      : [];
  },
  
  // Move serverComponentsExternalPackages to the correct location
experimental: {
  serverExternalPackages: ["pdf-parse", "some-other-package"],
},
  
  // Image optimization (if you're handling images)
  images: {
    domains: ['localhost', 'your-vercel-domain.vercel.app'],
  },
  
  // TypeScript and ESLint configuration
  typescript: {
    // Dangerously allow production builds to successfully complete even if your project has type errors
    // Set to false for stricter builds
    ignoreBuildErrors: false,
  },
  eslint: {
    // Disable ESLint during builds (you can enable this if you want strict linting)
    ignoreDuringBuilds: false,
  },
};

module.exports = nextConfig;