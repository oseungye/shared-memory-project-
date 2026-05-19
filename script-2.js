// =========================
// LANGUAGE DATA
// =========================

const translations = {
  ko: {
    navHome: "홈",
    navAbout: "소개",
    navArchive: "기억 아카이브",

    mainTitle: "Shared Memory Project",
    mainDescription:
      "동아시아의 다양한 기억과 시선을 연결하는 디지털 아카이브 프로젝트",

    analyzeButton: "AI 분석 시작",
    compareButton: "키워드 비교",
    sharedButton: "공동 표현 작성",

    aiAnalysisTitle: "AI 기억 분석",
    aiAnalysisDescription:
      "각 국가의 기억과 표현 방식을 비교 분석합니다.",

    compareDescription:
      "국가별 키워드와 역사 인식 차이를 시각적으로 비교합니다.",

    sharedPlaceholder: "공동 표현을 작성해보세요...",

    aboutTitle: "프로젝트 소개",
    aboutDescription:
      "Shared Memory Project는 동아시아 역사 기억의 차이와 공통점을 탐구하는 프로젝트입니다.",

    footer:
      "© 2026 Shared Memory Project. All Rights Reserved.",

    aiResult:
      "한국에서는 이 사건을 갈등과 역사적 상처 중심으로 기억하는 경향이 있습니다."
  },

  ja: {
    navHome: "ホーム",
    navAbout: "紹介",
    navArchive: "記憶アーカイブ",

    mainTitle: "Shared Memory Project",
    mainDescription:
      "東アジアの多様な記憶と視点をつなぐデジタルアーカイブプロジェクト",

    analyzeButton: "AI分析を開始",
    compareButton: "キーワード比較",
    sharedButton: "共同表現を書く",

    aiAnalysisTitle: "AI記憶分析",
    aiAnalysisDescription:
      "各国の記憶と表現方式を比較分析します。",

    compareDescription:
      "国家別のキーワードや歴史認識の違いを視覚的に比較します。",

    sharedPlaceholder: "共同表現を書いてみましょう...",

    aboutTitle: "プロジェクト紹介",
    aboutDescription:
      "Shared Memory Projectは東アジアの歴史認識の差異と共通点を探求するプロジェクトです。",

    footer:
      "© 2026 Shared Memory Project. All Rights Reserved.",

    aiResult:
      "日本ではこの出来事を歴史的対立と社会的記憶の観点から捉える傾向があります。"
  },

  en: {
    navHome: "Home",
    navAbout: "About",
    navArchive: "Memory Archive",

    mainTitle: "Shared Memory Project",
    mainDescription:
      "A digital archive project connecting diverse memories and perspectives across East Asia.",

    analyzeButton: "Start AI Analysis",
    compareButton: "Compare Keywords",
    sharedButton: "Write Shared Expression",

    aiAnalysisTitle: "AI Memory Analysis",
    aiAnalysisDescription:
      "Compare and analyze historical memories and narratives across countries.",

    compareDescription:
      "Visually compare keyword usage and historical perspectives between countries.",

    sharedPlaceholder: "Write a shared expression...",

    aboutTitle: "About Project",
    aboutDescription:
      "Shared Memory Project explores differences and common perspectives in East Asian historical memory.",

    footer:
      "© 2026 Shared Memory Project. All Rights Reserved.",

    aiResult:
      "In English-speaking contexts, this event is often interpreted through conflict, diplomacy, and collective memory."
  }
};

// =========================
// EVENT DATA
// =========================

const events = {
  ko: [
    {
      title: "임진왜란",
      description: "동아시아 국제 질서를 바꾼 전쟁"
    },
    {
      title: "한일 병합",
      description: "식민지 경험과 기억"
    }
  ],

  ja: [
    {
      title: "文禄・慶長の役",
      description: "東アジア秩序を変化させた戦争"
    },
    {
      title: "韓国併合",
      description: "植民地経験と記憶"
    }
  ],

  en: [
    {
      title: "Imjin War",
      description: "A war that reshaped East Asian order"
    },
    {
      title: "Japan-Korea Annexation",
      description: "Colonial experience and memory"
    }
  ]
};

// =========================
// LANGUAGE UPDATE FUNCTION
// =========================

function updateLanguage(lang) {

  // 현재 언어 저장
  localStorage.setItem("language", lang);

  // 번역 데이터 가져오기
  const current = translations[lang];

  // 일반 텍스트 변경
  document.querySelectorAll("[data-i18n]").forEach(element => {
    const key = element.dataset.i18n;

    if (current[key]) {
      element.textContent = current[key];
    }
  });

  // placeholder 변경
  document
    .querySelectorAll("[data-i18n-placeholder]")
    .forEach(element => {

      const key = element.dataset.i18nPlaceholder;

      if (current[key]) {
        element.placeholder = current[key];
      }
    });

  // AI 분석 결과 변경
  const aiResult = document.getElementById("ai-result");

  if (aiResult) {
    aiResult.textContent = current.aiResult;
  }

  // 이벤트 카드 변경
  renderEvents(lang);
}

// =========================
// EVENT RENDERING
// =========================

function renderEvents(lang) {

  const container = document.getElementById("event-container");

  if (!container) return;

  container.innerHTML = "";

  events[lang].forEach(event => {

    const card = document.createElement("div");

    card.className = "event-card";

    card.innerHTML = `
      <h3>${event.title}</h3>
      <p>${event.description}</p>
    `;

    container.appendChild(card);
  });
}

// =========================
// INITIAL LANGUAGE
// =========================

document.addEventListener("DOMContentLoaded", () => {

  // 저장된 언어 불러오기
  const savedLanguage =
    localStorage.getItem("language") || "ko";

  updateLanguage(savedLanguage);
});
document.addEventListener("click", (e) => {
  const target = e.target.closest("[data-page]");
  if (!target) return;

  e.preventDefault();

  const pageName = target.dataset.page;

  document.querySelectorAll(".page").forEach((page) => {
    page.classList.remove("active");
  });

  const nextPage = document.querySelector(
    `.page[data-page-name="${pageName}"]`
  );

  if (nextPage) {
    nextPage.classList.add("active");
    window.scrollTo(0, 0);
  }
});