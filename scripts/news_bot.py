"""Generate and integrate one reviewed-via-PR article for StarHao."""

import argparse
import html
import json
import os
import re
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
SITE = "https://zeronsr2000-ai.github.io/starhao/"
NEWS_MARKER = "<!-- SEO_ARTICLES -->"
FIELDS = {"slug", "title", "description", "sections", "service"}
SERVICES = {
    "brand-film": "品牌影片製作",
    "interview": "人物訪談拍攝",
    "podcast": "Podcast 製作",
    "social-cuts": "社群短影音製作",
    "event": "活動紀錄",
    "post-production": "影音後製",
}


def generate(existing_titles):
    prompt = (
        "為台灣星澔文創寫一篇繁體中文的影音製作實用教學。受眾是正在規劃委託拍攝的企業或行銷人員。"
        "聚焦一個具體搜尋問題，用可操作的步驟與明確標為假設的例子回答。"
        "避免重複既有主題、關鍵字堆砌、假造數字、客戶案例、引言或公司承諾。"
        "使用純文字，不要 Markdown、HTML 或自行提供網址。回傳 JSON 物件，欄位為："
        "slug（簡短英文小寫連字號）、title、description（摘要，約 70 個中文字）、"
        "sections（3 到 6 個物件，每個有 heading 和 paragraphs 字串陣列，每節具體說明）、"
        f"service（從 {', '.join(SERVICES)} 選一個）。\n"
        f"已發布的標題：{json.dumps(existing_titles, ensure_ascii=False)}"
    )
    request = urllib.request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=json.dumps({
            "model": os.environ.get("NEWS_MODEL") or "gpt-4.1-mini",
            "messages": [{"role": "user", "content": prompt}],
            "response_format": {"type": "json_object"},
            "max_completion_tokens": 3500,
        }).encode(),
        headers={
            "Authorization": f"Bearer {os.environ['OPENAI_API_KEY']}",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(request, timeout=120) as response:
        choice = json.load(response)["choices"][0]
    if choice["finish_reason"] != "stop":
        raise ValueError("文章生成未完成")
    return json.loads(choice["message"]["content"])


def valid_text(value, limit):
    return isinstance(value, str) and 0 < len(value.strip()) <= limit


def validate(draft):
    if not isinstance(draft, dict) or draft.keys() != FIELDS:
        raise ValueError("文章欄位不符合格式")
    if not isinstance(draft["slug"], str) or not re.fullmatch(
        r"[a-z0-9]+(?:-[a-z0-9]+)*", draft["slug"]
    ) or len(draft["slug"]) > 72:
        raise ValueError("文章網址格式錯誤")
    if not valid_text(draft["title"], 90) or not valid_text(draft["description"], 160):
        raise ValueError("標題或摘要格式錯誤")
    if not isinstance(draft["service"], str) or draft["service"] not in SERVICES:
        raise ValueError("服務類型錯誤")
    sections = draft["sections"]
    if not isinstance(sections, list) or not 3 <= len(sections) <= 6:
        raise ValueError("文章需有 3 至 6 節")
    for section in sections:
        if not isinstance(section, dict) or not valid_text(section.get("heading"), 90):
            raise ValueError("段落標題格式錯誤")
        paragraphs = section.get("paragraphs")
        if not isinstance(paragraphs, list) or not 1 <= len(paragraphs) <= 5:
            raise ValueError("段落數量錯誤")
        if not all(valid_text(paragraph, 1000) for paragraph in paragraphs):
            raise ValueError("段落內容格式錯誤")


def render(draft, day, filename):
    escape = html.escape
    title = escape(draft["title"])
    description = escape(draft["description"])
    url = SITE + filename
    schema = json.dumps({
        "@context": "https://schema.org", "@type": "Article",
        "headline": draft["title"], "description": draft["description"],
        "datePublished": day, "mainEntityOfPage": url, "inLanguage": "zh-Hant-TW",
        "author": {"@type": "Organization", "name": "星澔文創", "url": SITE},
    }, ensure_ascii=False).replace("<", r"\u003c")
    sections = []
    for section in draft["sections"]:
        paragraphs = "\n".join(f"<p>{escape(p)}</p>" for p in section["paragraphs"])
        sections.append(f"<h2>{escape(section['heading'])}</h2>\n{paragraphs}")
    body = "\n".join(sections)
    service = draft["service"]
    template = (ROOT / "article-video-production-seo-guide.html").read_text()
    start = template.index("    <meta name=\"description\"")
    end = template.index("  </head>")
    head = f'''    <meta name="description" content="{description}" />
    <meta property="og:title" content="{title}｜星澔文創" />
    <meta property="og:description" content="{description}" />
    <meta property="og:url" content="{url}" />
    <meta property="og:type" content="article" />
    <meta property="og:image" content="{SITE}og.png" />
    <title>{title}｜星澔文創</title>
    <link rel="canonical" href="{url}" />
    <link rel="stylesheet" href="styles.css?v=20260909-3" />
    <script type="application/ld+json">{schema}</script>
'''
    template = template[:start] + head + template[end:]
    start = template.index('      <article class="article-shell"')
    end = template.index("    </main>", start)
    return template[:start] + f'''      <article class="article-shell">
        <header class="article-head">
          <p class="eyebrow">影音製作指南 / <time datetime="{day}">{day}</time></p>
          <h1>{title}</h1>
          <p>{description}</p>
        </header>
        <div class="article-content">
{body}
          <p>延伸了解 <a href="service.html?type=services&amp;id={service}">{SERVICES[service]}</a>，或<a href="quote.html">聯絡星澔文創</a>討論你的拍攝需求。</p>
        </div>
      </article>
''' + template[end:]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--draft", type=Path, help="使用已備妥的 JSON 草稿")
    args = parser.parse_args()
    day = datetime.now(ZoneInfo("Asia/Taipei")).date().isoformat()
    if list(ROOT.glob(f"article-{day}-*.html")):
        print(f"{day} 已有文章")
        return

    news_path = ROOT / "news.html"
    sitemap_path = ROOT / "sitemap.xml"
    news = news_path.read_text()
    sitemap = sitemap_path.read_text()
    if news.count(NEWS_MARKER) != 1 or sitemap.count("</urlset>") != 1:
        raise ValueError("找不到唯一的文章列表或 sitemap 插入點")
    titles = []
    for path in sorted(ROOT.glob("article-*.html"), reverse=True):
        match = re.search(r"<title>(.*?)｜星澔文創</title>", path.read_text())
        if match:
            titles.append(html.unescape(match[1]))
    draft = json.loads(args.draft.read_text()) if args.draft else generate(titles[:60])
    validate(draft)
    if draft["title"].strip() in titles:
        raise ValueError("已有相同標題的文章")
    filename = f"article-{day}-{draft['slug']}.html"
    article = render(draft, day, filename)
    card = f'''
          <article class="news-card">
            <a href="{filename}">
              <div class="news-card-media"><div class="news-card-fallback">影音製作指南</div></div>
              <div class="news-card-body">
                <p>影音製作指南 / <time datetime="{day}">{day}</time></p>
                <h2>{html.escape(draft['title'])}</h2>
                <small>{html.escape(draft['description'])}</small>
              </div>
            </a>
          </article>'''
    sitemap = sitemap.replace(
        "</urlset>",
        f"  <url>\n    <loc>{SITE}{filename}</loc>\n    <lastmod>{day}</lastmod>\n  </url>\n</urlset>",
    )
    ET.fromstring(sitemap)
    (ROOT / filename).write_text(article)
    news_path.write_text(news.replace(NEWS_MARKER, NEWS_MARKER + card))
    sitemap_path.write_text(sitemap)
    print(filename)


if __name__ == "__main__":
    main()
