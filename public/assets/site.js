const $=(q,root=document)=>root.querySelector(q);
const escapeHtml=(s)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const wha=s=>'https://wa.me/'+String(s.whatsapp||'5516994623076').replace(/\D/g,'');
const copyDefaults = {"top":"✨ Novidades e estilo para acompanhar seu dia!","whatsapp":"WhatsApp ↗","tagline":"Seu estilo começa pelos pés.","contact":"Contato","phone":"WhatsApp:","instagram":"Instagram:","copyright":"Todos os direitos reservados.","floating":"✆ Fale conosco","size":"Selecione o tamanho","ask":"Consultar pelo WhatsApp →","sizeAlert":"Selecione um tamanho primeiro.","productMessage":"Olá! Tenho interesse em {produto}, tamanho {tamanho}. Poderia confirmar preço e disponibilidade?","bannerMessage":"Olá! Vim pelo site {loja} e gostaria de saber mais."};
const copyText = (state, key) => state.copy?.[key] ?? copyDefaults[key];
const sectionEyebrow = (section,state) => ({hero:(state.brand||'RA CALÇADOS')+' • ESTILO E CONFORTO',products:'Nossa seleção',text:state.brand||'RA CALÇADOS'})[section.type] ?? '';
const sectionAlt = section => section.type === 'hero' ? 'Calçado da coleção' : 'Imagem da coleção';
function getPage(s,id){return s.pages.find(p=>p.id===id)||s.pages[0]}
const maxOffset = 240;
function verticalOffset(value) {
  const offset = Number(value);
  return Number.isFinite(offset) ? Math.max(-maxOffset, Math.min(maxOffset, Math.round(offset))) : 0;
}
function elementScale(value) {
  const scale = Number(value ?? 100);
  return Number.isFinite(scale) ? Math.max(50, Math.min(150, Math.round(scale))) : 100;
}
function layoutStyle(target, part) {
  const x = verticalOffset(target[part+'X']);
  const y = verticalOffset(target[part+'Y']);
  const scale = elementScale(target[part+'Scale']);
  return x || y || scale !== 100 ? 'position:relative;left:'+x+'px;top:'+y+'px;scale:'+scale+'%' : '';
}
function layoutAttrs(target, part, editor) {
  const style = layoutStyle(target, part);
  return (style || editor ? ' style="'+style+(editor?';cursor:grab;touch-action:none;user-select:none':'')+'"' : '')
    + (editor ? ' data-layout-part="'+part+'"' : '');
}
function sectionMarkup(sec,s,editor=false){const e=escapeHtml, wa=wha(s),cta=`${wa}?text=${encodeURIComponent(copyText(s,'bannerMessage').replaceAll('{loja}',s.brand||'RA CALÇADOS'))}`;let content='';
 if(sec.type==='hero')content=`<div class="hero"><div class="container hero-grid"><div${layoutAttrs(sec,'text',editor)}><span class="eyebrow">${e(sec.eyebrow??sectionEyebrow(sec,s))}</span><h1>${e(sec.title)}</h1><p>${e(sec.subtitle)}</p><a class="btn" href="#produtos">${e(sec.button||'Ver coleção')} →</a></div><img${layoutAttrs(sec,'image',editor)} src="${e(sec.image||'')}" alt="${e(sec.alt??sectionAlt(sec))}" loading="lazy"></div></div>`;
 if(sec.type==='benefits')content=`<section class="section"><div class="container"><h2${layoutAttrs(sec,'text',editor)}>${e(sec.title)}</h2><div class="benefits"${layoutAttrs(sec,'text',editor)}>${(sec.items||[]).map((t,i)=>`<div class="benefit"><span>${['✦','♡','✓'][i%3]}</span>${e(t)}</div>`).join('')}</div></div></section>`;
 if(sec.type==='products')content=`<section id="produtos" class="section"><div class="container"><div class="sectiontop"${layoutAttrs(sec,'text',editor)}><div><span class="eyebrow">${e(sec.eyebrow??sectionEyebrow(sec,s))}</span><h2>${e(sec.title)}</h2><p class="subtitle">${e(sec.subtitle||'')}</p></div></div><div class="products">${s.products.filter(p=>p.active!==false).map(p=>`<article class="product"${editor?` data-layout-product="${e(p.id)}"`:''}><div class="product-img"${layoutAttrs(p,'image',editor)}><img src="${e(p.image)}" alt="${e(p.name)}" loading="lazy"></div><div class="product-body"${layoutAttrs(p,'text',editor)}><small>${e(p.category)}</small><h3>${e(p.name)}</h3><div class="price">${money(p.price)}</div><select class="select-size" aria-label="${e(copyText(s,'size'))}"><option value="">${e(copyText(s,'size'))}</option>${String(p.sizes||'').split(',').filter(Boolean).map(sz=>`<option value="${e(sz.trim())}">${e(sz.trim())}</option>`).join('')}</select><button class="btn small askproduct" data-name="${e(p.name)}">${e(copyText(s,'ask'))}</button></div></article>`).join('')}</div></div></section>`;
 if(sec.type==='banner')content=`<section class="section"><div class="container"><div class="banner"><div class="copy"${layoutAttrs(sec,'text',editor)}><h2>${e(sec.title)}</h2><p>${e(sec.subtitle)}</p><a class="btn" href="${cta}" target="_blank" rel="noopener">${e(sec.button||'Saiba mais')} →</a></div><img${layoutAttrs(sec,'image',editor)} src="${e(sec.image||'')}" alt="${e(sec.alt??sectionAlt(sec))}" loading="lazy"></div></div></section>`;
 if(sec.type==='text')content=`<section class="section"><div class="container"><div class="textcontent"${layoutAttrs(sec,'text',editor)}><span class="eyebrow">${e(sec.eyebrow??sectionEyebrow(sec,s))}</span><h2>${e(sec.title)}</h2><p class="subtitle">${e(sec.subtitle)}</p></div></div></section>`;
 if(editor)return `<div class="editable" data-section="${e(sec.id)}">${content}<div class="section-control"><button data-move="-1">↑</button><button data-move="1">↓</button></div></div>`;
 return content;
}
function renderSite(s,pageId,editor=false){const e=escapeHtml, p=getPage(s,pageId);document.documentElement.style.setProperty('--primary',s.theme?.primary||'#e63946');document.documentElement.style.setProperty('--dark',s.theme?.dark||'#101521');document.documentElement.style.setProperty('--surface',s.theme?.surface||'#f4f6fa');return `<div class="topstrip">${e(copyText(s,'top'))}</div><header class="head"><div class="container nav"><a class="brand" href="/">${e(s.brand||'RA CALÇADOS')}</a><nav class="navlinks">${s.pages.map(pg=>`<a class="${pg.id===p.id?'active':''}" href="${editor?'#':`/?pagina=${encodeURIComponent(pg.id)}`}" ${editor?`data-gopage="${e(pg.id)}"`:''}>${e(pg.name)}</a>`).join('')}</nav><a class="btn small" href="${wha(s)}" target="_blank" rel="noopener">${e(copyText(s,'whatsapp'))}</a></div></header><main>${p.sections.map(sec=>sectionMarkup(sec,s,editor)).join('')}</main>${s.notice?`<div class="shopnotice">${e(s.notice)}</div>`:''}<footer class="footer"><div class="container"><div class="footergrid"><div><div class="brand">${e(s.brand||'RA CALÇADOS')}</div><p>${e(copyText(s,'tagline'))}</p></div><div><strong>${e(copyText(s,'contact'))}</strong><p>${e(copyText(s,'phone'))} ${e(s.whatsapp||'5516994623076')}</p>${s.instagram?`<p>${e(copyText(s,'instagram'))} ${e(s.instagram)}</p>`:''}</div></div><div class="footnote">© ${new Date().getFullYear()} ${e(s.brand||'RA CALÇADOS')}. ${e(copyText(s,'copyright'))}</div></div></footer>${editor?'':`<a class="floating-wa" href="${wha(s)}" target="_blank" rel="noopener">${e(copyText(s,'floating'))}</a>`}`}
function bindShop(root,s){root.querySelectorAll('.askproduct').forEach(b=>b.onclick=()=>{const sel=b.closest('.product').querySelector('select');if(!sel.value){alert(copyText(s,'sizeAlert'));sel.focus();return}const message=copyText(s,'productMessage').replace(/\{produto\}|\{tamanho\}/g,key=>key==='{produto}'?b.dataset.name:sel.value);window.open(wha(s)+'?text='+encodeURIComponent(message),'_blank','noopener')})}
window.RA={escapeHtml,money,renderSite,bindShop,getPage,copyText,sectionEyebrow,sectionAlt,verticalOffset,elementScale,layoutStyle};
