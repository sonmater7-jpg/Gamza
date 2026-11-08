/**
 * 감자 중고거래 [화면 2: 상세 팝업(모달)] 자바스크립트 (screen2.js)
 * 전역 함수: window.openDetailModal(productId), window.closeDetailModal()
 */

(function () {
  'use strict';

  // 현재 열린 상품 ID 및 관심 등록 상태 저장 (데모 메모리 유지)
  let currentModalProductId = null;
  let currentModalProduct = null;   // 현재 열린 상품 전체 객체
  const likedProductIds = new Set();
  let toastTimer = null;
  let isEventsBound = false;

  /**
   * 현재 로그인한 사용자의 profile.id(profiles 테이블 PK)를 반환
   * auth.js의 getCurrentProfile()에서 가져옴
   */
  function getCurrentProfileId() {
    if (window.gamzaAuth && typeof window.gamzaAuth.getCurrentProfile === 'function') {
      const p = window.gamzaAuth.getCurrentProfile();
      return p ? p.id : null;
    }
    return null;
  }

  /**
   * 상품의 seller_id(profiles.id)와 현재 로그인 유저 profile.id가 일치하는지 확인
   * 폴백: seller.nickname 비교도 지원
   */
  function isOwner(product) {
    if (!product) return false;
    const profileId = getCurrentProfileId();
    // Supabase에서 가져온 상품은 seller_id 필드를 가질 수 있음
    if (profileId && product.seller_id) {
      return String(product.seller_id) === String(profileId);
    }
    // 폴백: 닉네임 비교 (데모 데이터 등)
    if (window.gamzaAuth && typeof window.gamzaAuth.getCurrentProfile === 'function') {
      const p = window.gamzaAuth.getCurrentProfile();
      if (p && product.seller && product.seller.nickname) {
        return p.nickname === product.seller.nickname;
      }
    }
    return false;
  }

  /**
   * 모달 마크업이 DOM에 없는 경우를 대비한 자동 템플릿 생성
   */
  function ensureDetailModalDOM() {
    let modal = document.getElementById('detailModal');
    if (!modal) {
      const template = `
        <div id="detailModal" class="gamza-modal-backdrop" aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="modalProductTitle">
          <div class="gamza-modal-container" role="document">
            <button type="button" class="modal-close-btn" id="modalCloseBtn" aria-label="상세 팝업 닫기">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            <div class="modal-image-wrapper">
              <img id="modalProductImage" src="" alt="상품 상세 이미지" class="modal-product-img" />
              <div class="image-gradient-overlay"></div>
            </div>
            <div class="modal-scroll-content">
              <div class="modal-meta-top">
                <span id="modalProductStatus" class="status-badge sale">판매중</span>
                <span id="modalProductCategory" class="category-tag">디지털기기</span>
              </div>
              <h2 id="modalProductTitle" class="modal-product-title">상품 제목</h2>
              <div class="modal-meta-sub">
                <span class="meta-icon" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                </span>
                <span id="modalProductLocation">위치</span>
                <span class="meta-dot">·</span>
                <span id="modalProductTimeAgo">방금 전</span>
              </div>
              <div class="modal-price-box">
                <span id="modalProductPrice" class="modal-product-price">0원</span>
              </div>
              <div class="modal-divider"></div>
              <div class="modal-section-title">상품 설명</div>
              <p id="modalProductDescription" class="modal-product-description">상품 설명</p>
              <div class="modal-divider"></div>
              <div class="modal-seller-section">
                <div class="seller-card">
                  <div class="seller-main-info">
                    <img id="modalSellerImage" class="seller-avatar" src="" alt="판매자 프로필" />
                    <div class="seller-details">
                      <div class="seller-nickname-wrap">
                        <span id="modalSellerNickname" class="seller-nickname">판매자</span>
                        <span class="seller-badge">동네이웃</span>
                      </div>
                      <div class="seller-location-wrap">
                        <span id="modalSellerLocation" class="seller-location">서초동</span>
                        <span class="seller-trust">동네인증 완료</span>
                      </div>
                    </div>
                  </div>
                  <div class="seller-manner-box">
                    <div class="manner-temp-header">
                      <span class="manner-temp-label">매너온도</span>
                      <div class="manner-temp-value-group">
                        <span id="modalSellerMannerTemp" class="manner-temp-value">36.5°C</span>
                        <span id="modalSellerMannerEmoji" class="manner-temp-emoji">🥔</span>
                      </div>
                    </div>
                    <div class="manner-temp-bar-bg" title="매너온도">
                      <div id="modalSellerMannerBar" class="manner-temp-bar-fill" style="width: 36.5%;"></div>
                    </div>
                    <div class="manner-temp-desc">
                      <span id="modalSellerMannerDiff">첫 온도 36.5°C 기본 매너예요.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <!-- 판매자 본인 전용 액션 바 -->
            <div id="ownerActionBar" class="modal-owner-action-bar" style="display:none;">
              <div class="owner-status-group">
                <span class="owner-status-label">상태 변경</span>
                <div class="owner-status-btns">
                  <button type="button" class="owner-status-btn" data-status="판매중">판매중</button>
                  <button type="button" class="owner-status-btn" data-status="예약중">예약중</button>
                  <button type="button" class="owner-status-btn" data-status="거래 완료">거래 완료</button>
                </div>
              </div>
              <div class="owner-manage-btns">
                <button type="button" id="modalEditBtn" class="owner-manage-btn owner-edit-btn">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                  수정
                </button>
                <button type="button" id="modalDeleteBtn" class="owner-manage-btn owner-delete-btn">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                    <path d="M10 11v6M14 11v6"></path>
                  </svg>
                  삭제
                </button>
              </div>
            </div>
            <!-- 타인/비로그인 전용 액션 바 -->
            <div id="visitorActionBar" class="modal-action-bar">
              <button type="button" id="modalLikeBtn" class="btn btn-outline modal-like-btn" aria-label="관심 추가">
                <svg class="heart-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>
                <span id="modalLikeText" class="like-btn-text">관심 추가</span>
              </button>
              <button type="button" id="modalChatBtn" class="btn btn-primary modal-chat-btn">
                <svg class="chat-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <span>채팅 시작하기</span>
              </button>
            </div>
          </div>
        </div>
        <div id="gamzaToast" class="gamza-toast" aria-live="polite">
          <span class="gamza-toast-icon">🥔</span>
          <span id="gamzaToastText" class="gamza-toast-text"></span>
        </div>
      `;
      const wrapper = document.createElement('div');
      wrapper.innerHTML = template.trim();
      while (wrapper.firstChild) {
        document.body.appendChild(wrapper.firstChild);
      }
      modal = document.getElementById('detailModal');
    }

    if (!isEventsBound) {
      bindModalEvents();
      isEventsBound = true;
    }

    return modal;
  }

  /**
   * 토스트 피드백 메시지 표시
   */
  function showGamzaToast(message) {
    let toast = document.getElementById('gamzaToast');
    let toastText = document.getElementById('gamzaToastText');
    if (!toast || !toastText) return;

    toastText.textContent = message;
    toast.classList.add('show');

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 2400);
  }

  /**
   * 모달 내 이벤트 바인딩 (닫기, 백드롭 클릭, ESC, 버튼 클릭)
   */
  function bindModalEvents() {
    const modal = document.getElementById('detailModal');
    const closeBtn = document.getElementById('modalCloseBtn');
    const likeBtn = document.getElementById('modalLikeBtn');
    const chatBtn = document.getElementById('modalChatBtn');

    // 1. 닫기 버튼 (X 아이콘)
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        window.closeDetailModal();
      });
    }

    // 2. 백드롭 클릭 시 닫기
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          window.closeDetailModal();
        }
      });
    }

    // 3. ESC 키 입력 시 닫기
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        const activeModal = document.getElementById('detailModal');
        if (activeModal && activeModal.classList.contains('active')) {
          window.closeDetailModal();
        }
      }
    });

    // 4. [관심 추가(찜)] 버튼 클릭 인터랙션
    if (likeBtn) {
      likeBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        if (currentModalProductId === null) return;

        const likeText = document.getElementById('modalLikeText');
        likeBtn.disabled = true;
        try {
          let isNowLiked = false;
          if (window.productStore && typeof window.productStore.toggleLike === 'function') {
            isNowLiked = await window.productStore.toggleLike(currentModalProductId);
          } else {
            isNowLiked = !likedProductIds.has(currentModalProductId);
            if (isNowLiked) likedProductIds.add(currentModalProductId);
            else likedProductIds.delete(currentModalProductId);
          }

          if (isNowLiked) {
            likedProductIds.add(currentModalProductId);
            likeBtn.classList.add('liked');
            if (likeText) likeText.textContent = '관심 해제';
            showGamzaToast('🥔 관심 목록에 추가되었습니다! (Supabase 동기화)');
          } else {
            likedProductIds.delete(currentModalProductId);
            likeBtn.classList.remove('liked');
            if (likeText) likeText.textContent = '관심 추가';
            showGamzaToast('관심 목록에서 해제되었습니다.');
          }
        } catch (err) {
          console.error('[Gamza] 찜 처리 실패:', err);
          showGamzaToast('관심 등록 처리에 실패했습니다.');
        } finally {
          likeBtn.disabled = false;
        }
      });
    }

    // 5. [채팅 시작하기] 버튼 클릭 인터랙션
    if (chatBtn) {
      chatBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (!currentModalProduct) return;

        // 로그인 여부 확인
        const isLoggedIn = window.gamzaAuth && window.gamzaAuth.isLoggedIn();
        if (!isLoggedIn) {
          showGamzaToast('채팅은 감자마켓 로그인 후 이용하실 수 있습니다! 🥔');
          if (typeof window.openLoginModal === 'function') {
            window.openLoginModal(() => {
              if (typeof window.openChatModal === 'function') {
                window.openChatModal(currentModalProduct);
              }
            });
          }
          return;
        }

        if (typeof window.openChatModal === 'function') {
          window.openChatModal(currentModalProduct);
        } else {
          showGamzaToast('채팅 기능 모듈 로딩 중입니다.');
        }
      });
    }

    // 6. [판매자 본인] 판매 상태 변경 버튼 (판매중 / 예약중 / 거래 완료)
    const statusBtns = modal.querySelectorAll('.owner-status-btn');
    statusBtns.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const targetStatus = btn.dataset.status;
        if (!targetStatus || !currentModalProductId) return;

        statusBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        try {
          if (window.productStore && typeof window.productStore.updateProductStatus === 'function') {
            await window.productStore.updateProductStatus(currentModalProductId, targetStatus);
          }

          // 모달 내 상태 뱃지 갱신
          const statusEl = document.getElementById('modalProductStatus');
          if (statusEl) {
            statusEl.textContent = targetStatus;
            statusEl.className = 'status-badge';
            if (targetStatus === '예약중') {
              statusEl.classList.add('reserved');
            } else if (targetStatus === '거래 완료' || targetStatus === '거래완료') {
              statusEl.classList.add('completed');
            } else {
              statusEl.classList.add('sale');
            }
          }

          // 현재 모달 상품 객체 업데이트
          if (currentModalProduct) {
            currentModalProduct.status = targetStatus;
          }

          showGamzaToast(`🥔 상품 상태가 "${targetStatus}"(으)로 변경되었습니다! (Supabase 저장)`);
        } catch (err) {
          console.error('[Gamza] 상태 변경 오류:', err);
          showGamzaToast('상태 변경에 실패했습니다. 다시 시도해주세요.');
        }
      });
    });

    // 7. [판매자 본인] 게시글 수정 버튼
    const editBtn = document.getElementById('modalEditBtn');
    if (editBtn) {
      editBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (!currentModalProduct) return;
        const targetProduct = { ...currentModalProduct };
        window.closeDetailModal();

        if (typeof window.openEditModal === 'function') {
          window.openEditModal(targetProduct);
        } else {
          showGamzaToast('수정 기능 모듈을 준비 중입니다.');
        }
      });
    }

    // 8. [판매자 본인] 게시글 삭제 버튼
    const deleteBtn = document.getElementById('modalDeleteBtn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        if (!currentModalProductId) return;

        const ok = window.confirm('정말 이 게시글을 삭제하시겠습니까?\n삭제된 게시글은 복구할 수 없습니다.');
        if (!ok) return;

        deleteBtn.disabled = true;
        try {
          if (window.productStore && typeof window.productStore.deleteProduct === 'function') {
            await window.productStore.deleteProduct(currentModalProductId);
          }
          window.closeDetailModal();
          showGamzaToast('🥔 게시글이 성공적으로 삭제되었습니다.');
        } catch (err) {
          console.error('[Gamza] 삭제 오류:', err);
          showGamzaToast('게시글 삭제에 실패했습니다.');
        } finally {
          deleteBtn.disabled = false;
        }
      });
    }
  }

  /**
   * 전역 함수: 상세 팝업 열기
   * @param {number|string} productId 
   */
  window.openDetailModal = function (productId) {
    if (!window.productStore) {
      console.error('[감자] window.productStore 가 정의되어 있지 않습니다.');
      return;
    }

    const product = window.productStore.getProductById(productId);
    if (!product) {
      console.warn(`[감자] ID ${productId}에 해당하는 상품 정보를 찾을 수 없습니다.`);
      return;
    }

    const modal = ensureDetailModalDOM();
    if (!modal) return;

    currentModalProductId = product.id;
    currentModalProduct = product;

    // 0. 작성자 본인 여부 확인 및 액션 바 전환 (수정/삭제/상태변경 vs 관심/채팅)
    const amOwner = isOwner(product);
    const ownerBar = document.getElementById('ownerActionBar');
    const visitorBar = document.getElementById('visitorActionBar');

    if (ownerBar && visitorBar) {
      if (amOwner) {
        ownerBar.style.display = 'flex';
        visitorBar.style.display = 'none';

        // 현재 상태에 맞는 상태 버튼 활성화
        const currStatus = String(product.status || '판매중').trim();
        ownerBar.querySelectorAll('.owner-status-btn').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.status === currStatus);
        });
      } else {
        ownerBar.style.display = 'none';
        visitorBar.style.display = 'flex';
      }
    }

    // 1. 고화질 이미지 바인딩
    const imgEl = document.getElementById('modalProductImage');
    if (imgEl) {
      imgEl.src = product.imageUrl || '';
      imgEl.alt = product.title || '상품 이미지';
    }

    // 2. 판매 상태 뱃지 바인딩
    const statusEl = document.getElementById('modalProductStatus');
    if (statusEl) {
      statusEl.textContent = product.status || '판매중';
      statusEl.className = 'status-badge';

      const s = String(product.status || '').trim();
      if (s === '예약중') {
        statusEl.classList.add('reserved');
      } else if (s === '거래 완료' || s === '거래완료' || s === '완료') {
        statusEl.classList.add('completed');
      } else {
        statusEl.classList.add('sale');
      }
    }

    // 3. 카테고리 태그 바인딩
    const categoryEl = document.getElementById('modalProductCategory');
    if (categoryEl) {
      categoryEl.textContent = product.category || '기타';
    }

    // 4. 상품명 바인딩
    const titleEl = document.getElementById('modalProductTitle');
    if (titleEl) {
      titleEl.textContent = product.title || '제목 없음';
    }

    // 5. 판매 위치 및 업로드 시간 바인딩
    const locEl = document.getElementById('modalProductLocation');
    if (locEl) {
      locEl.textContent = product.location || '동네 미지정';
    }
    const timeEl = document.getElementById('modalProductTimeAgo');
    if (timeEl) {
      timeEl.textContent = product.timeAgo || '방금 전';
    }

    // 6. 가격 (원화 포맷팅) 바인딩
    const priceEl = document.getElementById('modalProductPrice');
    if (priceEl) {
      const priceVal = product.price;
      if (typeof priceVal === 'number') {
        priceEl.textContent = priceVal === 0 ? '무료나눔' : `${priceVal.toLocaleString('ko-KR')}원`;
      } else if (priceVal) {
        priceEl.textContent = `${priceVal}원`;
      } else {
        priceEl.textContent = '0원';
      }
    }

    // 7. 상품 상세 설명 (줄바꿈 지원) 바인딩
    const descEl = document.getElementById('modalProductDescription');
    if (descEl) {
      descEl.textContent = product.description || '등록된 상세 설명이 없습니다.';
    }

    // 8. 판매자 정보 바인딩
    const seller = product.seller || {};

    const sellerImgEl = document.getElementById('modalSellerImage');
    if (sellerImgEl) {
      sellerImgEl.src = seller.profileImage || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80';
      sellerImgEl.alt = `${seller.nickname || '판매자'} 프로필`;
    }

    const sellerNickEl = document.getElementById('modalSellerNickname');
    if (sellerNickEl) {
      sellerNickEl.textContent = seller.nickname || '익명감자';
    }

    const sellerLocEl = document.getElementById('modalSellerLocation');
    if (sellerLocEl) {
      sellerLocEl.textContent = seller.location || product.location || '동네 미지정';
    }

    // 매너온도 (기본 36.5°C)
    const mannerTemp = typeof seller.mannerTemp === 'number' ? seller.mannerTemp : 36.5;

    const mannerTempEl = document.getElementById('modalSellerMannerTemp');
    if (mannerTempEl) {
      mannerTempEl.textContent = `${mannerTemp.toFixed(1)}°C`;
    }

    const mannerBarEl = document.getElementById('modalSellerMannerBar');
    if (mannerBarEl) {
      // 0~60°C 범위를 게이지 10~100%로 시각화 (36.5°C일 때 약 60%)
      const gaugePercent = Math.min(100, Math.max(12, ((mannerTemp - 20) / 40) * 100));
      mannerBarEl.style.width = `${gaugePercent}%`;
    }

    const mannerEmojiEl = document.getElementById('modalSellerMannerEmoji');
    if (mannerEmojiEl) {
      if (mannerTemp >= 40.0) {
        mannerEmojiEl.textContent = '🥔🔥';
      } else if (mannerTemp >= 37.5) {
        mannerEmojiEl.textContent = '🥔✨';
      } else if (mannerTemp >= 36.5) {
        mannerEmojiEl.textContent = '🥔';
      } else {
        mannerEmojiEl.textContent = '🌱';
      }
    }

    const mannerDiffEl = document.getElementById('modalSellerMannerDiff');
    if (mannerDiffEl) {
      const diff = Number((mannerTemp - 36.5).toFixed(1));
      if (diff > 0) {
        mannerDiffEl.textContent = `첫 온도 36.5°C보다 +${diff}°C 높아요!`;
      } else if (diff < 0) {
        mannerDiffEl.textContent = `첫 온도 36.5°C보다 ${Math.abs(diff)}°C 낮아요.`;
      } else {
        mannerDiffEl.textContent = `첫 온도 36.5°C 기본 매너예요.`;
      }
    }

    // 9. 관심 추가(찜) 버튼 상태 초기화
    const likeBtn = document.getElementById('modalLikeBtn');
    const likeText = document.getElementById('modalLikeText');
    const isLiked = (window.productStore && typeof window.productStore.isLiked === 'function')
      ? window.productStore.isLiked(product.id)
      : likedProductIds.has(product.id);

    if (likeBtn) {
      if (isLiked) {
        likedProductIds.add(product.id);
        likeBtn.classList.add('liked');
        if (likeText) likeText.textContent = '관심 해제';
      } else {
        likedProductIds.delete(product.id);
        likeBtn.classList.remove('liked');
        if (likeText) likeText.textContent = '관심 추가';
      }
    }

    // 10. 스크롤 위치 상단 초기화
    const scrollContent = modal.querySelector('.modal-scroll-content');
    if (scrollContent) {
      scrollContent.scrollTop = 0;
    }

    // 11. 모달 활성화 및 배경 스크롤 잠금
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  };

  /**
   * 전역 함수: 상세 팝업 닫기
   */
  window.closeDetailModal = function () {
    const modal = document.getElementById('detailModal');
    if (!modal) return;

    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    currentModalProductId = null;
    currentModalProduct = null;
  };

  /**
   * 전역 함수: 감자 토스트 메시지 노출
   */
  window.showGamzaToast = showGamzaToast;

  // DOMContentLoaded 시점에 모달이 이미 HTML에 존재한다면 사전 이벤트 바인딩
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      ensureDetailModalDOM();
    });
  } else {
    ensureDetailModalDOM();
  }
})();
