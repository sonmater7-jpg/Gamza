/**
 * js/supabaseClient.js
 * 감자마켓(Gamza) Supabase DB 연동 클라이언트 모듈
 */

(function () {
  'use strict';

  const SUPABASE_URL = 'https://ftxrlstlkfjzjjggqpmv.supabase.co';
  const SUPABASE_ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0eHJsc3Rsa2ZqempqZ2dxcG12Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM2NzI3MDAsImV4cCI6MjEwOTI0ODcwMH0.u4QHXeg5SPYIej8YdNbOVMjxxa3z8Z7TJiPAs0tIYkI';

  // 현재 기본 로그인 사용자 프로필 ('동네감자 (나)')
  const DEFAULT_USER_ID = 'a0000000-0000-0000-0000-000000000007';

  const DEFAULT_POTATO_IMAGE =
    'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=800&q=80';
  const DEFAULT_SELLER_IMAGE =
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80';

  // Supabase 공식 JS SDK 인스턴스 (CDN 로드 시 사용)
  let supabaseSdk = null;
  if (typeof window.supabase !== 'undefined' && typeof window.supabase.createClient === 'function') {
    try {
      supabaseSdk = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      console.log('[Gamza] Supabase JS SDK 초기화 성공');
    } catch (e) {
      console.warn('[Gamza] Supabase SDK 초기화 실패, REST API 모드로 작동합니다.', e);
    }
  }

  /**
   * 상대 시간 계산 유틸 (등록일시 -> '방금 전', '15분 전', '2시간 전' 등)
   */
  function formatTimeAgo(dateString) {
    if (!dateString) return '방금 전';
    const now = new Date();
    const past = new Date(dateString);
    const diffSec = Math.floor((now - past) / 1000);

    if (diffSec < 60) return '방금 전';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}분 전`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}시간 전`;
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 30) return `${diffDay}일 전`;
    const diffMonth = Math.floor(diffDay / 30);
    if (diffMonth < 12) return `${diffMonth}달 전`;
    return `${Math.floor(diffMonth / 12)}년 전`;
  }

  /**
   * Supabase DB Row -> 화면 UI 표준 객체로 변환
   */
  function mapRowToProduct(row) {
    const profile = row.profiles || row.seller || {};
    return {
      id: row.id,
      seller_id: row.seller_id || profile.id || null,
      title: row.title,
      category: row.category,
      price: typeof row.price === 'number' ? row.price : 0,
      location: row.location || '서초동',
      timeAgo: formatTimeAgo(row.created_at),
      status: row.status || '판매중',
      imageUrl: row.image_url || DEFAULT_POTATO_IMAGE,
      description: row.description || '',
      seller: {
        id: row.seller_id || profile.id || null,
        nickname: profile.nickname || '동네이웃',
        profileImage: profile.profile_image || DEFAULT_SELLER_IMAGE,
        location: profile.location || row.location || '서초동',
        mannerTemp: typeof profile.manner_temp === 'number' ? profile.manner_temp : 36.5
      },
      createdAt: row.created_at
    };
  }

  /**
   * Supabase REST API 직접 호출 헬퍼 (SDK 누락/실패 시에도 무조건 작동 보장)
   */
  async function restRequest(endpoint, options = {}) {
    const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
    const headers = {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      Prefer: options.prefer || 'return=representation',
      ...(options.headers || {})
    };

    const res = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Supabase API 오류 (${res.status}): ${errText}`);
    }

    if (res.status === 204) return null;
    return await res.json();
  }

  /**
   * 상품 목록 전체 조회 (Supabase products + profiles 조인)
   */
  async function fetchProducts() {
    try {
      if (supabaseSdk) {
        const { data, error } = await supabaseSdk
          .from('products')
          .select('*, profiles(nickname, profile_image, location, manner_temp, is_verified)')
          .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []).map(mapRowToProduct);
      } else {
        const endpoint =
          'products?select=id,title,category,price,location,status,image_url,description,seller_id,created_at,profiles(nickname,profile_image,location,manner_temp,is_verified)&order=created_at.desc';
        const data = await restRequest(endpoint);
        return (data || []).map(mapRowToProduct);
      }
    } catch (err) {
      console.error('[Gamza] Supabase 상품 조회 실패:', err);
      throw err;
    }
  }

  /**
   * 신규 상품 Supabase 등록
   */
  async function addProduct(productPayload) {
    // 로그인한 사용자의 profile.id 우선 사용, 없으면 기본 데모 유저
    const profile = window.gamzaAuth && window.gamzaAuth.getCurrentProfile
      ? window.gamzaAuth.getCurrentProfile()
      : null;
    const sellerId = profile ? profile.id : DEFAULT_USER_ID;

    const insertRow = {
      title: productPayload.title,
      category: productPayload.category,
      price: productPayload.price,
      location: productPayload.location,
      status: productPayload.status || '판매중',
      image_url: productPayload.imageUrl || DEFAULT_POTATO_IMAGE,
      description: productPayload.description,
      seller_id: sellerId
    };

    try {
      if (supabaseSdk) {
        const { data, error } = await supabaseSdk
          .from('products')
          .insert([insertRow])
          .select('*, profiles(nickname, profile_image, location, manner_temp, is_verified)')
          .single();

        if (error) throw error;
        return mapRowToProduct(data);
      } else {
        const endpoint =
          'products?select=id,title,category,price,location,status,image_url,description,created_at,profiles(nickname,profile_image,location,manner_temp,is_verified)';
        const result = await restRequest(endpoint, {
          method: 'POST',
          body: insertRow
        });
        const created = Array.isArray(result) ? result[0] : result;
        return mapRowToProduct(created);
      }
    } catch (err) {
      console.error('[Gamza] Supabase 상품 등록 실패:', err);
      throw err;
    }
  }

  /**
   * 관심(찜) 목록 조회
   */
  async function fetchLikedProductIds(userId = DEFAULT_USER_ID) {
    try {
      if (supabaseSdk) {
        const { data, error } = await supabaseSdk
          .from('product_likes')
          .select('product_id')
          .eq('user_id', userId);
        if (error) throw error;
        return new Set((data || []).map((row) => Number(row.product_id)));
      } else {
        const endpoint = `product_likes?select=product_id&user_id=eq.${userId}`;
        const data = await restRequest(endpoint);
        return new Set((data || []).map((row) => Number(row.product_id)));
      }
    } catch (err) {
      console.warn('[Gamza] 관심 목록 조회 경고 (로컬 메모리 유지):', err);
      return new Set();
    }
  }

  /**
   * 관심(찜) 상태 토글 (추가/해제)
   */
  async function toggleProductLike(productId, userId = DEFAULT_USER_ID) {
    const numId = Number(productId);
    try {
      // 1. 현재 찜 여부 확인
      let exists = false;
      if (supabaseSdk) {
        const { data } = await supabaseSdk
          .from('product_likes')
          .select('id')
          .eq('product_id', numId)
          .eq('user_id', userId);
        exists = data && data.length > 0;
      } else {
        const check = await restRequest(`product_likes?select=id&product_id=eq.${numId}&user_id=eq.${userId}`);
        exists = check && check.length > 0;
      }

      if (exists) {
        // 찜 해제 (DELETE)
        if (supabaseSdk) {
          await supabaseSdk
            .from('product_likes')
            .delete()
            .eq('product_id', numId)
            .eq('user_id', userId);
        } else {
          await restRequest(`product_likes?product_id=eq.${numId}&user_id=eq.${userId}`, {
            method: 'DELETE'
          });
        }
        return false; // 해제됨
      } else {
        // 찜 추가 (INSERT)
        if (supabaseSdk) {
          await supabaseSdk
            .from('product_likes')
            .insert([{ product_id: numId, user_id: userId }]);
        } else {
          await restRequest('product_likes', {
            method: 'POST',
            body: { product_id: numId, user_id: userId }
          });
        }
        return true; // 등록됨
      }
    } catch (err) {
      console.error('[Gamza] 관심 상태 변경 실패:', err);
      throw err;
    }
  }

  /**
   * 상품 판매 상태 업데이트 (판매중 / 예약중 / 거래 완료)
   */
  async function updateProductStatus(productId, newStatus) {
    const numId = Number(productId);
    try {
      if (supabaseSdk) {
        const { data, error } = await supabaseSdk
          .from('products')
          .update({ status: newStatus })
          .eq('id', numId)
          .select('*, profiles(nickname, profile_image, location, manner_temp, is_verified)')
          .single();
        if (error) throw error;
        return mapRowToProduct(data);
      } else {
        const result = await restRequest(`products?id=eq.${numId}`, {
          method: 'PATCH',
          body: { status: newStatus }
        });
        const updated = Array.isArray(result) ? result[0] : result;
        return updated ? mapRowToProduct(updated) : null;
      }
    } catch (err) {
      console.error('[Gamza] 상품 상태 업데이트 실패:', err);
      throw err;
    }
  }

  /**
   * 상품 삭제
   */
  async function deleteProduct(productId) {
    const numId = Number(productId);
    try {
      if (supabaseSdk) {
        const { error } = await supabaseSdk
          .from('products')
          .delete()
          .eq('id', numId);
        if (error) throw error;
      } else {
        await restRequest(`products?id=eq.${numId}`, { method: 'DELETE' });
      }
      return true;
    } catch (err) {
      console.error('[Gamza] 상품 삭제 실패:', err);
      throw err;
    }
  }

  /**
   * 상품 내용 전체 업데이트 (글 수정)
   */
  async function updateProduct(productId, productPayload) {
    const numId = Number(productId);
    const updateRow = {};
    if (productPayload.title !== undefined) updateRow.title = productPayload.title;
    if (productPayload.category !== undefined) updateRow.category = productPayload.category;
    if (productPayload.price !== undefined) updateRow.price = productPayload.price;
    if (productPayload.location !== undefined) updateRow.location = productPayload.location;
    if (productPayload.status !== undefined) updateRow.status = productPayload.status;
    if (productPayload.imageUrl !== undefined) updateRow.image_url = productPayload.imageUrl;
    if (productPayload.description !== undefined) updateRow.description = productPayload.description;

    try {
      if (supabaseSdk) {
        const { data, error } = await supabaseSdk
          .from('products')
          .update(updateRow)
          .eq('id', numId)
          .select('*, profiles(nickname, profile_image, location, manner_temp, is_verified)')
          .single();
        if (error) throw error;
        return mapRowToProduct(data);
      } else {
        const result = await restRequest(`products?id=eq.${numId}`, {
          method: 'PATCH',
          body: updateRow
        });
        const updated = Array.isArray(result) ? result[0] : result;
        return updated ? mapRowToProduct(updated) : null;
      }
    } catch (err) {
      console.error('[Gamza] 상품 수정 실패:', err);
      throw err;
    }
  }

  /**
   * 로컬 파일 이미지를 Data URL로 변환 (파일 업로드 헬퍼)
   */
  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }

  /**
   * 이미지 업로드 (Supabase Storage 버킷 업로드 시도 후 실패 시 Data URL Fallback)
   */
  async function uploadImage(file, bucketName = 'products') {
    if (!file) return null;

    // 1. Supabase Storage 업로드 시도 (지원되는 경우)
    if (supabaseSdk && supabaseSdk.storage) {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { data, error } = await supabaseSdk.storage
          .from(bucketName)
          .upload(filePath, file, { cacheControl: '3600', upsert: true });

        if (!error && data) {
          const { data: publicData } = supabaseSdk.storage
            .from(bucketName)
            .getPublicUrl(filePath);

          if (publicData && publicData.publicUrl) {
            return publicData.publicUrl;
          }
        }
      } catch (storageErr) {
        console.warn(`[Gamza] Supabase Storage (${bucketName}) 업로드 미지원 또는 권한 없음, Data URL로 대체합니다:`, storageErr);
      }
    }

    // 2. Fallback: Base64 Data URL (브라우저 로컬/오프라인에서도 100% 동작)
    return await fileToDataUrl(file);
  }

  // 전역 노출
  window.gamzaSupabase = {
    url: SUPABASE_URL,
    defaultUserId: DEFAULT_USER_ID,
    fetchProducts,
    addProduct,
    updateProduct,
    updateProductStatus,
    deleteProduct,
    fetchLikedProductIds,
    toggleProductLike,
    uploadImage,
    formatTimeAgo
  };
})();
