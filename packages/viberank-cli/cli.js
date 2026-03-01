#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import ora from 'ora';
import prompts from 'prompts';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
const CLI_VERSION = packageJson.version;

// Deployment URL — update after Vercel deploy
const API_URL = process.env.CC_CAMP_API_URL || 'https://cc-camp-league.vercel.app';

async function main() {
  console.log(chalk.hex('#6366f1').bold(`\n🏕️  CC Camp League v${CLI_VERSION}\n`));
  console.log(chalk.gray('AI Native Camp — Claude Code 사용량 리더보드\n'));

  // Try to get GitHub username
  let githubUser;

  try {
    const remoteUrl = execSync('git config --get remote.origin.url', { encoding: 'utf8' }).trim();
    const githubMatch = remoteUrl.match(/github\.com[:/]([^/]+)\//);
    if (githubMatch) {
      githubUser = githubMatch[1];
      console.log(chalk.gray(`GitHub 사용자 감지: ${githubUser}`));
    }
  } catch (error) {}

  if (!githubUser) {
    try {
      githubUser = execSync('git config user.name', { encoding: 'utf8' }).trim();
      console.log(chalk.yellow('경고: git config user.name 사용 중 — GitHub 사용자명과 다를 수 있습니다'));
    } catch (error) {
      console.log(chalk.yellow('GitHub 사용자명을 자동 감지하지 못했습니다'));
    }
  }

  const response = await prompts({
    type: 'text',
    name: 'username',
    message: 'GitHub 사용자명:',
    initial: githubUser || '',
    validate: value => value.length > 0 || '사용자명이 필요합니다'
  });

  if (!response.username) {
    console.log(chalk.red('사용자명이 필요합니다.'));
    process.exit(1);
  }

  githubUser = response.username;

  // Check if cc.json already exists
  let ccJsonPath = path.join(process.cwd(), 'cc.json');
  let usingExistingFile = false;

  if (fs.existsSync(ccJsonPath)) {
    const response = await prompts({
      type: 'confirm',
      name: 'useExisting',
      message: '기존 cc.json 파일을 사용하시겠습니까?',
      initial: true
    });

    if (!response.useExisting) {
      const spinner = ora('ccusage로 사용 데이터 생성 중...').start();

      try {
        execSync('npx ccusage@latest --json > cc.json', {
          encoding: 'utf8',
          stdio: 'pipe'
        });
        spinner.succeed('cc.json 생성 완료');
      } catch (error) {
        spinner.fail('cc.json 생성 실패');
        console.error(chalk.red('오류:', error.message));
        console.log(chalk.yellow('\nClaude Code를 한 번 이상 실행한 후 다시 시도해주세요.'));
        process.exit(1);
      }
    } else {
      usingExistingFile = true;
      console.log(chalk.green('✓ 기존 cc.json 사용'));
    }
  } else {
    const spinner = ora('ccusage로 사용 데이터 생성 중...').start();

    try {
      execSync('npx ccusage@latest --json > cc.json', {
        encoding: 'utf8',
        stdio: 'pipe'
      });
      spinner.succeed('cc.json 생성 완료');
    } catch (error) {
      spinner.fail('cc.json 생성 실패');
      console.error(chalk.red('오류:', error.message));
      console.log(chalk.yellow('\nClaude Code를 한 번 이상 실행한 후 다시 시도해주세요.'));
      process.exit(1);
    }
  }

  // Read and display summary
  try {
    const data = JSON.parse(fs.readFileSync(ccJsonPath, 'utf8'));
    console.log('\n📊 요약:');
    console.log(`  총 비용: ${chalk.green('$' + Math.round(data.totals.totalCost))}`);
    console.log(`  총 토큰: ${chalk.green(data.totals.totalTokens.toLocaleString())}`);
    console.log(`  추적 일수: ${chalk.green(data.daily.length)}\n`);
  } catch (error) {
    console.error(chalk.red('cc.json 읽기 오류:', error.message));
    process.exit(1);
  }

  // Confirm submission
  const confirmResponse = await prompts({
    type: 'confirm',
    name: 'submit',
    message: 'CC Camp League에 제출하시겠습니까?',
    initial: true
  });

  if (!confirmResponse.submit) {
    console.log(chalk.yellow('제출이 취소되었습니다.'));
    process.exit(0);
  }

  // Submit
  const submitSpinner = ora('CC Camp League에 제출 중...').start();

  let attempt = 0;
  const maxAttempts = 3;
  const retryDelay = 5000;

  while (attempt < maxAttempts) {
    attempt++;

    try {
      const ccData = JSON.parse(fs.readFileSync(ccJsonPath, 'utf8'));

      const response = await fetch(`${API_URL}/api/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-GitHub-User': githubUser,
          'X-CLI-Version': CLI_VERSION
        },
        body: JSON.stringify(ccData)
      });

      if (!response.ok) {
        let errorMessage = `서버 응답: ${response.status} ${response.statusText}`;

        try {
          const errorData = await response.json();
          if (errorData.error) errorMessage = errorData.error;
        } catch {}

        if (response.status === 503 && attempt < maxAttempts) {
          submitSpinner.text = `서버 일시 장애. ${retryDelay/1000}초 후 재시도... (${attempt}/${maxAttempts})`;
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        }

        submitSpinner.fail('제출 실패');
        console.error(chalk.red('오류:', errorMessage));
        process.exit(1);
      }

      const result = await response.json();

      if (result.success) {
        submitSpinner.succeed('CC Camp League 제출 완료! 🎉');
        console.log(`\n프로필 확인: ${chalk.hex('#6366f1')(result.profileUrl)}\n`);
        break;
      } else {
        submitSpinner.fail('제출 실패');
        console.error(chalk.red('오류:', result.error || '알 수 없는 오류'));
        process.exit(1);
      }
    } catch (error) {
      if ((error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') && attempt < maxAttempts) {
        submitSpinner.text = `연결 실패. ${retryDelay/1000}초 후 재시도... (${attempt}/${maxAttempts})`;
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        continue;
      }

      submitSpinner.fail('제출 실패');
      console.error(chalk.red('오류:', error.message));
      process.exit(1);
    }
  }

  // Cleanup
  if (!usingExistingFile) {
    const cleanupResponse = await prompts({
      type: 'confirm',
      name: 'cleanup',
      message: 'cc.json 파일을 삭제하시겠습니까?',
      initial: false
    });

    if (cleanupResponse.cleanup) {
      fs.unlinkSync(ccJsonPath);
      console.log(chalk.green('✓ cc.json 삭제 완료'));
    }
  }

  console.log(chalk.green('\n완료! 🏕️'));
}

main().catch(error => {
  console.error(chalk.red('예기치 않은 오류:', error.message));
  process.exit(1);
});
