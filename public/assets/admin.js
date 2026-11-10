(() => {
const e=RA.escapeHtml;const $=q=>document.querySelector(q);
let state=null,pageId='inicio',selected=null,tab='pagina',aiProposal=null,modified=false;
const openProducts = new Set();
let productCategory = '';
const uid=()=>Math.random().toString(36).slice(2,10);
function notice(t){$('#status').textContent=t}
async function api(action,data){const r=await fetch('/api?action='+action,{method:data?'POST':'GET',headers:data?{'Content-Type':'application/json'}:{},credentials:'same-origin',body:data?JSON.stringify(data):undefined});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.erro||'Erro na comunicação com a Netlify');return d}
async function start(){let r;try{r=await api('session')}catch{r={loggedIn:false}}if(!r.loggedIn){$('#login').style.display='grid';return}$('#login').style.display='none';$('#admin').style.display='grid';state=await api('site');pageId=state.pages[0]?.id;refresh()}
$('#loginform').onsubmit=async ev=>{ev.preventDefault();$('#loginstatus').textContent='Autenticando...';try{await api('login',{password:new FormData(ev.target).get('password')});ev.target.reset();await start()}catch(err){$('#loginstatus').textContent=err.message}};
$('#logout').onclick=async()=>{await api('logout',{});location.reload()};
function dirty(){modified=true;notice('Alterações não publicadas • clique em Publicar alterações')}
function refresh(renderControls=true){const p=RA.getPage(state,pageId);if(!p)return;$('#pageSelect').innerHTML=state.pages.map(pg=>`<option value="${e(pg.id)}" ${pg.id===p.id?'selected':''}>${e(pg.name)}</option>`).join('');$('#preview').innerHTML=RA.renderSite(state,pageId,true);RA.bindShop($('#preview'),state);$('#preview').querySelectorAll('[data-category-filter]').forEach(button=>button.addEventListener('click',()=>{tab='produtos';selected=null;productCategory=button.getAttribute('aria-pressed')==='true'?button.dataset.categoryFilter:'';openProducts.clear();state.products.filter(product=>product.category===button.dataset.categoryFilter).forEach(product=>openProducts.add(product.id));setActiveTab();renderProperty()}));$('#preview').querySelectorAll('[data-section]').forEach(el=>{const id=el.dataset.section;el.classList.toggle('selected',selected===id);el.addEventListener('click',ev=>{const product=ev.target.closest('[data-layout-product]');if(product){ev.preventDefault();ev.stopPropagation();tab='produtos';selected=null;openProducts.clear();openProducts.add(product.dataset.layoutProduct);productCategory=state.products.find(item=>item.id===product.dataset.layoutProduct)?.category||'';setActiveTab();refresh();$('#productlist details[open]')?.scrollIntoView({block:'nearest'});return}const btn=ev.target.closest('[data-move]');if(btn){ev.preventDefault();ev.stopPropagation();moveSection(id,Number(btn.dataset.move));return}if(ev.target.closest('a'))ev.preventDefault();selected=id;tab='pagina';setActiveTab();refresh()})});$('#preview').querySelectorAll('[data-gopage]').forEach(a=>a.onclick=ev=>{ev.preventDefault();pageId=a.dataset.gopage;selected=null;refresh()});if(renderControls)renderProperty()}
function moveSection(id,offset){const sections=RA.getPage(state,pageId).sections;const i=sections.findIndex(x=>x.id===id),j=i+offset;if(i<0||j<0||j>=sections.length)return;[sections[i],sections[j]]=[sections[j],sections[i]];dirty();refresh()}
function bindFields(obj,prefix=''){document.querySelectorAll('[data-field]').forEach(el=>{el.addEventListener('input',()=>{const key=el.dataset.field;let v=el.value;if(el.type==='number')v=Number(v);if(el.dataset.split==='true')v=v.split('\n').map(x=>x.trim()).filter(Boolean);if(key.startsWith('copy.')){obj.copy??={};obj.copy[key.slice(5)]=v}else obj[key]=v;dirty();if(el.type==='color'){document.documentElement.style.setProperty('--'+(key==='primary'?'primary':key==='dark'?'dark':'surface'),v)} });el.addEventListener('change',()=>refresh(false))})}
const field=(label,key,value,type='text',extra='')=>`<div class="field"><label>${e(label)}</label>${type==='textarea'?`<textarea data-field="${e(key)}" ${extra}>${e(value)}</textarea>`:`<input type="${type}" data-field="${e(key)}" value="${e(value)}" ${extra}>`}</div>`;
const copyLabels = {"top":"Faixa superior","whatsapp":"Botão do cabeçalho","tagline":"Frase do rodapé","contact":"Título de contato","phone":"Rótulo do telefone","instagram":"Rótulo do Instagram","copyright":"Direitos reservados","floating":"Botão flutuante","size":"Seletor de tamanho","ask":"Botão dos produtos","sizeAlert":"Aviso de tamanho","productMessage":"Mensagem do produto ({produto}, {tamanho})","bannerMessage":"Mensagem do banner"};
const imageUpload = '<div class="field"><label>Anexar imagem (JPG, PNG, WebP ou GIF, até 4 MB)<input type="file" data-image-upload accept="image/jpeg,image/png,image/webp,image/gif"></label><small role="status"></small></div>';

function bindImage(root, target) {
  const input = root.querySelector('[data-image-upload]');
  if (!input) return;
  const status = input.parentElement.nextElementSibling;
  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      status.textContent = 'Escolha uma imagem de até 4 MB.';
      return;
    }
    input.disabled = true;
    status.textContent = 'Enviando imagem…';
    try {
      const response = await fetch('/api?action=upload-image', {
        method: 'POST',
        headers: {'Content-Type': 'application/octet-stream'},
        body: file
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.erro);
      if (!input.isConnected) return;
      target.image = result.url;
      dirty();
      refresh();
    } catch (error) {
      status.textContent = error.message || 'Falha ao anexar a imagem.';
    } finally {
      input.disabled = false;
      input.value = '';
    }
  };
}
const layoutHistory = new WeakMap();

