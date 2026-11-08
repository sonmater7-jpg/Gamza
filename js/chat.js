/**
 * js/chat.js
 * 감자마켓 1:1 감자톡 실시간 대화 모달 컨트롤러
 */

(function () {
  'use strict';

  let currentChatProduct = null;
  let chatElements = null;
  let isChatEventsBound = false;

  /**
   * DOM 요소 캐싱
   */
  function cacheChatElements() {
    chatElements = {
      modal: document.getElementById('chatModal'),
      closeBtn: document.getElementById('chatCloseBtn'),
      form: document.getElementById('chatForm'),
      input: document.getElementById('chatInput'),
      sendBtn: document.getElementById('chatSendBtn'),
      messagesContainer: document.getElementById('chatMessages'),

      // 상대방 프로필 요소
      sellerAvatar: document.getElementById('chatSellerAvatar'),
      sellerNickname: document.getElementById('chatSellerNickname'),
      sellerTemp: document.getElementById('chatSellerTemp'),
      sellerLocation: document.getElementById('chatSellerLocation'),

      // 상품 미니 배너 요소
      productThumb: document.getElementById('chatProductThumb'),
      productStatus: document.getElementById('chatProductStatus'),
      productTitle: document.getElementById('chatProductTitle'),
      productPrice: document.getElementById('chatProductPrice'),

      // 추천 칩
      quickChips: document.querySelectorAll('.chat-quick-suggestions .quick-chip')
    };
  }

  /**
   * 로컬 스토리지 대화 기록 키
   */
  function getChatStorageKey(productId) {
    const user = window.gamzaAuth?.getCurrentUser();
    const userId = user?.id || 'guest';
    return `gamza_chat_${userId}_${productId}`;
  }

  /**
   * 대화 기록 불러오기
   */
  function loadChatHistory(productId) {
    try {
      const raw = localStorage.getItem(getChatStorageKey(productId));
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  /**
   * 대화 기록 저장하기
   */
  function saveChatHistory(productId, messages) {
    try {
      localStorage.setItem(getChatStorageKey(productId), JSON.stringify(messages));
    } catch (e) {
      console.warn('[Chat] 로컬 저장 실패:', e);
    }
  }

  /**
   * 시간 포맷팅 (오후 3:24)
   */
  function formatCurrentTime() {
    const now = new Date();
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? '오후' : '오전';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${ampm} ${hours}:${minutes}`;
  }

  /**
   * 말풍선 HTML 추가
   */
  function appendMessage(text, isMe = true, time = null) {
    if (!chatElements?.messagesContainer) return;

    const timeStr = time || formatCurrentTime();
    const bubbleWrapper = document.createElement('div');
    bubbleWrapper.className = `chat-bubble-row ${isMe ? 'my-row' : 'seller-row'}`;

    if (isMe) {
      bubbleWrapper.innerHTML = `
        <span class="chat-time">${timeStr}</span>
        <div class="chat-bubble my-bubble">${escapeHtml(text)}</div>
      `;
    } else {
      const sellerImg = currentChatProduct?.seller?.profileImage || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80';
      bubbleWrapper.innerHTML = `
        <img src="${sellerImg}" alt="판매자" class="chat-bubble-avatar" />
        <div class="chat-bubble-content">
          <span class="chat-sender-name">${escapeHtml(currentChatProduct?.seller?.nickname || '판매자')}</span>
          <div class="chat-bubble seller-bubble">${escapeHtml(text)}</div>
        </div>
        <span class="chat-time">${timeStr}</span>
      `;
    }

    chatElements.messagesContainer.appendChild(bubbleWrapper);
    scrollToBottom();
  }

  /**
   * 스크롤을 맨 아래로
   */
  function scrollToBottom() {
    if (chatElements?.messagesContainer) {
      chatElements.messagesContainer.scrollTop = chatElements.messagesContainer.scrollHeight;
    }
  }

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
   * 메시지 전송 처리
   */
  async function sendMessage(text) {
    const trimmed = (text || '').trim();
    if (!trimmed || !currentChatProduct) return;

    // 1. 내 메시지 UI 추가
    appendMessage(trimmed, true);

    // 2. 히스토리 저장
    const history = loadChatHistory(currentChatProduct.id) || [];
    history.push({ text: trimmed, isMe: true, time: formatCurrentTime() });
    saveChatHistory(currentChatProduct.id, history);

    if (chatElements?.input) {
      chatElements.input.value = '';
      chatElements.input.focus();
    }

    // 3. 상대방 판매자의 스마트 자동 답변 시뮬레이션
    setTimeout(() => {
      let reply = '';
      const sellerNick = currentChatProduct.seller?.nickname || '판매자';

      if (trimmed.includes('구매') || trimmed.includes('가능') || trimmed.includes('있나요')) {
        reply = `안녕하세요! 네, 아직 ${currentChatProduct.status || '판매중'} 상태라 구매 가능합니다 🥔 직거래 희망하시나요?`;
      } else if (trimmed.includes('위치') || trimmed.includes('어디') || trimmed.includes('직거래')) {
        const loc = currentChatProduct.location || '서초동';
        reply = `저는 보통 ${loc} 지하철역 출구 근처나 주민센터 앞에서 거래하는 게 편해요! 시간대 언제가 편하신가요? 😊`;
      } else if (trimmed.includes('네고') || trimmed.includes('깎') || trimmed.includes('할인') || trimmed.includes('가격')) {
        reply = `쿨거래 해주시면 조금은 가격 맞춰드릴 수 있어요! 생각하시는 가격 말씀해주세요 🥔✨`;
      } else {
        reply = `문의주셔서 감사합니다! ${sellerNick}입니다. 확인하고 바로 거래 조율 도와드릴게요 🥔`;
      }

      appendMessage(reply, false);
      history.push({ text: reply, isMe: false, time: formatCurrentTime() });
      saveChatHistory(currentChatProduct.id, history);
    }, 850);
  }

  /**
   * 이벤트 바인딩
   */
  function bindChatEvents() {
    if (!chatElements?.modal) return;

    // 닫기 버튼
    chatElements.closeBtn?.addEventListener('click', window.closeChatModal);

    // 백드롭 클릭 시 닫기
    chatElements.modal.addEventListener('click', (e) => {
      if (e.target === chatElements.modal) {
        window.closeChatModal();
      }
    });

    // ESC 닫기
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const modal = document.getElementById('chatModal');
        if (modal && modal.classList.contains('active')) {
          window.closeChatModal();
        }
      }
    });

    // 폼 제출 (전송)
    chatElements.form?.addEventListener('submit', (e) => {
      e.preventDefault();
      if (chatElements.input) {
        sendMessage(chatElements.input.value);
      }
    });

    // 추천 질문 칩 클릭
    chatElements.quickChips?.forEach(chip => {
      chip.addEventListener('click', () => {
        const msg = chip.getAttribute('data-msg');
        if (msg) {
          sendMessage(msg);
        }
      });
    });
  }

  /**
   * [전역 함수] 채팅 모달 열기
   */
  window.openChatModal = function (product) {
    if (!product) return;
    currentChatProduct = product;

    if (!chatElements) cacheChatElements();
    if (!isChatEventsBound) {
      bindChatEvents();
      isChatEventsBound = true;
    }

    const { modal, sellerAvatar, sellerNickname, sellerTemp, sellerLocation, productThumb, productStatus, productTitle, productPrice, messagesContainer } = chatElements;
    if (!modal) return;

    const seller = product.seller || {};

    // 1. 상대방 정보 바인딩
    if (sellerAvatar) {
      sellerAvatar.src = seller.profileImage || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80';
    }
    if (sellerNickname) sellerNickname.textContent = seller.nickname || '동네이웃';
    if (sellerTemp) {
      const temp = typeof seller.mannerTemp === 'number' ? seller.mannerTemp.toFixed(1) : '36.5';
      sellerTemp.textContent = `${temp}°C 🥔`;
    }
    if (sellerLocation) {
      sellerLocation.textContent = `${seller.location || product.location || '서초동'} · 보통 30분 내 응답`;
    }

    // 2. 상품 미니 배너 바인딩
    if (productThumb) {
      productThumb.src = product.imageUrl || '';
    }
    if (productTitle) {
      productTitle.textContent = product.title || '상품';
    }
    if (productPrice) {
      const p = product.price;
      productPrice.textContent = typeof p === 'number' ? (p === 0 ? '무료나눔' : `${p.toLocaleString('ko-KR')}원`) : `${p}원`;
    }
    if (productStatus) {
      const s = product.status || '판매중';
      productStatus.textContent = s;
      productStatus.className = 'status-badge';
      if (s === '예약중') productStatus.classList.add('reserved');
      else if (s.includes('완료')) productStatus.classList.add('completed');
      else productStatus.classList.add('sale');
    }

    // 3. 메시지 컨테이너 초기화 및 기존 대화 로드
    if (messagesContainer) {
      messagesContainer.innerHTML = '';

      // 날짜 구분선
      const dateDivider = document.createElement('div');
      dateDivider.className = 'chat-date-divider';
      dateDivider.textContent = '오늘';
      messagesContainer.appendChild(dateDivider);

      const saved = loadChatHistory(product.id);
      if (saved && Array.isArray(saved) && saved.length > 0) {
        saved.forEach(m => appendMessage(m.text, m.isMe, m.time));
      } else {
        // 첫 시작 시 센스 있는 환영 메시지
        const welcomeText = `안녕하세요! '${product.title}' 상품에 관심 가져주셔서 감사합니다 🥔 궁금한 점 편하게 말씀해주세요!`;
        appendMessage(welcomeText, false);
      }
    }

    // 4. 모달 오픈
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    setTimeout(() => {
      if (chatElements.input) chatElements.input.focus();
      scrollToBottom();
    }, 150);
  };

  /**
   * [전역 함수] 채팅 모달 닫기
   */
  window.closeChatModal = function () {
    const modal = document.getElementById('chatModal');
    if (!modal) return;
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  // DOM 로드 시 초기 캐싱
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', cacheChatElements);
  } else {
    cacheChatElements();
  }
})();