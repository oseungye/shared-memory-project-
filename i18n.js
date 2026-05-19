/* =========================================================================
   Shared Memory Project — 다국어 확장 모듈 (i18n.js)
   -------------------------------------------------------------------------
   ★ 기존 디자인/HTML/CSS/기능을 절대 건드리지 않고 "추가"만 합니다.
   ★ 모든 로직은 SMP_I18N 네임스페이스 안에 격리되어 기존 변수와 충돌 없음.
   ★ data-i18n 속성이 붙은 요소만 자동 번역하며, 속성이 없는 요소는 그대로 둠.
   ★ 서버 없이 GitHub Pages에서 바로 동작.
   ========================================================================= */
(function () {
  "use strict";

  /* ───────────────────────────────────────────────────────────────────────
     [A] 다국어 사전
     - UI에 표시될 모든 문구를 언어별로 정의
     - HTML 측에서 data-i18n="키" 또는 data-i18n-placeholder="키" 를 사용
     ─────────────────────────────────────────────────────────────────────── */
  const DICT = {
    ko: {
      // 상단 네비게이션
      nav_intro:     "소개",
      nav_events:    "사건 선택",
      nav_meaning:   "탐구 의의",

      // 히어로
      hero_title:    "동일한 역사도 국가마다 다르게 기억된다.",
      hero_desc:     "한국·일본·중국의 역사 서술을 나란히 놓고 비교합니다. 그 차이를 인정하는 것에서 공동의 기억이 시작됩니다.",
      hero_cta:      "탐구 시작하기",

      // 입력/분석 (확장 영역)
      input_heading:     "당신의 이야기를 들려주세요",
      input_desc:        "한국어, 일본어, 영어 모두 입력 가능합니다. 입력 언어는 자동으로 감지됩니다.",
      input_placeholder: "예) 할머니께서 들려주신 이야기, 사료에서 읽은 한 구절, 또는 당신이 제안하고 싶은 공동 표현…",
      input_submit:      "AI 분석 실행",
      input_clear:       "지우기",
      input_translate:   "번역 보기",
      input_detected:    "감지된 언어:",

      // 분석 결과 라벨
      analysis_title:    "AI 분석 결과",
      analysis_loading:  "이야기를 분석하는 중입니다…",
      analysis_empty:    "아직 입력된 이야기가 없습니다.",
      analysis_keywords: "핵심 키워드",
      analysis_emotion:  "감정/톤",
      analysis_period:   "추정 시대/맥락",
      analysis_summary:  "요약",

      // 공동 표현
      shared_badge_ko:   "한국어",
      shared_badge_ja:   "日本語",
      shared_badge_en:   "English",

      // 번역 모달
      translate_title:   "다국어 번역",
      translate_close:   "닫기",
      translate_ko:      "한국어",
      translate_ja:      "일본어",
      translate_en:      "영어",

      // 언어 선택 라벨
      lang_label:        "언어",
    },

    ja: {
      nav_intro:     "紹介",
      nav_events:    "事件選択",
      nav_meaning:   "探究の意義",

      hero_title:    "同じ歴史も国によって異なって記憶される。",
      hero_desc:     "韓国・日本・中国の歴史叙述を並べて比較します。その違いを認めることから、共通の記憶が始まります。",
      hero_cta:      "探究を始める",

      input_heading:     "あなたの物語を聞かせてください",
      input_desc:        "韓国語・日本語・英語のいずれでも入力できます。言語は自動的に検出されます。",
      input_placeholder: "例)祖母から聞いた話、史料で読んだ一節、あるいは提案したい共通表現…",
      input_submit:      "AI分析を実行",
      input_clear:       "消去",
      input_translate:   "翻訳を見る",
      input_detected:    "検出された言語:",

      analysis_title:    "AI分析結果",
      analysis_loading:  "物語を分析しています…",
      analysis_empty:    "まだ入力された物語はありません。",
      analysis_keywords: "キーワード",
      analysis_emotion:  "感情・トーン",
      analysis_period:   "推定時代・文脈",
      analysis_summary:  "要約",

      shared_badge_ko:   "韓国語",
      shared_badge_ja:   "日本語",
      shared_badge_en:   "英語",

      translate_title:   "多言語翻訳",
      translate_close:   "閉じる",
      translate_ko:      "韓国語",
      translate_ja:      "日本語",
      translate_en:      "英語",

      lang_label:        "言語",
    },

    en: {
      nav_intro:     "About",
      nav_events:    "Events",
      nav_meaning:   "Significance",

      hero_title:    "The same history is remembered differently in each country.",
      hero_desc:     "Compare historical narratives from Korea, Japan, and China side by side. Acknowledging the differences is where shared memory begins.",
      hero_cta:      "Start Exploring",

      input_heading:     "Share your story",
      input_desc:        "You can write in Korean, Japanese, or English. The language is detected automatically.",
      input_placeholder: "e.g. A story your grandmother told you, a passage from a historical source, or a shared expression you'd like to propose…",
      input_submit:      "Run AI Analysis",
      input_clear:       "Clear",
      input_translate:   "View Translations",
      input_detected:    "Detected language:",

      analysis_title:    "AI Analysis Result",
      analysis_loading:  "Analyzing your story…",
      analysis_empty:    "No story has been submitted yet.",
      analysis_keywords: "Keywords",
      analysis_emotion:  "Tone / Emotion",
      analysis_period:   "Estimated Period / Context",
      analysis_summary:  "Summary",

      shared_badge_ko:   "Korean",
      shared_badge_ja:   "Japanese",
      shared_badge_en:   "English",

      translate_title:   "Multilingual Translation",
      translate_close:   "Close",
      translate_ko:      "Korean",
      translate_ja:      "Japanese",
      translate_en:      "English",

      lang_label:        "Language",
    },
  };

  /* ───────────────────────────────────────────────────────────────────────
     [B] 현재 UI 언어 상태 관리
     - localStorage에 저장하여 새로고침해도 유지
     ─────────────────────────────────────────────────────────────────────── */
  let currentLang = localStorage.getItem("smp_lang") || "ko";

  function setUILang(lang) {
    if (!DICT[lang]) return;
    currentLang = lang;
    localStorage.setItem("smp_lang", lang);
    applyI18n();
    updateLangButtonsActive();
  }

  /* ───────────────────────────────────────────────────────────────────────
     [C] DOM에 번역 적용
     - data-i18n="키"           → textContent 변경
     - data-i18n-placeholder="키" → placeholder 변경
     - data-i18n-title="키"      → title(툴팁) 변경
     ─────────────────────────────────────────────────────────────────────── */
  function t(key) {
    return (DICT[currentLang] && DICT[currentLang][key]) || key;
  }

  function applyI18n() {
    // 텍스트 콘텐츠
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      el.textContent = t(key);
    });
    // placeholder
    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      const key = el.getAttribute("data-i18n-placeholder");
      el.setAttribute("placeholder", t(key));
    });
    // title 속성
    document.querySelectorAll("[data-i18n-title]").forEach((el) => {
      const key = el.getAttribute("data-i18n-title");
      el.setAttribute("title", t(key));
    });
    // <html lang="..."> 도 함께 갱신 (접근성)
    document.documentElement.setAttribute("lang", currentLang);
  }

  /* ───────────────────────────────────────────────────────────────────────
     [D] 언어 자동 감지
     - 유니코드 범위 기반의 가벼운 휴리스틱
     - 한글(Hangul) / 가나(Hiragana, Katakana) / 라틴 알파벳
     - 가나가 있으면 일본어로 우선 판정 (한자만 있을 때는 모호하므로)
     ─────────────────────────────────────────────────────────────────────── */
  function detectLanguage(text) {
    if (!text || !text.trim()) return null;

    const hangulRE   = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/;     // 한글
    const kanaRE     = /[\u3040-\u309F\u30A0-\u30FF]/;                  // 히라가나/가타카나
    const latinRE    = /[A-Za-z]/;

    const hasHangul = hangulRE.test(text);
    const hasKana   = kanaRE.test(text);
    const hasLatin  = latinRE.test(text);

    // 한글이 하나라도 있으면 한국어로 판정 (한국어 문장은 거의 항상 한글 포함)
    if (hasHangul) return "ko";
    // 가나가 있으면 일본어
    if (hasKana)   return "ja";
    // 알파벳만 있으면 영어
    if (hasLatin)  return "en";
    // 그 외 (예: 한자만)는 현재 UI 언어를 기본값으로
    return currentLang;
  }

  /* ───────────────────────────────────────────────────────────────────────
     [E] 입력 언어별 모의 AI 분석 결과
     - 실제 API 없이 동작
     - 입력 텍스트에서 키워드를 뽑고, 감지 언어에 맞는 라벨로 출력
     ─────────────────────────────────────────────────────────────────────── */
  // 언어별 분석 문구 템플릿
  const ANALYSIS_TEMPLATES = {
    ko: {
      emotions:  ["성찰적", "비통함", "그리움", "차분한 회상", "단호함"],
      periods:   ["근대 (19세기 후반~20세기 초)", "식민지 시기", "전후 회복기", "현대"],
      summaryFn: (kw) => `이 글은 '${kw[0] || "역사"}'을(를) 중심으로 한 개인의 시선이 담긴 서술로 보입니다. 공식 사료와는 다른 결의 감정이 드러나며, 공동의 기억으로 확장할 여지가 있습니다.`,
    },
    ja: {
      emotions:  ["内省的", "悲哀", "郷愁", "静かな回想", "毅然"],
      periods:   ["近代(19世紀後半〜20世紀初頭)", "植民地期", "戦後復興期", "現代"],
      summaryFn: (kw) => `この文章は「${kw[0] || "歴史"}」を中心とした個人の視点による叙述と見られます。公的史料とは異なる感情の層が現れており、共通の記憶へと拡張する余地があります。`,
    },
    en: {
      emotions:  ["Reflective", "Sorrowful", "Nostalgic", "Quietly Recollective", "Resolute"],
      periods:   ["Modern era (late 19th – early 20th c.)", "Colonial period", "Post-war recovery", "Contemporary"],
      summaryFn: (kw) => `This appears to be a personal narrative centered on "${kw[0] || "history"}." It carries an emotional register distinct from official records, offering room to expand into shared memory.`,
    },
  };

  // 언어별 간단 키워드 후보 (분석 시 텍스트에서 매칭되면 사용)
  const KEYWORD_HINTS = {
    ko: ["전쟁", "독립", "조선", "왜란", "위안부", "식민", "광복", "할머니", "고향", "기억"],
    ja: ["戦争", "独立", "朝鮮", "出兵", "慰安婦", "植民", "戦後", "祖母", "故郷", "記憶"],
    en: ["war", "independence", "Korea", "Japan", "China", "colonial", "memory", "grandmother", "homeland", "peace"],
  };

  function extractKeywords(text, lang) {
    const hints = KEYWORD_HINTS[lang] || [];
    const found = hints.filter((w) => text.includes(w));
    // 텍스트에 힌트가 없으면 가장 긴 단어 3개를 임시 키워드로 사용
    if (found.length === 0) {
      const tokens = text
        .split(/[\s,.;:!?。、！？]+/)
        .filter((w) => w.length >= 2)
        .sort((a, b) => b.length - a.length);
      return tokens.slice(0, 3);
    }
    return found.slice(0, 5);
  }

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function analyzeText(text) {
    const lang = detectLanguage(text) || currentLang;
    const tmpl = ANALYSIS_TEMPLATES[lang];
    const kw   = extractKeywords(text, lang);
    return {
      lang:     lang,
      keywords: kw,
      emotion:  pickRandom(tmpl.emotions),
      period:   pickRandom(tmpl.periods),
      summary:  tmpl.summaryFn(kw),
    };
  }

  /* ───────────────────────────────────────────────────────────────────────
     [F] 입력 영역(없으면 자동 생성)과 분석 결과 렌더링
     - 기존 HTML을 건드리지 않기 위해, #smp-i18n-zone 이 있으면 그 안에,
       없으면 <main> 또는 <body> 끝에 "추가"한다.
     ─────────────────────────────────────────────────────────────────────── */
  function ensureExtensionZone() {
    let zone = document.getElementById("smp-i18n-zone");
    if (zone) return zone;

    zone = document.createElement("section");
    zone.id = "smp-i18n-zone";
    zone.className = "smp-i18n-zone";
    zone.innerHTML = `
      <div class="smp-i18n-inner">
        <h3 data-i18n="input_heading">당신의 이야기를 들려주세요</h3>
        <p data-i18n="input_desc">한국어, 일본어, 영어 모두 입력 가능합니다. 입력 언어는 자동으로 감지됩니다.</p>

        <textarea id="smp-input"
                  rows="5"
                  data-i18n-placeholder="input_placeholder"
                  placeholder=""></textarea>

        <div class="smp-detected">
          <span data-i18n="input_detected">감지된 언어:</span>
          <strong id="smp-detected-lang">—</strong>
        </div>

        <div class="smp-actions">
          <button id="smp-analyze"  type="button" data-i18n="input_submit">AI 분석 실행</button>
          <button id="smp-clear"    type="button" data-i18n="input_clear">지우기</button>
          <button id="smp-translate" type="button" data-i18n="input_translate">번역 보기</button>
        </div>

        <div id="smp-result" class="smp-result" hidden>
          <h4 data-i18n="analysis_title">AI 분석 결과</h4>
          <dl>
            <dt data-i18n="analysis_keywords">핵심 키워드</dt>
            <dd id="smp-r-keywords"></dd>
            <dt data-i18n="analysis_emotion">감정/톤</dt>
            <dd id="smp-r-emotion"></dd>
            <dt data-i18n="analysis_period">추정 시대/맥락</dt>
            <dd id="smp-r-period"></dd>
            <dt data-i18n="analysis_summary">요약</dt>
            <dd id="smp-r-summary"></dd>
          </dl>
        </div>
      </div>

      <!-- 번역 모달 -->
      <div id="smp-translate-modal" class="smp-modal" hidden>
        <div class="smp-modal-box">
          <h4 data-i18n="translate_title">다국어 번역</h4>
          <div class="smp-tr-row"><span data-i18n="translate_ko">한국어</span><p id="smp-tr-ko"></p></div>
          <div class="smp-tr-row"><span data-i18n="translate_ja">일본어</span><p id="smp-tr-ja"></p></div>
          <div class="smp-tr-row"><span data-i18n="translate_en">영어</span><p id="smp-tr-en"></p></div>
          <button id="smp-tr-close" type="button" data-i18n="translate_close">닫기</button>
        </div>
      </div>
    `;

    (document.querySelector("main") || document.body).appendChild(zone);
    return zone;
  }

  /* ───────────────────────────────────────────────────────────────────────
     [G] 언어 선택 버튼 (없으면 우상단에 자동 삽입)
     ─────────────────────────────────────────────────────────────────────── */
  function ensureLangSwitcher() {
    let sw = document.getElementById("smp-lang-switch");
    if (sw) return sw;

    sw = document.createElement("div");
    sw.id = "smp-lang-switch";
    sw.className = "smp-lang-switch";
    sw.innerHTML = `
      <button type="button" data-lang="ko">한국어</button>
      <button type="button" data-lang="ja">日本語</button>
      <button type="button" data-lang="en">English</button>
    `;
    document.body.appendChild(sw);

    sw.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-lang]");
      if (!btn) return;
      setUILang(btn.getAttribute("data-lang"));
    });

    return sw;
  }

  function updateLangButtonsActive() {
    document.querySelectorAll("#smp-lang-switch button[data-lang]").forEach((b) => {
      b.classList.toggle("is-active", b.getAttribute("data-lang") === currentLang);
    });
  }

  /* ───────────────────────────────────────────────────────────────────────
     [H] 공동 표현 카드에 언어 배지 자동 부여
     - 기존에 등록된 카드(.proposal-card / .shared-card / li.proposal 등)를
       찾아 내부 텍스트의 언어를 감지 → 배지 span을 카드 안에 "추가"한다.
     - 카드의 기존 디자인은 변경하지 않고, 배지만 덧붙임.
     ─────────────────────────────────────────────────────────────────────── */
  const CARD_SELECTORS = [
    ".proposal-card",
    ".shared-card",
    ".shared-expression",
    "li.proposal",
    "[data-shared-card]",
  ].join(",");

  function tagSharedCards() {
    document.querySelectorAll(CARD_SELECTORS).forEach((card) => {
      if (card.querySelector(".smp-badge")) return; // 중복 방지
      const text = card.textContent || "";
      const lang = detectLanguage(text) || "ko";
      const badge = document.createElement("span");
      badge.className = `smp-badge smp-badge-${lang}`;
      badge.setAttribute("data-i18n", `shared_badge_${lang}`);
      badge.textContent = t(`shared_badge_${lang}`);
      card.prepend(badge);
      card.classList.add(`smp-card-lang-${lang}`);
    });
  }

  // 사용자가 새 공동 표현을 등록할 때도 자동으로 배지가 붙도록 감시
  function observeNewCards() {
    const target = document.body;
    const observer = new MutationObserver(() => tagSharedCards());
    observer.observe(target, { childList: true, subtree: true });
  }

  /* ───────────────────────────────────────────────────────────────────────
     [I] 번역 보기 (예시 데이터 기반)
     - 실제 API 없이, 미리 정의한 예시 + 입력 텍스트를 함께 보여줌
     ─────────────────────────────────────────────────────────────────────── */
  const SAMPLE_TRANSLATIONS = {
    ko: "할머니는 그 시절을 '말로 다 못한다'고만 하셨다. 그 침묵이 곧 역사였다.",
    ja: "祖母はあの時代を「言葉では言い尽くせない」とだけ言った。その沈黙こそが歴史だった。",
    en: "My grandmother only said of those years, 'words cannot tell it all.' That silence itself was history.",
  };

  function openTranslateModal() {
    const modal = document.getElementById("smp-translate-modal");
    const input = document.getElementById("smp-input");
    const userText = (input && input.value.trim()) || "";

    // 입력이 있으면 입력 언어 칸에 사용자 텍스트를, 나머지는 샘플을 보여줌
    const detected = userText ? detectLanguage(userText) : null;
    ["ko", "ja", "en"].forEach((lng) => {
      const el = document.getElementById(`smp-tr-${lng}`);
      if (!el) return;
      if (userText && detected === lng) {
        el.textContent = userText;
      } else {
        el.textContent = SAMPLE_TRANSLATIONS[lng];
      }
    });

    modal.hidden = false;
  }

  function closeTranslateModal() {
    const modal = document.getElementById("smp-translate-modal");
    if (modal) modal.hidden = true;
  }

  /* ───────────────────────────────────────────────────────────────────────
     [J] 이벤트 바인딩
     ─────────────────────────────────────────────────────────────────────── */
  function bindEvents() {
    const input    = document.getElementById("smp-input");
    const detected = document.getElementById("smp-detected-lang");
    const analyze  = document.getElementById("smp-analyze");
    const clear    = document.getElementById("smp-clear");
    const trBtn    = document.getElementById("smp-translate");
    const trClose  = document.getElementById("smp-tr-close");

    // 입력 즉시 언어 감지 표시
    if (input && detected) {
      input.addEventListener("input", () => {
        const lang = detectLanguage(input.value);
        detected.textContent = lang ? DICT[currentLang][`translate_${lang}`] || lang : "—";
      });
    }

    // 분석 실행
    if (analyze) {
      analyze.addEventListener("click", () => {
        const text = (input && input.value.trim()) || "";
        const box  = document.getElementById("smp-result");
        if (!text) {
          box.hidden = false;
          document.getElementById("smp-r-keywords").textContent = "";
          document.getElementById("smp-r-emotion").textContent  = "";
          document.getElementById("smp-r-period").textContent   = "";
          document.getElementById("smp-r-summary").textContent  = t("analysis_empty");
          return;
        }
        const r = analyzeText(text);

        // 분석 결과는 "입력 언어"의 라벨/문구로 출력 (요구사항 3번)
        const labelLang = r.lang;
        document.querySelectorAll("#smp-result [data-i18n]").forEach((el) => {
          const k = el.getAttribute("data-i18n");
          el.textContent = (DICT[labelLang] && DICT[labelLang][k]) || t(k);
        });

        document.getElementById("smp-r-keywords").textContent =
          r.keywords.length ? r.keywords.join(" · ") : "—";
        document.getElementById("smp-r-emotion").textContent  = r.emotion;
        document.getElementById("smp-r-period").textContent   = r.period;
        document.getElementById("smp-r-summary").textContent  = r.summary;
        box.hidden = false;
      });
    }

    // 지우기
    if (clear && input) {
      clear.addEventListener("click", () => {
        input.value = "";
        if (detected) detected.textContent = "—";
        const box = document.getElementById("smp-result");
        if (box) box.hidden = true;
      });
    }

    // 번역 보기
    if (trBtn)   trBtn.addEventListener("click", openTranslateModal);
    if (trClose) trClose.addEventListener("click", closeTranslateModal);
  }

  /* ───────────────────────────────────────────────────────────────────────
     [K] 최소 CSS 주입
     - 기존 디자인은 그대로 두고, "새로 추가된 영역"에만 적용되는 스타일만
       살짝 얹는다. (id/class가 모두 smp- 로 시작하므로 충돌 없음)
     ─────────────────────────────────────────────────────────────────────── */
  function injectStyles() {
    if (document.getElementById("smp-i18n-style")) return;
    const css = `
      /* 언어 선택 버튼 - 우상단 고정 */
      .smp-lang-switch{position:fixed;top:14px;right:14px;z-index:9999;
        display:flex;gap:6px;background:rgba(255,255,255,.9);
        padding:6px 8px;border-radius:999px;box-shadow:0 2px 8px rgba(0,0,0,.12);
        font-size:13px;font-family:inherit;}
      .smp-lang-switch button{border:1px solid transparent;background:transparent;
        padding:4px 10px;border-radius:999px;cursor:pointer;font:inherit;color:#333;}
      .smp-lang-switch button.is-active{background:#222;color:#fff;}

      /* 확장 영역 컨테이너 */
      .smp-i18n-zone{max-width:860px;margin:48px auto;padding:24px;
        border-top:1px solid rgba(0,0,0,.08);font-family:inherit;}
      .smp-i18n-zone h3{margin:0 0 8px;font-size:1.4rem;}
      .smp-i18n-zone p{margin:0 0 16px;color:#555;}
      .smp-i18n-zone textarea{width:100%;padding:12px;border:1px solid #ddd;
        border-radius:8px;font:inherit;line-height:1.6;resize:vertical;
        background:#fafafa;}
      .smp-detected{margin:10px 0;font-size:.9rem;color:#666;}
      .smp-detected strong{color:#222;margin-left:4px;}
      .smp-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;}
      .smp-actions button{padding:8px 16px;border:1px solid #222;background:#fff;
        border-radius:6px;cursor:pointer;font:inherit;}
      .smp-actions button#smp-analyze{background:#222;color:#fff;}

      .smp-result{margin-top:24px;padding:16px;border:1px solid #eee;
        border-radius:10px;background:#fff;}
      .smp-result h4{margin:0 0 12px;}
      .smp-result dl{display:grid;grid-template-columns:140px 1fr;gap:8px 16px;margin:0;}
      .smp-result dt{font-weight:600;color:#444;}
      .smp-result dd{margin:0;color:#222;}

      /* 공동 표현 카드 - 언어 배지 (기존 카드 위에 "추가"만) */
      .smp-badge{display:inline-block;font-size:11px;padding:2px 8px;border-radius:999px;
        margin-right:6px;vertical-align:middle;letter-spacing:.02em;}
      .smp-badge-ko{background:#e8f1ff;color:#1d4ed8;}
      .smp-badge-ja{background:#ffeaea;color:#b91c1c;}
      .smp-badge-en{background:#eaf7ec;color:#166534;}
      .smp-card-lang-ko{border-left:3px solid #1d4ed8;}
      .smp-card-lang-ja{border-left:3px solid #b91c1c;}
      .smp-card-lang-en{border-left:3px solid #166534;}

      /* 번역 모달 */
      .smp-modal{position:fixed;inset:0;background:rgba(0,0,0,.4);
        display:flex;align-items:center;justify-content:center;z-index:10000;padding:16px;}
      .smp-modal[hidden]{display:none;}
      .smp-modal-box{background:#fff;border-radius:12px;max-width:560px;width:100%;
        padding:24px;box-shadow:0 10px 30px rgba(0,0,0,.2);}
      .smp-modal-box h4{margin:0 0 16px;}
      .smp-tr-row{margin-bottom:12px;}
      .smp-tr-row span{display:inline-block;font-size:12px;font-weight:600;
        color:#888;margin-bottom:4px;}
      .smp-tr-row p{margin:0;padding:8px 10px;background:#fafafa;border-radius:6px;}
      #smp-tr-close{margin-top:8px;padding:8px 16px;border:1px solid #222;
        background:#222;color:#fff;border-radius:6px;cursor:pointer;}
    `;
    const style = document.createElement("style");
    style.id = "smp-i18n-style";
    style.textContent = css;
    document.head.appendChild(style);
  }

  /* ───────────────────────────────────────────────────────────────────────
     [L] 초기화
     ─────────────────────────────────────────────────────────────────────── */
  function init() {
    injectStyles();
    ensureLangSwitcher();
    ensureExtensionZone();
    bindEvents();
    applyI18n();
    updateLangButtonsActive();
    tagSharedCards();
    observeNewCards();
  }

  // 외부에서 호출 가능하도록 노출 (선택)
  window.SMP_I18N = {
    setLang: setUILang,
    detect:  detectLanguage,
    analyze: analyzeText,
    t:       t,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