function layoutSnapshot(target, part) {
  return [
    RA.verticalOffset(target[part+'X']),
    RA.verticalOffset(target[part+'Y']),
    RA.elementScale(target[part+'Scale']),
    ...Object.keys(RA.layoutFields[part]).map(key=>target[key] ?? '')
  ];
}

function rememberLayout(target, part, before) {
  if (layoutSnapshot(target,part).every((value,index) => value === before[index])) return;
  if (!layoutHistory.has(target)) layoutHistory.set(target,{text:[],image:[],section:[]});
  layoutHistory.get(target)[part].push(before);
}

const frameOptions = {
  imageFit:['Como a foto preenche o quadro',['Preencher (pode cortar)','Mostrar foto inteira']],
  imageFocusX:['Enquadramento horizontal',['Esquerda','Centro','Direita']],
  imageFocusY:['Enquadramento vertical',['Topo','Centro','Base']],
  textAlign:['Alinhamento do texto',['Esquerda','Centro','Direita']]
};
function frameControls(part,target) {
  return Object.entries(RA.layoutFields[part]).map(([key,values]) => {
    const [label,names] = frameOptions[key];
    const options = values.map((value,index) =>
      `<option value="${value}" ${target[key]===value?'selected':''}>${names[index]}</option>`).join('');
    return `<label>${label}<select data-frame="${key}"><option value="">Padrão</option>${options}</select></label>`;
  }).join('');
}
function moveControls(label, part, target) {
  return `<fieldset class="field" data-offset="${part}">
    <legend>${label}</legend>
    <div style="display:flex;gap:4px;flex-wrap:wrap">
      <button type="button" class="btn outline small" data-shift="-4">↑ Subir</button>
      <button type="button" class="btn outline small" data-shift="4">↓ Descer</button>
      <button type="button" class="btn outline small" data-size="-5">− Diminuir</button>
      <button type="button" class="btn outline small" data-size="5">+ Aumentar</button>
      <button type="button" class="btn outline small" data-restore ${layoutHistory.get(target)?.[part].length ? '' : 'disabled'}>Restaurar</button>
    </div>
    <output aria-live="polite">${layoutSummary(target,part)}</output>
    ${frameControls(part,target)}
  </fieldset>`;
}
function layoutSummary(target, part) {
  return `${RA.verticalOffset(target[part+'X'])} px horizontal · ${RA.verticalOffset(target[part+'Y'])} px vertical · ${RA.elementScale(target[part+'Scale'])}%`;
}
function bindMoves(root, target) {
  root.querySelectorAll('[data-offset]').forEach(group => {
    const part = group.dataset.offset;
    group.onchange = event => {
      const key = event.target.dataset.frame;
      if (!Object.hasOwn(RA.layoutFields[part],key)) return;
      const before = layoutSnapshot(target,part);
      target[key] = event.target.value;
      rememberLayout(target,part,before);
      group.querySelector('[data-restore]').disabled = false;
      dirty();
      refresh(false);
    };
    group.onclick = event => {
      const button = event.target.closest('button');
      if (!button) return;
      const before = layoutSnapshot(target,part);
      const restoring = button.hasAttribute('data-restore');
      if (restoring) {
        const previous = layoutHistory.get(target)?.[part].pop();
        if (!previous) return;
        [target[part+'X'],target[part+'Y'],target[part+'Scale']] = previous;
        group.querySelectorAll('[data-frame]').forEach((select,index) => {
          const value = previous[index+3];
          target[select.dataset.frame] = value;
          select.value = value;
        });
      } else if (button.dataset.size) {
        target[part+'Scale'] = RA.elementScale(RA.elementScale(target[part+'Scale']) + Number(button.dataset.size));
      } else {
        target[part+'Y'] = RA.verticalOffset(RA.verticalOffset(target[part+'Y']) + Number(button.dataset.shift));
      }
      if (!restoring) {
        if (layoutSnapshot(target,part).every((value,index) => value === before[index])) return;
        rememberLayout(target,part,before);
      }
      group.querySelector('[data-restore]').disabled = !layoutHistory.get(target)?.[part].length;
      group.querySelector('output').textContent = layoutSummary(target,part);
      dirty();
      refresh(false);
    };
  });
}

