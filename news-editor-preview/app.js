'use strict';
const $ = id => document.getElementById(id);
const fields = ['title','date','category','summary','cover','seo','description'];
let db, articles, current, savedRange, dirty = false, reordered = false, dragged;
const el = (tag, text) => Object.assign(document.createElement(tag), {textContent:text || ''});
function clean(html) {
  return DOMPurify.sanitize(html,{ALLOWED_TAGS:['p','div','br','span','font','strong','b','i','em','u','h2','h3','ul','ol','li','a','img','blockquote'],ALLOWED_ATTR:['href','src','alt','color','size','style','data-kind','data-url','class']});
}
function url(value) {
  try { const u = new URL(value.trim()); return ['https:','http:'].includes(u.protocol) ? u : null; } catch {return null;}
}
function show(id) {
  for(const s of ['list','edit','view']) $(s).hidden=s!==id;
  $('status').textContent='';window.scrollTo(0,0);
}
function persist(next) {
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('trial','readwrite');
    tx.objectStore('trial').put(next,'articles');
    tx.oncomplete=()=>{articles=next;resolve();};
    tx.onabort=tx.onerror=()=>reject(tx.error);
  });
}
function action(label,fn) {const b=el('button',label);b.onclick=fn;return b;}
function sortMove(from,to) {
  if(from===to || to<0 || to>=articles.length)return;
  articles.splice(to,0,articles.splice(from,1)[0]);reordered=true;list();
}
function list() {
  show('list');$('order').disabled=!reordered;$('rows').replaceChildren();
  articles.forEach((a,i)=>{
    const row=el('div');row.className='row';const grip=el('span','⠿');grip.className='move';grip.draggable=true;grip.title='拖曳排序';
    grip.ondragstart=e=>{dragged=i;e.dataTransfer.setData('text/plain',a.id);row.classList.add('drag');};
    grip.ondragend=()=>{dragged=undefined;row.classList.remove('drag');};
    row.ondragover=e=>e.preventDefault();
    row.ondrop=e=>{e.preventDefault();if(Number.isInteger(dragged))sortMove(dragged,i);dragged=undefined;};
    const name=action(a.title,()=>openArticle(a));name.className='name';
    const meta=el('span',a.status+' · '+a.date);meta.className='meta';
    row.append(grip,name,meta,action('上移',()=>sortMove(i,i-1)),action('下移',()=>sortMove(i,i+1)),action('編輯',()=>openArticle(a)),action('刪除',async()=>{
      if(reordered){$('status').textContent='請先儲存排序。';return;}
      if(confirm('刪除試用文章「'+a.title+'」？')){await persist(articles.filter(x=>x.id!==a.id));list();}
    }));$('rows').append(row);
  });
  if(!articles.length)$('rows').append(el('p','目前沒有文章。'));
}
function openArticle(a) {
  if(reordered){$('status').textContent='請先儲存排序，再進入編輯。';return;}
  current=a || {id:crypto.randomUUID(),date:new Date().toLocaleDateString('sv-SE'),category:'最新消息',html:''};
  fields.forEach(f=>$(f).value=current[f]||'');$('body').innerHTML=clean(current.html);
  $('editHeading').textContent=a?'編輯文章':'新增文章';$('publish').textContent=a?.status==='已發布'?'更新文章':'發布文章';
  dirty=false;savedRange=null;show('edit');
}
function collect() {
  const a={...current,html:clean($('body').innerHTML)};
  fields.forEach(f=>a[f]=$(f).value.trim());return a;
}
async function save(status) {
  const a=collect();if(!a.title){$('title').focus();$('status').textContent='請填寫文章標題。';return;}
  a.status=status;
  const next=articles.some(x=>x.id===a.id)?articles.map(x=>x.id===a.id?a:x):[...articles,a];
  await persist(next);dirty=false;list();$('status').textContent='已儲存在此瀏覽器。';
}
document.addEventListener('selectionchange',()=>{
  const sel=getSelection();if(sel.rangeCount && $('body').contains(sel.anchorNode) && $('body').contains(sel.focusNode))savedRange=sel.getRangeAt(0).cloneRange();
});
function focusText() {
  $('body').focus();const sel=getSelection();
  if(!savedRange || !$('body').contains(savedRange.commonAncestorContainer)){savedRange=document.createRange();savedRange.selectNodeContents($('body'));savedRange.collapse(false);}
  sel.removeAllRanges();sel.addRange(savedRange);
}
function command(cmd,v) {focusText();document.execCommand(cmd,false,v);dirty=true;}
function insert(node,selected) {
  focusText();const r=getSelection().getRangeAt(0);r.deleteContents();r.insertNode(node);
  if(selected){r.setStart(selected,0);r.setEnd(selected,selected.length);}else{r.setStartAfter(node);r.collapse(true);}
  savedRange=r.cloneRange();getSelection().removeAllRanges();getSelection().addRange(r);dirty=true;
}
function template(type) {
  const node=el('span'),label=document.createTextNode(type==='image'?'這裡貼上圖片網址':'這裡貼上影片網址');
  node.append(type==='image'?'<img src="':'[iframe]',label,type==='image'?'">':'[/iframe]');insert(node,label);
}
function modal(title,html,submit) {
  $('dt').textContent=title;$('dc').innerHTML=html;$('error').textContent='';$('dialog').showModal();
  $('ok').onclick=async()=>{try{$('ok').disabled=true;const after=await submit();$('dialog').close();if(after)after();}catch(e){$('error').textContent=e.message;}finally{$('ok').disabled=false;}};
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
function socialURL(raw) {
  if(url(raw) && media(raw))return raw;
  const doc=new DOMParser().parseFromString(raw,'text/html');
  for(const node of doc.querySelectorAll('[data-instgrm-permalink],[data-text-post-permalink],[data-href],iframe[src],a[href]')){
    let value=node.dataset.instgrmPermalink||node.dataset.textPostPermalink||node.dataset.href||node.getAttribute('src')||node.getAttribute('href');
    const u=url(value||'');if(!u)continue;
    if(/^(www\.)?facebook\.com$/.test(u.hostname)&&u.pathname.startsWith('/plugins/'))value=u.searchParams.get('href');
    if(value && media(value))return value;
  }
  throw Error('請貼上 Instagram、Facebook 或 Threads 公開單篇貼文的網址或官方嵌入碼。');
}
function renderPreview() {
  const a=collect(),content=el('div');content.innerHTML=a.html;
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
    if(m){const frame=el('iframe');frame.src=m[0];frame.title=m[1]+' 嵌入內容';frame.loading='lazy';frame.allowFullscreen=true;if(m[2])frame.style.aspectRatio='16/9';else frame.height='520';box.append(frame);}
    const link=el('a','開啟原文內容');link.href=u.href;link.target='_blank';link.rel='noopener noreferrer';box.append(link);node.replaceWith(box);
  }
  $('reader').replaceChildren(el('small',a.category+' / '+a.date),el('h1',a.title||'未命名文章'),el('p',a.summary));
  if(url(a.cover)){const img=el('img');img.src=a.cover;img.alt=a.title;$('reader').append(img);}
  $('reader').append(content);show('view');
}
$('photo').onclick=()=>{
  modal('插入圖片','<label>插入方式<select id="mode"><option value="url">嵌入圖片網址</option><option value="upload">上傳圖片</option></select></label><div id="upload" hidden><label>選取圖片<input multiple type="file" id="files" accept="image/jpeg,image/png,image/webp,image/gif"></label><small>JPG、PNG、WebP、GIF，每張最多 2 MB。</small></div>',async()=>{
    if($('mode').value==='url')return ()=>template('image');
    const files=[...$('files').files];if(!files.length)throw Error('請先選擇圖片。');
    const group=el('span');for(const f of files){
      if(!['image/jpeg','image/png','image/webp','image/gif'].includes(f.type)||f.size>2*1024*1024)throw Error(f.name+'：格式不符或大於 2 MB。');
      const reader=new FileReader();const data=await new Promise((res,rej)=>{reader.onload=()=>res(reader.result);reader.onerror=()=>rej(Error('無法讀取圖片'));reader.readAsDataURL(f);});
      const img=el('img');img.src=data;img.alt=f.name;await img.decode();group.append(img);
    }return ()=>insert(group);
  });$('mode').onchange=()=>$('upload').hidden=$('mode').value!=='upload';
};
$('video').onclick=()=>template('video');
$('social').onclick=()=>modal('嵌入社群貼文','<label>單篇貼文網址或官方嵌入碼<textarea id="raw" rows="5"></textarea></label>',()=>{
  const v=socialURL($('raw').value.trim());return ()=>{const node=el('span',media(v)[1]+' 貼文 · '+v);node.className='postref';node.dataset.kind='social';node.dataset.url=v;insert(node);};
});
$('link').onclick=()=>modal('插入連結','<label>連結網址<input id="href" type="url" placeholder="https://"></label>',()=>{
  const u=url($('href').value);if(!u)throw Error('請填寫完整網址。');
  return ()=>{if(savedRange && !savedRange.collapsed)command('createLink',u.href);else{const a=el('a',u.href);a.href=u.href;insert(a);}};
});
$('cancel').onclick=()=>$('dialog').close();
$('tools').onmousedown=e=>{if(e.target.tagName==='BUTTON')e.preventDefault();};
document.querySelectorAll('[data-cmd]').forEach(b=>b.onclick=()=>command(b.dataset.cmd));
$('size').onchange=e=>{const size=Number(e.target.value);if(!size)return;command('fontSize','7');$('body').querySelectorAll('font[size="7"]').forEach(f=>{f.removeAttribute('size');f.style.fontSize=size+'px';});e.target.value='';};
$('block').onchange=e=>{if(e.target.value)command('formatBlock',e.target.value);e.target.value='';};
$('color').oninput=e=>command('foreColor',e.target.value);
$('body').onpaste=e=>{e.preventDefault();document.execCommand('insertText',false,e.clipboardData.getData('text/plain'));};
$('body').ondrop=e=>e.preventDefault();
$('edit').oninput=()=>dirty=true;
$('new').onclick=()=>openArticle();
$('back').onclick=()=>{if(!dirty||confirm('離開並捨棄未儲存的修改？')){dirty=false;list();}};
$('draft').onclick=()=>save('草稿');$('publish').onclick=()=>save('已發布');
$('order').onclick=async()=>{await persist(articles);reordered=false;list();$('status').textContent='已儲存展示順序。';};
$('preview').onclick=renderPreview;$('resume').onclick=()=>show('edit');
window.onbeforeunload=e=>{if(dirty||reordered)e.preventDefault();};
window.onunhandledrejection=()=>{$('status').textContent='無法完成儲存或載入。請確認瀏覽器可使用本機儲存空間，再試一次。';};
(async()=>{
 const req=indexedDB.open('starhao-news-editor-trial',1);
 req.onupgradeneeded=()=>req.result.createObjectStore('trial');
 db=await new Promise((res,rej)=>{req.onsuccess=()=>res(req.result);req.onerror=()=>rej(req.error);});
 const get=db.transaction('trial').objectStore('trial').get('articles');
 articles=await new Promise((res,rej)=>{get.onsuccess=()=>res(get.result);get.onerror=()=>rej(get.error);});
 if(!articles)await persist(await (await fetch('samples.json')).json());list();
})();
