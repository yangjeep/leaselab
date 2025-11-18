module.exports = {
  ci: {
    collect: {
      // Start the Next.js server before running Lighthouse
      startServerCommand: 'npm run start',
      startServerReadyPattern: 'Ready on',
      startServerReadyTimeout: 30000,
      // URLs to test
      url: [
        'http://localhost:3000',
        // Add property URLs dynamically if needed
        // You can update this with actual slugs from your Airtable data
      ],
      // Number of runs per URL
      numberOfRuns: 3,
    },
    assert: {
      // Performance thresholds - will be updated by npm run lighthouse:baseline
      // Run 'npm run lighthouse:baseline' to set thresholds based on current performance
      assertions: {
        'categories:performance': ['error', { minScore: 0.8 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],
        // Individual metrics
        'first-contentful-paint': ['error', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 300 }],
        'speed-index': ['error', { maxNumericValue: 3000 }],
      },
    },
    upload: {
      // Optional: Upload results to Lighthouse CI server
      // target: 'temporary-public-storage',
    },
    server: {
      // Optional: Run Lighthouse CI server
      // port: 9001,
      // storage: './lighthouse-data',
    },
  },
};

