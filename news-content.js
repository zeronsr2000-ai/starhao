window.StarhaoNewsContent = (() => {
const el=(tag,text)=>Object.assign(document.createElement(tag),{textContent:text||''});
function clean(html) {
  const fragment=DOMPurify.sanitize(html,{RETURN_DOM_FRAGMENT:true,ALLOWED_TAGS:['p','div','br','span','font','strong','b','i','em','u','h2','h3','ul','ol','li','a','img','blockquote'],ALLOWED_ATTR:['href','src','alt','color','size','style','data-kind','data-url','class']});
  for(const node of fragment.querySelectorAll('[style]')) {
    const color=node.style.color, size=node.style.fontSize, weight=node.style.fontWeight;
    node.removeAttribute('style');
    if(color)node.style.color=color;
    if(/^\d{1,2}(?:px|pt)$/.test(size))node.style.fontSize=size;
    if(weight==='bold'||weight==='700')node.style.fontWeight=weight;
  }
  const wrapper=el('div');wrapper.append(fragment);return wrapper.innerHTML;
}
function url(value) {
  try { const u = new URL(value.trim()); return ['https:','http:'].includes(u.protocol) ? u : null; } catch {return null;}
}
function media(source) {
  const u=url(source);if(!u)return null;
  const host=u.hostname.toLowerCase().replace(/^www\./,'');
  if(['youtube.com','m.youtube.com','youtu.be','youtube-nocookie.com'].includes(host)){
    const id=host==='youtu.be'?u.pathname.slice(1):u.searchParams.get('v')||u.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/)?.[1];
    if(/^[a-zA-Z0-9_-]{11}$/.test(id||''))return ['https://www.youtube-nocookie.com/embed/'+id,'YouTube',true];
  }
  if(host==='instagram.com' && /^\/(?:p|reel)\/[\w-]+\/?$/.test(u.pathname))return ['https://www.instagram.com'+u.pathname.replace(/\/$/,'')+'/embed/','Instagram'];
  if(['threads.net','threads.com'].includes(host) && /^\/@[\w.]+\/post\/[\w-]+\/?$/.test(u.pathname))return ['https://www.threads.com'+u.pathname.replace(/\/$/,'')+'/embed','Threads'];
  if(['facebook.com','m.facebook.com','fb.watch'].includes(host)){
    const video=/\/videos\/|\/reel\/|\/watch/.test(u.pathname)||host==='fb.watch';
    if(!video && !/\/posts\/|\/permalink\/|\/permalink\.php|\/photo|\/story\.php/.test(u.pathname))return null;
    return ['https://www.facebook.com/plugins/'+(video?'video':'post')+'.php?href='+encodeURIComponent(u.href)+'&show_text=true','Facebook',video];
  }
  return null;
}
function render(html) {
  const content=el("div");content.innerHTML=clean(html);
  const walker=document.createTreeWalker(content,NodeFilter.SHOW_TEXT);
  const texts=[];while(walker.nextNode())texts.push(walker.currentNode);
  for(const text of texts){
    const pattern=/<img src="([^"]+)">|\[iframe\]([^[]+)\[\/iframe\]/g;
    const parts=document.createDocumentFragment();let end=0;
    for(const match of text.data.matchAll(pattern)){
      parts.append(text.data.slice(end,match.index));
      const token=el('span');token.dataset.kind=match[1]?'image':'video';token.dataset.url=match[1]||match[2];
      parts.append(token);end=match.index+match[0].length;
    }
    if(end){parts.append(text.data.slice(end));text.replaceWith(parts);}
  }
  for(const node of content.querySelectorAll('[data-kind]')){
    const raw=node.textContent;
    let value=node.dataset.url || raw.match(/^\[iframe\]([\s\S]+)\[\/iframe\]$/)?.[1] || raw.match(/^<img src="([^"]+)">$/)?.[1];
    const u=url(value||'');
    if(!u){node.replaceWith(el('p','請回編輯區補上有效網址。'));continue;}
    if(node.dataset.kind==='image'){const img=el('img');img.src=u.href;img.alt='文章圖片';node.replaceWith(img);continue;}
    const box=el('div'),m=media(u.href);
    if(m){const frame=el('iframe');frame.src=m[0];frame.title=m[1]+' 嵌入內容';frame.style.width='100%';frame.style.border='0';frame.loading='lazy';frame.allowFullscreen=true;if(m[2])frame.style.aspectRatio='16/9';else frame.height='520';box.append(frame);}
    const link=el('a','開啟原文內容');link.href=u.href;link.target='_blank';link.rel='noopener noreferrer';box.append(link);node.replaceWith(box);
  }
  return content;
}
async function loadImages(root, db) {
  for (const img of root.querySelectorAll('img[data-news-image]')) {
    const key = img.dataset.newsImage;
    const count = Number(img.dataset.parts);
    if (!/^[a-f0-9]{64}$/.test(key) || !Number.isInteger(count) || count < 1 || count > 5) continue;
    if (!db) continue;
    const reads = Array.from({length:count}, (_,i) =>
      db.collection('siteContent').doc('news-image-' + key + '-' + i).get());
    Promise.all(reads).then(parts => {
      const data = parts.map(doc => doc.data()?.data || '').join('');
      if (/^data:image\/(png|jpeg|webp|gif);base64,/.test(data)) img.src = data;
    }).catch(() => { img.title = '暫時無法載入圖片'; });
  }
}
return {clean,url,media,render,loadImages};
})();
