/**
 * js/auth.js
 * 감자마켓 - Supabase Auth 인증 모듈
 * 담당: 로그인·회원가입·로그아웃, 헤더 UI 전환, 로그인 모달 제어
 */

(function () {
  'use strict';

  /* ============================================================
   * 상태
   * ============================================================ */
  let currentUser = null;   // Supabase Auth User 객체
  let currentProfile = null; // profiles 테이블 row
  let _pendingAfterLogin = null; // 로그인 후 실행할 콜백
  let signupProfileImage = null; // 회원가입 시 선택한 프로필 사진 (Data URL 또는 Storage URL)
  let editProfileImage = null;   // 회원정보 수정 시 선택한 프로필 사진
  const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80';

  /* ============================================================
   * Supabase 클라이언트 참조 (supabaseClient.js 가 먼저 로드되어야 함)
   * ============================================================ */
  function getSdk() {
    // window.supabase = CDN 로드된 원본 모듈
    // window.gamzaSupabase 는 우리 래퍼
    if (window._gamzaAuthSdk) return window._gamzaAuthSdk;
    if (typeof window.supabase !== 'undefined' && typeof window.supabase.createClient === 'function') {
      const SUPABASE_URL = 'https://ftxrlstlkfjzjjggqpmv.supabase.co';
      const SUPABASE_ANON_KEY =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0eHJsc3Rsa2ZqempqZ2dxcG12Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM2NzI3MDAsImV4cCI6MjEwOTI0ODcwMH0.u4QHXeg5SPYIej8YdNbOVMjxxa3z8Z7TJiPAs0tIYkI';
      window._gamzaAuthSdk = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    return window._gamzaAuthSdk || null;
  }

  /* ============================================================
   * 프로필 조회 / 생성
   * ============================================================ */
  async function fetchOrCreateProfile(authUser, nickname, profileImage = null) {
    const sdk = getSdk();
    if (!sdk) return null;

    // 기존 프로필 조회 (auth_user_id 기준)
    const { data: existing } = await sdk
      .from('profiles')
      .select('*')
      .eq('auth_user_id', authUser.id)
      .maybeSingle();

    if (existing) {
      // 기존 프로필이 있고 이번에 새 사진이 전달되었으면 업데이트
      if (profileImage && !existing.profile_image) {
        await sdk.from('profiles').update({ profile_image: profileImage }).eq('id', existing.id);
        existing.profile_image = profileImage;
      }
      return existing;
    }

    // 없으면 생성 (회원가입 시)
    const newNick = nickname || authUser.email.split('@')[0];
    const { data: created, error } = await sdk
      .from('profiles')
      .insert([{
        auth_user_id: authUser.id,
        nickname: newNick,
        profile_image: profileImage || null,
        location: '서초동',
        manner_temp: 36.5
      }])
      .select()
      .single();

    if (error) {
      console.error('[Auth] 프로필 생성 실패:', error);
      return null;
    }
    return created;
  }

  /* ============================================================
   * 헤더 UI 전환 (닉네임 + 작은 프로필 사진 표시)
   * ============================================================ */
  function updateHeaderUI(profile) {
    const loginBtn    = document.getElementById('loginBtn');
    const nicknameBtn = document.getElementById('nicknameBtn');
    const logoutBtn   = document.getElementById('logoutBtn');
    const profileImg  = document.getElementById('headerProfileImg');

    if (profile) {
      // 로그인 상태
      if (loginBtn) loginBtn.style.display = 'none';
      if (nicknameBtn) {
        nicknameBtn.style.display = 'inline-flex';
        nicknameBtn.removeAttribute('disabled');
        nicknameBtn.classList.add('logged-in');

        const nickTextEl = document.getElementById('nicknameBtnText');
        if (nickTextEl) nickTextEl.textContent = profile.nickname || '감자유저';

        if (profileImg) {
          profileImg.src = profile.profile_image || DEFAULT_AVATAR;
          profileImg.style.display = 'inline-block';
        }
      }
      if (logoutBtn) logoutBtn.style.display = 'inline-flex';
    } else {
      // 비로그인 상태
      if (loginBtn) loginBtn.style.display = 'inline-flex';
      if (nicknameBtn) {
        nicknameBtn.style.display = 'none';
        nicknameBtn.setAttribute('disabled', 'true');
        nicknameBtn.classList.remove('logged-in');
        if (profileImg) profileImg.style.display = 'none';
      }
      if (logoutBtn) logoutBtn.style.display = 'none';
    }
  }

  /* ============================================================
   * 로그인 모달 제어
   * ============================================================ */
  window.openLoginModal = function (afterLoginCallback) {
    if (afterLoginCallback) _pendingAfterLogin = afterLoginCallback;
    const modal = document.getElementById('authModal');
    if (!modal) return;
    // 탭 초기화: 로그인 탭으로
    switchTab('login');
    clearAuthErrors();
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    // 이메일 포커스
    setTimeout(() => {
      const el = document.getElementById('authEmail');
      if (el) el.focus();
    }, 150);
  };

  window.closeLoginModal = function () {
    const modal = document.getElementById('authModal');
    if (!modal) return;
    modal.classList.remove('active');
    document.body.style.overflow = '';
    clearAuthErrors();
  };

  /* ============================================================
   * 탭 전환 (로그인 ↔ 회원가입 ↔ 비밀번호 찾기)
   * ============================================================ */
  function switchTab(tab) {
    const loginSection  = document.getElementById('authLoginSection');
    const signupSection = document.getElementById('authSignupSection');
    const forgotSection = document.getElementById('authForgotSection');
    const tabLogin      = document.getElementById('tabLogin');
    const tabSignup     = document.getElementById('tabSignup');
    const tabsWrapper   = document.querySelector('.auth-tabs');

    clearAuthErrors();

    if (tab === 'login') {
      if (tabsWrapper)   tabsWrapper.style.display   = 'flex';
      if (loginSection)  loginSection.style.display  = 'flex';
      if (signupSection) signupSection.style.display = 'none';
      if (forgotSection) forgotSection.style.display = 'none';
      if (tabLogin)  tabLogin.classList.add('active');
      if (tabSignup) tabSignup.classList.remove('active');
    } else if (tab === 'signup') {
      if (tabsWrapper)   tabsWrapper.style.display   = 'flex';
      if (loginSection)  loginSection.style.display  = 'none';
      if (signupSection) signupSection.style.display = 'flex';
      if (forgotSection) forgotSection.style.display = 'none';
      if (tabLogin)  tabLogin.classList.remove('active');
      if (tabSignup) tabSignup.classList.add('active');
    } else if (tab === 'forgot') {
      // 비밀번호 찾기 화면
      if (tabsWrapper)   tabsWrapper.style.display   = 'none';
      if (loginSection)  loginSection.style.display  = 'none';
      if (signupSection) signupSection.style.display = 'none';
      if (forgotSection) forgotSection.style.display = 'flex';
    }
  }

  /* ============================================================
   * 오류 메시지 처리
   * ============================================================ */
  function showAuthError(elementId, message) {
    const el = document.getElementById(elementId);
    if (el) el.textContent = message;
  }

  function clearAuthErrors() {
    ['authLoginError', 'authSignupError', 'authForgotError'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '';
    });
    // 입력값 초기화
    ['authEmail', 'authPassword', 'authSignupEmail', 'authSignupPassword', 'authSignupNickname', 'authForgotEmail'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });

    const forgotSuccess = document.getElementById('authForgotSuccess');
    if (forgotSuccess) forgotSuccess.style.display = 'none';

    // 프로필 사진 초기화
    signupProfileImage = null;
    const previewEl = document.getElementById('authSignupAvatarPreview');
    if (previewEl) previewEl.src = DEFAULT_AVATAR;
    const clearBtn = document.getElementById('authSignupProfileClearBtn');
    if (clearBtn) clearBtn.style.display = 'none';
    const fileInput = document.getElementById('authSignupProfileFile');
    if (fileInput) fileInput.value = '';
  }

  /* ============================================================
   * 로그인 처리
   * ============================================================ */
  async function handleLogin() {
    const sdk = getSdk();
    if (!sdk) return;

    const email    = (document.getElementById('authEmail')?.value || '').trim();
    const password = (document.getElementById('authPassword')?.value || '').trim();
    const btn      = document.getElementById('authLoginSubmitBtn');

    if (!email || !password) {
      showAuthError('authLoginError', '이메일과 비밀번호를 모두 입력해주세요.');
      return;
    }

    if (btn) { btn.disabled = true; btn.textContent = '로그인 중...'; }

    try {
      const { data, error } = await sdk.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const profile = await fetchOrCreateProfile(data.user, null);
      currentUser    = data.user;
      currentProfile = profile;

      updateHeaderUI(profile);
      window.closeLoginModal();

      if (typeof window.showGamzaToast === 'function') {
        window.showGamzaToast(`🥔 ${profile?.nickname || '감자유저'}님, 환영합니다!`);
      }

      // 로그인 후 대기 중인 콜백 실행 (예: 글쓰기 모달 열기)
      if (typeof _pendingAfterLogin === 'function') {
        const cb = _pendingAfterLogin;
        _pendingAfterLogin = null;
        setTimeout(cb, 300);
      }
    } catch (err) {
      console.error('[Auth] 로그인 실패:', err);
      const msg = err.message?.includes('Invalid login credentials')
        ? '이메일 또는 비밀번호가 올바르지 않습니다.'
        : (err.message || '로그인에 실패했습니다. 다시 시도해주세요.');
      showAuthError('authLoginError', msg);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '로그인'; }
    }
  }

  /* ============================================================
   * 회원가입 처리
   * ============================================================ */
  async function handleSignup() {
    const sdk = getSdk();
    if (!sdk) return;

    const email    = (document.getElementById('authSignupEmail')?.value || '').trim();
    const password = (document.getElementById('authSignupPassword')?.value || '').trim();
    const nickname = (document.getElementById('authSignupNickname')?.value || '').trim();
    const btn      = document.getElementById('authSignupSubmitBtn');

    if (!email || !password || !nickname) {
      showAuthError('authSignupError', '이메일, 비밀번호, 닉네임을 모두 입력해주세요.');
      return;
    }
    if (nickname.length < 2) {
      showAuthError('authSignupError', '닉네임은 2자 이상 입력해주세요.');
      return;
    }
    if (password.length < 6) {
      showAuthError('authSignupError', '비밀번호는 6자 이상이어야 합니다.');
      return;
    }

    if (btn) { btn.disabled = true; btn.textContent = '가입 중...'; }

    try {
      const { data, error } = await sdk.auth.signUp({ email, password });
      if (error) throw error;

      // 이메일 미인증 상태로도 즉시 로그인 처리 (Supabase 이메일 확인 비활성화 환경)
      const user = data.user || data.session?.user;
      if (!user) {
        // 이메일 확인 필요 환경
        showAuthError('authSignupError', '');
        const errEl = document.getElementById('authSignupError');
        if (errEl) {
          errEl.style.color = '#047857';
          errEl.textContent = '✅ 가입 완료! 이메일을 확인하고 로그인해 주세요.';
        }
        if (btn) { btn.disabled = false; btn.textContent = '회원가입'; }
        return;
      }

      const profile = await fetchOrCreateProfile(user, nickname, signupProfileImage);
      currentUser    = user;
      currentProfile = profile;

      updateHeaderUI(profile);
      window.closeLoginModal();

      if (typeof window.showGamzaToast === 'function') {
        window.showGamzaToast(`🥔 ${nickname}님, 감자마켓 가입을 환영합니다!`);
      }

      if (typeof _pendingAfterLogin === 'function') {
        const cb = _pendingAfterLogin;
        _pendingAfterLogin = null;
        setTimeout(cb, 300);
      }
    } catch (err) {
      console.error('[Auth] 회원가입 실패:', err);
      const msg = err.message?.includes('already registered')
        ? '이미 가입된 이메일입니다. 로그인 탭을 이용해주세요.'
        : (err.message || '회원가입에 실패했습니다. 다시 시도해주세요.');
      showAuthError('authSignupError', msg);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '회원가입'; }
    }
  }

  /* ============================================================
   * 비밀번호 찾기 처리
   * ============================================================ */
  async function handleForgotPassword() {
    const sdk = getSdk();
    if (!sdk) return;

    const emailInput = document.getElementById('authForgotEmail');
    const email = (emailInput?.value || '').trim();
    const btn = document.getElementById('authForgotSubmitBtn');
    const errEl = document.getElementById('authForgotError');
    const successEl = document.getElementById('authForgotSuccess');

    if (errEl) errEl.textContent = '';
    if (successEl) successEl.style.display = 'none';

    if (!email) {
      showAuthError('authForgotError', '가입하신 이메일 주소를 입력해주세요.');
      return;
    }

    if (btn) { btn.disabled = true; btn.textContent = '링크 전송 중...'; }

    try {
      // Supabase Auth 비밀번호 재설정 링크 발송
      const { error } = await sdk.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin
      });

      if (error) throw error;

      if (successEl) {
        successEl.style.display = 'block';
        successEl.textContent = `✅ [${email}] 수신함으로 비밀번호 재설정 링크가 전송되었습니다. 메일의 링크를 통해 비밀번호를 변경해주세요!`;
      }
      if (emailInput) emailInput.value = '';
    } catch (err) {
      console.warn('[Auth] 비밀번호 찾기 오류:', err);
      // Supabase 미지원/에러 시에도 사용자 경험을 위한 친절한 안내 제공
      if (successEl) {
        successEl.style.display = 'block';
        successEl.textContent = `✅ [${email}] 주소로 비밀번호 재설정 안내가 접수되었습니다. (등록된 이메일인 경우 메일이 발송됩니다)`;
      }
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '재설정 링크 보내기'; }
    }
  }

  /* ============================================================
   * 회원 정보 수정 모달 제어
   * ============================================================ */
  window.openProfileEditModal = function () {
    if (!currentUser || !currentProfile) {
      window.openLoginModal();
      return;
    }

    const modal = document.getElementById('profileEditModal');
    if (!modal) return;

    const emailEl = document.getElementById('profileEditEmail');
    const nickEl = document.getElementById('profileEditNickname');
    const locEl = document.getElementById('profileEditLocation');
    const previewEl = document.getElementById('profileEditAvatarPreview');
    const errEl = document.getElementById('profileEditError');

    if (errEl) errEl.textContent = '';
    if (emailEl) emailEl.value = currentUser.email || '연동 이메일';
    if (nickEl) nickEl.value = currentProfile.nickname || '';
    if (locEl) locEl.value = currentProfile.location || '서초동';

    editProfileImage = currentProfile.profile_image || null;
    if (previewEl) {
      previewEl.src = editProfileImage || DEFAULT_AVATAR;
    }

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    setTimeout(() => {
      if (nickEl) nickEl.focus();
    }, 150);
  };

  window.closeProfileEditModal = function () {
    const modal = document.getElementById('profileEditModal');
    if (!modal) return;
    modal.classList.remove('active');
    document.body.style.overflow = '';
  };

  async function handleProfileEditSubmit() {
    const sdk = getSdk();
    if (!sdk || !currentProfile) return;

    const nickInput = document.getElementById('profileEditNickname');
    const locInput = document.getElementById('profileEditLocation');
    const btn = document.getElementById('profileEditSubmitBtn');
    const errEl = document.getElementById('profileEditError');

    if (errEl) errEl.textContent = '';

    const newNick = (nickInput?.value || '').trim();
    const newLoc = (locInput?.value || '').trim() || '서초동';

    if (!newNick || newNick.length < 2) {
      if (errEl) errEl.textContent = '닉네임은 최소 2자 이상 입력해주세요.';
      if (nickInput) nickInput.focus();
      return;
    }

    if (btn) { btn.disabled = true; btn.textContent = '저장 중...'; }

    try {
      const updateData = {
        nickname: newNick,
        location: newLoc,
        profile_image: editProfileImage
      };

      const { data, error } = await sdk
        .from('profiles')
        .update(updateData)
        .eq('id', currentProfile.id)
        .select()
        .single();

      if (error) throw error;

      // 로컬 프로필 상태 갱신
      currentProfile = data || { ...currentProfile, ...updateData };

      // 헤더 및 화면 갱신
      updateHeaderUI(currentProfile);

      // 모달 닫기
      window.closeProfileEditModal();

      if (typeof window.showGamzaToast === 'function') {
        window.showGamzaToast(`🥔 ${newNick}님의 회원 정보가 성공적으로 변경되었습니다!`);
      }
    } catch (err) {
      console.error('[Auth] 프로필 수정 실패:', err);
      if (errEl) errEl.textContent = err.message || '회원 정보 수정 중 오류가 발생했습니다.';
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '🥔 수정사항 저장'; }
    }
  }

  /* ============================================================
   * 로그아웃 처리
   * ============================================================ */
  async function handleLogout() {
    const sdk = getSdk();
    if (sdk) {
      await sdk.auth.signOut().catch(() => {});
    }
    currentUser    = null;
    currentProfile = null;
    updateHeaderUI(null);

    if (typeof window.showGamzaToast === 'function') {
      window.showGamzaToast('로그아웃 되었습니다. 또 만나요! 🥔');
    }
  }

  /* ============================================================
   * 세션 복원 (페이지 새로고침 시 자동 로그인 유지)
   * ============================================================ */
  async function restoreSession() {
    const sdk = getSdk();
    if (!sdk) return;
    try {
      const { data } = await sdk.auth.getSession();
      const session = data?.session;
      if (session?.user) {
        const profile = await fetchOrCreateProfile(session.user, null);
        currentUser    = session.user;
        currentProfile = profile;
        updateHeaderUI(profile);
      }
    } catch (e) {
      console.warn('[Auth] 세션 복원 실패:', e);
    }
  }

  /* ============================================================
   * 이벤트 바인딩
   * ============================================================ */
  function bindAuthEvents() {
    // 로그인 버튼 (헤더)
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
      loginBtn.addEventListener('click', () => window.openLoginModal());
    }

    // 닉네임 버튼 (헤더) -> 클릭 시 회원 정보 수정 모달 오픈
    const nicknameBtn = document.getElementById('nicknameBtn');
    if (nicknameBtn) {
      nicknameBtn.addEventListener('click', () => {
        window.openProfileEditModal();
      });
    }

    // 로그아웃 버튼 (헤더)
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', handleLogout);
    }

    // 모달 닫기 (X 버튼)
    const authModalClose = document.getElementById('authModalClose');
    if (authModalClose) {
      authModalClose.addEventListener('click', window.closeLoginModal);
    }

    // 백드롭 클릭 닫기
    const authModal = document.getElementById('authModal');
    if (authModal) {
      authModal.addEventListener('click', e => {
        if (e.target === authModal) window.closeLoginModal();
      });
    }

    // ESC 키 닫기
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        const modal = document.getElementById('authModal');
        if (modal && modal.classList.contains('active')) {
          window.closeLoginModal();
        }
      }
    });

    // 탭 전환
    const tabLogin  = document.getElementById('tabLogin');
    const tabSignup = document.getElementById('tabSignup');
    if (tabLogin)  tabLogin.addEventListener('click',  () => switchTab('login'));
    if (tabSignup) tabSignup.addEventListener('click', () => switchTab('signup'));

    // 로그인 제출 버튼
    const loginSubmit = document.getElementById('authLoginSubmitBtn');
    if (loginSubmit) loginSubmit.addEventListener('click', handleLogin);

    // 회원가입 제출 버튼
    const signupSubmit = document.getElementById('authSignupSubmitBtn');
    if (signupSubmit) signupSubmit.addEventListener('click', handleSignup);

    // Enter 키 제출 처리
    ['authEmail', 'authPassword'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });
    });
    ['authSignupEmail', 'authSignupPassword', 'authSignupNickname'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') handleSignup(); });
    });

    // 회원가입 프로필 사진 선택
    const profileFileBtn = document.getElementById('authSignupProfileBtn');
    const profileFileInput = document.getElementById('authSignupProfileFile');
    const profilePreview = document.getElementById('authSignupAvatarPreview');
    const profileClearBtn = document.getElementById('authSignupProfileClearBtn');

    if (profileFileBtn && profileFileInput) {
      profileFileBtn.addEventListener('click', () => {
        profileFileInput.click();
      });

      profileFileInput.addEventListener('change', async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        // 용량 체크 (10MB)
        if (file.size > 10 * 1024 * 1024) {
          showAuthError('authSignupError', '프로필 사진은 10MB 이하 파일만 등록 가능합니다.');
          return;
        }

        try {
          if (profileFileBtn) profileFileBtn.disabled = true;
          // Supabase 또는 Data URL 업로드
          let uploadedUrl = null;
          if (window.gamzaSupabase && typeof window.gamzaSupabase.uploadImage === 'function') {
            uploadedUrl = await window.gamzaSupabase.uploadImage(file, 'profiles');
          } else {
            uploadedUrl = await new Promise((res, rej) => {
              const r = new FileReader();
              r.onload = () => res(r.result);
              r.onerror = rej;
              r.readAsDataURL(file);
            });
          }

          signupProfileImage = uploadedUrl;
          if (profilePreview) profilePreview.src = uploadedUrl;
          if (profileClearBtn) profileClearBtn.style.display = 'inline-block';
        } catch (uploadErr) {
          console.error('[Auth] 프로필 사진 로드 실패:', uploadErr);
          showAuthError('authSignupError', '사진을 불러오는 중 오류가 발생했습니다.');
        } finally {
          if (profileFileBtn) profileFileBtn.disabled = false;
        }
      });
    }

    if (profileClearBtn) {
      profileClearBtn.addEventListener('click', () => {
        signupProfileImage = null;
        if (profilePreview) profilePreview.src = DEFAULT_AVATAR;
        if (profileFileInput) profileFileInput.value = '';
        profileClearBtn.style.display = 'none';
      });
    }

    // "회원가입 하러가기" / "로그인 하러가기" 링크
    const goSignup = document.getElementById('goSignupLink');
    const goLogin  = document.getElementById('goLoginLink');
    if (goSignup) goSignup.addEventListener('click', e => { e.preventDefault(); switchTab('signup'); });
    if (goLogin)  goLogin.addEventListener('click',  e => { e.preventDefault(); switchTab('login'); });

    // 비밀번호 찾기 관련 링크 및 버튼
    const goForgot = document.getElementById('goForgotLink');
    if (goForgot) goForgot.addEventListener('click', e => { e.preventDefault(); switchTab('forgot'); });

    const forgotBack = document.getElementById('forgotBackToLoginLink');
    if (forgotBack) forgotBack.addEventListener('click', e => { e.preventDefault(); switchTab('login'); });

    const forgotSubmit = document.getElementById('authForgotSubmitBtn');
    if (forgotSubmit) forgotSubmit.addEventListener('click', handleForgotPassword);

    const forgotEmailInput = document.getElementById('authForgotEmail');
    if (forgotEmailInput) {
      forgotEmailInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') handleForgotPassword();
      });
    }

    // ──────────────────────────────────────────
    // 회원 정보 수정 모달 이벤트
    // ──────────────────────────────────────────
    const editModal = document.getElementById('profileEditModal');
    const editCloseBtn = document.getElementById('profileEditCloseBtn');
    const editCancelBtn = document.getElementById('profileEditCancelBtn');
    const editForm = document.getElementById('profileEditForm');
    const editFileBtn = document.getElementById('profileEditBrowseBtn');
    const editFileInput = document.getElementById('profileEditFileInput');
    const editPreview = document.getElementById('profileEditAvatarPreview');
    const editClearAvatarBtn = document.getElementById('profileEditClearAvatarBtn');

    if (editCloseBtn) editCloseBtn.addEventListener('click', window.closeProfileEditModal);
    if (editCancelBtn) editCancelBtn.addEventListener('click', window.closeProfileEditModal);

    if (editModal) {
      editModal.addEventListener('click', e => {
        if (e.target === editModal) window.closeProfileEditModal();
      });
    }

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        const pModal = document.getElementById('profileEditModal');
        if (pModal && pModal.classList.contains('active')) {
          window.closeProfileEditModal();
        }
      }
    });

    // 사진 찾기
    if (editFileBtn && editFileInput) {
      editFileBtn.addEventListener('click', () => editFileInput.click());

      editFileInput.addEventListener('change', async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
          const errEl = document.getElementById('profileEditError');
          if (errEl) errEl.textContent = '프로필 사진은 10MB 이하 파일만 등록 가능합니다.';
          return;
        }

        try {
          if (editFileBtn) editFileBtn.disabled = true;
          let uploadedUrl = null;
          if (window.gamzaSupabase && typeof window.gamzaSupabase.uploadImage === 'function') {
            uploadedUrl = await window.gamzaSupabase.uploadImage(file, 'profiles');
          } else {
            uploadedUrl = await new Promise((res, rej) => {
              const r = new FileReader();
              r.onload = () => res(r.result);
              r.onerror = rej;
              r.readAsDataURL(file);
            });
          }

          editProfileImage = uploadedUrl;
          if (editPreview) editPreview.src = uploadedUrl;
        } catch (uploadErr) {
          console.error('[Auth] 프로필 사진 업로드 실패:', uploadErr);
        } finally {
          if (editFileBtn) editFileBtn.disabled = false;
        }
      });
    }

    // 기본 이미지로 변경
    if (editClearAvatarBtn) {
      editClearAvatarBtn.addEventListener('click', () => {
        editProfileImage = null;
        if (editPreview) editPreview.src = DEFAULT_AVATAR;
        if (editFileInput) editFileInput.value = '';
      });
    }

    // 수정 폼 제출
    if (editForm) {
      editForm.addEventListener('submit', handleProfileEditSubmit);
    }
  }

  /* ============================================================
   * 전역 노출
   * ============================================================ */
  window.gamzaAuth = {
    getCurrentUser:    () => currentUser,
    getCurrentProfile: () => currentProfile,
    isLoggedIn:        () => !!currentUser
  };

  /* ============================================================
   * 초기화
   * ============================================================ */
  function init() {
    bindAuthEvents();
    restoreSession();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
