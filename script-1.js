/* =========================================================================
   Shared Memory Project — AI 분석 엔진 (script.js)
   -------------------------------------------------------------------------
   ★ 본 파일은 "분석 로직"에 집중합니다.
     UI/다국어 텍스트 전환은 i18n.js 가 담당합니다. (둘은 독립적으로 동작)

   ★ 핵심 동작
      1) 입력 텍스트의 언어를 유니코드 범위 기반으로 감지
      2) 감지된 언어에 맞는 "분석기"를 골라 호출
      3) 키워드 / 감정 강도 / 외교적·민족주의적 표현 / 서술 스타일 분석
      4) 결과를 입력 언어로 출력 (한국어 입력 → 한국어 결과)
      5) 두 언어 이상이 섞이면 "복합 언어 서술 감지" 모드로 분기

   ★ 외부 API를 쓰지 않는 이유
      - 사이트가 GitHub Pages(정적 호스팅)에서 동작해야 함
      - API 키 노출 위험 / 호출 비용 / 네트워크 의존성을 모두 제거
      - 본 프로젝트의 목적은 "역사 인식 차이의 체험"이므로,
        규칙 기반 분석으로도 학습 목적 달성이 충분함
   ========================================================================= */
(function () {
  "use strict";

  /* ───────────────────────────────────────────────────────────────────────
     [1] 언어 감지 — 유니코드 블록 기반 룰 베이스
     ───────────────────────────────────────────────────────────────────────
     ▸ 한글:    U+AC00–U+D7AF (음절), U+1100–U+11FF (자모), U+3130–U+318F (호환)
     ▸ 히라가나: U+3040–U+309F
     ▸ 가타카나: U+30A0–U+30FF
     ▸ 라틴 알파벳: A–Z / a–z

     반환값은 사용된 스크립트의 "집합" + "주 언어".
     이렇게 set 단위로 추적해야 혼합 언어를 정확히 판정할 수 있다.
     ─────────────────────────────────────────────────────────────────────── */
  const RE = {
    hangul: /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/g,
    kana:   /[\u3040-\u309F\u30A0-\u30FF]/g,
    latin:  /[A-Za-z]/g,
    han:    /[\u4E00-\u9FFF]/g, // 한자 (단독으로는 언어 판정 어려움)
  };

  function detectLanguage(text) {
    if (!text || !text.trim()) {
      return { primary: null, scripts: [], mixed: false, counts: {} };
    }

    const counts = {
      hangul: (text.match(RE.hangul) || []).length,
      kana:   (text.match(RE.kana)   || []).length,
      latin:  (text.match(RE.latin)  || []).length,
      han:    (text.match(RE.han)    || []).length,
    };

    // 어떤 스크립트가 의미 있게 등장했는지 set으로 표시
    const scripts = [];
    if (counts.hangul > 0) scripts.push("ko");
    if (counts.kana   > 0) scripts.push("ja");
    // 알파벳은 한국어/일본어 문장 안에서도 자주 끼므로,
    // 한글·가나가 전혀 없을 때만 영어로 인정 (혼합 오판 방지)
    if (counts.latin > 0 && counts.hangul === 0 && counts.kana === 0) {
      scripts.push("en");
    }

    // 주 언어 = 가장 많이 등장한 스크립트
    let primary = null;
    let max = 0;
    [["ko", counts.hangul], ["ja", counts.kana], ["en", counts.latin]].forEach(([lang, c]) => {
      if (c > max) { max = c; primary = lang; }
    });

    // 혼합 판정: 의미 있는 스크립트가 2개 이상
    const mixed = scripts.length >= 2;

    return { primary, scripts, mixed, counts };
  }

  /* ───────────────────────────────────────────────────────────────────────
     [2] 언어별 어휘 사전
     ───────────────────────────────────────────────────────────────────────
     키워드는 4개 카테고리로 나눠둔다:
       - history:       역사 사건/시대 관련 단어 (핵심 키워드 후보)
       - emotion_*:     감정 강도 측정용 (강/중/약 3단계)
       - diplomatic:    외교적/중립적 표현 (양국·협상·평화 등)
       - nationalistic: 민족주의적 표현 (침략·강탈·고유 등)

     ※ 같은 사건을 "양국에서 서로 다르게 부르는 단어"를 포함시켜,
        역사 인식 차이가 분석 결과에 그대로 드러나도록 설계했다.
     ─────────────────────────────────────────────────────────────────────── */
  const LEX = {
    ko: {
      history: ["임진왜란","왜란","일제","식민지","위안부","독립","광복","조선","대한제국","독도","간도","조약","강제","징용","해방","전쟁","항일"],
      emotion_strong: ["참혹","비극","분노","치욕","통탄","원통","울분","처참"],
      emotion_mid:    ["슬픔","아픔","비통","고통","상처","눈물","한"],
      emotion_soft:   ["그리움","회상","기억","추억","아쉬움","조용히"],
      diplomatic:    ["양국","협력","대화","화해","공동","상호","교류","평화","이해","논의"],
      nationalistic: ["침략","강탈","불법","고유","우리 땅","민족","조국","수호","항거","저항"],
    },
    ja: {
      history: ["文禄","慶長","出兵","朝鮮","植民地","従軍","独立","解放","李氏朝鮮","竹島","間島","条約","強制","徴用","戦争","抗日"],
      emotion_strong: ["悲惨","悲劇","怒り","屈辱","痛恨","無念","憤り"],
      emotion_mid:    ["悲しみ","痛み","苦しみ","傷","涙","恨み"],
      emotion_soft:   ["懐かしさ","回想","記憶","思い出","名残","静かに"],
      diplomatic:    ["両国","協力","対話","和解","共同","相互","交流","平和","理解","議論"],
      nationalistic: ["侵略","強奪","不法","固有","我が領土","民族","祖国","守護","抗戦","抵抗"],
    },
    en: {
      history: ["war","invasion","colonial","occupation","comfort women","independence","liberation","Joseon","Korea","Japan","Dokdo","Takeshima","treaty","forced labor","annexation"],
      emotion_strong: ["atrocious","tragic","outrage","humiliation","devastating","horrific"],
      emotion_mid:    ["sorrow","pain","suffering","wound","tears","grief"],
      emotion_soft:   ["nostalgia","recollection","memory","remembrance","longing","quietly"],
      diplomatic:    ["both nations","cooperation","dialogue","reconciliation","mutual","exchange","peace","understanding","discussion"],
      nationalistic: ["aggression","plunder","illegal","indigenous","our territory","nation","homeland","defend","resistance","uprising"],
    },
  };

  /* ───────────────────────────────────────────────────────────────────────
     [3] 언어별 출력 템플릿
     ───────────────────────────────────────────────────────────────────────
     같은 "구조"를 갖되, 표현 톤은 각 언어의 역사 서술 관습을 반영했다:
       - ko: 직접적 감정 표현, 피해자 시점 어휘
       - ja: 간접·완곡, 거리감 있는 문체
       - en: 분석적·중립적, 사건명 중심
     ─────────────────────────────────────────────────────────────────────── */
  const TEMPLATES = {
    ko: {
      labels: {
        keywords:      "핵심 키워드",
        emotion:       "감정 강도",
        diplomatic:    "외교적 표현 비중",
        nationalistic: "민족주의적 표현 비중",
        style:         "서술 방식",
        perception:    "역사 인식 특징",
        summary:       "종합 분석",
        detected:      "감지된 언어",
      },
      detected: "한국어",
      styleByEmotion: {
        strong: "감정이 전면에 드러나는 직접적·고발적 서술",
        mid:    "회상과 감정이 교차하는 개인사 중심 서술",
        soft:   "조용한 회상조의 서정적 서술",
        flat:   "사실 나열 중심의 담담한 서술",
      },
      perceptionFn: (d, n) => {
        if (n > d && n >= 2) return "피해자 시점에서 사건의 부당함을 강조하는 인식";
        if (d > n && d >= 2) return "양국 관계와 화해 가능성을 모색하는 인식";
        if (d === 0 && n === 0) return "특정 시각이 두드러지지 않는 개인 기억 중심의 인식";
        return "감정과 사실, 화해와 비판이 공존하는 양가적 인식";
      },
      summaryFn: (ctx) => {
        const kw = ctx.keywords[0] || "역사";
        return `이 글은 '${kw}'을(를) 중심으로, ${ctx.style}을 보입니다. ` +
               `외교적 표현 ${ctx.diplomaticPct}%, 민족주의적 표현 ${ctx.nationalisticPct}%로 ` +
               `${ctx.perception}이(가) 드러납니다. 공동의 기억으로 확장하려면 ` +
               `${ctx.nationalisticPct > ctx.diplomaticPct ? "상대국 시점의 어휘를 함께 검토" : "구체적 사건명과 시기를 보강"}하는 것이 좋겠습니다.`;
      },
    },

    ja: {
      labels: {
        keywords:      "キーワード",
        emotion:       "感情の強度",
        diplomatic:    "外交的表現の比率",
        nationalistic: "ナショナリズム的表現の比率",
        style:         "叙述の方法",
        perception:    "歴史認識の特徴",
        summary:       "総合分析",
        detected:      "検出された言語",
      },
      detected: "日本語",
      styleByEmotion: {
        strong: "感情を前面に出した直接的・告発的な叙述",
        mid:    "回想と感情が交差する個人史的叙述",
        soft:   "静かな回想調の叙情的な叙述",
        flat:   "事実を淡々と列挙する叙述",
      },
      perceptionFn: (d, n) => {
        if (n > d && n >= 2) return "被害者の視点から事件の不当性を強調する認識";
        if (d > n && d >= 2) return "両国関係と和解の可能性を模索する認識";
        if (d === 0 && n === 0) return "特定の視点が前面に出ない個人の記憶中心の認識";
        return "感情と事実、和解と批判が併存する両義的な認識";
      },
      summaryFn: (ctx) => {
        const kw = ctx.keywords[0] || "歴史";
        return `この文章は「${kw}」を中心に、${ctx.style}を示しています。` +
               `外交的表現 ${ctx.diplomaticPct}%、ナショナリズム的表現 ${ctx.nationalisticPct}% であり、` +
               `${ctx.perception}が読み取れます。共通の記憶へと拡張するためには、` +
               `${ctx.nationalisticPct > ctx.diplomaticPct ? "相手国の視点の語彙を併せて検討する" : "具体的な事件名と時期を補強する"}ことが望ましいでしょう。`;
      },
    },

    en: {
      labels: {
        keywords:      "Keywords",
        emotion:       "Emotional Intensity",
        diplomatic:    "Diplomatic Expression Ratio",
        nationalistic: "Nationalistic Expression Ratio",
        style:         "Narrative Style",
        perception:    "Historical Perception",
        summary:       "Overall Analysis",
        detected:      "Detected Language",
      },
      detected: "English",
      styleByEmotion: {
        strong: "Direct, accusatory narrative with foregrounded emotion",
        mid:    "Personal history weaving recollection with feeling",
        soft:   "Lyrical, quietly reminiscent narrative",
        flat:   "Detached, fact-listing narrative",
      },
      perceptionFn: (d, n) => {
        if (n > d && n >= 2) return "victim-centered perception emphasizing the injustice of events";
        if (d > n && d >= 2) return "perception oriented toward bilateral relations and reconciliation";
        if (d === 0 && n === 0) return "personal-memory perception without a dominant ideological frame";
        return "ambivalent perception where emotion and fact, critique and reconciliation coexist";
      },
      summaryFn: (ctx) => {
        const kw = ctx.keywords[0] || "history";
        return `Centered on "${kw}", the text exhibits a ${ctx.style.toLowerCase()}. ` +
               `Diplomatic expressions account for ${ctx.diplomaticPct}% and nationalistic ones for ${ctx.nationalisticPct}%, ` +
               `revealing a ${ctx.perception}. To expand this into shared memory, it would help to ` +
               `${ctx.nationalisticPct > ctx.diplomaticPct ? "consider vocabulary from the other country's perspective" : "add specific event names and dates"}.`;
      },
    },

    // 혼합 언어 — 별도 템플릿
    mixed: {
      labels: {
        keywords:      "복합 키워드 / 複合キーワード / Mixed Keywords",
        emotion:       "감정 강도 / 感情強度 / Emotional Intensity",
        diplomatic:    "외교 표현 / 外交表現 / Diplomatic",
        nationalistic: "민족 표현 / 民族表現 / Nationalistic",
        style:         "서술 방식 / 叙述スタイル / Narrative Style",
        perception:    "역사 인식 / 歴史認識 / Historical Perception",
        summary:       "복합 언어 서술 분석 / Mixed-Language Narrative Analysis",
        detected:      "감지된 언어 / Detected Languages",
      },
      detected: "복합 언어 서술 감지 (Mixed-Language Narrative Detected)",
    },
  };

  /* ───────────────────────────────────────────────────────────────────────
     [4] 카운팅 헬퍼 — 텍스트에서 카테고리별 매칭 단어 추출
     ─────────────────────────────────────────────────────────────────────── */
  function matchWords(text, list) {
    const found = [];
    const lower = text.toLowerCase();
    list.forEach((w) => {
      // 영문은 대소문자 무시, 한·일은 그대로 비교
      const isLatin = /[A-Za-z]/.test(w);
      const target  = isLatin ? w.toLowerCase() : w;
      const hay     = isLatin ? lower : text;
      if (hay.includes(target)) found.push(w);
    });
    return found;
  }

  /* ───────────────────────────────────────────────────────────────────────
     [5] 단일 언어 분석 — 메인 파이프라인
     ─────────────────────────────────────────────────────────────────────── */
  function analyzeOne(text, lang) {
    const lex = LEX[lang];
    const tpl = TEMPLATES[lang];

    // 5-1. 카테고리별 매칭
    const kwHits = matchWords(text, lex.history);
    const strong = matchWords(text, lex.emotion_strong);
    const mid    = matchWords(text, lex.emotion_mid);
    const soft   = matchWords(text, lex.emotion_soft);
    const diplo  = matchWords(text, lex.diplomatic);
    const nation = matchWords(text, lex.nationalistic);

    // 5-2. 감정 강도 점수 (가중치: 강3 / 중2 / 약1)
    const emotionScore = strong.length * 3 + mid.length * 2 + soft.length * 1;
    let emotionLevel;
    if      (emotionScore >= 6) emotionLevel = "strong";
    else if (emotionScore >= 3) emotionLevel = "mid";
    else if (emotionScore >= 1) emotionLevel = "soft";
    else                        emotionLevel = "flat";

    // 5-3. 외교 / 민족 비율 (전체 매칭 어휘 대비)
    const totalCat = diplo.length + nation.length;
    const diplomaticPct    = totalCat ? Math.round((diplo.length  / totalCat) * 100) : 0;
    const nationalisticPct = totalCat ? Math.round((nation.length / totalCat) * 100) : 0;

    // 5-4. 키워드 — 사전에 없으면 텍스트에서 긴 토큰 3개를 대체로 사용
    let keywords = kwHits.slice(0, 5);
    if (keywords.length === 0) {
      keywords = text
        .split(/[\s,.;:!?。、！？「」『』\(\)\[\]\-—]+/)
        .filter((w) => w.length >= 2)
        .sort((a, b) => b.length - a.length)
        .slice(0, 3);
    }

    // 5-5. 감정 강도 표시 문자열 (UI 친화적)
    const emotionLabel = {
      ko: { strong:"강 (★★★)", mid:"중 (★★☆)", soft:"약 (★☆☆)", flat:"평탄 (☆☆☆)" },
      ja: { strong:"強 (★★★)", mid:"中 (★★☆)", soft:"弱 (★☆☆)", flat:"平 (☆☆☆)" },
      en: { strong:"High (★★★)", mid:"Medium (★★☆)", soft:"Low (★☆☆)", flat:"Flat (☆☆☆)" },
    }[lang][emotionLevel];

    // 5-6. 종합 요약 컨텍스트
    const style      = tpl.styleByEmotion[emotionLevel];
    const perception = tpl.perceptionFn(diplo.length, nation.length);
    const summary    = tpl.summaryFn({
      keywords, style, perception, diplomaticPct, nationalisticPct,
    });

    return {
      lang,
      detected:        tpl.detected,
      labels:          tpl.labels,
      keywords,
      emotion:         emotionLabel,
      emotionScore,
      diplomaticPct,
      nationalisticPct,
      style,
      perception,
      summary,
      _matched: { diplo, nation, strong, mid, soft },
    };
  }

  /* ───────────────────────────────────────────────────────────────────────
     [6] 혼합 언어 분석
     ───────────────────────────────────────────────────────────────────────
     ▸ 감지된 각 언어로 individually 분석 후 결과를 합친다.
     ▸ 요약은 3개국어 병기 — "복합 언어 서술 감지"의 시각적 효과.
     ─────────────────────────────────────────────────────────────────────── */
  function analyzeMixed(text, scripts) {
    const partials = scripts.map((lng) => analyzeOne(text, lng));

    const keywords = [];
    partials.forEach((p) => p.keywords.forEach((k) => {
      if (!keywords.includes(k)) keywords.push(k);
    }));

    const avg = (key) =>
      Math.round(partials.reduce((s, p) => s + p[key], 0) / partials.length);

    const emotionScoreSum = partials.reduce((s, p) => s + p.emotionScore, 0);

    const summary = {
      ko: `이 글은 ${scripts.map((s)=>({ko:"한국어",ja:"일본어",en:"영어"}[s])).join(" + ")} 가 함께 사용된 복합 언어 서술입니다. 서로 다른 언어 공동체의 어휘가 한 문장 안에 공존한다는 점에서, 이미 '공동의 기억'을 향한 서사적 시도로 읽힙니다.`,
      ja: `この文章は ${scripts.map((s)=>({ko:"韓国語",ja:"日本語",en:"英語"}[s])).join(" + ")} が混在する複合言語叙述です。異なる言語共同体の語彙が一つの文章に共存していること自体が、すでに「共通の記憶」へ向かう叙事的試みとして読み取れます。`,
      en: `This is a mixed-language narrative combining ${scripts.map((s)=>({ko:"Korean",ja:"Japanese",en:"English"}[s])).join(" + ")}. The coexistence of vocabularies from different linguistic communities within a single passage can itself be read as a narrative move toward shared memory.`,
    };

    return {
      lang:       "mixed",
      mixed:      true,
      scripts,
      detected:   TEMPLATES.mixed.detected,
      labels:     TEMPLATES.mixed.labels,
      keywords:   keywords.slice(0, 8),
      emotion: {
        ko: `종합 강도 점수: ${emotionScoreSum}`,
        ja: `総合強度スコア: ${emotionScoreSum}`,
        en: `Combined intensity score: ${emotionScoreSum}`,
      },
      diplomaticPct:    avg("diplomaticPct"),
      nationalisticPct: avg("nationalisticPct"),
      style: {
        ko: partials.map((p)=>`[${p.lang}] ${p.style}`).join(" / "),
        ja: partials.map((p)=>`[${p.lang}] ${p.style}`).join(" / "),
        en: partials.map((p)=>`[${p.lang}] ${p.style}`).join(" / "),
      },
      perception: {
        ko: partials.map((p)=>`[${p.lang}] ${p.perception}`).join(" / "),
        ja: partials.map((p)=>`[${p.lang}] ${p.perception}`).join(" / "),
        en: partials.map((p)=>`[${p.lang}] ${p.perception}`).join(" / "),
      },
      summary,
      partials,
    };
  }

  /* ───────────────────────────────────────────────────────────────────────
     [7] 공개 진입점
     ─────────────────────────────────────────────────────────────────────── */
  function analyze(text) {
    const det = detectLanguage(text);

    if (!det.primary && det.scripts.length === 0) return null;
    if (det.mixed) return analyzeMixed(text, det.scripts);

    const lang = det.primary || "ko";
    return analyzeOne(text, lang);
  }

  /* ───────────────────────────────────────────────────────────────────────
     [8] 결과 렌더링
     ───────────────────────────────────────────────────────────────────────
     ▸ 결과를 그릴 박스 후보:
        1) #smp-result (i18n.js가 만든 영역)
        2) #ai-analysis-result, [data-ai-result] (기존 컨테이너)
        3) 위 어느 것도 없으면 textarea 옆에 새로 만든다
     ▸ 기존 카드/UI 디자인은 절대 수정하지 않음 — 결과 박스만 갱신
     ─────────────────────────────────────────────────────────────────────── */
  function getResultBox() {
    const candidates = [
      document.getElementById("smp-result"),
      document.getElementById("ai-analysis-result"),
      document.querySelector("[data-ai-result]"),
    ].filter(Boolean);
    if (candidates.length) return candidates[0];

    const input = document.getElementById("smp-input") || document.querySelector("textarea");
    const box = document.createElement("div");
    box.id = "smp-result";
    box.className = "smp-result";
    (input?.parentElement || document.body).appendChild(box);
    return box;
  }

  function renderResult(r) {
    const box = getResultBox();
    if (!box) return;

    // 혼합 언어 결과는 객체 형태의 다국어 문구이므로 적절히 꺼내 쓴다
    const pick = (v) => (typeof v === "string" ? v : (v?.ko || v?.en || ""));

    const L = r.labels;

    // 막대 그래프 한 줄
    const pctBar = (label, pct, color) => `
      <div class="smp-bar-row">
        <span class="smp-bar-label">${label}</span>
        <div class="smp-bar-track">
          <div class="smp-bar-fill" style="width:${pct}%;background:${color};"></div>
        </div>
        <span class="smp-bar-val">${pct}%</span>
      </div>
    `;

    box.innerHTML = `
      <div class="smp-result-head">
        <span class="smp-pill smp-pill-${r.mixed ? "mix" : r.lang}">${r.detected}</span>
      </div>

      <dl class="smp-result-grid">
        <dt>${L.keywords}</dt>
        <dd>${r.keywords.length
                ? r.keywords.map(k => `<span class="smp-kw">${k}</span>`).join(" ")
                : "—"}</dd>

        <dt>${L.emotion}</dt>
        <dd>${pick(r.emotion)}</dd>

        <dt>${L.style}</dt>
        <dd>${pick(r.style)}</dd>

        <dt>${L.perception}</dt>
        <dd>${pick(r.perception)}</dd>
      </dl>

      <div class="smp-bars">
        ${pctBar(L.diplomatic,    r.diplomaticPct,    "#2563eb")}
        ${pctBar(L.nationalistic, r.nationalisticPct, "#b91c1c")}
      </div>

      <div class="smp-summary">
        <strong>${L.summary}</strong>
        <p>${pick(r.summary)}</p>
      </div>
    `;
    box.hidden = false;
  }

  /* ───────────────────────────────────────────────────────────────────────
     [9] 최소 CSS — smp- prefix로 기존 스타일과 충돌 없음
     ─────────────────────────────────────────────────────────────────────── */
  function injectStyles() {
    if (document.getElementById("smp-analysis-style")) return;
    const css = `
      .smp-result{margin-top:20px;padding:18px;border:1px solid #eee;
        border-radius:10px;background:#fff;font-family:inherit;}
      .smp-result-head{margin-bottom:12px;}
      .smp-pill{display:inline-block;padding:3px 10px;border-radius:999px;
        font-size:12px;font-weight:600;}
      .smp-pill-ko{background:#e8f1ff;color:#1d4ed8;}
      .smp-pill-ja{background:#ffeaea;color:#b91c1c;}
      .smp-pill-en{background:#eaf7ec;color:#166534;}
      .smp-pill-mix{background:#f3e8ff;color:#6d28d9;}

      .smp-result-grid{display:grid;grid-template-columns:160px 1fr;
        gap:10px 16px;margin:0 0 16px;}
      .smp-result-grid dt{font-weight:600;color:#444;}
      .smp-result-grid dd{margin:0;color:#222;line-height:1.55;}
      .smp-kw{display:inline-block;background:#f4f4f5;color:#222;
        padding:2px 8px;border-radius:999px;font-size:12px;margin:0 4px 4px 0;}

      .smp-bars{margin:12px 0 16px;}
      .smp-bar-row{display:grid;grid-template-columns:160px 1fr 48px;
        align-items:center;gap:10px;margin-bottom:6px;font-size:13px;}
      .smp-bar-label{color:#444;}
      .smp-bar-track{height:8px;background:#f1f1f3;border-radius:999px;overflow:hidden;}
      .smp-bar-fill{height:100%;border-radius:999px;transition:width .4s ease;}
      .smp-bar-val{text-align:right;color:#555;font-variant-numeric:tabular-nums;}

      .smp-summary{padding:12px 14px;background:#fafafa;border-radius:8px;}
      .smp-summary strong{display:block;margin-bottom:6px;color:#222;}
      .smp-summary p{margin:0;line-height:1.65;color:#333;}
    `;
    const s = document.createElement("style");
    s.id = "smp-analysis-style";
    s.textContent = css;
    document.head.appendChild(s);
  }

  /* ───────────────────────────────────────────────────────────────────────
     [10] 이벤트 연결
     ───────────────────────────────────────────────────────────────────────
     ▸ i18n.js가 만든 #smp-analyze 버튼이 있으면 그쪽에 연결
     ▸ 없다면 페이지에 이미 있는 "AI 분석 실행" 등의 버튼을 텍스트로 찾아 연결
     ▸ 어느 쪽이든 textarea의 값을 받아 analyze() 호출 후 renderResult()
     ─────────────────────────────────────────────────────────────────────── */
  function findLegacyAnalyzeButton() {
    const candidates = Array.from(document.querySelectorAll("button, a, [role='button']"));
    return candidates.find((el) => /AI\s*분석|分析|analysis|analyze/i.test(el.textContent || ""));
  }

  function findInputArea() {
    return document.getElementById("smp-input")
        || document.querySelector("textarea[data-analyze]")
        || document.querySelector("textarea");
  }

  function bindAnalyzeButton() {
    const input     = findInputArea();
    const newBtn    = document.getElementById("smp-analyze");
    const legacyBtn = findLegacyAnalyzeButton();

    const handler = () => {
      const text = (input && input.value) || "";
      const box  = getResultBox();

      if (!text.trim()) {
        box.innerHTML = `<p style="color:#888;">— No input —</p>`;
        box.hidden = false;
        return;
      }

      // 짧은 지연으로 "분석 중" UI를 보여줘 실제 AI 느낌 강화
      box.innerHTML = `<p style="color:#888;">… analyzing …</p>`;
      box.hidden = false;
      setTimeout(() => {
        const r = analyze(text);
        if (r) renderResult(r);
      }, 300);
    };

    if (newBtn)                              newBtn.addEventListener("click", handler);
    if (legacyBtn && legacyBtn !== newBtn)   legacyBtn.addEventListener("click", handler);
  }

  /* ───────────────────────────────────────────────────────────────────────
     [11] 부팅
     ─────────────────────────────────────────────────────────────────────── */
  function boot() {
    injectStyles();
    bindAnalyzeButton();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  /* ───────────────────────────────────────────────────────────────────────
     [12] 외부 노출 — 콘솔 테스트 및 다른 스크립트와의 협업용
     ─────────────────────────────────────────────────────────────────────── */
  window.SMP_AI = {
    detectLanguage,
    analyze,
    render: renderResult,
  };
})();
