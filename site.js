const defaults = window.STARHORIZON_DEFAULTS;
const api = window.StarhorizonFirebase;

function $(selector, root = document) {
  return root.querySelector(selector);
}

function text(selector, value) {
  const node = $(selector);
  if (node) node.textContent = value || "";
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

function renderEmbed(url) {
  const value = String(url || "").trim();
  if (!value) return "";
  const youtubeId = getYoutubeId(value);
  if (youtubeId) {
    return `<div class="embed"><iframe title="YouTube 作品影片" src="https://www.youtube.com/embed/${moneySafe(youtubeId)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`;
  }
  if (value.includes("facebook.com")) {
    const src = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(value)}&show_text=false&width=900`;
    return `<div class="embed"><iframe title="Facebook 作品影片" src="${src}" scrolling="no" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share" allowfullscreen></iframe></div>`;
  }
  const instagramPath = getInstagramPath(value);
  if (instagramPath) {
    return `<div class="embed embed-phone"><iframe title="Instagram 作品" src="https://www.instagram.com/${moneySafe(instagramPath)}/embed" scrolling="no" allowtransparency="true"></iframe></div>`;
  }
  return `<a class="btn ghost" href="${moneySafe(value)}" target="_blank" rel="noreferrer">觀看作品連結</a>`;
}

function renderHome(home, works, services, process) {
  text("[data-home-eyebrow]", home.eyebrow);
  text("[data-home-title]", home.title);
  text("[data-home-subtitle]", home.subtitle);
  text("[data-primary-cta]", home.primaryCtaText);
  attr("[data-primary-cta]", "href", home.primaryCtaLink);
  text("[data-secondary-cta]", home.secondaryCtaText);
  attr("[data-secondary-cta]", "href", home.secondaryCtaLink);
  text("[data-showreel-label]", home.showreelLabel);
  renderWorks("[data-featured-works]", published(works).filter((item) => item.featured).slice(0, 6));
  renderServices("[data-service-preview]", published(services).slice(0, 6));
  renderProcess("[data-process-preview]", process.slice(0, 4));
}

function renderWorks(selector, works) {
  const root = $(selector);
  if (!root) return;
  root.innerHTML = works
    .map(
      (work, index) => `
        <article class="work-card ${index === 0 ? "big" : index === 4 ? "wide" : ""}">
          <a href="works.html#${moneySafe(work.id)}">
            <div class="thumb ${moneySafe(work.coverClass || "g1")}"><span>${moneySafe(work.category)}</span></div>
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
          <div class="thumb ${moneySafe(work.coverClass || "g1")}"><span>${moneySafe(work.category)}</span></div>
          <div class="case-body">
            <p class="eyebrow">${moneySafe(work.category)} / ${moneySafe(work.year)}</p>
            <h2>${moneySafe(work.title)}</h2>
            <p>${moneySafe(work.summary)}</p>
            ${renderEmbed(work.videoUrl)}
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
      const subject = encodeURIComponent("星澔文創網站詢價");
      const body = encodeURIComponent(Object.entries(formData).map(([key, value]) => `${key}: ${value}`).join("\n"));
      status.innerHTML = `目前線上表單尚未啟用，請先用 Email 聯絡：<a href="mailto:${site.email}?subject=${subject}&body=${body}">${site.email}</a>`;
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
  const site = await api.getDoc("siteContent", "site", defaults.site);
  const home = await api.getDoc("siteContent", "home", defaults.home);
  const about = await api.getDoc("siteContent", "about", defaults.about);
  const inquiryForm = await api.getDoc("siteContent", "inquiryForm", defaults.inquiryForm);
  const works = await api.getCollection("works", defaults.works);
  const services = await api.getCollection("services", defaults.services);
  const process = await api.getCollection("process", defaults.process);
  setMeta(site);
  renderHome(home, works, services, process);
  renderWorkList(works);
  renderServiceList(services);
  renderProcess("[data-process-list]", process);
  renderAbout(about);
  renderInquiryFormOptions(inquiryForm);
  setupInquiryForm(site);
}

document.addEventListener("DOMContentLoaded", initPage);