const preview = $('#preview');
let drag = null;
let suppressClick = false;

preview.addEventListener('dragstart', event => {
  if (event.target.closest('[data-layout-part]')) event.preventDefault();
});
preview.addEventListener('pointerdown', event => {
  if (drag || !event.isPrimary || event.button !== 0) return;
  suppressClick = false;
  const handle = event.target.closest('[data-section-drag]');
  const element = handle
    ? handle.closest('[data-section]').querySelector('[data-layout-part="section"]')
    : event.target.closest('[data-layout-part]:not([data-layout-part="section"])');
  if (!element || event.target.closest('select,input,textarea')) return;
  const section = element.closest('[data-section]');
  const product = element.closest('[data-layout-product]');
  const target = product
    ? state.products.find(item => item.id === product.dataset.layoutProduct)
    : RA.getPage(state,pageId).sections.find(item => item.id === section?.dataset.section);
  if (!target) return;
  const part = element.dataset.layoutPart;
  const elements = [...(product || section).querySelectorAll('[data-layout-part]')]
    .filter(node => node.dataset.layoutPart === part && (product || !node.closest('[data-layout-product]')));
  drag = {id:event.pointerId,target,part,elements,product,section,
    startX:event.clientX,startY:event.clientY,
    x:RA.verticalOffset(target[part+'X']),y:RA.verticalOffset(target[part+'Y']),
    before:layoutSnapshot(target,part)};
});
preview.addEventListener('pointermove', event => {
  if (drag?.id !== event.pointerId) return;
  const dx = event.clientX - drag.startX;
  const dy = event.clientY - drag.startY;
  if (!drag.moved && Math.hypot(dx,dy) < 4) return;
  if (!drag.moved) {
    preview.setPointerCapture(event.pointerId);
    drag.moved = true;
  }
  const {target,part,elements} = drag;
  const sectionZoom = part === 'section' ? 1 : RA.elementScale(
    RA.getPage(state,pageId).sections.find(item => item.id === drag.section.dataset.section)?.sectionScale
  ) / 100;
  target[part+'X'] = RA.verticalOffset(drag.x + dx / sectionZoom);
  target[part+'Y'] = RA.verticalOffset(drag.y + dy / sectionZoom);
  elements.forEach(element => {
    element.style.cssText = RA.layoutStyle(target,part,!drag.product)+';cursor:grabbing;touch-action:none;user-select:none';
  });
});
function finishDrag(event) {
  if (drag?.id !== event.pointerId) return;
  const completed = drag;
  drag = null;
  if (!completed.moved) return;
  if (event.type === 'pointerup') {
    rememberLayout(completed.target,completed.part,completed.before);
    suppressClick = true;
    tab = completed.product ? 'produtos' : 'pagina';
    selected = completed.product ? null : completed.section.dataset.section;
    if (completed.product) openProducts.add(completed.target.id);
    setActiveTab();
    dirty();
  } else {
    completed.target[completed.part+'X'] = completed.x;
    completed.target[completed.part+'Y'] = completed.y;
  }
  refresh();
}
window.addEventListener('pointerup',finishDrag);
window.addEventListener('pointercancel',finishDrag);
preview.addEventListener('lostpointercapture',finishDrag);
preview.addEventListener('click', event => {
  if (!suppressClick) return;
  suppressClick = false;
  event.preventDefault();
  event.stopImmediatePropagation();
},true);

