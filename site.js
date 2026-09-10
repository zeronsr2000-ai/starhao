const defaults = window.STARHORIZON_DEFAULTS;
const api = window.StarhorizonFirebase;
let currentSite = defaults.site;
let navServiceItems = [];

function $(selector, root = document) {
  return root.querySelector(selector);
}

function qsa(selector, root = document) {
  return [...root.querySelectorAll(selector)];
}

function text(selector, value) {
  const node = $(selector);
  if (node) node.textContent = value || "";
}

function lines(selector, value) {
  const node = $(selector);
  if (!node) return;
  node.textContent = value || "";
  node.classList.add("balanced-copy");
}

function attr(selector, name, value) {
  const node = $(selector);
  if (node && value) node.setAttribute(name, value);
}

function ensureMeta(name, content) {
  if (!content) return;
  let node = $(`meta[name="${name}"]`);
  if (!node) {
    node = document.createElement("meta");
    node.setAttribute("name", name);
    document.head.appendChild(node);
  }
  node.setAttribute("content", content);
}

function ensureMetaProperty(property, content) {
  if (!content) return;
  let node = $(`meta[property="${property}"]`);
  if (!node) {
    node = document.createElement("meta");
    node.setAttribute("property", property);
    document.head.appendChild(node);
  }
  node.setAttribute("content", content);
}

function ensureCanonical(url) {
  if (!url) return;
  let node = $('link[rel="canonical"]');
  if (!node) {
    node = document.createElement("link");
    node.setAttribute("rel", "canonical");
    document.head.appendChild(node);
  }
  node.setAttribute("href", url);
}

function ensureJsonLd(id, payload) {
  if (!payload) return;
  let node = $(`#${id}`);
  if (!node) {
    node = document.createElement("script");
    node.id = id;
    node.type = "application/ld+json";
    document.head.appendChild(node);
  }
  node.textContent = JSON.stringify(payload);
}

function siteBaseUrl(site = defaults.site) {
  return String(site.baseUrl || defaults.site.baseUrl || "https://zeronsr2000-ai.github.io/starhao/").replace(/\/?$/, "/");
}

function pagePath() {
  const path = window.location.pathname.split("/").pop() || "index.html";
  return path === "index.html" ? "" : path;
}

function absoluteUrl(path = "", site = defaults.site) {
  if (/^https?:\/\//.test(String(path))) return path;
  return new URL(path, siteBaseUrl(site)).href;
}

function setPageSeo(site, overrides = {}) {
  const title = overrides.title || site.seoTitle || document.title;
  const description = overrides.description || site.seoDescription || "";
  const url = overrides.url || absoluteUrl(pagePath(), site);
  const image = overrides.image || absoluteUrl("og.png", site);
  document.title = title;
  ensureMeta("description", description);
  ensureCanonical(url);
  ensureMetaProperty("og:type", overrides.type || "website");
  ensureMetaProperty("og:site_name", site.brandName || defaults.site.brandName);
  ensureMetaProperty("og:title", title);
  ensureMetaProperty("og:description", description);
  ensureMetaProperty("og:url", url);
  ensureMetaProperty("og:image", image);
  ensureMeta("twitter:card", "summary_large_image");
  ensureMeta("twitter:title", title);
  ensureMeta("twitter:description", description);
  ensureMeta("twitter:image", image);
}

function setSiteJsonLd(site) {
  const url = siteBaseUrl(site);
  const logo = site.logoImageUrl ? absoluteUrl(site.logoImageUrl, site) : absoluteUrl("og.png", site);
  ensureJsonLd("site-json-ld", {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${url}#organization`,
        name: site.brandName || defaults.site.brandName,
        alternateName: site.englishName || defaults.site.englishName,
        url,
        logo,
        email: site.email || undefined,
        telephone: site.phone || undefined,
        sameAs: [site.youtube, site.instagram, site.facebook].filter(Boolean),
      },
      {
        "@type": "WebSite",
        "@id": `${url}#website`,
        url,
        name: site.brandName || defaults.site.brandName,
        publisher: { "@id": `${url}#organization` },
        inLanguage: "zh-Hant-TW",
      },
      {
        "@type": "ProfessionalService",
        "@id": `${url}#service`,
        name: site.brandName || defaults.site.brandName,
        url,
        image: logo,
        email: site.email || undefined,
        telephone: site.phone || undefined,
        areaServed: "Taiwan",
        serviceType: ["品牌影片製作", "人物訪談影片", "Podcast 影像", "社群短影音", "活動紀錄", "後期剪輯"],
      },
    ],
  });
}

