/**
 * js/data.js
 * 감자마켓 데이터 스토어 (Supabase 실시간 DB 연동 + 오프라인 폴백 지원)
 */

// 오프라인 / 네트워크 초기 로딩 시 사용할 기본 폴백 데이터
const INITIAL_PRODUCTS = [
  {
    id: 1,
    title: "아이패드 에어 5세대 M1 64GB 스페이스그레이",
    category: "디지털기기",
    price: 540000,
    location: "서초동",
    timeAgo: "15분 전",
    status: "판매중",
    imageUrl: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=800&q=80",
    description: "작년 가을에 구매해서 인강용으로만 조심스럽게 사용했습니다. 강화유리 필름 붙어있고 배터리 효율 94%입니다. 마그네틱 케이스 함께 드립니다. 직거래는 서초역 부근 희망합니다!",
    seller: {
      nickname: "햇감자사랑",
      profileImage: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
      location: "서초동",
      mannerTemp: 37.8
    }
  },
  {
    id: 2,
    title: "원목 미니 사이드 테이블 (원형)",
    category: "가구/인테리어",
    price: 32000,
    location: "방배동",
    timeAgo: "45분 전",
    status: "예약중",
    imageUrl: "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&w=800&q=80",
    description: "침대 옆 협탁이나 거실 소파 옆에 두기 좋은 감성 원목 테이블입니다. 이사 가면서 인테리어 변경으로 저렴하게 내놓습니다. 눈에 띄는 스크래치 없이 깨끗합니다.",
    seller: {
      nickname: "방배동포슬이",
      profileImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
      location: "방배동",
      mannerTemp: 41.2
    }
  },
  {
    id: 3,
    title: "파타고니아 클래식 레트로-X 플리스 자켓 M",
    category: "의류",
    price: 135000,
    location: "양재동",
    timeAgo: "2시간 전",
    status: "판매중",
    imageUrl: "https://images.unsplash.com/photo-1578587018452-892bacefd3f2?auto=format&fit=crop&w=800&q=80",
    description: "정품 파타고니아 플리스 네추럴 색상입니다. 사이즈 미스로 실착 3회 미만이고 드라이클리닝 완료된 상태입니다. 털 뭉침이나 오염 전혀 없습니다.",
    seller: {
      nickname: "감자도리",
      profileImage: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80",
      location: "양재동",
      mannerTemp: 39.5
    }
  },
  {
    id: 4,
    title: "드롱기 데디카 반자동 에스프레소 머신 EC685",
    category: "생활가전",
    price: 110000,
    location: "반포동",
    timeAgo: "4시간 전",
    status: "거래 완료",
    imageUrl: "https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?auto=format&fit=crop&w=800&q=80",
    description: "홈카페 시작하기 좋은 컴팩트한 커피머신입니다. 사용감 약간 있으나 모든 기능 정상 작동하며 내부 디스케일링 청소 마쳤습니다. 포터필터 탬퍼 바스켓 풀박스입니다.",
    seller: {
      nickname: "모닝커피",
      profileImage: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80",
      location: "반포동",
      mannerTemp: 36.5
    }
  },
  {
    id: 5,
    title: "미야자키 하야오 애니메이션 아트북 전 3권 세트",
    category: "도서/티켓",
    price: 45000,
    location: "서초동",
    timeAgo: "6시간 전",
    status: "판매중",
    imageUrl: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80",
    description: "센과 치히로, 하울의 움직이는 성, 토토로 풀컬러 아트북 양장본입니다. 책장에만 꽂아두어 거의 새책 상태입니다. 소장가치 충분합니다.",
    seller: {
      nickname: "포테이토칩",
      profileImage: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80",
      location: "서초동",
      mannerTemp: 38.1
    }
  },
  {
    id: 6,
    title: "킨토 데이오프 텀블러 500ml 카키 (새상품)",
    category: "기타",
    price: 24000,
    location: "잠원동",
    timeAgo: "1일 전",
    status: "예약중",
    imageUrl: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=800&q=80",
    description: "박스만 개봉해본 미사용 새상품입니다. 손잡이가 달려있어 야외활동이나 사무실에서 쓰기 편리해요. 색상도 예쁩니다.",
    seller: {
      nickname: "감자칩마스터",
      profileImage: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80",
      location: "잠원동",
      mannerTemp: 36.5
    }
  }
];

// Supabase 연동 데이터 관리 스토어
class ProductStore {
  constructor() {
    this.products = [...INITIAL_PRODUCTS];
    this.listeners = [];
    this.likedProductIds = new Set();
    this.isLoadedFromDb = false;

    // Supabase DB 비동기 동기화
    this.initDb();
  }

  /**
   * Supabase DB에서 최신 상품 목록 및 찜 목록 불러오기
   */
  async initDb() {
    if (!window.gamzaSupabase) {
      console.warn('[Gamza] gamzaSupabase 모듈이 로드되지 않아 초기 데이터를 사용합니다.');
      return;
    }

    try {
      // 1. Supabase 상품 로드
      const dbProducts = await window.gamzaSupabase.fetchProducts();
      if (Array.isArray(dbProducts) && dbProducts.length > 0) {
        this.products = dbProducts;
        this.isLoadedFromDb = true;
        console.log(`[Gamza] ⚡ Supabase DB에서 상품 ${dbProducts.length}건을 성공적으로 연동했습니다.`);
        this.notify();
      }

      // 2. 관심(찜) 목록 로드
      const likesSet = await window.gamzaSupabase.fetchLikedProductIds();
      if (likesSet) {
        this.likedProductIds = likesSet;
      }
    } catch (err) {
      console.warn('[Gamza] Supabase 초기 로딩 실패, 로컬 시드 데이터를 유지합니다:', err);
    }
  }

