const defaults = window.STARHORIZON_DEFAULTS;
const api = window.StarhorizonFirebase;

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
  document.title = site.seoTitle || document.title;
  attr('meta[name="description"]', "content", site.seoDescription);
  ensureMeta("google-site-verification", site.googleSiteVerification);
  text("[data-brand]", site.brandName);
  text("[data-brand-footer]", site.brandName);
  text("[data-english]", site.englishName);
  text("[data-email]", site.email);
  text("[data-logo-letter]", site.logoLetter || "S");
  text(".logo-mark", site.logoLetter || "S");
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
}

function renderNav(site) {
  const nav = $("[data-nav]");
  if (!nav) return;
  const page = document.body.dataset.page || "home";
  const items = [
    ["home", "index.html", site.navHome || "首頁"],
    ["works", "works.html", site.navWorks || "作品案例"],
    ["news", "news.html", site.navNews || "最新消息"],
    ["services", "services.html", site.navServices || "服務項目"],
    ["process", "process.html", site.navProcess || "製作流程"],
    ["about", "about.html", site.navAbout || "關於我們"],
    ["quote", "quote.html", site.navQuote || "詢價"],
  ];
  nav.innerHTML = items.map(([key, href, label]) => `<a class="${page === key || (page === "article" && key === "news") ? "active" : ""}" href="${href}">${moneySafe(label)}</a>`).join("");
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

function renderWorkCover(work) {
  const cover = workCoverUrl(work);
  const label = platformLabel(work?.videoUrl);
  const title = moneySafe(work?.title || "作品封面");
  const media = cover
    ? `<img class="work-cover-image" src="${moneySafe(cover)}" alt="${title}" loading="lazy" />`
    : `<div class="work-cover-fallback"><span>${title}</span></div>`;
  return `${media}<span class="work-play-badge" aria-hidden="true">▶</span><span class="work-platform-badge">觀看平台：${moneySafe(label)}</span>`;
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
  renderServices("[data-extended-service-preview]", published(extendedServices));
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
            <div class="featured-work-media ${moneySafe(work.coverClass || "g1")}">${renderWorkCover(work)}</div>
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
        <div class="featured-work-media ${moneySafe(work.coverClass || "g1")}">${renderWorkCover(work)}</div>
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
            <div class="library-work-media ${moneySafe(work.coverClass || "g1")}">${renderWorkCover(work)}</div>
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

function renderServices(selector, services) {
  const root = $(selector);
  if (!root) return;
  root.innerHTML = services
    .map(
      (service, index) => `
        <article class="service">
          <span class="num">${String(index + 1).padStart(2, "0")}</span>
          <h3>${moneySafe(service.title)}</h3>
          <p>${moneySafe(service.summary)}</p>
          ${service.target ? `<small>適合對象：${moneySafe(service.target)}</small>` : ""}
        </article>
      `,
    )
    .join("");
}

function renderServiceList(services) {
  renderServices("[data-service-list]", published(services));
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
  const team = $("[data-team]");
  if (team) {
    team.innerHTML = (about.team || [])
      .map(
        (member) => `
          <article class="service">
            <h3>${moneySafe(member.name)}</h3>
            <p>${moneySafe(member.role)}</p>
          </article>
        `,
      )
      .join("");
  }
  const clients = $("[data-clients]");
  if (clients) {
    clients.innerHTML = (about.clients || []).map((client) => `<span>${moneySafe(client)}</span>`).join("");
  }
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

function renderArticleBlocks(blocks) {
  return parseArticleBlocks(blocks)
    .map((block) => {
      const type = block.type || "paragraph";
      if (type === "heading") return `<h2>${moneySafe(block.text)}</h2>`;
      if (type === "image") {
        return `<figure>${block.url ? `<img src="${moneySafe(block.url)}" alt="${moneySafe(block.alt || block.caption || "")}" loading="lazy" />` : ""}${block.caption ? `<figcaption>${moneySafe(block.caption)}</figcaption>` : ""}</figure>`;
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
  const title = article.seoTitle || `${article.title || "最新消息"}｜星澔文創`;
  const description = article.seoDescription || article.excerpt || "";
  document.title = title;
  attr('meta[name="description"]', "content", description);
  attr('meta[property="og:title"]', "content", title);
  attr('meta[property="og:description"]', "content", description);
  attr('meta[property="og:image"]', "content", article.coverUrl);
  const jsonLd = $("#article-json-ld");
  if (jsonLd) {
    jsonLd.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: article.title,
      description,
      image: article.coverUrl || undefined,
      datePublished: article.publishedAt || undefined,
      author: { "@type": "Organization", name: defaults.site.brandName },
      publisher: { "@type": "Organization", name: defaults.site.brandName },
    });
  }
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
    <div class="article-content">${renderArticleBlocks(article.blocks)}</div>
  `;
}

function setupNav() {
  const menu = $("[data-menu]");
  const nav = $("[data-nav]");
  if (!menu || !nav) return;
  menu.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    menu.setAttribute("aria-expanded", String(isOpen));
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
    const formData = Object.fromEntries(new FormData(form).entries());
    status.textContent = "送出中...";
    try {
      await api.addDoc("inquiries", {
        ...formData,
        status: "未處理",
        source: window.location.pathname,
      });
      form.reset();
      status.textContent = "已收到需求，我們會盡快與你聯繫。";
    } catch (error) {
      const currentSite = form._starhorizonSite || site;
      const subject = encodeURIComponent("星澔文創網站詢價");
      const body = encodeURIComponent(Object.entries(formData).map(([key, value]) => `${key}: ${value}`).join("\n"));
      status.innerHTML = `目前線上表單尚未啟用，請先用 Email 聯絡：<a href="mailto:${currentSite.email}?subject=${subject}&body=${body}">${currentSite.email}</a>`;
    }
  });
}

function renderInquiryFormOptions(inquiryForm) {
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

  const sitePromise = api.getDoc("siteContent", "site", defaults.site).then((site) => {
    setMeta(site);
    setupInquiryForm(site);
    return site;
  });

  if (page === "home") {
    const [site, home, pages, workSettings, workCategories, works, services, extendedServices, process, partners] = await Promise.all([
      sitePromise,
      api.getDoc("siteContent", "home", defaults.home),
      api.getDoc("siteContent", "pages", defaults.pages),
      api.getDoc("siteContent", "workSettings", defaults.workSettings),
      api.getCollection("workCategories", defaults.workCategories),
      api.getCollection("works", defaults.works),
      api.getCollection("services", defaults.services),
      api.getCollection("extendedServices", defaults.extendedServices),
      api.getCollection("process", defaults.process),
      api.getCollection("partners", defaults.partners),
    ]);
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
    const [, pages, home, services, extendedServices] = await Promise.all([sitePromise, api.getDoc("siteContent", "pages", defaults.pages), api.getDoc("siteContent", "home", defaults.home), api.getCollection("services", defaults.services), api.getCollection("extendedServices", defaults.extendedServices)]);
    renderPages(pages);
    text("[data-extended-eyebrow]", home.extendedEyebrow);
    lines("[data-extended-title]", home.extendedTitle);
    text("[data-extended-description]", home.extendedDescription);
    renderServiceList(services);
    renderServices("[data-extended-service-list]", published(extendedServices));
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
    renderServices("[data-extended-service-list]", defaults.extendedServices);
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
    renderServices("[data-extended-service-list]", published(api.getCachedCollection("extendedServices", defaults.extendedServices)));
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