function moneySafe(value) {
  return String(value || "").replace(/[<>"']/g, "");
}

function published(items) {
  return [...items].filter((item) => item.status !== "draft" && item.status !== "hidden").sort((a, b) => (a.sort || 0) - (b.sort || 0));
}

function findWork(works, id) {
  return works.find((work) => work.id === id);
}

function categoryIdForWork(categories, work) {
  if (work.categoryId) return work.categoryId;
  return categories.find((category) => category.title === work.category)?.id || "";
}

function categoryLabel(categories, work) {
  return categories.find((category) => category.id === categoryIdForWork(categories, work))?.title || work.category || "未分類";
}

function workVideoUrl(work) {
  return work?.videoUrl || work?.coverUrl || "";
}

function fallbackShowcaseWorks(works, settings) {
  const selected = (settings.showcaseWorkIds || []).map((id) => findWork(works, id)).filter(Boolean);
  const auto = works.filter((work) => work.showcase !== false && !selected.some((item) => item.id === work.id));
  return [...selected, ...auto].slice(0, 6);
}

function resolveCategoryCover(category, works) {
  const categoryWorks = works.filter((work) => work.categoryId === category.id || (!work.categoryId && work.category === category.title));
  if (category.coverMode === "selected" && category.coverWorkId) {
    return findWork(categoryWorks, category.coverWorkId) || categoryWorks[0];
  }
  if (!categoryWorks.length) return null;
  const index = Math.abs([...category.id].reduce((sum, char) => sum + char.charCodeAt(0), 0)) % categoryWorks.length;
  return categoryWorks[index];
}

function setMeta(site) {
  currentSite = site;
  setPageSeo(site);
  setSiteJsonLd(site);
  ensureMeta("google-site-verification", site.googleSiteVerification);
  text("[data-brand]", site.brandName);
  text("[data-brand-footer]", site.brandName);
  text("[data-english]", site.englishName);
  text("[data-email]", site.email);
  renderBrandLogo(site);
  renderNav(site);
  text("[data-top-cta]", site.topCtaText);
  attr("[data-top-cta]", "href", site.topCtaLink);
  text(".top-cta", site.topCtaText);
  attr(".top-cta", "href", site.topCtaLink);
  text("[data-footer-text]", site.footerText);
  text("[data-footer-cta]", site.footerCtaText);
  attr("[data-footer-cta]", "href", site.footerCtaLink);
  text("footer p", site.footerText);
  text("footer > a", site.footerCtaText);
  attr("footer > a", "href", site.footerCtaLink);
  renderContactInfo(site);
  renderQuickContact(site);
}

function renderBrandLogo(site) {
  qsa(".logo-mark").forEach((node) => {
    if (site.logoImageUrl) {
      node.innerHTML = `<img src="${moneySafe(site.logoImageUrl)}" alt="${moneySafe(site.logoImageAlt || site.brandName || "Logo")}" loading="eager" />`;
      node.classList.add("has-image");
    } else {
      node.textContent = site.logoLetter || "S";
      node.classList.remove("has-image");
    }
  });
}

function renderNav(site) {
  const nav = $("[data-nav]");
  if (!nav) return;
  const page = document.body.dataset.page || "home";
  const items = normalizeNavItems(site);
  nav.innerHTML = items.map((item) => {
    const key = item.id || navKeyFromHref(item.href);
    const href = item.href || "#";
    const label = item.label || item.title || "選單";
    const active = page === key || (page === "article" && key === "news") || (page === "service" && key === "services");
    const useServiceDropdown = item.serviceDropdown || key === "services" || String(href).split("?")[0] === "services.html";
    if (!useServiceDropdown) return `<a class="${active ? "active" : ""}" href="${moneySafe(href)}">${moneySafe(label)}</a>`;
    const submenuId = `nav-dropdown-${moneySafe(key)}`;
    const submenu = navServiceItems.length
      ? `<button class="nav-dropdown-toggle" type="button" aria-label="展開${moneySafe(label)}子選單" aria-expanded="false" aria-controls="${submenuId}" data-nav-submenu-toggle></button><div class="nav-dropdown" id="${submenuId}" role="menu">${navServiceItems.map((item) => `<a href="${serviceHref(item.service, item.type)}" role="menuitem">${moneySafe(item.service.title)}</a>`).join("")}</div>`
      : "";
    return `<div class="nav-item has-dropdown"><a class="${active ? "active" : ""}" href="${moneySafe(href)}">${moneySafe(label)}</a>${submenu}</div>`;
  }).join("");
}

function legacyNavItems(site) {
  return [
    { id: "home", label: site.navHome || "首頁", href: "index.html", sort: 1, status: "published" },
    { id: "works", label: site.navWorks || "作品案例", href: "works.html", sort: 2, status: "published" },
    { id: "services", label: site.navServices || "服務項目", href: "services.html", sort: 3, status: "published", serviceDropdown: true },
    { id: "process", label: site.navProcess || "製作流程", href: "process.html", sort: 4, status: "published" },
    { id: "about", label: site.navAbout || "關於我們", href: "about.html", sort: 5, status: "published" },
    { id: "news", label: site.navNews || "最新消息", href: "news.html", sort: 6, status: "published" },
    { id: "quote", label: site.navQuote || "詢價", href: "quote.html", sort: 7, status: "published" },
  ];
}

function normalizeNavItems(site) {
  const rows = Array.isArray(site.navItems) && site.navItems.length ? site.navItems : legacyNavItems(site);
  return rows
    .filter((item) => item && item.status !== "hidden")
    .sort((a, b) => (Number(a.sort) || 0) - (Number(b.sort) || 0));
}

function navKeyFromHref(href = "") {
  const clean = String(href).split("?")[0].replace(/^\.\//, "");
  if (!clean || clean === "index.html") return "home";
  if (clean === "article.html") return "news";
  if (clean === "service.html") return "services";
  if (clean === "service-area.html") return "serviceArea";
  return clean.replace(/\.html$/, "");
}

function setNavServiceItems(services = defaults.services, extendedServices = defaults.extendedServices) {
  navServiceItems = [
    ...published(services).map((service) => ({ service, type: "services" })),
    ...published(extendedServices).map((service) => ({ service, type: "extendedServices" })),
  ];
  renderNav(currentSite);
}

function hasContactValue(value) {
  return value && !["尚未設定", "未設定", "-"].includes(String(value).trim());
}

function renderContactInfo(site) {
  const root = $("[data-contact-info]");
  if (!root) return;
  const contacts = [
    { label: "Email", value: site.email },
    { label: "電話", value: site.phone },
    { label: "LINE", value: site.line },
  ].filter((item) => hasContactValue(item.value));
  root.innerHTML = contacts.map((item) => `<div><strong>${moneySafe(item.label)}</strong><p>${moneySafe(item.value)}</p></div>`).join("");
  root.classList.toggle("hidden", contacts.length === 0);
}

function renderOptions(selector, options) {
  const select = $(selector);
  if (!select) return;
  select.innerHTML = (options || []).map((option) => `<option>${moneySafe(option)}</option>`).join("");
}

function contactHref(type, value) {
  const clean = String(value || "").trim();
  if (!clean) return "";
  if (/^https?:\/\//i.test(clean)) return clean;
  if (type === "phone") return `tel:${clean.replace(/[^\d+]/g, "")}`;
  if (type === "email") return `mailto:${clean}`;
  if (type === "line") return `https://line.me/ti/p/${encodeURIComponent(clean.replace(/^@/, ""))}`;
  return clean;
}

function safeHexColor(value) {
  const color = String(value || "").trim();
  return /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(color) ? color : "";
}

function renderQuickContact(site) {
  let root = $("[data-quick-contact]");
  const source = Array.isArray(site.quickLinks) && site.quickLinks.length
    ? site.quickLinks
    : [
        { type: "line", label: "LINE", value: site.line, status: site.line ? "published" : "hidden", sort: 1 },
        { type: "phone", label: "TEL", value: site.phone, status: site.phone ? "published" : "hidden", sort: 2 },
        { type: "facebook", label: "FB", value: site.facebook, status: site.facebook ? "published" : "hidden", sort: 3 },
        { type: "email", label: "MAIL", value: site.email, status: site.email ? "published" : "hidden", sort: 4 },
      ];
  const links = source
    .filter((item) => item.status !== "hidden")
    .sort((a, b) => (Number(a.sort) || 0) - (Number(b.sort) || 0))
    .map((item) => {
      const value = item.value || site[item.type] || "";
      return { ...item, value, href: item.href || contactHref(item.type, value) };
    })
    .filter((item) => item.href);

  if (!links.length) {
    if (root) root.remove();
    return;
  }
  if (!root) {
    root = document.createElement("aside");
    root.dataset.quickContact = "";
    root.className = "quick-contact";
    root.setAttribute("aria-label", "快速聯絡");
    document.body.appendChild(root);
  }
  root.innerHTML = links
    .map((item) => {
      const label = moneySafe(item.label || "快捷聯絡");
      const icon = item.iconUrl
        ? `<img class="quick-contact-icon" src="${moneySafe(item.iconUrl)}" alt="" loading="lazy" />`
        : moneySafe(item.label || "LINK");
      const style = safeHexColor(item.backgroundColor) ? ` style="background:${safeHexColor(item.backgroundColor)}"` : "";
      return `<a class="quick-contact-link quick-${moneySafe(item.type || "custom")}" href="${moneySafe(item.href)}" aria-label="${label}"${style}>${icon}</a>`;
    })
    .join("");
}

function normalizeInquiryFields(inquiryForm = {}) {
  const fields = Array.isArray(inquiryForm.fields) && inquiryForm.fields.length
    ? inquiryForm.fields
    : defaults.inquiryForm.fields;
  return [...fields]
    .filter((field) => field.status !== "hidden")
    .sort((a, b) => (a.sort || 0) - (b.sort || 0));
}

function renderInquiryRequired(required) {
  return required ? '<span class="required-mark" aria-label="必填">*</span>' : "";
}

function renderInquiryField(field) {
  const id = moneySafe(field.id);
  const label = `${moneySafe(field.label)} ${renderInquiryRequired(field.required)}`;
  const required = field.required ? "required" : "";
  const placeholder = field.placeholder ? ` placeholder="${moneySafe(field.placeholder)}"` : "";
  const options = Array.isArray(field.options) ? field.options : [];
  if (field.type === "textarea") {
    return `<label>${label}<textarea name="${id}" data-dynamic-field="${id}" ${required}${placeholder}></textarea></label>`;
  }
  if (field.type === "select") {
    return `<label>${label}<select name="${id}" data-dynamic-field="${id}" ${required}>${options.map((option) => `<option>${moneySafe(option)}</option>`).join("")}</select></label>`;
  }
  if (field.type === "radio" || field.type === "checkbox") {
    return `
      <fieldset class="option-field" data-option-field="${id}">
        <legend>${label}</legend>
        <div class="option-grid">
          ${options.map((option) => `<label><input type="${field.type}" name="${id}" value="${moneySafe(option)}" data-dynamic-field="${id}" /> ${moneySafe(option)}</label>`).join("")}
        </div>
      </fieldset>
    `;
  }
  const type = ["email", "tel", "number"].includes(field.type) ? field.type : "text";
  return `<label>${label}<input type="${type}" name="${id}" data-dynamic-field="${id}" ${required}${placeholder} /></label>`;
}

function renderInquiryFields(inquiryForm = defaults.inquiryForm) {
  const root = $("[data-inquiry-fields]");
  if (!root) return;
  root.innerHTML = normalizeInquiryFields(inquiryForm).map(renderInquiryField).join("");
}

let turnstileScriptPromise = null;

function loadTurnstileScript() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (turnstileScriptPromise) return turnstileScriptPromise;
  const existing = document.querySelector('script[data-turnstile-script]');
  if (existing) {
    turnstileScriptPromise = new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve(window.turnstile), { once: true });
      existing.addEventListener("error", reject, { once: true });
    });
    return turnstileScriptPromise;
  }
  const script = document.createElement("script");
  script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
  script.async = true;
  script.defer = true;
  script.dataset.turnstileScript = "true";
  turnstileScriptPromise = new Promise((resolve, reject) => {
    script.addEventListener("load", () => resolve(window.turnstile), { once: true });
    script.addEventListener("error", reject, { once: true });
  });
  document.head.appendChild(script);
  return turnstileScriptPromise;
}