const sectionOptions=[['hero','Banner principal'],['products','Lista de produtos'],['benefits','Benefícios'],['banner','Banner com imagem'],['text','Texto institucional']];
function renderProperty(){const root=$('#property'),p=RA.getPage(state,pageId);if(!root)return;
if(tab==='pagina'){
  const sec=p.sections.find(x=>x.id===selected);
  root.innerHTML=`<h3>${sec?'Editar seção':'Páginas e seções'}</h3><p class="hint">Arraste fotos e textos na prévia. Clique na seção para editar o conteúdo e ajustar o tamanho.</p>`;
  if(sec){root.innerHTML+=`<div class="card-admin"><strong>${e(sectionOptions.find(x=>x[0]===sec.type)?.[1]||sec.type)}</strong></div>`+field('Título','title',sec.title)+(['hero','products','text'].includes(sec.type)?field('Texto acima do título','eyebrow',sec.eyebrow??RA.sectionEyebrow(sec,state)):'')+((sec.type==='benefits')?`<div class="field"><label>Benefícios (um por linha)</label><textarea data-field="items" data-split="true">${e((sec.items||[]).join('\n'))}</textarea></div>`:field('Descrição','subtitle',sec.subtitle||'','textarea'))+(['hero','banner'].includes(sec.type)?field('Imagem (URL ou anexo)','image',sec.image||'')+imageUpload+field('Descrição da imagem','alt',sec.alt??RA.sectionAlt(sec))+field('Texto do botão','button',sec.button||''):'')+moveControls('Seção inteira','section',sec)+moveControls('Mover texto','text',sec)+(['hero','banner'].includes(sec.type)?moveControls('Mover foto','image',sec):'')+`<button class="btn outline" id="duplicate" style="width:100%;margin-top:10px">Duplicar seção</button><button class="btn outline" id="delSection" style="width:100%;margin-top:8px">Excluir seção</button>`;
    bindFields(sec);bindImage(root,sec);bindMoves(root,sec);$('#duplicate').onclick=()=>{p.sections.splice(p.sections.indexOf(sec)+1,0,{...structuredClone(sec),id:uid()});dirty();refresh()};$('#delSection').onclick=()=>{if(!confirm('Excluir esta seção?'))return;p.sections=p.sections.filter(x=>x!==sec);selected=null;dirty();refresh()};
  }else{root.innerHTML+=`<div class="field"><label>Nome da página</label><input id="pageName" value="${e(p.name)}"></div><button class="btn outline" id="renamePage" style="width:100%">Renomear página</button><div class="field"><label>Adicionar nova seção</label><select class="input" id="newSection">${sectionOptions.map(x=>`<option value="${x[0]}">${x[1]}</option>`).join('')}</select></div><button class="btn" id="addSection" style="width:100%">+ Adicionar seção</button><div style="height:15px"></div><button class="btn outline" id="newPage" style="width:100%">+ Nova página</button><button class="btn outline" id="delPage" style="width:100%;margin-top:8px">Excluir página atual</button><p class="hint">Para alterar o menu, crie, renomeie ou exclua páginas aqui.</p>`;
    $('#renamePage').onclick=()=>{p.name=$('#pageName').value.slice(0,65)||p.name;dirty();refresh()};$('#addSection').onclick=()=>{const type=$('#newSection').value;p.sections.push({id:uid(),type,title:'Novo conteúdo',subtitle:'Edite esta descrição.',button:'Saiba mais',items:['Qualidade','Conforto','Atendimento'],image:'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1200&q=80'});selected=p.sections.at(-1).id;dirty();refresh()};$('#newPage').onclick=()=>{const name=prompt('Nome da nova página:','Nova página');if(!name)return;const id='pagina-'+uid();state.pages.push({id,name:name.slice(0,60),sections:[]});pageId=id;selected=null;dirty();refresh()};$('#delPage').onclick=()=>{if(state.pages.length<=1){alert('É necessário manter pelo menos uma página.');return}if(!confirm('Excluir esta página?'))return;state.pages=state.pages.filter(x=>x.id!==pageId);pageId=state.pages[0].id;dirty();refresh()}}
}
if(tab==='produtos'){root.innerHTML=`<h3>Catálogo de produtos</h3><p class="hint">Produtos em demonstração. Cadastre dados verdadeiros antes de vender.</p><div class="field"><label>Categoria dos produtos<select id="productCategory"><option value="">Todas as categorias</option>${[...new Set(['Chinelos','Tênis',...state.products.map(product=>product.category).filter(Boolean)])].map(category=>`<option value="${e(category)}" ${productCategory===category?'selected':''}>${e(category)}</option>`).join('')}</select></label></div><button class="btn" id="newprod" style="width:100%">+ Adicionar produto${productCategory?' em '+e(productCategory):''}</button><div id="productlist"></div>`;$('#productCategory').onchange=event=>{productCategory=event.target.value;renderProperty()};$('#newprod').onclick=()=>{const product={id:uid(),name:'Novo produto',price:0,category:productCategory||'Tênis',sizes:'38,39,40',image:'',active:true};state.products.push(product);openProducts.clear();openProducts.add(product.id);dirty();refresh();$('#productlist details[open] input[data-k="name"]')?.focus()};const list=$('#productlist');state.products.forEach((pr,i)=>{if(productCategory&&pr.category!==productCategory)return;const card=document.createElement('div');card.className='card-admin';card.innerHTML=`<strong>${e(pr.name)}</strong><div class="hint">${RA.money(pr.price)}</div><details ${openProducts.has(pr.id) ? 'open' : ''}><summary style="cursor:pointer;font-size:12px;margin-top:9px">Editar detalhes</summary><div class="field"><label>Nome</label><input data-k="name" value="${e(pr.name)}"></div><div class="field"><label>Preço (R$)</label><input type="number" step="0.01" min="0" data-k="price" value="${e(pr.price)}"></div><div class="field"><label>Cor do produto</label><input data-k="color" value="${e(pr.color||'')}" placeholder="Ex.: preto, branco, azul"></div><div class="field"><label>Categoria</label><input data-k="category" value="${e(pr.category)}"></div><div class="field"><label>Tamanhos separados por vírgula</label><input data-k="sizes" value="${e(pr.sizes)}"></div><div class="field"><label>Imagem (URL ou anexo)</label><input data-k="image" value="${e(pr.image)}"></div>${imageUpload}${moveControls('Mover foto','image',pr)}${moveControls('Mover texto','text',pr)}<label style="font-size:12px"><input type="checkbox" data-k="active" ${pr.active!==false?'checked':''}> Exibir na loja</label><button class="mutedbtn delprod" style="width:100%;margin-top:8px">Excluir produto</button></details>`;card.querySelectorAll('[data-k]').forEach(el=>el.addEventListener('change',()=>{pr[el.dataset.k]=el.type==='checkbox'?el.checked:el.type==='number'?Number(el.value):el.value;dirty();refresh()}));card.querySelector('.delprod').onclick=()=>{if(!confirm('Excluir o produto?'))return;state.products.splice(i,1);dirty();refresh()};list.appendChild(card);bindImage(card,pr);bindMoves(card,pr);renderVariants(card,pr);card.querySelector('details').ontoggle=ev=>{if(ev.target.open)openProducts.add(pr.id);else openProducts.delete(pr.id)}})}
if(tab==='aparencia'){root.innerHTML=`<h3>Aparência</h3><p class="hint">Altere as cores da loja inteira e veja a prévia.</p>`+field('Cor principal','primary',state.theme.primary,'color')+field('Cor dos títulos','dark',state.theme.dark,'color')+field('Cor de fundo','surface',state.theme.surface,'color');bindFields(state.theme)}
if(tab==='config'){root.innerHTML=`<h3>Configurações da loja</h3>`+field('Nome da loja','brand',state.brand)+field('WhatsApp (com DDI 55)','whatsapp',state.whatsapp)+field('Instagram','instagram',state.instagram)+field('Aviso da vitrine','notice',state.notice,'textarea')+`<h3>Textos da vitrine</h3>`+Object.entries(copyLabels).map(([key,label])=>field(label,'copy.'+key,RA.copyText(state,key))).join('')+`<p class="hint">Pagamentos reais não estão ativos. O checkout Mercado Pago exige integração adicional e verificação do pedido no servidor.</p>`;bindFields(state)}
if(tab==='ia'){root.innerHTML=`<h3>Editar com IA ✨</h3><p class="hint">Descreva o que deseja alterar. A IA propõe uma nova versão que você poderá revisar antes de aplicar.</p><div class="ai-box"><textarea id="aiprompt" placeholder="Ex.: coloque a loja com cores azul e branco e mude o título principal para Ofertas especiais..."></textarea><button id="askAI" class="btn">Gerar sugestão com IA</button><p class="hint">Requer OPENAI_API_KEY na Netlify. Pode gerar custo de API.</p><div id="airesponse"></div></div>`;$('#askAI').onclick=async()=>{const prompt=$('#aiprompt').value;const out=$('#airesponse');out.innerHTML='<p class="hint">Consultando IA...</p>';try{aiProposal=await api('ai',{prompt});out.innerHTML=`<div class="ai-result"><strong>Proposta de mudança</strong><p>${e(aiProposal.resumo)}</p><button class="btn" id="applyAI">Aplicar na prévia</button><p class="hint">Depois, clique em “Publicar alterações”.</p></div>`;$('#applyAI').onclick=()=>{state=aiProposal.site;dirty();selected=null;tab='pagina';setActiveTab();refresh()}}catch(err){out.innerHTML=`<p class="hint">${e(err.message)}</p>`}}}
}
function renderVariants(card, product) {
  const details = card.querySelector('details');
  const area = document.createElement('div');
  area.innerHTML = '<h4>Cores do mesmo modelo</h4><button type="button" class="btn outline small" data-add-color>+ Adicionar cor</button>';
  details.appendChild(area);
  area.querySelector('[data-add-color]').onclick = () => {
    product.variants ??= [];
    product.variants.push({id:uid(),color:'Nova cor',image:'',price:product.price,sizes:product.sizes});
    openProducts.add(product.id);
    dirty(); refresh();
  };
  (product.variants || []).forEach(variant => {
    const item = document.createElement('div');
    item.className = 'card-admin';
    item.innerHTML = `<label>Nome da cor<input data-variant="color" value="${e(variant.color)}"></label>
      <label>Preço desta cor (R$)<input type="number" min="0" step="0.01" data-variant="price" value="${e(variant.price ?? product.price)}"></label>
      <label>Tamanhos desta cor<input data-variant="sizes" value="${e(variant.sizes ?? product.sizes)}"></label>
      <label>Foto desta cor (URL)<input data-variant="image" value="${e(variant.image||'')}"></label>
      ${imageUpload}<button type="button" class="mutedbtn" data-remove-color>Remover cor</button>`;
    item.querySelectorAll('[data-variant]').forEach(input => input.onchange = () => {
      variant[input.dataset.variant] = input.type === 'number' ? Math.max(0,Number(input.value)||0) : input.value;
      dirty(); refresh(false);
    });
    item.querySelector('[data-remove-color]').onclick = () => {
      if (!confirm('Remover esta cor do modelo?')) return;
      product.variants = product.variants.filter(value=>value!==variant);
      dirty(); refresh();
    };
    area.appendChild(item);
    bindImage(item,variant);
  });
}
function setActiveTab(){document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('on',b.dataset.tab===tab))}
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;selected=null;setActiveTab();refresh()});
$('#pageSelect').onchange=ev=>{pageId=ev.target.value;selected=null;refresh()};
$('#desktop').onclick=()=>$('#preview').classList.remove('mobile');$('#mobile').onclick=()=>$('#preview').classList.add('mobile');
$('#save').onclick=async()=>{notice('Publicando alterações...');try{const d=await api('save',{site:state});state.updatedAt=d.updatedAt;modified=false;notice('Alterações publicadas com sucesso! Abra a loja em outra aba.')}catch(err){notice('Falha: '+err.message)}};
$('#download').onclick=()=>{if(!state)return;const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='backup-ra-calcados-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
window.addEventListener('beforeunload',ev=>{if(modified){ev.preventDefault();ev.returnValue=''}});
start().catch(err=>{console.error(err);$('#login').style.display='grid';$('#loginstatus').textContent='Falha ao iniciar o painel: '+err.message});

})();
