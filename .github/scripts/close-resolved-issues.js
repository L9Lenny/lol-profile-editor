#!/usr/bin/env node

/**
 * Script to automatically close GitHub issues from commit messages and PR bodies
 * Usage: node close-resolved-issues.js
 * 
 * Environment variables:
 * - GITHUB_TOKEN: GitHub personal access token
 * - GITHUB_REPOSITORY: owner/repo format
 * - PR_NUMBER: Pull request number
 */

import https from 'https';
import process from 'process';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPOSITORY || 'L9Lenny/lol-profile-editor';
const PR_NUMBER = process.env.PR_NUMBER || process.argv[2];

const ISSUE_PATTERNS = [
  /(?:Fixes|Closes|Resolves|Fix|Close|Resolve):\s*#(\d+)/gi
];

/**
 * Make HTTP request
 */
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const defaultHeaders = {
      'User-Agent': 'GitHub-Auto-Close-Issues/1.0',
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
 * Extract issue numbers from text
 */
function extractIssueNumbers(text) {
  const issues = new Set();

  for (const pattern of ISSUE_PATTERNS) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      issues.add(parseInt(match[1]));
    }
  }

  return Array.from(issues).sort((a, b) => a - b);
}

/**
 * Get PR details and commits
 */
async function getPRDetails(prNumber) {
  const [owner, repo] = GITHUB_REPO.split('/');

  const pr = await makeRequest(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`);

  const commits = await makeRequest(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/commits`
  );

  return { pr, commits };
}

/**
 * Get issue details
 */
async function getIssueDetails(issueNumber) {
  const [owner, repo] = GITHUB_REPO.split('/');

  return await makeRequest(
    `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`
  );
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
    console.log('🚀 Starting auto-close resolved issues...\n');

    // Validate inputs
    if (!GITHUB_TOKEN) {
      throw new Error('GITHUB_TOKEN environment variable is required');
    }

    if (!PR_NUMBER) {
      throw new Error('PR_NUMBER environment variable or first argument is required');
    }

    console.log(`📦 Configuration:`);
    console.log(`   - GitHub Repository: ${GITHUB_REPO}`);
    console.log(`   - PR Number: ${PR_NUMBER}\n`);

    // Get PR details
    console.log(`📥 Fetching PR #${PR_NUMBER} details...`);
    const { pr, commits } = await getPRDetails(parseInt(PR_NUMBER));

    console.log(`   - PR Title: ${pr.title}`);
    console.log(`   - PR URL: ${pr.html_url}`);
    console.log(`   - Commits: ${commits.length}\n`);

    // Extract issue numbers from commit messages and PR body
    let allText = pr.body || '';
    for (const commit of commits) {
      allText += '\n' + commit.commit.message;
    }

    const issueNumbers = extractIssueNumbers(allText);

    if (issueNumbers.length === 0) {
      console.log('ℹ️  No issues found in commit messages or PR body');
      console.log('\nSupported patterns:');
      console.log('  - Fixes #123');
      console.log('  - Closes #123');
      console.log('  - Resolves #123');
      console.log('  - Fix #123');
      console.log('  - Close #123');
      console.log('  - Resolve #123');
      process.exit(0);
    }

    console.log(`🔍 Found ${issueNumbers.length} issue(s): ${issueNumbers.join(', ')}\n`);

    let closed = 0;
    let skipped = 0;
    let errors = 0;

    // Process each issue
    for (const issueNumber of issueNumbers) {
      try {
        console.log(`Processing issue #${issueNumber}...`);

        // Get issue details
        const issue = await getIssueDetails(issueNumber);

        // Check if already closed
        if (issue.state === 'closed') {
          console.log(`  ⏭️  Already closed`);
          skipped++;
          continue;
        }

        // Add comment
        const comment = `## ✅ Resolved by PR

This issue has been resolved by PR #${PR_NUMBER}: **${pr.title}**

[View PR →](${pr.html_url})

---
*This comment was automatically generated when the PR was merged.*`;

        await addCommentToIssue(issueNumber, comment);
        console.log(`  ✅ Comment added`);

        // Close issue
        await closeIssue(issueNumber);
        console.log(`  ✅ Issue closed\n`);
        closed++;
      } catch (error) {
        console.error(`  ❌ Error: ${error.message}\n`);
        errors++;
      }
    }

    console.log(`\n✨ Summary:`);
    console.log(`   - Closed: ${closed}`);
    console.log(`   - Skipped: ${skipped}`);
    console.log(`   - Errors: ${errors}`);
    console.log(`   - Total: ${issueNumbers.length}`);

    process.exit(errors > 0 ? 1 : 0);
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

main();
