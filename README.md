# CC Camp League 🏕️

AI Native Camp 참가자들의 Claude Code 사용량 리더보드.

**더 많이 쓰는 사람이 더 빠르게 성장합니다.**

## 기능

- Claude Code 토큰 사용량 실시간 리더보드
- GitHub OAuth 인증
- CLI / 파일 업로드 제출 지원
- 일별 사용량 차트
- 개인 프로필 페이지

## 기술 스택

- **Frontend**: Next.js 16 + TypeScript + Tailwind CSS
- **Database**: Convex (실시간 서버리스 DB)
- **Auth**: NextAuth.js + GitHub OAuth
- **Deploy**: Vercel
- **CLI**: Node.js (npx cc-camp)

## 로컬 개발

### 필수 요구사항

- Node.js 18+
- pnpm
- Convex 계정
- GitHub OAuth App

### 셋업

```bash
# 의존성 설치
pnpm install

# 환경 변수 설정
cp .env.example .env.local
# .env.local 파일을 편집하여 값 입력

# Convex 시작
npx convex dev

# 개발 서버 시작 (다른 터미널)
pnpm dev
```

### GitHub OAuth App 만들기

1. https://github.com/settings/developers 접속
2. "New OAuth App" 클릭
3. 설정:
   - Application name: `CC Camp League`
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
4. Client ID와 Secret을 `.env.local`에 입력

## 참가자 사용법

### CLI (추천)

```bash
npx cc-camp
```

### 파일 업로드

1. `npx ccusage@latest --json > cc.json` 실행
2. 웹사이트에서 cc.json 파일 업로드

## 배포

Vercel에 배포:

```bash
# Vercel CLI 설치
npm i -g vercel

# 배포
vercel
```

환경 변수를 Vercel 대시보드에서 설정하세요.

## 크레딧

[Viberank](https://github.com/sculptdotfun/viberank) (MIT License) 기반으로 제작되었습니다.
