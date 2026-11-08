# 🥔 감자마켓 (Gamza)

> **"따뜻하고 포슬포슬한 이웃 중고거래 플랫폼"**  
> 감자마켓은 이웃과 따뜻한 온기를 나누며 물품을 거래하고 소통할 수 있는 지역 기반 중고거래 웹 서비스입니다.

---

## ✨ 주요 기능

1. **포슬포슬 감자 홈 (메인 화면)**
   - 등록된 중고거래 매물 탐색 및 카테고리 필터링
   - 동네/키워드 실시간 검색
   - 판매 상태(판매중, 예약중, 거래완료) 배지 및 직관적인 UI

2. **물품 상세 & 거래 문의**
   - 상품 상세 이미지 및 설명 확인
   - 감자 온도(신뢰도 지수) 확인
   - 실시간 1:1 채팅 문의 연동

3. **내 물건 판매하기 (물품 등록)**
   - 이미지 업로드 (Supabase Storage 연동 및 Data URL 미리보기)
   - 카테고리, 판매 가격, 상세 설명 작성 및 즉시 등록

4. **실시간 1:1 감자톡 (채팅)**
   - 구매자와 판매자 간의 실시간 메시지 송수신 (Supabase Realtime)
   - 약속 잡기 및 거래 상태 변경

5. **인증 & 프로필 관리**
   - Supabase Auth 기반 회원가입 / 로그인 / 로그아웃
   - 프로필 닉네임, 프로필 사진 변경 및 내 거래 내역 관리

---

## 🛠 기술 스택

- **Frontend**: HTML5, CSS3 (Modern CSS Tokens & Flex/Grid), Vanilla JavaScript (ES6+)
- **Backend & Database**: [Supabase](https://supabase.com/) (PostgreSQL, Supabase Auth, Storage, Realtime)
- **Local Dev Server**: Node.js HTTP Server (`server.js`)
- **Typography & Icons**: Pretendard Webfont, SVG Icons

---

## 📂 프로젝트 구조

```plaintext
Gamza/
├── components/          # 화면 컴포넌트 템플릿
│   ├── screen1.html     # 홈 화면 컴포넌트
│   ├── screen2.html     # 물품 등록/수정 컴포넌트
│   └── screen3.html     # 내 감자(마이페이지)/채팅 컴포넌트
├── css/                 # 스타일시트 모음
│   ├── variables.css    # 컬러 팔레트 및 디자인 토큰
│   ├── screen1.css      # 메인 화면 스타일
│   ├── screen2.css      # 등록 화면 스타일
│   ├── screen3.css      # 마이페이지 스타일
│   └── chat.css         # 실시간 채팅 모달 스타일
├── js/                  # 클라이언트 스크립트 모음
│   ├── supabaseClient.js# Supabase DB 연동 및 유틸
│   ├── auth.js          # 인증 및 프로필 처리
│   ├── chat.js          # 실시간 채팅 로직
│   ├── data.js          # 목업/기본 데이터
│   ├── screen1.js       # 홈 화면 로직
│   ├── screen2.js       # 등록 화면 로직
│   └── screen3.js       # 마이페이지 로직
├── supabase/            # Supabase 스키마 및 마이그레이션 SQL
│   ├── schema.sql       # 테이블 및 RLS 정책 정의
│   └── auth_migration.sql # 인증 연동 마이그레이션
├── index.html           # SPA 메인 진입점
├── server.js            # 로컬 개발용 경량 Node 서버
├── package.json         # 프로젝트 설정
└── .gitignore           # Git 제외 파일 목록
```

---

## 🚀 시작하기

### 1. 사전 요구사항
- [Node.js](https://nodejs.org/) (v16 이상 권장)
- [Supabase](https://supabase.com/) 프로젝트 계정

### 2. 환경 설정
프로젝트 루트에 `.env` 파일을 구성하거나 Supabase 프로젝트 설정을 확인합니다.
```bash
cp .env.example .env
```
`supabase/schema.sql`을 Supabase 대시보드의 **SQL Editor**에 실행하여 필요한 테이블(`products`, `profiles`, `chats`, `messages`)과 RLS 정책을 생성합니다.

### 3. 로컬 서버 실행
```bash
# 서버 구동
npm start
# 또는
node server.js
```
브라우저에서 `http://localhost:3000` 으로 접속하여 서비스를 확인합니다.

---

## 🔒 보안 및 배포 주의사항
- `.env` 및 `.mcp.json` 등 개인 액세스 토큰(`sbp_...`)이나 서비스 롤 키(`service_role`)는 절대 저장소에 공개되지 않도록 관리합니다.
- Supabase 대시보드에서 `products`, `profiles`, `messages` 테이블의 Row Level Security(RLS)가 활성화되어 있는지 확인하세요.
- Vercel, Netlify, GitHub Pages 등의 정적 호스팅 서비스로 배포 가능합니다.
