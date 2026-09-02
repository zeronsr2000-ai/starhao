const defaults = window.STARHORIZON_DEFAULTS;
const api = window.StarhorizonFirebase;

function $(selector, root = document) {
  return root.querySelector(selector);
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

function moneySafe(value) {
  return String(value || "").replace(/[<>"']/g, "");
}

function published(items) {
  return [...items].filter((item) => item.status !== "draft" && item.status !== "hidden").sort((a, b) => (a.sort || 0) - (b.sort || 0));
}

function setMeta(site) {
  document.title = site.seoTitle || document.title;
  attr('meta[name="description"]', "content", site.seoDescription);
  text("[data-brand]", site.brandName);
  text("[data-brand-footer]", site.brandName);
  text("[data-english]", site.englishName);
  text("[data-email]", site.email);
  text("[data-logo-letter]", site.logoLetter || "S");
  text(".logo-mark", site.logoLetter || "S");
  text("[data-nav-home]", site.navHome);
  text("[data-nav-works]", site.navWorks);
  text("[data-nav-services]", site.navServices);
  text("[data-nav-process]", site.navProcess);
  text("[data-nav-about]", site.navAbout);
  text("[data-nav-quote]", site.navQuote);
  text('.nav a[href="index.html"]', site.navHome);
  text('.nav a[href="works.html"]', site.navWorks);
  text('.nav a[href="services.html"]', site.navServices);
  text('.nav a[href="process.html"]', site.navProcess);
  text('.nav a[href="about.html"]', site.navAbout);
  text('.nav a[href="quote.html"]', site.navQuote);
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

function renderEmbed(url, work = {}) {
  const value = String(url || "").trim();
  if (!value) return "";
  const youtubeId = getYoutubeId(value);
  if (youtubeId) {
    return `<div class="embed"><iframe title="YouTube 作品影片" src="https://www.youtube.com/embed/${moneySafe(youtubeId)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`;
  }
  if (value.includes("facebook.com") || getInstagramPath(value)) {
    return `<a class="social-work-link" href="${moneySafe(value)}" target="_blank" rel="noreferrer"><span>${value.includes("facebook.com") ? "Facebook" : "Instagram"}</span><strong>${moneySafe(work.title || "觀看作品")}</strong><small>前往原平台觀看完整內容 ↗</small></a>`;
  }
  return `<a class="btn ghost" href="${moneySafe(value)}" target="_blank" rel="noreferrer">觀看作品連結</a>`;
}

function renderHome(home, works, services, extendedServices, process, partners) {
  text("[data-home-eyebrow]", home.eyebrow);
  lines("[data-home-title]", home.title);
  text("[data-home-subtitle]", home.subtitle);
  text("[data-primary-cta]", home.primaryCtaText);
  attr("[data-primary-cta]", "href", home.primaryCtaLink);
  text("[data-secondary-cta]", home.secondaryCtaText);
  attr("[data-secondary-cta]", "href", home.secondaryCtaLink);
  text("[data-showreel-label]", home.showreelLabel);
  renderShowreel(home.showreelUrl);
  renderSimpleList("[data-showreel-bottom]", home.showreelBottom);
  renderTicker(home.tickerItems);
  text("[data-partners-eyebrow]", home.partnersEyebrow);
  lines("[data-partners-title]", home.partnersTitle);
  text("[data-partners-description]", home.partnersDescription);
  renderPartners(partners);
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
  renderWorks("[data-featured-works]", published(works).filter((item) => item.featured));
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

function renderShowreel(url) {
  const root = $("[data-showreel-media]");
  if (!root || !url) return;
  const youtubeId = getYoutubeId(url);
  root.innerHTML = youtubeId
    ? `<iframe title="Showreel" src="https://www.youtube.com/embed/${moneySafe(youtubeId)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`
    : `<video controls playsinline src="${moneySafe(url)}"></video>`;
  root.classList.add("has-media");
}

function renderPartners(partners) {
  const root = $("[data-partner-track]");
  if (!root) return;
  const rows = published(partners).filter((item) => item.imageUrl);
  if (!rows.length) {
    root.closest(".partner-marquee")?.classList.add("is-empty");
    return;
  }
  const repeated = rows.length < 6 ? [...rows, ...rows, ...rows, ...rows] : [...rows, ...rows];
  root.innerHTML = repeated.map((item) => `<figure class="partner-logo"><img src="${moneySafe(item.imageUrl)}" alt="${moneySafe(item.alt || item.title || "合作夥伴")}" loading="lazy" /></figure>`).join("");
}

function renderWorks(selector, works) {
  const root = $(selector);
  if (!root) return;
  root.innerHTML = works
    .map(
      (work, index) => `
        <article class="work-card ${index === 0 ? "big" : index === 4 ? "wide" : ""}">
          <a href="works.html#${moneySafe(work.id)}">
            <div class="thumb ${moneySafe(work.coverClass || "g1")}" ${work.coverUrl ? `style="background-image:url('${moneySafe(work.coverUrl)}')"` : ""}><span>${moneySafe(work.category)}</span></div>
            <div class="work-info">
              <p>${moneySafe(work.client || work.year || "案例")}</p>
              <h3>${moneySafe(work.title)}</h3>
              <small>${moneySafe(work.summary)}</small>
            </div>
          </a>
        </article>
      `,
    )
    .join("");
}

function renderWorkList(works) {
  const root = $("[data-work-list]");
  if (!root) return;
  const rows = published(works);
  root.innerHTML = rows
    .map(
      (work) => `
        <article class="case-card" id="${moneySafe(work.id)}">
          <div class="thumb ${moneySafe(work.coverClass || "g1")}" ${work.coverUrl ? `style="background-image:url('${moneySafe(work.coverUrl)}')"` : ""}><span>${moneySafe(work.category)}</span></div>
          <div class="case-body">
            <p class="eyebrow">${moneySafe(work.category)} / ${moneySafe(work.year)}</p>
            <h2>${moneySafe(work.title)}</h2>
            <p>${moneySafe(work.summary)}</p>
            ${renderEmbed(work.videoUrl, work)}
          </div>
        </article>
      `,
    )
    .join("");
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
    const [site, home, pages, works, services, extendedServices, process, partners] = await Promise.all([
      sitePromise,
      api.getDoc("siteContent", "home", defaults.home),
      api.getDoc("siteContent", "pages", defaults.pages),
      api.getCollection("works", defaults.works),
      api.getCollection("services", defaults.services),
      api.getCollection("extendedServices", defaults.extendedServices),
      api.getCollection("process", defaults.process),
      api.getCollection("partners", defaults.partners),
    ]);
    renderPages(pages);
    renderHome(home, works, services, extendedServices, process, partners);
    setupInquiryForm(site);
    return;
  }

  if (page === "works") {
    const [, pages, works] = await Promise.all([sitePromise, api.getDoc("siteContent", "pages", defaults.pages), api.getCollection("works", defaults.works)]);
    renderPages(pages);
    renderWorkList(works);
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
    renderHome(defaults.home, defaults.works, defaults.services, defaults.extendedServices, defaults.process, defaults.partners);
  } else if (page === "works") {
    renderPages(defaults.pages);
    renderWorkList(defaults.works);
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
    );
  } else if (page === "works") {
    renderWorkList(api.getCachedCollection("works", defaults.works));
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