async function renderTurnstileWidget(container, siteKey) {
  if (!container || !siteKey) return;
  const target = container.querySelector("[data-turnstile-widget]");
  const message = container.querySelector("[data-turnstile-message]");
  if (!target || target.dataset.rendered === "true") return;
  try {
    const turnstileApi = await loadTurnstileScript();
    if (!turnstileApi?.render) throw new Error("Turnstile API is unavailable");
    turnstileApi.render(target, {
      sitekey: siteKey,
      theme: "dark",
    });
    target.dataset.rendered = "true";
    if (message) message.textContent = "請完成上方 Cloudflare 驗證後再送出。";
  } catch (error) {
    if (message) message.textContent = "Cloudflare 真人驗證載入失敗，請重新整理頁面後再試。";
  }
}

function renderInquirySecurity(inquiryForm = defaults.inquiryForm) {
  const turnstileBox = $("[data-turnstile-box]");
  if (turnstileBox) {
    const enabled = Boolean(inquiryForm.turnstileEnabled && inquiryForm.turnstileSiteKey);
    turnstileBox.classList.toggle("hidden", !enabled);
    turnstileBox.innerHTML = enabled
      ? `<div data-turnstile-widget></div><p class="field-hint" data-turnstile-message>正在載入 Cloudflare 真人驗證...</p>`
      : "";
    if (enabled) renderTurnstileWidget(turnstileBox, inquiryForm.turnstileSiteKey);
  }
}

function collectInquiryFields(form, inquiryForm) {
  const values = {};
  normalizeInquiryFields(inquiryForm).forEach((field) => {
    const inputs = qsa(`[name="${CSS.escape(field.id)}"]`, form);
    if (field.type === "checkbox") {
      values[field.id] = inputs.filter((input) => input.checked).map((input) => input.value);
    } else if (field.type === "radio") {
      values[field.id] = inputs.find((input) => input.checked)?.value || "";
    } else {
      values[field.id] = inputs[0]?.value || "";
    }
  });
  return values;
}

function validateInquiryFields(form, inquiryForm) {
  for (const field of normalizeInquiryFields(inquiryForm)) {
    if (!field.required) continue;
    const inputs = qsa(`[name="${CSS.escape(field.id)}"]`, form);
    const value = field.type === "checkbox" || field.type === "radio"
      ? inputs.some((input) => input.checked)
      : String(inputs[0]?.value || "").trim();
    if (!value) return `請填寫必填欄位：${field.label}`;
  }
  return "";
}

function validateInquirySecurity(form, inquiryForm) {
  const formData = Object.fromEntries(new FormData(form).entries());
  if (formData.website) return "blocked";
  if (inquiryForm.turnstileEnabled && inquiryForm.turnstileSiteKey && !formData["cf-turnstile-response"]) {
    return inquiryForm.turnstileErrorMessage || defaults.inquiryForm.turnstileErrorMessage;
  }
  return "";
}

function getYoutubeId(url) {
  const patterns = [/youtu\.be\/([^?&/]+)/, /youtube\.com\/watch\?v=([^?&]+)/, /youtube\.com\/shorts\/([^?&/]+)/, /youtube\.com\/embed\/([^?&/]+)/];
  for (const pattern of patterns) {
    const match = String(url || "").match(pattern);
    if (match) return match[1];
  }
  return "";
}

function getInstagramPath(url) {
  const match = String(url || "").match(/instagram\.com\/(p|reel|tv)\/([^?&/]+)/);
  return match ? `${match[1]}/${match[2]}` : "";
}

function getFacebookEmbedUrl(url) {
  const value = String(url || "").trim();
  if (!value.includes("facebook.com") && !value.includes("fb.watch")) return "";
  const plugin = /\/videos\/|\/reel\/|watch\/?\?v=/.test(value) ? "video" : "post";
  return `https://www.facebook.com/plugins/${plugin}.php?href=${encodeURIComponent(value)}&show_text=false&width=900`;
}

function platformLabel(url) {
  const value = String(url || "").toLowerCase();
  if (value.includes("youtube.com") || value.includes("youtu.be")) return "YouTube";
  if (value.includes("instagram.com")) return "Instagram";
  if (value.includes("facebook.com") || value.includes("fb.watch")) return "Facebook";
  return "作品連結";
}

function youtubeThumbnailUrl(url) {
  const id = getYoutubeId(url);
  return id ? `https://img.youtube.com/vi/${moneySafe(id)}/hqdefault.jpg` : "";
}

function workCoverUrl(work) {
  return work?.coverUrl || youtubeThumbnailUrl(work?.videoUrl) || "";
}

function workImageAlt(work, categories = []) {
  return [categoryLabel(categories, work), work?.title, work?.client, "作品封面"].filter(Boolean).join("｜");
}

function renderWorkCover(work, categories = []) {
  const cover = workCoverUrl(work);
  const label = platformLabel(work?.videoUrl);
  const title = moneySafe(work?.title || "作品封面");
  const media = cover
    ? `<img class="work-cover-image" src="${moneySafe(cover)}" alt="${moneySafe(work.coverAlt || workImageAlt(work, categories) || title)}" loading="lazy" />`
    : `<div class="work-cover-fallback"><span>${title}</span></div>`;
  return `${media}<span class="work-play-badge" aria-hidden="true">▶</span><span class="work-platform-badge">觀看平台：${moneySafe(label)}</span>`;
}

function videoEmbedUrl(work) {
  const value = String(work?.videoUrl || "").trim();
  const youtubeId = getYoutubeId(value);
  if (youtubeId) return `https://www.youtube.com/embed/${moneySafe(youtubeId)}`;
  return value || undefined;
}

function setWorksJsonLd(works, categories) {
  const site = api.getCachedDoc?.("siteContent", "site", defaults.site) || defaults.site;
  const rows = published(works).filter((work) => work.videoUrl);
  if (!rows.length) return;
  ensureJsonLd("works-video-json-ld", {
    "@context": "https://schema.org",
    "@graph": rows.map((work) => {
      const category = categoryLabel(categories, work);
      const thumbnail = workCoverUrl(work) || "og.png";
      return {
        "@type": "VideoObject",
        name: work.title,
        description: work.summary || `${site.brandName || defaults.site.brandName} ${category}作品案例`,
        thumbnailUrl: [absoluteUrl(thumbnail, site)],
        uploadDate: work.year ? `${work.year}-01-01` : undefined,
        embedUrl: videoEmbedUrl(work),
        contentUrl: work.videoUrl || undefined,
        publisher: {
          "@type": "Organization",
          name: site.brandName || defaults.site.brandName,
          logo: {
            "@type": "ImageObject",
            url: site.logoImageUrl ? absoluteUrl(site.logoImageUrl, site) : absoluteUrl("og.png", site),
          },
        },
        genre: category,
        inLanguage: "zh-Hant-TW",
      };
    }),
  });
}

