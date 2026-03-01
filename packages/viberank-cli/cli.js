#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import ora from 'ora';
import prompts from 'prompts';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
const CLI_VERSION = packageJson.version;

const API_URL = process.env.CC_CAMP_API_URL || 'https://cc-camp-league.vercel.app';
const CONFIG_DIR = path.join(os.homedir(), '.cc-camp');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const SYNC_SCRIPT = path.join(CONFIG_DIR, 'sync.sh');
const SYNC_LOG = path.join(CONFIG_DIR, 'sync.log');
const CRON_TAG = '# cc-camp-auto-sync';

// --- Config helpers ---

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  } catch {
    return null;
  }
}

function writeConfig(config) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

// --- Find node binary path ---

function getNodePath() {
  try {
    return execSync('which node', { encoding: 'utf8' }).trim();
  } catch {
    return '/usr/local/bin/node';
  }
}

function getNpxPath() {
  try {
    return execSync('which npx', { encoding: 'utf8' }).trim();
  } catch {
    return '/usr/local/bin/npx';
  }
}

// --- Sync script ---

function createSyncScript(username) {
  const nodePath = getNodePath();
  const npxPath = getNpxPath();
  const nodeDir = path.dirname(nodePath);

  const script = `#!/bin/bash
# AI Native Camp League — Auto Sync
export PATH="${nodeDir}:/usr/local/bin:/opt/homebrew/bin:$PATH"

USERNAME="${username}"
API="${API_URL}"
TMP_FILE="/tmp/cc-camp-usage.json"
LOG="${SYNC_LOG}"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Sync started" >> "$LOG"

# Generate usage data
"${npxPath}" --yes ccusage@latest --json > "$TMP_FILE" 2>/dev/null

if [ ! -f "$TMP_FILE" ] || [ ! -s "$TMP_FILE" ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] No usage data found" >> "$LOG"
  exit 0
fi

# Submit to leaderboard (python3 for UTF-8 support)
HTTP_CODE=$(python3 -c "
import json, urllib.request
data = json.load(open('$TMP_FILE'))
# Strip modelBreakdowns to reduce payload size
if 'daily' in data:
    for day in data['daily']:
        day.pop('modelBreakdowns', None)
data['_username'] = '$USERNAME'
req = urllib.request.Request('$API/api/submit',
    data=json.dumps(data).encode('utf-8'),
    headers={'Content-Type': 'application/json'})
try:
    resp = urllib.request.urlopen(req)
    print(resp.status)
except urllib.error.HTTPError as e:
    print(e.code)
" 2>/dev/null)

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Sync done (HTTP $HTTP_CODE)" >> "$LOG"

# Keep log small
tail -100 "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"
`;

  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(SYNC_SCRIPT, script, { mode: 0o755 });
}

// --- Cron helpers ---

function getCurrentCrontab() {
  try {
    return execSync('crontab -l 2>/dev/null', { encoding: 'utf8' });
  } catch {
    return '';
  }
}

function installCron() {
  const current = getCurrentCrontab();

  // Remove old entry if exists
  const lines = current.split('\n').filter(l => !l.includes(CRON_TAG) && !l.includes('cc-camp'));

  // Add new entry — every minute
  lines.push(`* * * * * ${SYNC_SCRIPT} ${CRON_TAG}`);

  const newCrontab = lines.filter(l => l.trim()).join('\n') + '\n';
  execSync(`echo "${newCrontab}" | crontab -`, { encoding: 'utf8' });
}

function removeCron() {
  const current = getCurrentCrontab();
  const lines = current.split('\n').filter(l => !l.includes(CRON_TAG) && !l.includes('cc-camp'));
  const newCrontab = lines.filter(l => l.trim()).join('\n') + '\n';

  if (lines.filter(l => l.trim()).length === 0) {
    try { execSync('crontab -r 2>/dev/null'); } catch {}
  } else {
    execSync(`echo "${newCrontab}" | crontab -`, { encoding: 'utf8' });
  }
}

