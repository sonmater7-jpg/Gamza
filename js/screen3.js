/**
 * js/screen3.js: 감자 중고거래 [화면 3: 글쓰기 모달 스크립트]
 */

(function () {
  'use strict';

  // 기본 감자 대표 이미지 (이미지 미입력 시 적용)
  const DEFAULT_POTATO_IMAGE = 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=800&q=80';

  // 수정 모드 상태 관리
  let isEditMode = false;
  let editingProductId = null;

  // DOM 요소 캐시 객체
  let elements = {};

  /**
   * DOM 요소 초기화 및 캐싱
   */
  function cacheElements() {
    elements = {
      modal: document.getElementById('writeModal'),
      dialog: document.querySelector('.write-modal-dialog'),
      form: document.getElementById('writeProductForm'),
      headerTitle: document.getElementById('writeModalTitle'),
      closeBtn: document.getElementById('closeWriteModalBtn'),
      cancelBtn: document.getElementById('cancelWriteBtn'),
      submitBtn: document.getElementById('submitProductBtn'),

      // 필드들
      imageUrlInput: document.getElementById('productImage'),
      fileInput: document.getElementById('productFileInput'),
      browseBtn: document.getElementById('browseImageBtn'),
      imagePreviewContainer: document.getElementById('imagePreviewContainer'),
      previewPlaceholder: document.getElementById('previewPlaceholder'),
      imagePreview: document.getElementById('imagePreview'),
      clearImageBtn: document.getElementById('clearImageBtn'),
      presetChips: document.querySelectorAll('.preset-chip'),

      titleInput: document.getElementById('productTitle'),
      categorySelect: document.getElementById('productCategory'),
      priceInput: document.getElementById('productPrice'),
      setFreePriceBtn: document.getElementById('setFreePriceBtn'),
      locationInput: document.getElementById('productLocation'),
      locationTags: document.querySelectorAll('.preset-tag'),
      statusRadios: document.querySelectorAll('input[name="status"]'),
      descTextarea: document.getElementById('productDescription'),
      descCharCounter: document.getElementById('descCharCounter'),

      // 에러 메시지 컨테이너
      titleError: document.getElementById('titleError'),
      categoryError: document.getElementById('categoryError'),
      priceError: document.getElementById('priceError'),
      locationError: document.getElementById('locationError'),
      statusError: document.getElementById('statusError'),
      descError: document.getElementById('descriptionError'),
      imageError: document.getElementById('imageError'),

      // 토스트
      toast: document.getElementById('writeModalToast'),
      toastMessage: document.getElementById('writeToastMessage')
    };
  }

  /**
   * 모달이 현재 열려있는지 여부
   */
  function isModalOpen() {
    return elements.modal && elements.modal.classList.contains('active');
  }

  /**
   * 토스트 알림 표시
   */
  function showToast(message, duration = 1200, callback) {
    if (!elements.toast || !elements.toastMessage) {
      if (typeof callback === 'function') callback();
      return;
    }
    elements.toastMessage.textContent = message;
    elements.toast.classList.add('show');

    setTimeout(() => {
      elements.toast.classList.remove('show');
      if (typeof callback === 'function') {
        callback();
      }
    }, duration);
  }

  /**
   * 이미지 미리보기 갱신
   */
  function updateImagePreview(url) {
    const trimmed = (url || '').trim();

    if (!trimmed) {
      // 이미지 URL이 없을 때 기본 플레이스홀더 복원
      if (elements.imagePreview) {
        elements.imagePreview.src = '';
        elements.imagePreview.style.display = 'none';
      }
      if (elements.previewPlaceholder) {
        elements.previewPlaceholder.style.display = 'flex';
      }
      if (elements.clearImageBtn) {
        elements.clearImageBtn.style.display = 'none';
      }
      if (elements.imagePreviewContainer) {
        elements.imagePreviewContainer.classList.remove('has-image');
      }
      clearFieldError(elements.imageError);
      return;
    }

    // 임시 Image 객체로 유효성 체크
    const tempImg = new Image();
    tempImg.onload = function () {
      if (!elements.imagePreview) return;
      elements.imagePreview.src = trimmed;
      elements.imagePreview.style.display = 'block';
      if (elements.previewPlaceholder) {
        elements.previewPlaceholder.style.display = 'none';
      }
      if (elements.clearImageBtn) {
        elements.clearImageBtn.style.display = 'inline-flex';
      }
      if (elements.imagePreviewContainer) {
        elements.imagePreviewContainer.classList.add('has-image');
      }
      clearFieldError(elements.imageError);
    };

    tempImg.onerror = function () {
      if (!elements.imagePreview) return;
      elements.imagePreview.src = '';
      elements.imagePreview.style.display = 'none';
      if (elements.previewPlaceholder) {
        elements.previewPlaceholder.style.display = 'flex';
      }
      if (elements.clearImageBtn) {
        elements.clearImageBtn.style.display = 'inline-flex';
      }
      if (elements.imagePreviewContainer) {
        elements.imagePreviewContainer.classList.remove('has-image');
      }
      setFieldError(elements.imageError, '이미지를 불러올 수 없는 URL입니다. 다른 링크를 입력해주세요.');
    };

    tempImg.src = trimmed;
  }

  /**
   * 필드 에러 표시
   */
  function setFieldError(errorElement, message) {
    if (!errorElement) return;
    errorElement.textContent = message;
    const group = errorElement.closest('.form-group');
    if (group) {
      group.classList.add('has-error');
    }
  }

  /**
   * 필드 에러 제거
   */
  function clearFieldError(errorElement) {
    if (!errorElement) return;
    errorElement.textContent = '';
    const group = errorElement.closest('.form-group');
    if (group) {
      group.classList.remove('has-error');
    }
  }

  /**
   * 모든 필드 에러 제거
   */
  function clearAllErrors() {
    const errorElements = [
      elements.titleError,
      elements.categoryError,
      elements.priceError,
      elements.locationError,
      elements.statusError,
      elements.descError,
      elements.imageError
    ];
    errorElements.forEach(clearFieldError);
  }

  /**
   * 폼 유효성 검사
   */
  function validateForm() {
    clearAllErrors();
    let isValid = true;
    let firstInvalidInput = null;

    // 1) 상품명 검사 (최소 2자 이상)
    const titleVal = elements.titleInput?.value.trim() || '';
    if (!titleVal) {
      setFieldError(elements.titleError, '상품명을 입력해주세요.');
      isValid = false;
      if (!firstInvalidInput) firstInvalidInput = elements.titleInput;
    } else if (titleVal.length < 2) {
      setFieldError(elements.titleError, '상품명을 2자 이상 입력해주세요.');
      isValid = false;
      if (!firstInvalidInput) firstInvalidInput = elements.titleInput;
    }

    // 2) 카테고리 검사
    const categoryVal = elements.categorySelect?.value || '';
    if (!categoryVal) {
      setFieldError(elements.categoryError, '카테고리를 선택해주세요.');
      isValid = false;
      if (!firstInvalidInput) firstInvalidInput = elements.categorySelect;
    }

    // 3) 가격 검사 (0원 이상 숫자)
    const priceVal = elements.priceInput?.value.trim();
    if (priceVal === '' || priceVal === null || priceVal === undefined) {
      setFieldError(elements.priceError, '가격을 입력해주세요.');
      isValid = false;
      if (!firstInvalidInput) firstInvalidInput = elements.priceInput;
    } else {
      const num = Number(priceVal);
      if (isNaN(num) || num < 0) {
        setFieldError(elements.priceError, '0원 이상의 올바른 가격을 입력해주세요.');
        isValid = false;
        if (!firstInvalidInput) firstInvalidInput = elements.priceInput;
      }
    }

    // 4) 거래 동네 검사
    const locationVal = elements.locationInput?.value.trim() || '';
    if (!locationVal) {
      setFieldError(elements.locationError, '거래 동네를 입력해주세요 (예: 서초동).');
      isValid = false;
      if (!firstInvalidInput) firstInvalidInput = elements.locationInput;
    }

    // 5) 판매 상태 검사
    const checkedStatus = document.querySelector('input[name="status"]:checked')?.value;
    if (!checkedStatus) {
      setFieldError(elements.statusError, '판매 상태를 선택해주세요.');
      isValid = false;
    }

    // 6) 자세한 설명 검사 (최소 5자 이상)
    const descVal = elements.descTextarea?.value.trim() || '';
    if (!descVal) {
      setFieldError(elements.descError, '상품 설명을 입력해주세요.');
      isValid = false;
      if (!firstInvalidInput) firstInvalidInput = elements.descTextarea;
    } else if (descVal.length < 5) {
      setFieldError(elements.descError, '상품 설명을 최소 5자 이상 자세히 작성해주세요.');
      isValid = false;
      if (!firstInvalidInput) firstInvalidInput = elements.descTextarea;
    }

    if (!isValid && firstInvalidInput) {
      firstInvalidInput.focus();
    }

    return isValid;
  }

  /**
   * 폼 전체 리셋
   */
  function resetForm() {
    isEditMode = false;
    editingProductId = null;

    if (elements.headerTitle) {
      elements.headerTitle.textContent = '내 감자 팔기 (글쓰기)';
    }
    if (elements.submitBtn) {
      elements.submitBtn.innerHTML = '<span>🥔 감자 마켓에 작성 완료</span>';
    }

    if (elements.form) {
      elements.form.reset();
    }

    // 이미지 프리뷰 초기화
    updateImagePreview('');

    // 프리셋 칩 활성화 상태 해제
    elements.presetChips.forEach(chip => chip.classList.remove('active'));

    // 글자 수 카운터 초기화
    if (elements.descCharCounter) {
      elements.descCharCounter.textContent = '0 / 1000자';
    }

    // 기본 판매 상태 "판매중" 체크
    const defaultStatus = document.querySelector('input[name="status"][value="판매중"]');
    if (defaultStatus) {
      defaultStatus.checked = true;
    }

    // 에러 상태 클리어
    clearAllErrors();
  }

  /**
   * [전역 함수] 글쓰기 모달 열기 (신규 작성)
   */
  window.openWriteModal = function () {
    if (!elements.modal) cacheElements();
    if (!elements.modal) return;

    resetForm();
    elements.modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // 첫 번째 입력창으로 부드럽게 포커스
    setTimeout(() => {
      if (elements.titleInput) {
        elements.titleInput.focus();
      }
    }, 150);
  };

  /**
   * [전역 함수] 게시글 수정 모달 열기 (기존 글 수정)
   */
  window.openEditModal = function (product) {
    if (!product) return;
    if (!elements.modal) cacheElements();
    if (!elements.modal) return;

    resetForm();

    isEditMode = true;
    editingProductId = product.id;

    if (elements.headerTitle) {
      elements.headerTitle.textContent = '🥔 내 감자 수정하기 (수정)';
    }
    if (elements.submitBtn) {
      elements.submitBtn.innerHTML = '<span>🥔 감자 수정 완료</span>';
    }

    // 기존 값 채우기
    if (elements.titleInput) elements.titleInput.value = product.title || '';
    if (elements.categorySelect) elements.categorySelect.value = product.category || '';
    if (elements.priceInput) elements.priceInput.value = product.price !== undefined ? product.price : '';
    if (elements.locationInput) elements.locationInput.value = product.location || '';
    if (elements.imageUrlInput) elements.imageUrlInput.value = product.imageUrl || '';
    if (elements.descTextarea) {
      elements.descTextarea.value = product.description || '';
      if (elements.descCharCounter) {
        elements.descCharCounter.textContent = `${elements.descTextarea.value.length} / 1000자`;
      }
    }

    // 상태 라디오 선택
    const s = String(product.status || '판매중').trim();
    const targetRadio = document.querySelector(`input[name="status"][value="${s}"]`);
    if (targetRadio) targetRadio.checked = true;

    // 이미지 미리보기 반영
    updateImagePreview(product.imageUrl || '');

    elements.modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    setTimeout(() => {
      if (elements.titleInput) {
        elements.titleInput.focus();
      }
    }, 150);
  };

  /**
   * [전역 함수] 모달 닫기
   */
  window.closeWriteModal = function () {
    if (!elements.modal) cacheElements();
    if (!elements.modal) return;

    elements.modal.classList.remove('active');
    document.body.style.overflow = '';
  };

  /**
   * 폼 제출 처리 (신규 작성 또는 수정 완료)
   */
  async function handleFormSubmit(e) {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // 폼 데이터 수집
    const title = elements.titleInput.value.trim();
    const category = elements.categorySelect.value;
    const price = Math.floor(Number(elements.priceInput.value) || 0);
    const location = elements.locationInput.value.trim();
    const status = document.querySelector('input[name="status"]:checked')?.value || '판매중';
    const rawImageUrl = elements.imageUrlInput.value.trim();
    const imageUrl = rawImageUrl || DEFAULT_POTATO_IMAGE;
    const description = elements.descTextarea.value.trim();

    const productPayload = {
      title,
      category,
      price,
      location,
      status,
      imageUrl,
      description
    };

    // 버튼 비활성화 (중복 제출 방지)
    if (elements.submitBtn) {
      elements.submitBtn.disabled = true;
    }

    try {
      if (isEditMode && editingProductId) {
        // [수정 모드]
        if (window.productStore && typeof window.productStore.updateProduct === 'function') {
          await window.productStore.updateProduct(editingProductId, productPayload);
        }
        showToast('🥔 게시글이 성공적으로 수정되었습니다!', 900, () => {
          window.closeWriteModal();
          resetForm();
          if (elements.submitBtn) elements.submitBtn.disabled = false;
        });
      } else {
        // [신규 등록 모드]
        if (window.productStore && typeof window.productStore.addProduct === 'function') {
          await window.productStore.addProduct(productPayload);
        }
        showToast('🥔 감자가 성공적으로 등록되었습니다!', 900, () => {
          window.closeWriteModal();
          resetForm();
          if (elements.submitBtn) elements.submitBtn.disabled = false;
        });
      }
    } catch (err) {
      console.error('[Gamza] 저장 실패:', err);
      showToast('저장 중 오류가 발생했습니다. 다시 시도해주세요.', 1500, () => {
        if (elements.submitBtn) elements.submitBtn.disabled = false;
      });
    }
  }

  /**
   * 이벤트 리스너 바인딩
   */
  function bindEvents() {
    // 닫기 및 취소 버튼
    if (elements.closeBtn) {
      elements.closeBtn.addEventListener('click', window.closeWriteModal);
    }
    if (elements.cancelBtn) {
      elements.cancelBtn.addEventListener('click', window.closeWriteModal);
    }

    // 모달 백드롭 클릭 시 닫기
    if (elements.modal) {
      elements.modal.addEventListener('click', (e) => {
        if (e.target === elements.modal) {
          window.closeWriteModal();
        }
      });
    }

    // ESC 키 입력 시 닫기
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isModalOpen()) {
        window.closeWriteModal();
      }
    });

    // 이미지 파일 탐색기 선택 이벤트
    if (elements.browseBtn && elements.fileInput) {
      elements.browseBtn.addEventListener('click', () => {
        elements.fileInput.click();
      });

      elements.fileInput.addEventListener('change', async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        // 용량 체크 (10MB)
        if (file.size > 10 * 1024 * 1024) {
          setFieldError(elements.imageError, '사진 크기는 10MB 이하만 업로드 가능합니다.');
          return;
        }

        try {
          if (elements.browseBtn) {
            elements.browseBtn.disabled = true;
            elements.browseBtn.innerHTML = '<span>사진 업로드 중...</span>';
          }

          let uploadedUrl = null;
          if (window.gamzaSupabase && typeof window.gamzaSupabase.uploadImage === 'function') {
            uploadedUrl = await window.gamzaSupabase.uploadImage(file, 'products');
          } else {
            uploadedUrl = await new Promise((res, rej) => {
              const r = new FileReader();
              r.onload = () => res(r.result);
              r.onerror = rej;
              r.readAsDataURL(file);
            });
          }

          if (elements.imageUrlInput) {
            elements.imageUrlInput.value = uploadedUrl;
          }
          elements.presetChips.forEach(chip => chip.classList.remove('active'));
          updateImagePreview(uploadedUrl);
        } catch (uploadErr) {
          console.error('[Gamza] 파일 업로드 실패:', uploadErr);
          setFieldError(elements.imageError, '사진 업로드 중 오류가 발생했습니다.');
        } finally {
          if (elements.browseBtn) {
            elements.browseBtn.disabled = false;
            elements.browseBtn.innerHTML = `
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              <span>내 PC에서 사진 찾기</span>
            `;
          }
        }
      });
    }

    // 이미지 URL 실시간 입력 이벤트
    if (elements.imageUrlInput) {
      elements.imageUrlInput.addEventListener('input', (e) => {
        elements.presetChips.forEach(chip => chip.classList.remove('active'));
        updateImagePreview(e.target.value);
      });
      elements.imageUrlInput.addEventListener('change', (e) => {
        updateImagePreview(e.target.value);
      });
    }

    // 이미지 지우기 버튼
    if (elements.clearImageBtn) {
      elements.clearImageBtn.addEventListener('click', () => {
        if (elements.imageUrlInput) {
          elements.imageUrlInput.value = '';
        }
        elements.presetChips.forEach(chip => chip.classList.remove('active'));
        updateImagePreview('');
        if (elements.imageUrlInput) {
          elements.imageUrlInput.focus();
        }
      });
    }

    // 이미지 프리셋 버튼 클릭 이벤트
    elements.presetChips.forEach(chip => {
      chip.addEventListener('click', () => {
        const url = chip.getAttribute('data-url');
        if (!url) return;

        elements.presetChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');

        if (elements.imageUrlInput) {
          elements.imageUrlInput.value = url;
        }
        updateImagePreview(url);
      });
    });

    // 무료나눔(0원) 버튼
    if (elements.setFreePriceBtn) {
      elements.setFreePriceBtn.addEventListener('click', () => {
        if (elements.priceInput) {
          elements.priceInput.value = '0';
          clearFieldError(elements.priceError);
          elements.priceInput.focus();
        }
      });
    }

    // 추천 동네 빠른 선택 태그 클릭
    elements.locationTags.forEach(tag => {
      tag.addEventListener('click', () => {
        const loc = tag.getAttribute('data-location');
        if (loc && elements.locationInput) {
          elements.locationInput.value = loc;
          clearFieldError(elements.locationError);
        }
      });
    });

    // 글자 수 카운터 갱신 및 입력 시 에러 제거
    if (elements.descTextarea) {
      elements.descTextarea.addEventListener('input', () => {
        const len = elements.descTextarea.value.length;
        if (elements.descCharCounter) {
          elements.descCharCounter.textContent = `${len} / 1000자`;
        }
        if (len >= 5) {
          clearFieldError(elements.descError);
        }
      });
    }

    // 각 필드 입력 시 실시간 에러 제거
    if (elements.titleInput) {
      elements.titleInput.addEventListener('input', () => {
        if (elements.titleInput.value.trim().length >= 2) {
          clearFieldError(elements.titleError);
        }
      });
    }

    if (elements.categorySelect) {
      elements.categorySelect.addEventListener('change', () => {
        if (elements.categorySelect.value) {
          clearFieldError(elements.categoryError);
        }
      });
    }

    if (elements.priceInput) {
      elements.priceInput.addEventListener('input', () => {
        if (elements.priceInput.value !== '' && Number(elements.priceInput.value) >= 0) {
          clearFieldError(elements.priceError);
        }
      });
    }

    if (elements.locationInput) {
      elements.locationInput.addEventListener('input', () => {
        if (elements.locationInput.value.trim().length >= 1) {
          clearFieldError(elements.locationError);
        }
      });
    }

    // 폼 제출 핸들러
    if (elements.form) {
      elements.form.addEventListener('submit', handleFormSubmit);
    }
  }

  /**
   * 모듈 초기화
   */
  function init() {
    cacheElements();
    bindEvents();
  }

  // DOM 로드 상태에 따라 초기화 실행
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