function renderEmbed(url, work = {}, compact = false) {
  const value = String(url || "").trim();
  if (!value) return "";
  const youtubeId = getYoutubeId(value);
  const shape = work.orientation === "portrait" ? " embed-phone" : "";
  const compactClass = compact ? " embed-compact" : "";
  if (youtubeId) {
    return `<div class="embed${shape}${compactClass}"><iframe title="YouTube 作品影片" src="https://www.youtube.com/embed/${moneySafe(youtubeId)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`;
  }
  const facebookEmbedUrl = getFacebookEmbedUrl(value);
  if (facebookEmbedUrl) {
    return `<div class="embed${shape}${compactClass}"><iframe title="Facebook 作品影片" src="${facebookEmbedUrl}" scrolling="no" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share" allowfullscreen></iframe></div>`;
  }
  const instagramPath = getInstagramPath(value);
  if (instagramPath) {
    return `<div class="embed embed-phone${compactClass}"><iframe title="Instagram 作品" src="https://www.instagram.com/${moneySafe(instagramPath)}/embed" scrolling="no" allowtransparency="true"></iframe></div>`;
  }
  return `<a class="btn ghost" href="${moneySafe(value)}" target="_blank" rel="noreferrer">觀看作品連結</a>`;
}

function renderHome(home, works, services, extendedServices, process, partners, categories, workSettings) {
  text("[data-home-eyebrow]", home.eyebrow);
  lines("[data-home-title]", home.title);
  text("[data-home-subtitle]", home.subtitle);
  text("[data-primary-cta]", home.primaryCtaText);
  attr("[data-primary-cta]", "href", home.primaryCtaLink);
  text("[data-secondary-cta]", home.secondaryCtaText);
  attr("[data-secondary-cta]", "href", home.secondaryCtaLink);
  text("[data-showreel-label]", home.showreelLabel);
  renderShowreel(home.showreelUrl, findWork(works, workSettings.showreelWorkId || home.showreelWorkId));
  renderSimpleList("[data-showreel-bottom]", home.showreelBottom);
  renderTicker(home.tickerItems);
  text("[data-partners-eyebrow]", home.partnersEyebrow);
  lines("[data-partners-title]", home.partnersTitle);
  text("[data-partners-description]", home.partnersDescription);
  renderPartners(partners, home.partnerMarqueeDuration);
  text("[data-works-eyebrow]", home.worksEyebrow);
  lines("[data-works-title]", home.worksTitle);
  text("[data-works-description]", home.worksDescription);
  text("[data-services-eyebrow]", home.servicesEyebrow);
  lines("[data-services-title]", home.servicesTitle);
  text("[data-services-description]", home.servicesDescription);
  text("[data-extended-eyebrow]", home.extendedEyebrow);
  lines("[data-extended-title]", home.extendedTitle);
  text("[data-extended-description]", home.extendedDescription);
  text("[data-process-eyebrow]", home.processEyebrow);
  lines("[data-process-title]", home.processTitle);
  text("[data-process-description]", home.processDescription);
  text("[data-cta-eyebrow]", home.ctaEyebrow);
  lines("[data-cta-title]", home.ctaTitle);
  text("[data-cta-body]", home.ctaBody);
  text("[data-cta-text]", home.ctaText);
  attr("[data-cta-text]", "href", home.ctaLink);
  renderWorks("[data-featured-works]", published(works), published(categories).filter((item) => item.showOnHome !== false), workSettings);
  renderServices("[data-service-preview]", published(services).slice(0, 6));
  renderServices("[data-extended-service-preview]", published(extendedServices), "extendedServices");
  renderProcess("[data-process-preview]", process.slice(0, 4));
}

function renderSimpleList(selector, items) {
  const root = $(selector);
  if (root) root.innerHTML = (items || []).map((item) => `<span>${moneySafe(item)}</span>`).join("");
}

function renderTicker(items) {
  const values = [...(items || []), ...(items || [])];
  const root = $("[data-ticker-track]");
  if (root) root.innerHTML = values.map((item) => `<span>${moneySafe(item)}</span>`).join("");
}

function renderShowreel(url, work) {
  const root = $("[data-showreel-media]");
  const value = workVideoUrl(work) || url;
  if (!root || !value) return;
  root.innerHTML = renderEmbed(value, work || { orientation: "landscape" }, true).replace('class="embed', 'class="showreel-embed embed');
  root.classList.add("has-media");
}

function renderPartners(partners, duration) {
  const root = $("[data-partner-track]");
  if (!root) return;
  const marquee = root.closest(".partner-marquee");
  const rows = published(partners).filter((item) => item.imageUrl);
  if (!rows.length) {
    marquee?.classList.add("is-empty");
    root.innerHTML = "";
    return;
  }
  marquee?.classList.remove("is-empty");
  root.style.setProperty("--partner-marquee-duration", `${normalizeMarqueeDuration(duration)}s`);
  const repeatedRows = repeatForMarquee(rows);
  const logoSet = repeatedRows.map((item) => `<figure class="partner-logo"><img src="${moneySafe(item.imageUrl)}" alt="${moneySafe(item.alt || item.title || "合作夥伴")}" loading="lazy" /></figure>`).join("");
  root.innerHTML = `<div class="partner-set">${logoSet}</div><div class="partner-set" aria-hidden="true">${logoSet}</div>`;
}

function normalizeMarqueeDuration(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 34;
  return Math.min(180, Math.max(8, number));
}

function repeatForMarquee(rows) {
  const minItems = 10;
  const copies = Math.max(1, Math.ceil(minItems / rows.length));
  return Array.from({ length: copies }, () => rows).flat();
}