function isCronInstalled() {
  const current = getCurrentCrontab();
  return current.includes(CRON_TAG);
}

// --- Sync (one-shot) ---

async function runSync(username, silent = false) {
  const spinner = silent ? null : ora('사용 데이터 수집 중...').start();

  try {
    execSync('npx --yes ccusage@latest --json > /tmp/cc-camp-usage.json', {
      encoding: 'utf8',
      stdio: 'pipe',
      timeout: 60000,
    });
  } catch {
    spinner?.fail('사용 데이터를 가져올 수 없습니다. Claude Code를 먼저 사용해주세요.');
    return false;
  }

  const tmpFile = '/tmp/cc-camp-usage.json';
  if (!fs.existsSync(tmpFile) || fs.statSync(tmpFile).size === 0) {
    spinner?.fail('사용 데이터가 없습니다.');
    return false;
  }

  spinner?.start('리더보드에 제출 중...');

  try {
    const ccData = JSON.parse(fs.readFileSync(tmpFile, 'utf8'));

    // Strip modelBreakdowns to reduce payload size (prevents timeout)
    if (ccData.daily) {
      ccData.daily = ccData.daily.map(day => {
        const { modelBreakdowns, ...rest } = day;
        return rest;
      });
    }

    ccData._username = username;
    const res = await fetch(`${API_URL}/api/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CLI-Version': `cli-${CLI_VERSION}`,
      },
      body: JSON.stringify(ccData),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      spinner?.fail(err.error || `제출 실패 (${res.status})`);
      return false;
    }

    const result = await res.json();
    spinner?.succeed('동기화 완료!');

    if (!silent) {
      console.log(`\n  💰 총 비용: ${chalk.green('$' + Math.round(ccData.totals.totalCost))}`);
      console.log(`  📊 총 토큰: ${chalk.green(ccData.totals.totalTokens.toLocaleString())}`);
      console.log(`  📅 추적 일수: ${chalk.green(ccData.daily.length)}`);
      console.log(`\n  🔗 ${chalk.cyan(`${API_URL}${result.profileUrl}`)}\n`);
    }

    return true;
  } catch (err) {
    spinner?.fail(`동기화 실패: ${err.message}`);
    return false;
  }
}

// --- Commands ---

async function setup() {
  console.log(chalk.cyan.bold(`\n🏕️  AI Native Camp League — 자동 동기화 설정\n`));

  // Detect GitHub username
  let githubUser;
  try {
    const remoteUrl = execSync('git config --get remote.origin.url', { encoding: 'utf8' }).trim();
    const match = remoteUrl.match(/github\.com[:/]([^/]+)\//);
    if (match) githubUser = match[1];
  } catch {}

  if (!githubUser) {
    try {
      githubUser = execSync('git config user.name', { encoding: 'utf8' }).trim();
    } catch {}
  }

  const { username } = await prompts({
    type: 'text',
    name: 'username',
    message: '이름:',
    initial: githubUser || '',
    validate: v => v.length > 0 || '필수 입력입니다',
  });

  if (!username) {
    console.log(chalk.red('취소되었습니다.'));
    process.exit(1);
  }

  // Save config
  writeConfig({ username, apiUrl: API_URL, installedAt: new Date().toISOString() });

  // Create sync script
  const spinner = ora('자동 동기화 설정 중...').start();
  createSyncScript(username);
  installCron();
  spinner.succeed('자동 동기화 설정 완료 (1분 간격)');

  // Run first sync
  console.log('');
  const ok = await runSync(username);

  if (ok) {
    console.log(chalk.green.bold('✅ 설정 완료!'));
    console.log(chalk.gray('   Claude Code를 사용하면 1분마다 자동으로 리더보드가 업데이트됩니다.'));
    console.log(chalk.gray(`   리더보드: ${API_URL}\n`));
  } else {
    console.log(chalk.yellow('\n⚠️  자동 동기화는 설정되었지만 첫 동기화에 실패했습니다.'));
    console.log(chalk.gray('   Claude Code를 사용한 후 자동으로 동기화됩니다.\n'));
  }
}

async function status() {
  const config = readConfig();
  if (!config) {
    console.log(chalk.yellow('\n설정되지 않았습니다. 먼저 설정을 진행합니다.\n'));
    return setup();
  }

  console.log(chalk.cyan.bold(`\n🏕️  AI Native Camp League — 상태\n`));
  console.log(`  사용자: ${chalk.white(config.username)}`);
  console.log(`  자동 동기화: ${isCronInstalled() ? chalk.green('활성') : chalk.red('비활성')}`);
  console.log(`  설정일: ${chalk.gray(config.installedAt)}`);

  // Show last sync from log
  if (fs.existsSync(SYNC_LOG)) {
    const log = fs.readFileSync(SYNC_LOG, 'utf8').trim().split('\n');
    const lastLine = log[log.length - 1];
    console.log(`  마지막 동기화: ${chalk.gray(lastLine)}`);
  }

  console.log(`  리더보드: ${chalk.cyan(API_URL)}\n`);
}

async function remove() {
  console.log(chalk.cyan.bold(`\n🏕️  AI Native Camp League — 계정 삭제\n`));

  const config = readConfig();

  if (config?.username) {
    const { confirm } = await prompts({
      type: 'confirm',
      name: 'confirm',
      message: `"${config.username}" 계정과 리더보드 데이터를 모두 삭제할까요?`,
      initial: false,
    });

    if (!confirm) {
      console.log(chalk.yellow('취소되었습니다.\n'));
      return;
    }

    // Delete from server
    const spinner = ora('서버에서 데이터 삭제 중...').start();
    try {
      const res = await fetch(`${config.apiUrl || API_URL}/api/delete-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: config.username }),
      });
      const result = await res.json();
      if (res.ok) {
        spinner.succeed('서버 데이터 삭제 완료');
      } else {
        spinner.warn(`서버 삭제 실패: ${result.error || '알 수 없는 오류'}`);
      }
    } catch {
      spinner.warn('서버 연결 실패 — 로컬 설정만 삭제합니다');
    }
  }

  // Remove local config & cron
  removeCron();
  if (fs.existsSync(CONFIG_DIR)) {
    fs.rmSync(CONFIG_DIR, { recursive: true, force: true });
  }

  console.log(chalk.green('\n✅ 계정이 완전히 삭제되었습니다.\n'));
}