  getProducts() {
    return [...this.products];
  }

  getProductById(id) {
    return this.products.find(p => String(p.id) === String(id));
  }

  isLiked(productId) {
    return this.likedProductIds.has(Number(productId));
  }

  /**
   * 관심(찜) 토글 처리
   */
  async toggleLike(productId) {
    const numId = Number(productId);
    if (window.gamzaSupabase) {
      try {
        const isLiked = await window.gamzaSupabase.toggleProductLike(numId);
        if (isLiked) {
          this.likedProductIds.add(numId);
        } else {
          this.likedProductIds.delete(numId);
        }
        return isLiked;
      } catch (err) {
        console.error('[Gamza] 찜 토글 중 Supabase 오류:', err);
      }
    }

    // 로컬 폴백 토글
    if (this.likedProductIds.has(numId)) {
      this.likedProductIds.delete(numId);
      return false;
    } else {
      this.likedProductIds.add(numId);
      return true;
    }
  }

  /**
   * 신규 상품 등록 (즉시 낙관적 렌더링 + Supabase 영구 저장)
   */
  async addProduct(newProduct) {
    const tempId = Date.now();

    // 현재 로그인 유저 정보 반영
    const profile = window.gamzaAuth && typeof window.gamzaAuth.getCurrentProfile === 'function'
      ? window.gamzaAuth.getCurrentProfile()
      : null;
    const sellerNickname = profile ? profile.nickname : '동네감자 (나)';
    const sellerImage = profile && profile.profile_image
      ? profile.profile_image
      : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80';

    const sellerId = profile ? profile.id : (window.gamzaSupabase ? window.gamzaSupabase.defaultUserId : 'demo');

    const optimisticProduct = {
      id: tempId,
      seller_id: sellerId,
      timeAgo: "방금 전",
      seller: {
        id: sellerId,
        nickname: sellerNickname,
        profileImage: sellerImage,
        location: newProduct.location || "서초동",
        mannerTemp: 36.5
      },
      ...newProduct
    };

    // 1. 화면 즉각 반응을 위한 낙관적 목록 추가
    this.products.unshift(optimisticProduct);
    this.notify();

    // 2. Supabase DB 비동기 저장
    if (window.gamzaSupabase) {
      try {
        const savedProduct = await window.gamzaSupabase.addProduct(newProduct);
        if (savedProduct) {
          const index = this.products.findIndex(p => p.id === tempId);
          if (index !== -1) {
            this.products[index] = savedProduct;
          }
          this.notify();
          console.log('[Gamza] ⚡ Supabase DB에 새 상품이 영구 저장되었습니다. ID:', savedProduct.id);
          return savedProduct;
        }
      } catch (err) {
        console.error('[Gamza] Supabase DB 저장 실패:', err);
      }
    }

    return optimisticProduct;
  }

  /**
   * 상품 내용 수정 (낙관적 업데이트 + Supabase 동기화)
   */
  async updateProduct(productId, updatedPayload) {
    const numId = Number(productId);
    const idx = this.products.findIndex(p => String(p.id) === String(numId));
    if (idx !== -1) {
      this.products[idx] = { ...this.products[idx], ...updatedPayload };
      this.notify();
    }

    if (window.gamzaSupabase && typeof window.gamzaSupabase.updateProduct === 'function') {
      try {
        const saved = await window.gamzaSupabase.updateProduct(numId, updatedPayload);
        if (saved && idx !== -1) {
          this.products[idx] = saved;
          this.notify();
        }
        console.log(`[Gamza] ⚡ 상품 ${numId} 수정 저장 완료`);
        return saved;
      } catch (err) {
        console.error('[Gamza] 상품 수정 Supabase 실패:', err);
      }
    }
    return this.products[idx] || null;
  }

  /**
   * 상품 판매 상태 변경 (낙관적 업데이트 + Supabase 동기화)
   */
  async updateProductStatus(productId, newStatus) {
    const numId = Number(productId);

    // 낙관적 업데이트
    const idx = this.products.findIndex(p => String(p.id) === String(numId));
    if (idx !== -1) {
      this.products[idx] = { ...this.products[idx], status: newStatus };
      this.notify();
    }

    if (window.gamzaSupabase && typeof window.gamzaSupabase.updateProductStatus === 'function') {
      try {
        const updated = await window.gamzaSupabase.updateProductStatus(numId, newStatus);
        if (updated && idx !== -1) {
          this.products[idx] = updated;
          this.notify();
        }
        console.log(`[Gamza] ⚡ 상품 ${numId} 상태 → "${newStatus}" 저장 완료`);
        return updated;
      } catch (err) {
        console.error('[Gamza] 상태 업데이트 Supabase 실패:', err);
      }
    }
    return this.products[idx] || null;
  }

  /**
   * 상품 삭제
   */
  async deleteProduct(productId) {
    const numId = Number(productId);

    // 낙관적 제거
    const prevLen = this.products.length;
    this.products = this.products.filter(p => String(p.id) !== String(numId));
    if (this.products.length !== prevLen) this.notify();

    if (window.gamzaSupabase && typeof window.gamzaSupabase.deleteProduct === 'function') {
      try {
        await window.gamzaSupabase.deleteProduct(numId);
        console.log(`[Gamza] ⚡ 상품 ${numId} 삭제 완료`);
        return true;
      } catch (err) {
        console.error('[Gamza] 삭제 Supabase 실패:', err);
        return false;
      }
    }
    return true;
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(cb => {
      try {
        cb(this.getProducts());
      } catch (e) {
        console.error('[Gamza] Listener 오류:', e);
      }
    });
  }
}

// 전역 싱글톤 스토어 생성
window.productStore = new ProductStore();