function renderWorks(selector, works, categories = [], settings = {}) {
  const root = $(selector);
  if (!root) return;
  const rows = fallbackShowcaseWorks(works, settings);
  root.classList.add("featured-work-grid");
  if (!rows.length) {
    root.innerHTML = `<p class="empty-note">目前尚未設定展示影片，請到後台「首頁／展示設定」選擇作品。</p>`;
    return;
  }
  root.innerHTML = rows
    .map(
      (work, index) => `
        <article class="featured-work-card ${index === 0 ? "is-large" : ""} ${work.orientation === "portrait" ? "portrait" : ""}">
          <a href="${moneySafe(work.videoUrl || `works.html#${work.id}`)}" target="_blank" rel="noreferrer">
            <div class="featured-work-media ${moneySafe(work.coverClass || "g1")}">${renderWorkCover(work, categories)}</div>
            <div class="featured-work-info">
              <p>${moneySafe(categoryLabel(categories, work))} /</p>
              <h3>${moneySafe(work.title)}</h3>
              <small>${moneySafe(work.summary)}</small>
            </div>
          </a>
        </article>
      `,
    )
    .join("");
}

function renderShowcaseWorks(works, categories, settings) {
  const root = $("[data-work-showcase]");
  if (!root) return;
  const rows = fallbackShowcaseWorks(published(works), settings);
  root.innerHTML = rows.map((work, index) => renderFeaturedCard(work, categories, index)).join("");
}

function renderFeaturedCard(work, categories, index) {
  return `
    <article class="featured-work-card ${index === 0 ? "is-large" : ""} ${work.orientation === "portrait" ? "portrait" : ""}">
      <a href="${moneySafe(work.videoUrl || "#")}" target="_blank" rel="noreferrer">
        <div class="featured-work-media ${moneySafe(work.coverClass || "g1")}">${renderWorkCover(work, categories)}</div>
        <div class="featured-work-info">
          <p>${moneySafe(categoryLabel(categories, work))} /</p>
          <h3>${moneySafe(work.title)}</h3>
          <small>${moneySafe(work.summary)}</small>
        </div>
      </a>
    </article>
  `;
}

function renderWorkList(works, categories = [], settings = {}) {
  const root = $("[data-work-list]");
  if (!root) return;
  const rows = published(works);
  setWorksJsonLd(rows, categories);
  renderShowcaseWorks(rows, categories, settings);
  renderPaginatedWorks(root, rows, categories, 1);
}

function renderPaginatedWorks(root, rows, categories, page = 1) {
  const pageSize = 12;
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(Math.max(1, page), totalPages);
  const pageRows = rows.slice((current - 1) * pageSize, current * pageSize);
  root.innerHTML = `
    <div class="work-library-grid">
      ${pageRows.map((work) => `
        <article class="library-work-card ${work.orientation === "portrait" ? "portrait" : ""}" id="${moneySafe(work.id)}">
          <a href="${moneySafe(work.videoUrl || "#")}" target="_blank" rel="noreferrer">
            <div class="library-work-media ${moneySafe(work.coverClass || "g1")}">${renderWorkCover(work, categories)}</div>
            <div class="library-work-info">
              <p>${moneySafe(categoryLabel(categories, work))} /</p>
              <h3>${moneySafe(work.title)}</h3>
              <small>${moneySafe(work.summary)}</small>
            </div>
          </a>
        </article>
      `).join("")}
    </div>
    ${totalPages > 1 ? `<nav class="pagination" aria-label="作品分頁">${Array.from({ length: totalPages }, (_, index) => `<button type="button" data-work-page="${index + 1}" class="${index + 1 === current ? "active" : ""}">${index + 1}</button>`).join("")}</nav>` : ""}
  `;
  qsa("[data-work-page]", root).forEach((button) => {
    button.addEventListener("click", () => renderPaginatedWorks(root, rows, categories, Number(button.dataset.workPage)));
  });
}

function serviceSlug(service) {
  const titleMap = {
    "品牌形象影片": "brand-film",
    "人物訪談影片": "interview",
    "Podcast / 節目製作": "podcast",
    "Podcast／節目製作": "podcast",
    "短影音切片": "social-cuts",
    "活動紀錄": "event",
    "後期剪輯與包裝": "post-production",
    "品牌網站製作": "website",
    "SEO 搜尋優化": "seo",
    "APP製作": "app",
    "客製化 APP 開發": "app",
  };
  return String(service.slug || titleMap[service.title] || service.id || "").trim();
}

function serviceHref(service, type = "services") {
  const slug = serviceSlug(service);
  return `service.html?type=${encodeURIComponent(type)}&id=${encodeURIComponent(slug)}`;
}

function stripLabelPrefix(value, label) {
  return String(value || "").replace(new RegExp(`^${label}[：:]?\\s*`), "");
}

function renderServices(selector, services, type = "services") {
  const root = $(selector);
  if (!root) return;
  root.innerHTML = services
    .map(
      (service, index) => `
        <article class="service">
          <span class="num">${String(index + 1).padStart(2, "0")}</span>
          <h3>${moneySafe(service.title)}</h3>
          <p>${moneySafe(service.summary)}</p>
          ${service.target ? `<small>適合對象：${moneySafe(stripLabelPrefix(service.target, "適合對象"))}</small>` : ""}
          <a class="service-more" href="${serviceHref(service, type)}">觀看更多</a>
        </article>
      `,
    )
    .join("");
}

function renderServiceList(services) {
  renderServices("[data-service-list]", published(services), "services");
}

function splitTextLines(value) {
  return String(value || "").split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

function serviceDetailText(service) {
  if (service.detailBody) return service.detailBody;
  return "";
}

function serviceDetailBlocks(service) {
  if (Array.isArray(service.detailBlocks) && service.detailBlocks.length) return service.detailBlocks;
  if (typeof service.detailBlocks === "string") {
    const parsed = parseArticleBlocks(service.detailBlocks);
    if (parsed.length) return parsed;
  }
  return splitTextLines(serviceDetailText(service)).map((text) => ({ type: "paragraph", text }));
}

function renderServiceMediaList(service) {
  const videos = splitTextLines(service.detailVideoUrls || service.videoUrls || service.videoUrl);
  const images = splitTextLines(service.detailImageUrls || service.imageUrls || service.imageUrl);
  const videoHtml = videos.map((url) => `<div class="service-detail-media-item">${renderEmbed(url, { orientation: "landscape" }, true)}</div>`).join("");
  const imageHtml = images.map((url, index) => `<figure class="service-detail-media-item"><img src="${moneySafe(url)}" alt="${moneySafe(service.detailImageAlt || service.title || "服務展示圖片")} ${index + 1}" loading="lazy" /></figure>`).join("");
  return videoHtml + imageHtml;
}

function setServiceSeo(service, type) {
  const site = api.getCachedDoc?.("siteContent", "site", defaults.site) || defaults.site;
  const title = service.seoTitle || `${service.title || "服務項目"}｜星澔文創`;
  const description = service.seoDescription || service.detailIntro || service.summary || service.target || service.detailBody || "";
  const url = absoluteUrl(`service.html?type=${encodeURIComponent(type)}&id=${encodeURIComponent(serviceSlug(service))}`, site);
  setPageSeo(site, { title, description, url });
  ensureJsonLd("service-detail-json-ld", {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.title,
    description,
    provider: {
      "@type": "Organization",
      name: site.brandName || defaults.site.brandName,
      url: siteBaseUrl(site),
    },
    areaServed: "Taiwan",
    url,
    serviceType: service.title,
  });
  ensureJsonLd("breadcrumb-json-ld", {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "首頁", item: siteBaseUrl(site) },
      { "@type": "ListItem", position: 2, name: "服務項目", item: absoluteUrl("services.html", site) },
      { "@type": "ListItem", position: 3, name: service.title, item: url },
    ],
  });
}

function renderServiceDetail(services, extendedServices) {
  const root = $("[data-service-detail]");
  if (!root) return;
  const params = new URLSearchParams(window.location.search);
  const type = params.get("type") === "extendedServices" ? "extendedServices" : "services";
  const rows = published(type === "extendedServices" ? extendedServices : services);
  const id = params.get("id") || "";
  const service = rows.find((item) => item.id === id || serviceSlug(item) === id) || rows[0];
  if (!service) {
    root.innerHTML = `<p class="empty-note">目前找不到這個服務項目。</p>`;
    return;
  }
  setServiceSeo(service, type);
  const articleBlocks = serviceDetailBlocks(service);
  const media = renderServiceMediaList(service);
  root.innerHTML = `
    <header class="service-detail-head">
      <p class="eyebrow">${type === "extendedServices" ? "Extended Services" : "Services"}</p>
      <h1>${moneySafe(service.detailTitle || service.title)}</h1>
      <p>${moneySafe(service.detailIntro || service.summary || "")}</p>
    </header>
    <div class="service-detail-grid">
      <section class="service-detail-card">
        <h2>服務說明</h2>
        <p>${moneySafe(service.summary || "可依品牌需求規劃服務內容與影像形式。")}</p>
      </section>
      <aside class="service-detail-card">
        <h2>適合對象</h2>
        <p>${moneySafe(service.target || "可依品牌目前階段與內容需求規劃。")}</p>
      </aside>
    </div>
    ${media ? `<section class="service-detail-gallery"><div class="section-head"><div><p class="eyebrow">Gallery</p><h2>影片與照片展示</h2></div></div><div class="service-detail-media-grid">${media}</div></section>` : ""}
    <section class="service-seo-article">
      <p class="eyebrow">Service Notes</p>
      <h2>${moneySafe(service.detailTitle || service.title)}介紹</h2>
      ${typeof service.detailHtml === 'string' ? `<div class="sun-editor-editable service-article-content">${window.ServiceArticle.clean(service.detailHtml)}</div>` : articleBlocks.length ? renderArticleBlocks(articleBlocks, { title: service.title }) : `<p class="empty-note">這個服務的詳細介紹尚未設定，請到後台服務內容編輯。</p>`}
    </section>
    <div class="service-detail-actions"><a class="btn primary" href="quote.html">詢問這項服務</a><a class="btn ghost" href="services.html">回服務項目</a></div>
  `;
}

function renderServiceAreaPage(pages, about, site) {
  const root = $("[data-service-area-page]");
  if (!root) return;
  const title = pages.serviceAreaTitle || "台灣全區影像製作服務。";
  const description = pages.serviceAreaLead || about.serviceArea || "";
  setPageSeo(site, {
    title: `${title.replace(/\s+/g, "")}｜星澔文創`,
    description,
    url: absoluteUrl("service-area.html", site),
  });
  ensureJsonLd("service-area-json-ld", {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: site.brandName || defaults.site.brandName,
    url: siteBaseUrl(site),
    areaServed: "Taiwan",
    description,
  });
  const areaLines = splitTextLines(about.serviceArea || description);
  root.innerHTML = `
    <section class="page-hero">
      <p class="eyebrow">${moneySafe(pages.serviceAreaEyebrow || "Service Area")}</p>
      <h1>${moneySafe(title)}</h1>
      <p>${moneySafe(description)}</p>
    </section>
    <section class="service-area-content">
      <div>
        <p class="eyebrow">Coverage</p>
        <h2>服務地區說明</h2>
      </div>
      <div class="service-seo-article service-area-article">
        ${(areaLines.length ? areaLines : ["台灣全區，可依專案需求安排外縣市拍攝。"]).map((line) => `<p>${moneySafe(line)}</p>`).join("")}
      </div>
      <div class="service-detail-actions"><a class="btn primary" href="quote.html">詢問拍攝服務</a><a class="btn ghost" href="services.html">查看服務項目</a></div>
    </section>
  `;
}

function renderProcess(selector, process) {
  const root = $(selector);
  if (!root) return;
  root.innerHTML = [...process]
    .sort((a, b) => (a.sort || 0) - (b.sort || 0))
    .map(
      (step, index) => `
        <article class="step">
          <span class="num">${String(index + 1).padStart(2, "0")}</span>
          <h3>${moneySafe(step.title)}</h3>
          <p>${moneySafe(step.body)}</p>
        </article>
      `,
    )
    .join("");
}

function renderAbout(about) {
  text("[data-about-title]", about.title);
  text("[data-about-body]", about.body);
  text("[data-about-philosophy]", about.philosophy);
  text("[data-service-area]", about.serviceArea);
  renderAboutMarquee(about.pointImages, about.mediaMarqueeDuration);
  renderAboutVideos(about.pointVideos);
  const team = $("[data-team]");
  if (team) {
    team.innerHTML = renderArticleBlocks(aboutTeamArticle(about), { title: "團隊分工" });
  }
  const clients = $("[data-clients]");
  if (clients) {
    clients.innerHTML = aboutShowcaseItems(about)
      .map((item) => `
        <article class="featured-work-card about-showcase-card">
          <a href="${moneySafe(item.url || "#")}" ${item.url ? 'target="_blank" rel="noreferrer"' : ""}>
            ${aboutShowcaseMedia(item)}
            <div class="featured-work-info">
              <p>${moneySafe(item.category || "Showcase")}</p>
              <h3>${moneySafe(item.title || "展示項目")}</h3>
              <small>${moneySafe(item.summary || "")}</small>
            </div>
          </a>
        </article>
      `)
      .join("");
  }
}

function aboutTeamArticle(about = {}) {
  if (Array.isArray(about.teamArticle) && about.teamArticle.length) return about.teamArticle;
  return (about.team || []).flatMap((member) => [
    { type: "heading", text: member.name || "" },
    { type: "paragraph", text: member.role || "" },
  ]);
}

function aboutShowcaseItems(about = {}) {
  if (Array.isArray(about.showcaseItems) && about.showcaseItems.length) {
    return published(about.showcaseItems).sort((a, b) => (Number(a.sort) || 0) - (Number(b.sort) || 0));
  }
  return (about.clients || []).map((title, index) => ({
    title,
    category: "Service",
    summary: "",
    url: "",
    imageUrl: "",
    sort: index + 1,
    status: "published",
  }));
}

function renderAboutMarquee(images, duration) {
  const root = $("[data-about-media-track]");
  if (!root) return;
  const marquee = root.closest("[data-about-marquee]");
  const rows = published(images || []).filter((item) => item.imageUrl || item.url);
  if (!rows.length) {
    marquee?.classList.add("is-empty");
    root.innerHTML = "";
    return;
  }
  marquee?.classList.remove("is-empty");
  root.style.setProperty("--about-marquee-duration", `${normalizeMarqueeDuration(duration)}s`);
  const repeatedRows = repeatForMarquee(rows);
  const imageSet = repeatedRows.map((item) => `<figure class="about-marquee-photo"><img src="${moneySafe(item.imageUrl || item.url)}" alt="${moneySafe(item.alt || "製作觀點照片")}" loading="lazy" /></figure>`).join("");
  root.innerHTML = `<div class="about-media-set">${imageSet}</div><div class="about-media-set" aria-hidden="true">${imageSet}</div>`;
}

function renderAboutVideos(videos) {
  const root = $("[data-about-videos]");
  if (!root) return;
  const rows = published(videos || []).filter((item) => item.url || item.videoUrl);
  root.innerHTML = rows.map((item) => `<div class="about-video-card">${renderEmbed(item.url || item.videoUrl, { orientation: item.orientation || "landscape" }, true)}${item.caption ? `<p>${moneySafe(item.caption)}</p>` : ""}</div>`).join("");
}

function aboutShowcaseMedia(item) {
  const image = item.imageUrl || item.coverUrl || youtubeThumbnailUrl(item.url || item.videoUrl);
  if (image) return `<img src="${moneySafe(image)}" alt="${moneySafe(item.title || "展示封面")}" loading="lazy" />`;
  return `<div class="work-placeholder">${moneySafe(item.title || "Showcase")}</div>`;
}

function renderPages(pages) {
  Object.entries(pages || {}).forEach(([key, value]) => lines(`[data-page-${key}]`, value));
}

function articleSlug(article) {
  return String(article.slug || article.id || "").trim();
}

function articleHref(article) {
  if (article.staticPath) return article.staticPath;
  const slug = articleSlug(article);
  return `article.html?id=${encodeURIComponent(slug)}`;
}

function sortedArticles(articles) {
  return published(articles).sort((a, b) => {
    const dateA = String(a.publishedAt || "");
    const dateB = String(b.publishedAt || "");
    if (dateA !== dateB) return dateB.localeCompare(dateA);
    return (a.sort || 0) - (b.sort || 0);
  });
}

function parseArticleBlocks(value) {
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function renderNewsList(articles) {
  const root = $("[data-news-list]");
  if (!root) return;
  const rows = sortedArticles(articles);
  if (!rows.length) {
    root.innerHTML = `<p class="empty-note">目前尚未發布最新消息。</p>`;
    return;
  }
  root.innerHTML = rows
    .map((article) => {
      const cover = article.coverUrl
        ? `<img src="${moneySafe(article.coverUrl)}" alt="${moneySafe(article.coverAlt || article.title)}" loading="lazy" />`
        : `<div class="news-card-fallback">${moneySafe(article.category || "News")}</div>`;
      return `
        <article class="news-card">
          <a href="${articleHref(article)}">
            <div class="news-card-media">${cover}</div>
            <div class="news-card-body">
              <p>${moneySafe(article.category || "最新消息")} / ${moneySafe(article.publishedAt || "")}</p>
              <h2>${moneySafe(article.title)}</h2>
              <small>${moneySafe(article.excerpt || "")}</small>
            </div>
          </a>
        </article>
      `;
    })
    .join("");
}

function renderArticleBlocks(blocks, article = {}) {
  return parseArticleBlocks(blocks)
    .map((block) => {
      const type = block.type || "paragraph";
      if (type === "heading") return `<h2>${moneySafe(block.text)}</h2>`;
      if (type === "image") {
        const alt = block.alt || block.caption || article.title || "文章圖片";
        return `<figure>${block.url ? `<img src="${moneySafe(block.url)}" alt="${moneySafe(alt)}" loading="lazy" />` : ""}${block.caption ? `<figcaption>${moneySafe(block.caption)}</figcaption>` : ""}</figure>`;
      }
      if (type === "video") return `<div class="article-video">${renderEmbed(block.url, { orientation: block.orientation || "landscape" }, true)}${block.caption ? `<p>${moneySafe(block.caption)}</p>` : ""}</div>`;
      if (type === "quote") return `<blockquote>${moneySafe(block.text)}</blockquote>`;
      if (type === "list") {
        const items = String(block.text || "").split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
        return `<ul>${items.map((item) => `<li>${moneySafe(item)}</li>`).join("")}</ul>`;
      }
      return `<p>${moneySafe(block.text)}</p>`;
    })
    .join("");
}

function setArticleSeo(article) {
  const site = api.getCachedDoc?.("siteContent", "site", defaults.site) || defaults.site;
  const title = article.seoTitle || `${article.title || "最新消息"}｜星澔文創`;
  const description = article.seoDescription || article.excerpt || "";
  const slug = article.staticPath || `${articleSlug(article)}.html`;
  const url = absoluteUrl(slug, site);
  const image = article.coverUrl ? absoluteUrl(article.coverUrl, site) : absoluteUrl("og.png", site);
  setPageSeo(site, { title, description, url, image, type: "article" });
  ensureJsonLd("article-json-ld", {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: article.title,
      description,
      image,
      mainEntityOfPage: url,
      datePublished: article.publishedAt || undefined,
      dateModified: article.updatedAt || article.publishedAt || undefined,
      author: { "@type": "Organization", name: site.brandName || defaults.site.brandName },
      publisher: {
        "@type": "Organization",
        name: site.brandName || defaults.site.brandName,
        logo: {
          "@type": "ImageObject",
          url: site.logoImageUrl ? absoluteUrl(site.logoImageUrl, site) : absoluteUrl("og.png", site),
        },
      },
      inLanguage: "zh-Hant-TW",
    });
  ensureJsonLd("breadcrumb-json-ld", {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "首頁", item: siteBaseUrl(site) },
      { "@type": "ListItem", position: 2, name: "最新消息", item: absoluteUrl("news.html", site) },
      { "@type": "ListItem", position: 3, name: article.title, item: url },
    ],
  });
}

function renderArticle(articles) {
  const root = $("[data-article]");
  if (!root) return;
  const id = new URLSearchParams(window.location.search).get("id") || "";
  const rows = sortedArticles(articles);
  const article = rows.find((item) => item.id === id || articleSlug(item) === id) || rows[0];
  if (!article) {
    root.innerHTML = `<p class="empty-note">目前找不到這篇文章。</p>`;
    return;
  }
  setArticleSeo(article);
  const cover = article.coverUrl ? `<figure class="article-cover"><img src="${moneySafe(article.coverUrl)}" alt="${moneySafe(article.coverAlt || article.title)}" /></figure>` : "";
  root.innerHTML = `
    <header class="article-head">
      <p class="eyebrow">${moneySafe(article.category || "News")} / ${moneySafe(article.publishedAt || "")}</p>
      <h1>${moneySafe(article.title)}</h1>
      <p>${moneySafe(article.excerpt || "")}</p>
    </header>
    ${cover}
    <div class="article-content">${renderArticleBlocks(article.blocks, article)}</div>
  `;
}

function setupNav() {
  const menu = $("[data-menu]");
  const nav = $("[data-nav]");
  if (!menu || !nav) return;
  menu.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    menu.setAttribute("aria-expanded", String(isOpen));
    if (!isOpen) {
      qsa(".has-dropdown.is-submenu-open", nav).forEach((item) => item.classList.remove("is-submenu-open"));
      qsa("[data-nav-submenu-toggle]", nav).forEach((button) => button.setAttribute("aria-expanded", "false"));
    }
  });
  nav.addEventListener("click", (event) => {
    const toggle = event.target.closest("[data-nav-submenu-toggle]");
    const parentLink = event.target.closest(".has-dropdown > a");
    const target = toggle || parentLink;
    if (!target || !nav.classList.contains("is-open") || !window.matchMedia("(max-width: 980px)").matches) return;
    const item = target.closest(".has-dropdown");
    const button = $("[data-nav-submenu-toggle]", item);
    if (!item || !button) return;
    event.preventDefault();
    const isOpen = item.classList.toggle("is-submenu-open");
    button.setAttribute("aria-expanded", String(isOpen));
  });
}

function setupGlow() {
  const glow = $(".glow");
  if (!glow) return;
  window.addEventListener("pointermove", (event) => {
    glow.style.left = `${event.clientX}px`;
    glow.style.top = `${event.clientY}px`;
  });
}

function setupInquiryForm(site) {
  const form = $("[data-inquiry-form]");
  const status = $("[data-form-status]");
  if (!form) return;
  form._starhorizonSite = site;
  if (form.dataset.inquiryBound === "true") return;
  form.dataset.inquiryBound = "true";
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const inquiryForm = form._starhorizonInquiryForm || defaults.inquiryForm;
    const fieldError = validateInquiryFields(form, inquiryForm);
    if (fieldError) {
      status.textContent = fieldError;
      return;
    }
    const securityError = validateInquirySecurity(form, inquiryForm);
    if (securityError === "blocked") {
      form.reset();
      return;
    }
    if (securityError) {
      status.textContent = securityError;
      return;
    }
    const fields = collectInquiryFields(form, inquiryForm);
    status.textContent = "送出中...";
    try {
      await api.addDoc("inquiries", {
        fieldsJson: JSON.stringify(fields),
        website: "",
        status: "未處理",
        source: window.location.pathname,
      });
      form.reset();
      status.textContent = "已收到需求，我們會盡快與你聯繫。";
    } catch (error) {
      const currentSite = form._starhorizonSite || site;
      const subject = encodeURIComponent("星澔文創網站詢價");
      const body = encodeURIComponent(Object.entries(fields).map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join("、") : value}`).join("\n"));
      status.innerHTML = `目前線上表單尚未啟用，請先用 Email 聯絡：<a href="mailto:${currentSite.email}?subject=${subject}&body=${body}">${currentSite.email}</a>`;
    }
  });
}

