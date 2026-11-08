/**
 * js/screen1.js
 * 감자 중고거래 웹 서비스 - [화면 1: 상품 목록] 컨트롤러
 */

(function () {
  'use strict';

  // 상태 관리
  let currentCategory = '전체';
  let isAvailableOnly = false;
  let searchQuery = '';

  /**
   * HTML 특수문자 이스케이프 유틸리티
   */
  function escapeHtml(str) {
    if (typeof str !== 'string') return String(str ?? '');
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * 판매 상태 뱃지 HTML 생성
   */
  function getStatusBadgeHtml(status) {
    const s = String(status || '').trim();
    let badgeClass = 'sale';
    if (s === '예약중') {
      badgeClass = 'reserved';
    } else if (s === '거래 완료' || s === '거래완료' || s === '완료') {
      badgeClass = 'completed';
    }
    return `<span class="status-badge ${badgeClass}">${escapeHtml(status || '판매중')}</span>`;
  }

  /**
   * 개별 상품 카드 HTML 생성
   */
  function createProductCardHtml(product) {
    const formattedPrice =
      typeof product.price === 'number'
        ? product.price === 0
          ? '무료 나눔 🥔'
          : `${product.price.toLocaleString('ko-KR')}원`
        : product.price || '0원';

    const s = String(product.status || '').trim();
    const isCompleted = s === '거래 완료' || s === '거래완료' || s === '완료';
    const completedOverlay = isCompleted
      ? `<div class="card-completed-overlay"><span class="completed-badge">거래 완료</span></div>`
      : '';

    return `
      <article 
        class="product-card${isCompleted ? ' completed is-completed' : ''}" 
        data-id="${product.id}" 
        tabindex="0" 
        role="button" 
        aria-label="${escapeHtml(product.title)} 상품 상세 보기"
      >
        <div class="product-thumb-container">
          <img 
            src="${escapeHtml(product.imageUrl)}" 
            alt="${escapeHtml(product.title)}" 
            class="product-thumb" 
            loading="lazy" 
            onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=800&q=80';"
          />
          ${completedOverlay}
        </div>
        <div class="product-info">
          <div class="product-badge-row">
            ${getStatusBadgeHtml(product.status)}
            <span class="product-category-tag">${escapeHtml(product.category || '기타')}</span>
          </div>
          <h3 class="product-title" title="${escapeHtml(product.title)}">${escapeHtml(product.title)}</h3>
          <div class="product-meta">
            <span class="product-location">${escapeHtml(product.location || '동네')}</span>
            <span class="meta-dot">·</span>
            <span class="product-time">${escapeHtml(product.timeAgo || '방금 전')}</span>
          </div>
          <div class="product-seller-row">
            <span class="product-seller-nick">🥔 ${escapeHtml((product.seller && product.seller.nickname) || '동네이웃')}</span>
          </div>
          <div class="product-price">${formattedPrice}</div>
        </div>
      </article>
    `;
  }

  /**
   * 상품 목록 렌더링 함수
   * window.productStore에서 상품 목록을 가져와 필터링 후 렌더링
   */
  function renderProductList() {
    const productListEl = document.getElementById('productList');
    const emptyStateEl = document.getElementById('emptyState');
    const productCountEl = document.getElementById('productCount');

    if (!productListEl) return;

    // 1. window.productStore에서 원본 데이터 획득
    let products = [];
    if (window.productStore && typeof window.productStore.getProducts === 'function') {
      products = window.productStore.getProducts();
    }

    // 2. 카테고리 필터링
    let filtered = products;
    if (currentCategory && currentCategory !== '전체') {
      filtered = filtered.filter(p => p.category === currentCategory);
    }

    // 3. '거래 가능만 보기' 필터링 (켜면 '거래 완료' 제외)
    if (isAvailableOnly) {
      filtered = filtered.filter(p => {
        const s = String(p.status || '').trim();
        return s !== '거래 완료' && s !== '거래완료' && s !== '완료';
      });
    }

    // 4. 검색어 필터링 (제목, 설명, 지역, 카테고리 매칭)
    const trimmedQuery = searchQuery.trim().toLowerCase();
    if (trimmedQuery !== '') {
      filtered = filtered.filter(p => {
        const titleMatch = (p.title || '').toLowerCase().includes(trimmedQuery);
        const descMatch = (p.description || '').toLowerCase().includes(trimmedQuery);
        const locationMatch = (p.location || '').toLowerCase().includes(trimmedQuery);
        const categoryMatch = (p.category || '').toLowerCase().includes(trimmedQuery);
        return titleMatch || descMatch || locationMatch || categoryMatch;
      });
    }

    // 5. 건수 표시 업데이트
    if (productCountEl) {
      productCountEl.textContent = `${filtered.length}개`;
    }

    // 6. 결과에 따른 뷰 전환
    if (filtered.length === 0) {
      productListEl.innerHTML = '';
      productListEl.style.display = 'none';
      if (emptyStateEl) {
        emptyStateEl.style.display = 'flex';
      }
    } else {
      if (emptyStateEl) {
        emptyStateEl.style.display = 'none';
      }
      productListEl.style.display = 'grid';
      productListEl.innerHTML = filtered.map(createProductCardHtml).join('');
    }
  }

  /**
   * 필터 및 검색 초기화 함수
   */
  function resetFilters() {
    currentCategory = '전체';
    isAvailableOnly = false;
    searchQuery = '';

    // 검색창 초기화
    const searchInput = document.getElementById('searchInput');
    const searchClearBtn = document.getElementById('searchClearBtn');
    if (searchInput) searchInput.value = '';
    if (searchClearBtn) searchClearBtn.style.display = 'none';

    // 토글 초기화
    const toggle = document.getElementById('availableOnlyToggle');
    if (toggle) toggle.checked = false;

    // 카테고리 칩 UI 초기화
    const chipsWrapper = document.getElementById('categoryChips');
    if (chipsWrapper) {
      chipsWrapper.querySelectorAll('.category-chip').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.category === '전체');
      });
    }

    // 목록 타이틀 초기화
    const titleEl = document.getElementById('listTitle');
    if (titleEl) titleEl.textContent = '오늘의 감자 마켓';

    renderProductList();
  }

  /**
   * 화면 1 이벤트 리스너 바인딩 및 초기화
   */
  function initScreen1() {
    const productListEl = document.getElementById('productList');
    if (!productListEl) return;

    // A. 상품 카드 클릭 (이벤트 위임) -> window.openDetailModal(productId) 호출
    productListEl.addEventListener('click', e => {
      const card = e.target.closest('.product-card');
      if (card && card.dataset.id) {
        const productId = Number(card.dataset.id);
        if (typeof window.openDetailModal === 'function') {
          window.openDetailModal(productId);
        } else {
          console.info(`[감자] window.openDetailModal(${productId}) 호출`);
        }
      }
    });

    // 키보드 접근성: Enter / Space 키로 상품 카드 클릭
    productListEl.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        const card = e.target.closest('.product-card');
        if (card && card.dataset.id) {
          e.preventDefault();
          const productId = Number(card.dataset.id);
          if (typeof window.openDetailModal === 'function') {
            window.openDetailModal(productId);
          } else {
            console.info(`[감자] window.openDetailModal(${productId}) 호출`);
          }
        }
      }
    });

    // B. [글쓰기] 버튼 클릭 -> 로그인 여부 체크 후 window.openWriteModal() 호출
    const writeBtn = document.getElementById('writeBtn');
    if (writeBtn) {
      writeBtn.addEventListener('click', () => {
        // 로그인 상태 확인
        const isLoggedIn = window.gamzaAuth && window.gamzaAuth.isLoggedIn();
        if (!isLoggedIn) {
          // 비로그인: 로그인 모달 먼저 열고, 로그인 성공 후 글쓰기 모달 자동 오픈
          if (typeof window.openLoginModal === 'function') {
            window.openLoginModal(() => {
              if (typeof window.openWriteModal === 'function') {
                window.openWriteModal();
              }
            });
          }
          return;
        }
        if (typeof window.openWriteModal === 'function') {
          window.openWriteModal();
        } else {
          console.info('[감자] window.openWriteModal() 호출');
        }
      });
    }

    // C. [로그인] 버튼 클릭 -> auth.js 에서 처리하므로 여기서는 제거
    // (auth.js bindAuthEvents 에서 loginBtn 이벤트 등록)

    // D. 로고 클릭 시 홈/필터 초기화
    const logoBtn = document.getElementById('logoBtn');
    if (logoBtn) {
      logoBtn.addEventListener('click', e => {
        e.preventDefault();
        resetFilters();
      });
    }

    // E. 카테고리 칩 클릭 동작
    const categoryChips = document.getElementById('categoryChips');
    if (categoryChips) {
      categoryChips.addEventListener('click', e => {
        const chip = e.target.closest('.category-chip');
        if (!chip) return;

        const selectedCat = chip.dataset.category;
        if (!selectedCat) return;

        currentCategory = selectedCat;

        // 선택된 카테고리 강조 스타일 처리
        categoryChips.querySelectorAll('.category-chip').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.category === currentCategory);
        });

        // 타이틀 변경
        const titleEl = document.getElementById('listTitle');
        if (titleEl) {
          titleEl.textContent =
            currentCategory === '전체'
              ? '오늘의 감자 마켓'
              : `${currentCategory} 인기 매물`;
        }

        renderProductList();
      });
    }

    // F. '거래 가능만 보기' 토글 스위치 동작
    const availableOnlyToggle = document.getElementById('availableOnlyToggle');
    if (availableOnlyToggle) {
      availableOnlyToggle.addEventListener('change', e => {
        isAvailableOnly = e.target.checked;
        renderProductList();
      });
    }

    // G. 검색창 동작 (실시간 입력, 엔터/버튼 검색, 초기화)
    const searchInput = document.getElementById('searchInput');
    const searchForm = document.getElementById('searchForm');
    const searchClearBtn = document.getElementById('searchClearBtn');
    const searchBtn = document.getElementById('searchBtn');

    if (searchInput) {
      // 실시간 검색
      searchInput.addEventListener('input', e => {
        searchQuery = e.target.value;
        if (searchClearBtn) {
          searchClearBtn.style.display = searchQuery.length > 0 ? 'flex' : 'none';
        }
        renderProductList();
      });

      // 엔터 키 검색 대응
      searchInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          searchQuery = searchInput.value;
          renderProductList();
        }
      });
    }

    if (searchForm) {
      searchForm.addEventListener('submit', e => {
        e.preventDefault();
        if (searchInput) {
          searchQuery = searchInput.value;
          renderProductList();
        }
      });
    }

    if (searchBtn) {
      searchBtn.addEventListener('click', e => {
        e.preventDefault();
        if (searchInput) {
          searchQuery = searchInput.value;
          renderProductList();
        }
      });
    }

    if (searchClearBtn) {
      searchClearBtn.addEventListener('click', () => {
        if (searchInput) {
          searchInput.value = '';
          searchQuery = '';
          searchClearBtn.style.display = 'none';
          searchInput.focus();
          renderProductList();
        }
      });
    }

    // H. 빈 상태 초기화 버튼 동작
    const emptyResetBtn = document.getElementById('emptyResetBtn');
    if (emptyResetBtn) {
      emptyResetBtn.addEventListener('click', () => {
        resetFilters();
      });
    }

    // 초기 렌더링 실행
    renderProductList();
  }

  // 7. window.productStore.subscribe()를 통한 상품 추가 시 자동 리렌더링
  function setupStoreSubscription() {
    if (window.productStore && typeof window.productStore.subscribe === 'function') {
      window.productStore.subscribe(() => {
        renderProductList();
      });
    } else {
      // productStore 로딩이 늦어질 경우를 대비한 재시도
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if (window.productStore && typeof window.productStore.subscribe === 'function') {
          window.productStore.subscribe(() => {
            renderProductList();
          });
          renderProductList();
          clearInterval(interval);
        } else if (attempts >= 10) {
          clearInterval(interval);
        }
      }, 200);
    }
  }

  // 전역 함수 노출
  window.renderProductList = renderProductList;
  window.resetFilters = resetFilters;
  window.initScreen1 = initScreen1;

  // 스토어 구독 설정
  setupStoreSubscription();

  // DOM 로드 완료 시 초기화 실행
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initScreen1);
  } else {
    initScreen1();
  }
})();