// --- Main ---

async function main() {
  const command = process.argv[2];

  switch (command) {
    case 'setup':
      return setup();

    case 'sync':
      const config = readConfig();
      if (!config) {
        console.log(chalk.yellow('먼저 설정이 필요합니다.\n'));
        return setup();
      }
      console.log(chalk.cyan.bold(`\n🏕️  AI Native Camp League — 수동 동기화\n`));
      await runSync(config.username);
      break;

    case 'status':
      return status();

    case 'remove':
    case 'uninstall':
      return remove();

    case 'help':
    case '--help':
    case '-h':
      console.log(chalk.cyan.bold(`\n🏕️  AI Native Camp League v${CLI_VERSION}\n`));
      console.log('사용법:');
      console.log(`  ${chalk.white('npx cc-camp')}          설정 또는 상태 확인`);
      console.log(`  ${chalk.white('npx cc-camp setup')}    자동 동기화 설정 (최초 1회)`);
      console.log(`  ${chalk.white('npx cc-camp sync')}     수동 동기화`);
      console.log(`  ${chalk.white('npx cc-camp status')}   동기화 상태 확인`);
      console.log(`  ${chalk.white('npx cc-camp remove')}   계정 삭제 (서버 데이터 포함)\n`);
      break;

    default: {
      // No command: if already set up → status, else → setup
      const existing = readConfig();
      if (existing) {
        return status();
      } else {
        return setup();
      }
    }
  }
}

main().catch(error => {
  console.error(chalk.red('오류:', error.message));
  process.exit(1);
});