function renderInquiryFormOptions(inquiryForm) {
  const form = $("[data-inquiry-form]");
  if (form) form._starhorizonInquiryForm = inquiryForm;
  renderInquiryFields(inquiryForm);
  renderInquirySecurity(inquiryForm);
  renderOptions("[data-video-type-options]", inquiryForm.videoTypeOptions || defaults.inquiryForm.videoTypeOptions);
  renderOptions("[data-shooting-options]", inquiryForm.shootingOptions || defaults.inquiryForm.shootingOptions);
  renderOptions("[data-budget-options]", inquiryForm.budgetOptions || defaults.inquiryForm.budgetOptions);
}

async function initPage() {
  setupNav();
  setupGlow();
  const page = document.body.dataset.page || "home";
  renderDefaultsForPage(page);
  renderCachedForPage(page);

  const serviceCollectionsPromise = Promise.all([
    api.getCollection("services", defaults.services),
    api.getCollection("extendedServices", defaults.extendedServices),
  ]).then(([services, extendedServices]) => {
    setNavServiceItems(services, extendedServices);
    return [services, extendedServices];
  });

  const sitePromise = api.getDoc("siteContent", "site", defaults.site).then((site) => {
    setMeta(site);
    setupInquiryForm(site);
    return site;
  });

  if (page === "home") {
    const [site, home, pages, workSettings, workCategories, works, serviceRows, process, partners] = await Promise.all([
      sitePromise,
      api.getDoc("siteContent", "home", defaults.home),
      api.getDoc("siteContent", "pages", defaults.pages),
      api.getDoc("siteContent", "workSettings", defaults.workSettings),
      api.getCollection("workCategories", defaults.workCategories),
      api.getCollection("works", defaults.works),
      serviceCollectionsPromise,
      api.getCollection("process", defaults.process),
      api.getCollection("partners", defaults.partners),
    ]);
    const [services, extendedServices] = serviceRows;
    renderPages(pages);
    renderHome(home, works, services, extendedServices, process, partners, workCategories, workSettings);
    setupInquiryForm(site);
    return;
  }

  if (page === "works") {
    const [, pages, workSettings, workCategories, works] = await Promise.all([sitePromise, api.getDoc("siteContent", "pages", defaults.pages), api.getDoc("siteContent", "workSettings", defaults.workSettings), api.getCollection("workCategories", defaults.workCategories), api.getCollection("works", defaults.works)]);
    renderPages(pages);
    renderWorkList(works, workCategories, workSettings);
    return;
  }

  if (page === "news") {
    const [, pages, articles] = await Promise.all([sitePromise, api.getDoc("siteContent", "pages", defaults.pages), api.getCollection("articles", defaults.articles)]);
    renderPages(pages);
    renderNewsList(articles);
    return;
  }

  if (page === "article") {
    const [, articles] = await Promise.all([sitePromise, api.getCollection("articles", defaults.articles)]);
    renderArticle(articles);
    return;
  }

  if (page === "services") {
    const [, pages, home, serviceRows] = await Promise.all([sitePromise, api.getDoc("siteContent", "pages", defaults.pages), api.getDoc("siteContent", "home", defaults.home), serviceCollectionsPromise]);
    const [services, extendedServices] = serviceRows;
    renderPages(pages);
    text("[data-extended-eyebrow]", home.extendedEyebrow);
    lines("[data-extended-title]", home.extendedTitle);
    text("[data-extended-description]", home.extendedDescription);
    renderServiceList(services);
    renderServices("[data-extended-service-list]", published(extendedServices), "extendedServices");
    return;
  }

  if (page === "service") {
    const [, serviceRows] = await Promise.all([sitePromise, serviceCollectionsPromise]);
    const [services, extendedServices] = serviceRows;
    renderServiceDetail(services, extendedServices);
    return;
  }

  if (page === "serviceArea") {
    const [site, pages, about] = await Promise.all([sitePromise, api.getDoc("siteContent", "pages", defaults.pages), api.getDoc("siteContent", "about", defaults.about)]);
    renderPages(pages);
    renderServiceAreaPage(pages, about, site);
    return;
  }

  if (page === "process") {
    const [, pages, process] = await Promise.all([sitePromise, api.getDoc("siteContent", "pages", defaults.pages), api.getCollection("process", defaults.process)]);
    renderPages(pages);
    renderProcess("[data-process-list]", process);
    return;
  }

  if (page === "about") {
    const [, pages, about] = await Promise.all([sitePromise, api.getDoc("siteContent", "pages", defaults.pages), api.getDoc("siteContent", "about", defaults.about)]);
    renderPages(pages);
    renderAbout(about);
    return;
  }

  if (page === "quote") {
    const [site, pages, inquiryForm] = await Promise.all([sitePromise, api.getDoc("siteContent", "pages", defaults.pages), api.getDoc("siteContent", "inquiryForm", defaults.inquiryForm)]);
    renderPages(pages);
    renderInquiryFormOptions(inquiryForm);
    setupInquiryForm(site);
  }
}

