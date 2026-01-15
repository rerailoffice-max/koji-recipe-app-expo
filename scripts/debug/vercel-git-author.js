// #region agent log
const { execSync } = require('node:child_process');

function safeExec(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8' }).trim();
  } catch (error) {
    return `ERROR: ${error.message}`;
  }
}

function log(payload) {
  fetch('http://127.0.0.1:7246/ingest/e2971e0f-c017-418c-8c61-59d0d72fe3aa', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: 'debug-session',
      runId: 'author-check',
      timestamp: Date.now(),
      ...payload,
    }),
  }).catch(() => {});
}

const gitConfigName = safeExec('git config user.name');
const gitConfigEmail = safeExec('git config user.email');
const lastCommit = safeExec('git show -s --format=%H');
const lastAuthorName = safeExec('git show -s --format=%an');
const lastAuthorEmail = safeExec('git show -s --format=%ae');
const lastCommitterName = safeExec('git show -s --format=%cn');
const lastCommitterEmail = safeExec('git show -s --format=%ce');
const remotes = safeExec('git remote -v');

log({
  hypothesisId: 'H1',
  location: 'scripts/debug/vercel-git-author.js:29',
  message: 'Local git config author',
  data: { gitConfigName, gitConfigEmail },
});

log({
  hypothesisId: 'H2',
  location: 'scripts/debug/vercel-git-author.js:36',
  message: 'Last commit author/committer',
  data: {
    lastCommit,
    lastAuthorName,
    lastAuthorEmail,
    lastCommitterName,
    lastCommitterEmail,
  },
});

log({
  hypothesisId: 'H3',
  location: 'scripts/debug/vercel-git-author.js:49',
  message: 'Git remotes',
  data: { remotes },
});
// #endregion agent log
