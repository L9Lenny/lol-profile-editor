#!/usr/bin/env node

/**
 * Script to create GitHub issues from SonarQube findings
 * Usage: node create-sonarqube-issues.js
 * 
 * Environment variables required:
 * - GITHUB_TOKEN: GitHub personal access token
 * - SONAR_TOKEN: SonarQube token (optional, if using private SonarQube instance)
 * - GITHUB_REPOSITORY: owner/repo format
 */

import https from 'https';
import http from 'http';
import process from 'process';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const SONAR_TOKEN = process.env.SONAR_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPOSITORY || 'lenny-ts/lol-profile-editor';
const SONAR_PROJECT_KEY = process.env.SONAR_PROJECT_KEY || 'L9Lenny_lol-profile-editor';
const SONAR_ORGANIZATION = process.env.SONAR_ORGANIZATION || 'l9lenny';
const SONAR_HOST = process.env.SONAR_HOST || 'https://sonarcloud.io';
const SONAR_BRANCH = process.env.SONAR_BRANCH || 'main';
const SONAR_SEVERITIES = process.env.SONAR_SEVERITIES || 'BLOCKER,CRITICAL,MAJOR';

const labels = {
  'BLOCKER': ['sonarqube', 'blocker', 'critical'],
  'CRITICAL': ['sonarqube', 'critical'],
  'MAJOR': ['sonarqube', 'major'],
  'MINOR': ['sonarqube', 'minor'],
  'INFO': ['sonarqube', 'info']
};

const issueTypeLabels = {
  'BUG': 'bug',
  'VULNERABILITY': 'security',
  'CODE_SMELL': 'code-smell'
};

