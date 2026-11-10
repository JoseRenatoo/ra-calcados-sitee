import { getStore } from '@netlify/blobs';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { defaults } from './defaults.mjs';
const cookieName='ra_admin';
function json(v,status=200,headers={}){return new Response(JSON.stringify(v),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers}})}
function auth(req){const secret=process.env.SESSION_SECRET;if(!secret)return false; const raw=(req.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(cookieName+'='))?.slice(cookieName.length+1);if(!raw)return false;const [body,sig]=raw.split('.');if(!body||!sig)return false;const expected=createHmac('sha256',secret).update(body).digest('hex');const a=Buffer.from(sig,'hex'),b=Buffer.from(expected,'hex');if(a.length!==b.length||!timingSafeEqual(a,b))return false;try{const data=JSON.parse(Buffer.from(body,'base64url').toString());return data.role==='admin'&&data.exp>Date.now()}catch{return false}}
function sameOrigin(req){try{return new URL(req.headers.get('origin')).origin===new URL(req.url).origin}catch{return false}}
function validState(v){if(!v||typeof v!=='object'||!Array.isArray(v.pages)||!Array.isArray(v.products)||v.pages.length>30||v.products.length>300)return false;const str=JSON.stringify(v);return str.length<550000&&v.pages.every(p=>typeof p.id==='string'&&typeof p.name==='string'&&Array.isArray(p.sections)&&p.sections.length<100)&&v.products.every(p=>typeof p.id==='string'&&typeof p.name==='string'&&Number.isFinite(Number(p.price))&&Number(p.price)>=0)}
async function site(){const store=getStore('ra-calcados-editor-site');return await store.get('site',{type:'json'})||structuredClone(defaults)}
function safeModelState(current){return {brand:current.brand,theme:current.theme,pages:current.pages,products:current.products,notice:current.notice}}
const maxImageBytes = 4 * 1024 * 1024;
const imageTypes = {jpg:'image/jpeg',png:'image/png',gif:'image/gif',webp:'image/webp'};

function imageExtension(bytes) {
  if (bytes.length < 12) return null;
  if (bytes.subarray(0, 3).toString('hex') === 'ffd8ff') return 'jpg';
  if (bytes.subarray(0, 8).toString('hex') === '89504e470d0a1a0a') return 'png';
  if (['GIF87a','GIF89a'].includes(bytes.toString('ascii',0,6))) return 'gif';
  if (bytes.toString('ascii',0,4)==='RIFF' && bytes.toString('ascii',8,12)==='WEBP') return 'webp';
  return null;
}