function renderDefaultsForPage(page) {
  setMeta(defaults.site);
  if (page === "home") {
    renderPages(defaults.pages);
    renderHome(defaults.home, defaults.works, defaults.services, defaults.extendedServices, defaults.process, defaults.partners, defaults.workCategories, defaults.workSettings);
  } else if (page === "works") {
    renderPages(defaults.pages);
    renderWorkList(defaults.works, defaults.workCategories, defaults.workSettings);
  } else if (page === "news") {
    renderPages(defaults.pages);
    renderNewsList(defaults.articles);
  } else if (page === "article") {
    renderArticle(defaults.articles);
  } else if (page === "services") {
    renderPages(defaults.pages);
    renderServiceList(defaults.services);
    renderServices("[data-extended-service-list]", defaults.extendedServices, "extendedServices");
  } else if (page === "service") {
    renderServiceDetail(defaults.services, defaults.extendedServices);
  } else if (page === "serviceArea") {
    renderPages(defaults.pages);
    renderServiceAreaPage(defaults.pages, defaults.about, defaults.site);
  } else if (page === "process") {
    renderPages(defaults.pages);
    renderProcess("[data-process-list]", defaults.process);
  } else if (page === "about") {
    renderPages(defaults.pages);
    renderAbout(defaults.about);
  } else if (page === "quote") {
    renderPages(defaults.pages);
    renderInquiryFormOptions(defaults.inquiryForm);
    setupInquiryForm(defaults.site);
  }
}

