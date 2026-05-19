/* =========================================================================
   Shared Memory Project — AI 분석 엔진 (script.js)
   -------------------------------------------------------------------------
   ▣ 이번 수정의 핵심 변경점
     1) analyzeNarrative(text) 가 { ko, ja, en } 객체를 반환하도록 변경
     2) detectLanguage(text) 의 결과로 그 객체에서 인덱싱해 출력
     3) aiResult.innerHTML 에 박혀 있던 한국어 하드코딩 문자열을 제거하고,
        반드시 analysis[language] 를 거치게 만듦
   ------------------------------------------------------------------------- 
   ▣ 기존 코드의 문제
     이전 script.js 에서는 분석 함수가 HTML을 직접 생성하면서
     한국어 문구를 그대로 박아 넣고 있었음. detectLanguage 가 동작해도
     렌더링 단계에서 그 값을 사용하지 않아 결과가 항상 한국어로만 표시됨.
   ========================================================================= */

(function () {
  "use strict";

  /* ───────────────────────────────────────────────────────────────────────
     [1] 언어 감지
         - 한글 / 가나 / 라틴 알파벳의 유니코드 범위로 판별
         - 두 종류 이상 섞이면 mixed=true
         - 단일 언어일 때 primary 가 'ko' | 'ja' | 'en'
     ─────────────────────────────────────────────────────────────────────── */
  const RE = {
    hangul: /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/g,
    kana:   /[\u3040-\u309F\u30A0-\u30FF]/g,
    latin:  /[A-Za-z]/g,
  };

  function detectLanguage(text) {
    if (!text || !text.trim()) {
      return { primary: null, scripts: [], mixed: false };
    }

    const cKo = (text.match(RE.hangul) || []).length;
    const cJa = (text.match(RE.kana)   || []).length;
    const cEn = (text.match(RE.latin)  || []).length;

    const scripts = [];
    if (cKo > 0) scripts.push("ko");
    if (cJa > 0) scripts.push("ja");
    // 한글·가나가 전혀 없을 때에만 영어로 인정 (혼합 오판 방지)
    if (cEn > 0 && cKo === 0 && cJa === 0) scripts.push("en");

    // 가장 많이 등장한 스크립트가 주 언어
    let primary = null;
    let max = 0;
    [["ko", cKo], ["ja", cJa], ["en", cEn]].forEach(([lang, c]) => {
      if (c > max) { max = c; primary = lang; }
    });

    return {
      primary,
      scripts,
      mixed: scripts.length >= 2,
      counts: { ko: cKo, ja: cJa, en: cEn },
    };
  }

  /* ───────────────────────────────────────────────────────────────────────
     [2] 어휘 사전
         - history:       핵심 키워드 후보
         - emotion_*:     감정 강도 (강/중/약 가중치)
         - diplomatic:    외교적·중립적 표현
         - nationalistic: 민족주의적 표현
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

  /* 영문 비교는 소문자, 한·일은 원문 그대로 비교 */
  function matchWords(text, list) {
    const lower = text.toLowerCase();
    return list.filter((w) => {
      const isLatin = /[A-Za-z]/.test(w);
      const target  = isLatin ? w.toLowerCase() : w;
      const hay     = isLatin ? lower : text;
      return hay.includes(target);
    });
  }

  /* ───────────────────────────────────────────────────────────────────────
     [3] 점수 계산 — 언어 공통
         감정 강도, 외교/민족 표현 비율, 키워드 추출
     ─────────────────────────────────────────────────────────────────────── */
  function scoreOne(text, lang) {
    const lex = LEX[lang];

    const kwHits = matchWords(text, lex.history);
    const strong = matchWords(text, lex.emotion_strong);
    const mid    = matchWords(text, lex.emotion_mid);
    const soft   = matchWords(text, lex.emotion_soft);
    const diplo  = matchWords(text, lex.diplomatic);
    const nation = matchWords(text, lex.nationalistic);

    // 감정 강도 (강3 / 중2 / 약1 가중)
    const eScore = strong.length * 3 + mid.length * 2 + soft.length * 1;
    let level;
    if      (eScore >= 6) level = "strong";
    else if (eScore >= 3) level = "mid";
    else if (eScore >= 1) level = "soft";
    else                  level = "flat";

    // 외교 vs 민족 비율
    const total = diplo.length + nation.length;
    const diploPct  = total ? Math.round((diplo.length  / total) * 100) : 0;
    const nationPct = total ? Math.round((nation.length / total) * 100) : 0;

    // 키워드 (사전 매칭이 없으면 긴 토큰으로 폴백)
    let keywords = kwHits.slice(0, 5);
    if (keywords.length === 0) {
      keywords = text
        .split(/[\s,.;:!?。、！？「」『』()\[\]\-—]+/)
        .filter((w) => w.length >= 2)
        .sort((a, b) => b.length - a.length)
        .slice(0, 3);
    }

    return {
      keywords,
      level,
      diploPct,
      nationPct,
      matched: { strong, mid, soft, diplo, nation },
    };
  }

  /* ───────────────────────────────────────────────────────────────────────
     [4] ★ 핵심 함수 — analyzeNarrative(text)
         반환값: { language, primary, mixed, analysis: { ko, ja, en } }
         analysis 객체에 세 언어 분석 결과를 모두 담아 두기 때문에,
         호출부에서 analysis[language] 만 꺼내 출력하면 된다.
     ─────────────────────────────────────────────────────────────────────── */
  function analyzeNarrative(text) {
    const det = detectLanguage(text);
    const primary = det.primary || "ko";

    // 점수는 "주 언어"의 사전을 기준으로 계산하되,
    // 분석 문구는 ko/ja/en 모두 생성해 둔다.
    const s = scoreOne(text, primary);
    const kw0 = s.keywords[0] || "";

    /* ── 감정 강도 라벨 (언어별 표기) ── */
    const intensityLabel = {
      ko: { strong:"강 (★★★)", mid:"중 (★★☆)", soft:"약 (★☆☆)", flat:"평탄 (☆☆☆)" },
      ja: { strong:"強 (★★★)", mid:"中 (★★☆)", soft:"弱 (★☆☆)", flat:"平 (☆☆☆)" },
      en: { strong:"High (★★★)", mid:"Medium (★★☆)", soft:"Low (★☆☆)", flat:"Flat (☆☆☆)" },
    };

    /* ── 서술 방식 (감정 강도에 따라) ── */
    const styleText = {
      ko: {
        strong: "감정이 전면에 드러나는 직접적·고발적 서술",
        mid:    "회상과 감정이 교차하는 개인사 중심 서술",
        soft:   "조용한 회상조의 서정적 서술",
        flat:   "사실 나열 중심의 담담한 서술",
      },
      ja: {
        strong: "感情を前面に出した直接的・告発的な叙述",
        mid:    "回想と感情が交差する個人史的叙述",
        soft:   "静かな回想調の叙情的な叙述",
        flat:   "事実を淡々と列挙する叙述",
      },
      en: {
        strong: "direct, accusatory narrative with foregrounded emotion",
        mid:    "personal-history narrative weaving recollection with feeling",
        soft:   "lyrical, quietly reminiscent narrative",
        flat:   "detached, fact-listing narrative",
      },
    };

    /* ── 역사 인식 특징 (외교 vs 민족 비율에 따라) ── */
    function perceptionText(lang, d, n) {
      const map = {
        ko: {
          victim:    "피해자 시점에서 사건의 부당함을 강조하는 인식",
          recon:     "양국 관계와 화해 가능성을 모색하는 인식",
          neutral:   "특정 시각이 두드러지지 않는 개인 기억 중심의 인식",
          ambivalent:"감정과 사실, 화해와 비판이 공존하는 양가적 인식",
        },
        ja: {
          victim:    "被害者の視点から事件の不当性を強調する認識",
          recon:     "両国関係と和解の可能性を模索する認識",
          neutral:   "特定の視点が前面に出ない個人の記憶中心の認識",
          ambivalent:"感情と事実、和解と批判が併存する両義的な認識",
        },
        en: {
          victim:    "victim-centered perception emphasizing the injustice of events",
          recon:     "perception oriented toward bilateral relations and reconciliation",
          neutral:   "personal-memory perception without a dominant ideological frame",
          ambivalent:"ambivalent perception where emotion and fact, critique and reconciliation coexist",
        },
      }[lang];
      if (n > d && n >= 2) return map.victim;
      if (d > n && d >= 2) return map.recon;
      if (d === 0 && n === 0) return map.neutral;
      return map.ambivalent;
    }

    /* ── 종합 요약 문구 (언어별 톤) ── */
    function summaryText(lang) {
      const style       = styleText[lang][s.level];
      const perception  = perceptionText(lang, s.diploPct ? 2 : 0, s.nationPct ? 2 : 0);
      const wantsRecon  = s.nationPct > s.diploPct;

      if (lang === "ko") {
        // 키워드 중 일본어 측 호칭이 섞이지 않도록, 출력 언어용 키워드는 그 언어 사전에서 다시 한 번 매칭 시도
        const kwForLang = matchWords(text, LEX.ko.history)[0] || kw0 || "역사";
        return `이 글은 '${kwForLang}'을(를) 중심으로, ${style}을 보입니다. ` +
               `외교적 표현 ${s.diploPct}%, 민족주의적 표현 ${s.nationPct}%로 ` +
               `${perception}이(가) 드러납니다. ` +
               (wantsRecon
                 ? "상대국 시점의 어휘를 함께 검토하면 공동의 기억으로 확장할 여지가 커집니다."
                 : "구체적 사건명과 시기를 보강하면 공동의 기억으로 확장하기 좋습니다.");
      }
      if (lang === "ja") {
        const kwForLang = matchWords(text, LEX.ja.history)[0] || kw0 || "歴史";
        // 요구사항 4번의 예시 톤을 반영: 「~」という表現から ~ 視点が見られます。
        const opener = kwForLang
          ? `「${kwForLang}」という表現から、`
          : `この文章からは、`;
        const stance = wantsRecon ? "国家中心的視点" : "対話志向的視点";
        return `${opener}${stance}が見られます。` +
               `叙述は${style}であり、外交的表現 ${s.diploPct}%、ナショナリズム的表現 ${s.nationPct}% で、` +
               `${perception}が読み取れます。` +
               (wantsRecon
                 ? "相手国の視点の語彙を併せて検討することで、共通の記憶への拡張が可能になります。"
                 : "具体的な事件名と時期を補強すると、共通の記憶へ繋がりやすくなります。");
      }
      // en
      const kwForLang = matchWords(text, LEX.en.history)[0] || kw0 || "history";
      // 요구사항 5번의 예시 톤을 반영
      const opener = (s.diploPct > s.nationPct)
        ? "This narrative uses relatively diplomatic and neutral wording."
        : (s.nationPct > s.diploPct)
          ? "This narrative leans toward nationally framed, victim-centered wording."
          : "This narrative balances diplomatic and nationally framed wording.";
      return `${opener} Centered on "${kwForLang}", it reads as a ${style}. ` +
             `Diplomatic expressions: ${s.diploPct}%, nationalistic: ${s.nationPct}%, ` +
             `revealing a ${perception}. ` +
             (wantsRecon
               ? "Considering vocabulary from the other country's perspective would open it toward shared memory."
               : "Adding specific event names and dates would help expand it into shared memory.");
    }

    /* ── 라벨 (언어별) ── */
    const labels = {
      ko: { keywords:"핵심 키워드", emotion:"감정 강도", diplomatic:"외교적 표현",
            nationalistic:"민족주의적 표현", style:"서술 방식", perception:"역사 인식 특징",
            summary:"종합 분석", detected:"감지된 언어" },
      ja: { keywords:"キーワード", emotion:"感情の強度", diplomatic:"外交的表現",
            nationalistic:"ナショナリズム的表現", style:"叙述の方法", perception:"歴史認識の特徴",
            summary:"総合分析", detected:"検出された言語" },
      en: { keywords:"Keywords", emotion:"Emotional Intensity", diplomatic:"Diplomatic Expressions",
            nationalistic:"Nationalistic Expressions", style:"Narrative Style", perception:"Historical Perception",
            summary:"Overall Analysis", detected:"Detected Language" },
    };

    const detectedName = { ko:"한국어", ja:"日本語", en:"English" };

    /* ── 언어별 결과 객체 (요구사항 2번 구조) ── */
    const analysis = {};
    ["ko", "ja", "en"].forEach((lng) => {
      analysis[lng] = {
        labels:    labels[lng],
        detected:  detectedName[lng],
        keywords:  s.keywords,
        emotion:   intensityLabel[lng][s.level],
        style:     styleText[lng][s.level],
        perception: perceptionText(lng,
                      s.matched.diplo.length,
                      s.matched.nation.length),
        diploPct:  s.diploPct,
        nationPct: s.nationPct,
        summary:   summaryText(lng),
      };
    });

    return {
      language: primary,   // ★ 호출부가 analysis[language] 로 인덱싱
      primary,
      mixed: det.mixed,
      scripts: det.scripts,
      analysis,
    };
  }

  /* ───────────────────────────────────────────────────────────────────────
     [5] 렌더링 — analysis[language] 만 사용해 HTML 생성
         어떤 경우에도 한국어 문자열을 직접 박아 넣지 않는다.
     ─────────────────────────────────────────────────────────────────────── */
  function buildHTML(a, langPill) {
    const L = a.labels;
    const bar = (label, pct, color) => `
      <div class="smp-bar-row">
        <span class="smp-bar-label">${label}</span>
        <div class="smp-bar-track">
          <div class="smp-bar-fill" style="width:${pct}%;background:${color};"></div>
        </div>
        <span class="smp-bar-val">${pct}%</span>
      </div>`;

    return `
      <div class="smp-result-head">
        <span class="smp-pill smp-pill-${langPill}">${a.detected}</span>
      </div>
      <dl class="smp-result-grid">
        <dt>${L.keywords}</dt>
        <dd>${a.keywords.length
              ? a.keywords.map(k => `<span class="smp-kw">${k}</span>`).join(" ")
              : "—"}</dd>
        <dt>${L.emotion}</dt>     <dd>${a.emotion}</dd>
        <dt>${L.style}</dt>       <dd>${a.style}</dd>
        <dt>${L.perception}</dt>  <dd>${a.perception}</dd>
      </dl>
      <div class="smp-bars">
        ${bar(L.diplomatic,    a.diploPct,  "#2563eb")}
        ${bar(L.nationalistic, a.nationPct, "#b91c1c")}
      </div>
      <div class="smp-summary">
        <strong>${L.summary}</strong>
        <p>${a.summary}</p>
      </div>
    `;
  }

  /* ───────────────────────────────────────────────────────────────────────
     [6] 결과 박스 찾기
         기존 사이트에서 흔히 쓰이는 ID/클래스 후보를 모두 탐색.
         어느 것도 없으면 입력창 옆에 #smp-result 를 새로 만든다.
     ─────────────────────────────────────────────────────────────────────── */
  function getResultBox() {
    const cands = [
      "#aiResult", "#ai-result", "#ai_analysis", "#ai-analysis",
      "#ai-analysis-result", "#analysisResult", "#analysis-result",
      "#smp-result", "[data-ai-result]",
    ];
    for (const sel of cands) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    // 없으면 새로 생성
    const input = findInputArea();
    const box = document.createElement("div");
    box.id = "smp-result";
    box.className = "smp-result";
    (input?.parentElement || document.body).appendChild(box);
    return box;
  }

  function findInputArea() {
    const cands = [
      "#smp-input", "#narrative-input", "#narrative", "#userText", "#user-text",
      "textarea[data-analyze]", "textarea",
    ];
    for (const sel of cands) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return null;
  }

  function findAnalyzeButton() {
    // 1순위: 명시적 ID
    const ids = ["#smp-analyze", "#runAnalysis", "#run-analysis", "#analyze-btn", "#analyzeBtn"];
    for (const sel of ids) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    // 2순위: 텍스트 매칭
    return Array.from(document.querySelectorAll("button, a, [role='button']"))
      .find((el) => /AI\s*분석|分析|analysis|analyze/i.test(el.textContent || ""));
  }

  /* ───────────────────────────────────────────────────────────────────────
     [7] 메인 핸들러
         ★ 여기서 핵심 수정: 한국어로 하드코딩하지 않고
            analysis[language] 의 내용만 가지고 HTML을 만든다.
     ─────────────────────────────────────────────────────────────────────── */
  function runAnalysis() {
    const input = findInputArea();
    const box   = getResultBox();
    if (!input || !box) return;

    const text = input.value || "";
    if (!text.trim()) {
      box.innerHTML = `<p style="color:#888;">— No input —</p>`;
      box.hidden = false;
      return;
    }

    // 분석 중 표시
    box.innerHTML = `<p style="color:#888;">… analyzing …</p>`;
    box.hidden = false;

    setTimeout(() => {
      const result   = analyzeNarrative(text);
      const language = result.language;          // ★ 감지된 언어
      const a        = result.analysis[language]; // ★ 그 언어의 결과만 꺼냄
      box.innerHTML  = buildHTML(a, language);
    }, 300);
  }

  /* ───────────────────────────────────────────────────────────────────────
     [8] 최소 CSS (smp- prefix — 기존 디자인과 충돌 없음)
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
     [9] 부팅
         - 기존 "AI 분석 실행" 버튼을 찾아 클릭 핸들러 부착
         - 기존 핸들러가 있더라도 덮어쓰지 않고 추가만 함 (capture 단계 X)
     ─────────────────────────────────────────────────────────────────────── */
  function boot() {
    injectStyles();
    const btn = findAnalyzeButton();
    if (btn) btn.addEventListener("click", runAnalysis);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  /* ───────────────────────────────────────────────────────────────────────
     [10] 외부 노출
          콘솔에서 직접 테스트 가능:
            SMP_AI.analyzeNarrative("이것은 임진왜란에 관한 글이다")
            SMP_AI.analyzeNarrative("これは出兵についての記述である")
            SMP_AI.analyzeNarrative("This is a passage about the invasion.")
     ─────────────────────────────────────────────────────────────────────── */
  window.SMP_AI = {
    detectLanguage,
    analyzeNarrative,
    runAnalysis,
  };
})();
