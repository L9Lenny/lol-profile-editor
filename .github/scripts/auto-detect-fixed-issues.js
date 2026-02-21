#!/usr/bin/env node

/**
 * Script to automatically detect and close GitHub issues that were fixed by comparing
 * SonarQube analysis results before and after the PR
 * 
 * Usage: node auto-detect-fixed-issues.js
 * 
 * Environment variables:
 * - GITHUB_TOKEN: GitHub personal access token
 * - SONAR_TOKEN: SonarQube token
 * - GITHUB_REPOSITORY: owner/repo format
 */

import https from 'https';
import process from 'process';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const SONAR_TOKEN = process.env.SONAR_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPOSITORY || 'L9Lenny/lol-profile-editor';
const SONAR_PROJECT_KEY = process.env.SONAR_PROJECT_KEY || 'L9Lenny_lol-profile-editor';
const SONAR_ORGANIZATION = process.env.SONAR_ORGANIZATION || 'l9lenny';

// PR information (optional, from GitHub Actions)
const PR_NUMBER = process.env.PR_NUMBER || null;
const PR_URL = process.env.PR_URL || null;
const PR_TITLE = process.env.PR_TITLE || null;

/**
 * Make HTTP request
 */
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const defaultHeaders = {
      'User-Agent': 'GitHub-Auto-Detect-Fixed/1.0',
      'Accept': 'application/vnd.github+json'
    };

    let hostname = '';
    try {
      const parsedUrl = new URL(url);
      hostname = parsedUrl.hostname;
    } catch {
      hostname = '';
    }

    if (GITHUB_TOKEN && (hostname === 'github.com' || hostname.endsWith('.github.com'))) {
      defaultHeaders['Authorization'] = `Bearer ${GITHUB_TOKEN}`;
    } else if (SONAR_TOKEN && (hostname === 'sonarcloud.io' || hostname.endsWith('.sonarcloud.io'))) {
      defaultHeaders['Authorization'] = `Bearer ${SONAR_TOKEN}`;
    }

    const requestOptions = {
      ...options,
      headers: { ...defaultHeaders, ...options.headers }
    };

    const req = https.request(url, requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        } else {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(data);
          }
        }
      });
    });

    req.on('error', reject);
    if (options.body) req.write(JSON.stringify(options.body));
    req.end();
  });
}

/**
 * Get open SonarQube issues
 */
async function getSonarQubeIssues() {
  const url = `https://sonarcloud.io/api/issues/search?componentKeys=${SONAR_PROJECT_KEY}&organization=${SONAR_ORGANIZATION}&statuses=OPEN&ps=500`;

  console.log(`📊 Fetching SonarQube issues...`);
  const response = await makeRequest(url);

  return response.issues || [];
}

/**
 * Get open GitHub issues with sonarqube label
 */
async function getGitHubIssues() {
  const [owner, repo] = GITHUB_REPO.split('/');
  const url = `https://api.github.com/repos/${owner}/${repo}/issues?state=open&labels=sonarqube&per_page=100`;

  console.log(`📋 Fetching GitHub issues...`);
  const response = await makeRequest(url);

  return response || [];
}

/**
 * Extract SonarQube key from GitHub issue title
 * Pattern: "[SEVERITY] message (SONARKEY)"
 */
function extractSonarKey(title) {
  // Matches any sequence inside the last pair of parentheses
  const match = title.match(/\(([^()]+)\)$/);
  return match ? match[1] : null;
}

/**
 * Add comment to issue
 */
async function addCommentToIssue(issueNumber, comment) {
  const [owner, repo] = GITHUB_REPO.split('/');

  return await makeRequest(
    `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { body: comment }
    }
  );
}

/**
 * Close issue
 */
async function closeIssue(issueNumber) {
  const [owner, repo] = GITHUB_REPO.split('/');

  return await makeRequest(
    `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: { state: 'closed' }
    }
  );
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('🚀 Starting auto-detect fixed issues...\n');

    // Validate inputs
    if (!GITHUB_TOKEN) {
      throw new Error('GITHUB_TOKEN environment variable is required');
    }

    if (!SONAR_TOKEN) {
      throw new Error('SONAR_TOKEN environment variable is required');
    }

    console.log(`📦 Configuration:`);
    console.log(`   - GitHub Repository: ${GITHUB_REPO}`);
    console.log(`   - SonarQube Project: ${SONAR_PROJECT_KEY}\n`);

    // Fetch current data
    console.log(`📥 Fetching current state...\n`);
    const sonarIssues = await getSonarQubeIssues();
    const githubIssues = await getGitHubIssues();

    console.log(`\n📊 Analysis:`);
    console.log(`   - SonarQube issues: ${sonarIssues.length}`);
    console.log(`   - GitHub issues: ${githubIssues.length}\n`);

    // Create maps for comparison
    const sonarKeys = new Set(sonarIssues.map(i => i.key));

    console.log(`🔍 Comparing issues...\n`);

    let closed = 0;
    let skipped = 0;

    // Check each GitHub issue
    for (const githubIssue of githubIssues) {
      const sonarKey = extractSonarKey(githubIssue.title);

      if (!sonarKey) {
        console.log(`⏭️  Issue #${githubIssue.number}: Could not extract SonarQube key`);
        skipped++;
        continue;
      }

      // Check if this issue still exists in SonarQube
      if (sonarKeys.has(sonarKey)) {
        console.log(`⏭️  Issue #${githubIssue.number} (${sonarKey}): Still open in SonarQube`);
        skipped++;
        continue;
      }

      // Issue is no longer in SonarQube - it's fixed!
      console.log(`✅ Issue #${githubIssue.number} (${sonarKey}): Fixed! Closing...`);

      try {
        // Add comment
        let commentBody = `## ✅ Automatically Resolved

This issue has been automatically detected as resolved!

**SonarQube Key**: \`${sonarKey}\``;

        // Add PR information if available
        if (PR_NUMBER) {
          commentBody += `

**Fixed By**: PR #${PR_NUMBER}`;
          if (PR_TITLE) {
            commentBody += ` (${PR_TITLE})`;
          }
          if (PR_URL) {
            commentBody += ` - [View PR](${PR_URL})`;
          }
        }

        commentBody += `

The SonarQube analysis no longer shows this issue in the codebase, indicating it has been fixed.

---
*This detection was automated by comparing SonarQube analysis results.*`;

        await addCommentToIssue(githubIssue.number, commentBody);
        console.log(`   ✅ Comment added`);

        // Close the issue
        await closeIssue(githubIssue.number);
        console.log(`   ✅ Issue closed\n`);
        closed++;
      } catch (error) {
        console.error(`   ❌ Error: ${error.message}\n`);
      }
    }

    console.log(`\n✨ Summary:`);
    console.log(`   - Closed: ${closed}`);
    console.log(`   - Skipped: ${skipped}`);
    console.log(`   - Total GitHub issues: ${githubIssues.length}`);

    if (closed > 0) {
      console.log(`\n🎉 Successfully closed ${closed} issue(s)!`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

main();