function renderCachedForPage(page) {
  if (!api.getCachedDoc || !api.getCachedCollection) return;
  const site = api.getCachedDoc("siteContent", "site", defaults.site);
  const pages = api.getCachedDoc("siteContent", "pages", defaults.pages);
  setNavServiceItems(api.getCachedCollection("services", defaults.services), api.getCachedCollection("extendedServices", defaults.extendedServices));
  setMeta(site);
  renderPages(pages);
  if (page === "home") {
    renderHome(
      api.getCachedDoc("siteContent", "home", defaults.home),
      api.getCachedCollection("works", defaults.works),
      api.getCachedCollection("services", defaults.services),
      api.getCachedCollection("extendedServices", defaults.extendedServices),
      api.getCachedCollection("process", defaults.process),
      api.getCachedCollection("partners", defaults.partners),
      api.getCachedCollection("workCategories", defaults.workCategories),
      api.getCachedDoc("siteContent", "workSettings", defaults.workSettings),
    );
  } else if (page === "works") {
    renderWorkList(api.getCachedCollection("works", defaults.works), api.getCachedCollection("workCategories", defaults.workCategories), api.getCachedDoc("siteContent", "workSettings", defaults.workSettings));
  } else if (page === "news") {
    renderNewsList(api.getCachedCollection("articles", defaults.articles));
  } else if (page === "article") {
    renderArticle(api.getCachedCollection("articles", defaults.articles));
  } else if (page === "services") {
    const home = api.getCachedDoc("siteContent", "home", defaults.home);
    text("[data-extended-eyebrow]", home.extendedEyebrow);
    lines("[data-extended-title]", home.extendedTitle);
    text("[data-extended-description]", home.extendedDescription);
    renderServiceList(api.getCachedCollection("services", defaults.services));
    renderServices("[data-extended-service-list]", published(api.getCachedCollection("extendedServices", defaults.extendedServices)), "extendedServices");
  } else if (page === "service") {
    renderServiceDetail(api.getCachedCollection("services", defaults.services), api.getCachedCollection("extendedServices", defaults.extendedServices));
  } else if (page === "serviceArea") {
    renderServiceAreaPage(pages, api.getCachedDoc("siteContent", "about", defaults.about), site);
  } else if (page === "process") {
    renderProcess("[data-process-list]", api.getCachedCollection("process", defaults.process));
  } else if (page === "about") {
    renderAbout(api.getCachedDoc("siteContent", "about", defaults.about));
  } else if (page === "quote") {
    renderInquiryFormOptions(api.getCachedDoc("siteContent", "inquiryForm", defaults.inquiryForm));
    setupInquiryForm(site);
  }
}

document.addEventListener("DOMContentLoaded", initPage);