async function uploadImage(req) {
  if (!auth(req)) return json({erro:'Entre com sua senha de administrador.'},401);
  if (Number(req.headers.get('content-length')) > maxImageBytes) return json({erro:'Imagem acima de 4 MB.'},413);
  const bytes = Buffer.from(await req.arrayBuffer());
  if (bytes.length > maxImageBytes) return json({erro:'Imagem acima de 4 MB.'},413);
  const extension = imageExtension(bytes);
  if (!extension) return json({erro:'Use uma imagem JPG, PNG, WebP ou GIF.'},415);
  const key = createHash('sha256').update(bytes).digest('hex')+'.'+extension;
  await getStore({name:'ra-calcados-images',consistency:'strong'}).set(key,bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
  return json({url:'/api?action=image&id='+key});
}

async function readImage(key) {
  if (!/^[a-f0-9]{64}\.(jpg|png|gif|webp)$/.test(key || '')) return new Response(null,{status:404});
  const bytes = await getStore({name:'ra-calcados-images',consistency:'strong'}).get(key,{type:'arrayBuffer'});
  if (!bytes) return new Response(null,{status:404});
  return new Response(bytes,{headers:{
    'Content-Type':imageTypes[key.split('.').pop()],
    'X-Content-Type-Options':'nosniff',
    'Cache-Control':'public, max-age=31536000, immutable'
  }});
}

export default async function handler(req){
  const url=new URL(req.url),action=url.searchParams.get('action')||'site';
  try {
    if(req.method==='GET'&&action==='image')return await readImage(url.searchParams.get('id'));
    if(req.method==='GET'&&action==='site')return json(await site());
    if(req.method==='GET'&&action==='session')return json({loggedIn:auth(req),aiConfigured:!!process.env.OPENAI_API_KEY});
    if(req.method!=='POST')return json({erro:'Método não permitido.'},405);
    if(!sameOrigin(req))return json({erro:'Origem inválida.'},403);
    if(action==='upload-image')return await uploadImage(req);
    const input=await req.json().catch(()=>({}));
    if(action==='login'){
      const pass=process.env.ADMIN_PASSWORD,secret=process.env.SESSION_SECRET;
      if(!pass||!secret)return json({erro:'Configure ADMIN_PASSWORD e SESSION_SECRET na Netlify.'},503);
      const a=Buffer.from(String(input.password||'')),b=Buffer.from(pass);
      if(a.length!==b.length||!timingSafeEqual(a,b))return json({erro:'Senha incorreta.'},401);
      const token=Buffer.from(JSON.stringify({role:'admin',exp:Date.now()+8*3600e3,n:randomBytes(8).toString('hex')})).toString('base64url');
      const sig=createHmac('sha256',secret).update(token).digest('hex');
      return json({ok:true},200,{'Set-Cookie':`${cookieName}=${token}.${sig}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800`});
    }
    if(action==='logout')return json({ok:true},200,{'Set-Cookie':`${cookieName}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`});
    if(!auth(req))return json({erro:'Entre com sua senha de administrador.'},401);
    if(action==='save'){
      const next=input.site;
      if(!validState(next))return json({erro:'Dados inválidos ou projeto muito grande.'},400);
      const clean={brand:String(next.brand||'RA CALÇADOS').slice(0,80),whatsapp:String(next.whatsapp||'5516994623076').replace(/\D/g,'').slice(0,15),instagram:String(next.instagram||'').slice(0,100),theme:next.theme||defaults.theme,copy:Object.fromEntries(Object.entries(next.copy||{}).filter(([,value])=>typeof value==='string').map(([key,value])=>[key,value.slice(0,500)])),pages:next.pages,products:next.products,notice:String(next.notice||'').slice(0,500),updatedAt:new Date().toISOString()};
      await getStore('ra-calcados-editor-site').setJSON('site',clean);
      return json({ok:true,updatedAt:clean.updatedAt});
    }
    if(action==='ai'){
      if(!process.env.OPENAI_API_KEY)return json({erro:'Adicione OPENAI_API_KEY nas variáveis da Netlify para ativar a IA.'},503);
      const prompt=String(input.prompt||'').slice(0,1200);if(prompt.length<4)return json({erro:'Descreva a alteração desejada.'},400);
      const current=await site();
      const response=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{'Authorization':`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_MODEL||'gpt-4.1-mini',temperature:0.2,response_format:{type:'json_object'},messages:[{role:'system',content:'Você é um editor de site para a loja brasileira RA CALÇADOS. Responda SOMENTE JSON com objeto {"resumo":"texto curto","site":{...}}. Edite o JSON do site conforme pedido, preservando TODAS as propriedades de estado (brand,whatsapp,instagram,theme,pages,products,notice). Tipos de seção permitidos: hero,benefits,products,banner,text. Não invente estoque, preços ou descontos, a menos que o usuário solicite explicitamente; não altere whatsapp sem pedido. Não inclua HTML/scripts. Mantenha pt-BR. Nunca altere autenticação, servidores, checkout ou meios de pagamento.'},{role:'user',content:JSON.stringify({pedido:prompt,site:safeModelState(current),whatsapp:current.whatsapp,instagram:current.instagram})}]})});
      const data=await response.json();if(!response.ok)return json({erro:'Falha ao consultar IA. Confira a chave e os créditos da API.'},502);
      const result=JSON.parse(data.choices?.[0]?.message?.content||'{}');
      if(!validState(result.site))return json({erro:'A IA não retornou um projeto válido. Tente outro pedido.'},422);
      const candidate={...current,...result.site,whatsapp:current.whatsapp,instagram:current.instagram};
      return json({resumo:String(result.resumo||'Alteração sugerida.'),site:candidate});
    }
    return json({erro:'Ação desconhecida.'},404);
  } catch(e){console.error(e);return json({erro:'Erro no servidor. Verifique o painel de logs da Netlify.'},500)}
}