/**
 * Make HTTP request
 */
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const defaultHeaders = {
      'User-Agent': 'GitHub-Actions-SonarQube-Issues/1.0',
      'Accept': 'application/json'
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

    const req = protocol.request(url, requestOptions, (res) => {
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
 * Fetch SonarQube issues
 */
async function fetchSonarQubeIssues() {
  const urlWithBranch = `${SONAR_HOST}/api/issues/search?componentKeys=${SONAR_PROJECT_KEY}&organization=${SONAR_ORGANIZATION}&branch=${SONAR_BRANCH}&issueSeverities=${SONAR_SEVERITIES}&types=BUG,VULNERABILITY,CODE_SMELL&statuses=OPEN&ps=500`;
  const urlWithoutBranch = `${SONAR_HOST}/api/issues/search?componentKeys=${SONAR_PROJECT_KEY}&organization=${SONAR_ORGANIZATION}&issueSeverities=${SONAR_SEVERITIES}&types=BUG,VULNERABILITY,CODE_SMELL&statuses=OPEN&ps=500`;

  console.log(`📊 Fetching issues from SonarQube (with branch): ${urlWithBranch}`);

  try {
    const response = await makeRequest(urlWithBranch);
    return response.issues || [];
  } catch (error) {
    if (error.message.includes('non main branches') || error.message.includes('403')) {
      console.warn(`⚠️  Branch query failed or restricted. Retrying without branch parameter...`);
      console.log(`📊 Fetching issues from SonarQube (without branch): ${urlWithoutBranch}`);
      try {
        const response = await makeRequest(urlWithoutBranch);
        return response.issues || [];
      } catch (retryError) {
        console.error('❌ Failed to fetch SonarQube issues without branch:', retryError.message);
        throw retryError;
      }
    }
    console.error('❌ Failed to fetch SonarQube issues:', error.message);
    throw error;
  }
}

/**
 * Create a GitHub label if it doesn't exist
 */
async function ensureLabel(name, color = 'f29513', description = '') {
  const url = `https://api.github.com/repos/${GITHUB_REPO}/labels`;

  // Try to create the label
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: {
      name,
      color,
      description
    }
  };

  try {
    const response = await makeRequest(url, options);
    return true;
  } catch (error) {
    // If label already exists (422), it's fine
    if (error.message.includes('422')) {
      return true;
    }
    console.warn(`⚠️  Warning: Failed to create label "${name}": ${error.message}`);
    return false;
  }
}

/**
 * Ensure all required labels exist
 */
async function ensureAllLabels() {
  console.log('🏷️  Ensuring GitHub labels exist...\n');

  const labelConfigs = [
    { name: 'sonarqube', color: '0052cc', description: 'Issues created from SonarQube analysis' },
    { name: 'blocker', color: 'd73a49', description: 'Blocker severity issue' },
    { name: 'critical', color: 'ff6b6b', description: 'Critical severity issue' },
    { name: 'major', color: 'ffc640', description: 'Major severity issue' },
    { name: 'minor', color: 'fbca04', description: 'Minor severity issue' },
    { name: 'info', color: '84b6eb', description: 'Info severity issue' },
    { name: 'bug', color: 'd73a49', description: 'Bug type issue' },
    { name: 'security', color: 'd73a49', description: 'Security vulnerability' },
    { name: 'code-smell', color: '1f6feb', description: 'Code smell issue' }
  ];

  for (const label of labelConfigs) {
    await ensureLabel(label.name, label.color, label.description);
  }

  console.log('✅ Labels ready!\n');
}

/**
 * Get existing GitHub issues with sonarqube label
 */
async function getExistingIssues() {
  const url = `https://api.github.com/repos/${GITHUB_REPO}/issues?state=open&labels=sonarqube&per_page=100`;

  try {
    const response = await makeRequest(url);
    return response || [];
  } catch (error) {
    console.error('❌ Failed to fetch GitHub issues:', error.message);
    throw error;
  }
}

/**
 * Create GitHub issue
 */
async function createGitHubIssue(title, body, issueLabels) {
  const url = `https://api.github.com/repos/${GITHUB_REPO}/issues`;

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: {
      title,
      body,
      labels: issueLabels
    }
  };

  try {
    const response = await makeRequest(url, options);
    return response;
  } catch (error) {
    console.error(`❌ Failed to create issue "${title}":`, error.message);
    throw error;
  }
}

/**
 * Check if issue already exists
 */
function issueExists(issues, sonarKey) {
  return issues.some(issue => 
    (issue.title && issue.title.includes(sonarKey)) || 
    (issue.body && issue.body.includes(sonarKey))
  );
}

/**
 * Format issue body
 */
function formatIssueBody(sonarIssue) {
  const lines = [
    '## SonarQube Analysis Finding\n',
    `**Severity:** \`${sonarIssue.severity}\``,
    `**Type:** \`${sonarIssue.type}\``,
    `**Component:** \`${sonarIssue.component}\``,
    sonarIssue.line ? `**Line:** ${sonarIssue.line}` : '',
    '',
    `**Issue:** ${sonarIssue.message}`,
    '',
    `[View in SonarCloud](${SONAR_HOST}/project/issues?id=${SONAR_PROJECT_KEY}&issues=${sonarIssue.key})`,
    '',
    '---',
    '*This issue was automatically created from SonarQube analysis.*',
    `<!-- sonarIssueKey: ${sonarIssue.key} -->`
  ];

  return lines.filter(Boolean).join('\n');
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('🚀 Starting SonarQube to GitHub Issues automation...\n');

    // Validate required environment variables
    if (!GITHUB_TOKEN) {
      throw new Error('GITHUB_TOKEN environment variable is required');
    }

    console.log(`📦 Configuration:`);
    console.log(`   - GitHub Repository: ${GITHUB_REPO}`);
    console.log(`   - SonarQube Project: ${SONAR_PROJECT_KEY}`);
    console.log(`   - SonarQube Host: ${SONAR_HOST}\n`);

    // Ensure all labels exist first
    await ensureAllLabels();

    // Fetch issues
    const sonarIssues = await fetchSonarQubeIssues();
    const existingIssues = await getExistingIssues();

    console.log(`📈 Found ${sonarIssues.length} issue(s) in SonarQube`);
    console.log(`📋 Found ${existingIssues.length} existing GitHub issue(s) with 'sonarqube' label\n`);

    let created = 0;
    let skipped = 0;

    // Process each SonarQube issue
    for (const sonarIssue of sonarIssues) {
      const sonarKey = sonarIssue.key;
      const exists = issueExists(existingIssues, sonarKey);

      if (exists) {
        console.log(`⏭️  Issue already exists: ${sonarKey}`);
        skipped++;
        continue;
      }

      const issueLabels = [
        'sonarqube',
        ...labels[sonarIssue.severity] || ['info'],
        issueTypeLabels[sonarIssue.type] || ''
      ].filter(Boolean);

      // Create a cleaner title without the raw code and severity brackets (severity is already in labels)
      const title = `SonarQube: ${sonarIssue.message.substring(0, 120)}`;
      const body = formatIssueBody(sonarIssue);

      try {
        const response = await createGitHubIssue(title, body, issueLabels);
        console.log(`✅ Created issue #${response.number}: ${sonarKey}`);
        created++;
      } catch (error) {
        console.error(`❌ Error creating issue: ${error.message}`);
      }
    }

    console.log(`\n✨ Summary:`);
    console.log(`   - Created: ${created}`);
    console.log(`   - Skipped: ${skipped}`);
    console.log(`   - Total: ${sonarIssues.length}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

main();
