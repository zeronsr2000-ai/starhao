(function () {
  const escape = (value) => String(value || '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function clean(html) {
    return DOMPurify.sanitize(html || '', { USE_PROFILES: { html: true }, FORBID_TAGS: ['style', 'form', 'input', 'button'], FORBID_ATTR: ['id', 'name'] });
  }
  function content(item) {
    if (typeof item.detailHtml === 'string') return clean(item.detailHtml);
    let blocks = item.detailBlocks;
    if (typeof blocks === 'string') { try { blocks = JSON.parse(blocks); } catch (_) { blocks = []; } }
    if (!Array.isArray(blocks) || !blocks.length) return '<p>' + escape(item.detailBody).replace(/\n/g, '<br>') + '</p>';
    return clean(blocks.map((b) => {
      const text = escape(b.text).replace(/\n/g, '<br>');
      if (b.type === 'image') return `<figure><img src="${escape(b.url)}" alt="${escape(b.alt)}"><figcaption>${escape(b.caption)}</figcaption></figure>`;
      if (b.type === 'video') return `<p><a href="${escape(b.url)}">${escape(b.caption || b.url)}</a></p>`;
      if (b.type === 'list') return '<ul>' + String(b.text || '').split('\n').map(t => '<li>' + escape(t) + '</li>').join('') + '</ul>';
      const tag = b.type === 'heading' ? 'h2' : b.type === 'quote' ? 'blockquote' : 'p';
      return `<${tag}>${text}</${tag}>`;
    }).join(''));
  }
  function edit(form, item) {
    if (!form._serviceEditor) {
      form.querySelector('.article-editor-mode')?.remove();
      form.querySelector('[data-service-code-pane]')?.remove();
      form.querySelector('[data-service-edit-pane] .field-hint')?.remove();
      form.removeAttribute('data-service-editor-mode');
      const textarea = form.querySelector('[data-service-textarea]');
      form._serviceEditor = SUNEDITOR.create(textarea, {
        width: '100%', height: '360px', minHeight: '280px', stickyToolbar: -1,
        defaultStyle: 'font-size: 16px; line-height: 1.8;',
        buttonList: [['undo', 'redo'], ['font', 'fontSize', 'formatBlock'],
          ['bold', 'underline', 'italic', 'strike'], ['fontColor', 'hiliteColor'],
          ['align', 'list', 'lineHeight'], ['outdent', 'indent'], ['link', 'image', 'table'],
          ['removeFormat', 'fullScreen', 'codeView']],
        imageFileInput: true, imageUrlInput: true
      });
    }
    form._serviceEditor.setContents(content(item));
  }
  function read(form) {
    const editor = form._serviceEditor;
    if (editor.core._variable.isCodeView) editor.core.toggleCodeView();
    return clean(editor.getContents());
  }
  window.ServiceArticle = { clean, content, edit, read };
})();
