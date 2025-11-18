#!/usr/bin/env node

/**
 * Generate Lighthouse baseline from current performance
 * Run this once to capture current performance metrics and use them as baseline
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Running Lighthouse to capture baseline performance...\n');

try {
  // Run Lighthouse once to get current scores
  const output = execSync(
    'lighthouse http://localhost:3000 --output json --output-path ./lighthouse-baseline.json --chrome-flags="--headless" --quiet',
    { encoding: 'utf-8', stdio: 'pipe' }
  );

  // Read the results
  const results = JSON.parse(fs.readFileSync('./lighthouse-baseline.json', 'utf-8'));
  
  const scores = {
    performance: Math.round(results.categories.performance.score * 100),
    accessibility: Math.round(results.categories.accessibility.score * 100),
    bestPractices: Math.round(results.categories['best-practices'].score * 100),
    seo: Math.round(results.categories.seo.score * 100),
  };

  const metrics = {
    fcp: Math.round(results.audits['first-contentful-paint'].numericValue),
    lcp: Math.round(results.audits['largest-contentful-paint'].numericValue),
    cls: results.audits['cumulative-layout-shift'].numericValue,
    tbt: Math.round(results.audits['total-blocking-time'].numericValue),
    si: Math.round(results.audits['speed-index'].numericValue),
  };

  console.log('📊 Current Performance Scores:');
  console.log(`  Performance: ${scores.performance}`);
  console.log(`  Accessibility: ${scores.accessibility}`);
  console.log(`  Best Practices: ${scores.bestPractices}`);
  console.log(`  SEO: ${scores.seo}\n`);

  console.log('📈 Current Metrics:');
  console.log(`  First Contentful Paint: ${metrics.fcp}ms`);
  console.log(`  Largest Contentful Paint: ${metrics.lcp}ms`);
  console.log(`  Cumulative Layout Shift: ${metrics.cls}`);
  console.log(`  Total Blocking Time: ${metrics.tbt}ms`);
  console.log(`  Speed Index: ${metrics.si}ms\n`);

  // Generate baseline config with 5% buffer (allow 5% degradation)
  const baseline = {
    performance: Math.max(0, scores.performance - 5),
    accessibility: Math.max(0, scores.accessibility - 5),
    bestPractices: Math.max(0, scores.bestPractices - 5),
    seo: Math.max(0, scores.seo - 5),
    fcp: Math.round(metrics.fcp * 1.1), // Allow 10% increase
    lcp: Math.round(metrics.lcp * 1.1),
    cls: Math.min(0.25, metrics.cls * 1.2), // Allow 20% increase, max 0.25
    tbt: Math.round(metrics.tbt * 1.2),
    si: Math.round(metrics.si * 1.1),
  };

  console.log('✅ Baseline thresholds (with buffer):');
  console.log(`  Performance: ≥ ${baseline.performance}`);
  console.log(`  Accessibility: ≥ ${baseline.accessibility}`);
  console.log(`  Best Practices: ≥ ${baseline.bestPractices}`);
  console.log(`  SEO: ≥ ${baseline.seo}`);
  console.log(`  FCP: ≤ ${baseline.fcp}ms`);
  console.log(`  LCP: ≤ ${baseline.lcp}ms`);
  console.log(`  CLS: ≤ ${baseline.cls}`);
  console.log(`  TBT: ≤ ${baseline.tbt}ms`);
  console.log(`  SI: ≤ ${baseline.si}ms\n`);

  // Update .lighthouserc.js
  const configPath = path.join(__dirname, '..', '.lighthouserc.js');
  let config = fs.readFileSync(configPath, 'utf-8');

  // Replace assertions section
  const newAssertions = `    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: ${baseline.performance / 100} }],
        'categories:accessibility': ['error', { minScore: ${baseline.accessibility / 100} }],
        'categories:best-practices': ['error', { minScore: ${baseline.bestPractices / 100} }],
        'categories:seo': ['error', { minScore: ${baseline.seo / 100} }],
        'first-contentful-paint': ['error', { maxNumericValue: ${baseline.fcp} }],
        'largest-contentful-paint': ['error', { maxNumericValue: ${baseline.lcp} }],
        'cumulative-layout-shift': ['error', { maxNumericValue: ${baseline.cls} }],
        'total-blocking-time': ['error', { maxNumericValue: ${baseline.tbt} }],
        'speed-index': ['error', { maxNumericValue: ${baseline.si} }],
      },
    },`;

  config = config.replace(/assert:\s*\{[\s\S]*?\},/m, newAssertions);
  fs.writeFileSync(configPath, config);

  console.log('✨ Updated .lighthouserc.js with baseline thresholds!\n');
  console.log('💡 Tip: Review the thresholds and adjust if needed.');

  // Clean up
  fs.unlinkSync('./lighthouse-baseline.json');
  
} catch (error) {
  console.error('❌ Error generating baseline:', error.message);
  console.error('\nMake sure:');
  console.error('  1. The Next.js server is running on http://localhost:3000');
  console.error('  2. Run: npm run build && npm run start');
  process.exit(1);
}

