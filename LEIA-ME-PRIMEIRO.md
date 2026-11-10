# RA CALÇADOS — Loja e Studio em português brasileiro

## O que foi feito

- Site público na rota `/` com vitrine, páginas e produtos de exemplo.
- Painel `/admin.html` com login por senha, edição visual clicando nas seções, criação/exclusão de páginas e blocos, edição de fotos via URL, catálogo, cores, backup e prévia celular.
- Comando de IA dentro do painel, usando OpenAI **somente no servidor**; alterações propostas precisam de aprovação e publicação.
- Netlify Functions para autenticação, leitura e gravação de conteúdo; armazenamento no Netlify Blobs, que persiste entre deploys.
- Idioma pt-BR, preços em R$, contato (16) 99462-3076.

## Antes de publicar

**Não exponha `/admin.html` ao público sem configurar credenciais.** O login só funciona com variáveis definidas abaixo. A página do painel pode ser acessada, mas os dados e alterações requerem sessão autenticada.

## Publicar no MESMO projeto da Netlify

Atenção: **o Netlify Drop (arrastar ZIP/pasta) não é o processo recomendado para este projeto**, porque ele contém funções serverless e dependências para backend. Utilize um repositório GitHub conectado à Netlify ou Netlify CLI com `netlify deploy --build --prod`.

### Método GitHub, mais acessível

1. Entre em https://github.com e crie um repositório **privado**, por exemplo `ra-calcados-site`.
2. Extraia este ZIP. Envie o **conteúdo da pasta `RA_CALCADOS_NETLIFY_BR`** (não apenas `public/`) à raiz do repositório, incluindo `netlify.toml`, `package.json`, `netlify/functions`, `public`.
3. Abra https://app.netlify.com e selecione o projeto atual `rad-medovik-4b9168`.
4. Em configuração de implantação, conecte o repositório GitHub ao **projeto existente**, sem criar um novo, e confirme: build command `echo Preparando RA CALÇADOS`; publish directory `public`; functions directory `netlify/functions`.
5. Vá a **Project configuration → Environment variables** e cadastre separadamente:
   - `ADMIN_PASSWORD` = uma senha longa e exclusiva, criada por você.
   - `SESSION_SECRET` = uma sequência aleatória com pelo menos 32 caracteres (prefira 64). **Não use a senha como segredo.**
   - `OPENAI_API_KEY` = sua chave privada da OpenAI (opcional, somente se quiser usar IA online; use sua própria conta API).
   - `OPENAI_MODEL` = `gpt-4.1-mini` (opcional).
6. Faça novo deploy pelo GitHub. Teste `https://rad-medovik-4b9168.netlify.app/` e `https://rad-medovik-4b9168.netlify.app/admin.html`.
7. Entre em `/admin.html`, edite, clique em **Publicar alterações** e abra a página pública.

**Nunca cole senha, chave de API ou token Mercado Pago em conversas, arquivos públicos, HTML, GitHub ou `netlify.toml`.** No painel Netlify, marque variáveis como secretas quando possível e use escopo Functions.

## Teste local para desenvolvedores

Com Node.js e Netlify CLI instalados: `npm install`, `npx netlify dev`. Crie as variáveis no ambiente local seguro, não em arquivos enviados ao GitHub.

## Limitações e próximos passos

- **Não há checkout real ativo.** Os botões de compra consultam o WhatsApp. Não solicite cartão ou PIX diretamente pelo site até criar checkout Mercado Pago com preço validado no servidor, pedidos e confirmação por webhook.
- Os preços e as fotos incluídos são **demonstração**. Não publique ofertas reais até substituir todos os itens por produtos, imagens autorizadas, preços e tamanhos verdadeiros.
- A IA altera o conteúdo estruturado da loja, não o código do backend, autenticação, pagamento ou toda a infraestrutura. Não é uma reprodução completa da Hostinger.
- A inserção de imagens é por URLs HTTPS, não por upload direto. Para gestão de imagens de clientes, integrar upload autenticado.
- O login tem proteção de sessão assinada, mas **não oferece recuperação de senha, múltiplos usuários, limitação de tentativas por IP, trilha de auditoria nem MFA**. Para loja em produção com equipe, adote autenticação gerenciada e rate limiting.
- Netlify Blobs é adequado ao conteúdo deste projeto; não o use como banco de pedidos transacionais. Alterações simultâneas no mesmo projeto podem sobrescrever a versão anterior.
- Antes de usar em produção, implemente páginas de política de privacidade, troca/devolução, informações de frete e identificação do vendedor.

## Dúvidas

- O site que os clientes veem é a raiz `/`.
- O editor é `/admin.html`.
- Informações salvas no Blobs persistem depois de atualizar o código e não exigem novo deploy a cada mudança editorial.
