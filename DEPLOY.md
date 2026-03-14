# Guia de Deploy — Pluggy Pagamentos Demo

## O que você vai fazer
Subir um projeto no Vercel (gratuito) que serve como:
- Frontend da demo (tablet)
- Proxy para a API da Pluggy (guarda as chaves seguras no servidor)

Tempo estimado: **10 minutos**

---

## Pré-requisitos
- Conta no GitHub (gratuita) → github.com
- Conta no Vercel (gratuita) → vercel.com
- Suas chaves da Pluggy: `clientId` e `clientSecret`

---

## Passo 1 — Subir o projeto no GitHub

1. Acesse **github.com** → clique em **"New repository"**
2. Nome: `pluggy-demo` → clique em **"Create repository"**
3. Na próxima tela, clique em **"uploading an existing file"**
4. Arraste a pasta `pluggy-demo` completa (todos os arquivos)
5. Clique em **"Commit changes"**

Estrutura que deve aparecer no GitHub:
```
pluggy-demo/
├── api/
│   └── proxy.js
├── public/
│   └── index.html
├── package.json
└── vercel.json
```

---

## Passo 2 — Conectar ao Vercel

1. Acesse **vercel.com** → faça login com sua conta GitHub
2. Clique em **"Add New Project"**
3. Selecione o repositório `pluggy-demo`
4. Clique em **"Import"**
5. Em **"Framework Preset"** → deixe como **"Other"**
6. Em **"Root Directory"** → deixe em branco (raiz do projeto)
7. **NÃO clique em Deploy ainda** — precisa configurar as variáveis primeiro

---

## Passo 3 — Configurar as variáveis de ambiente

Na mesma tela de configuração do Vercel, em **"Environment Variables"**:

| Nome | Valor |
|------|-------|
| `PLUGGY_CLIENT_ID` | seu clientId da Pluggy |
| `PLUGGY_CLIENT_SECRET` | seu clientSecret da Pluggy |

Clique em **"Add"** para cada variável.

**⚠️ IMPORTANTE:** Essas variáveis NUNCA aparecem no código do tablet. Ficam 100% seguras no servidor Vercel.

---

## Passo 4 — Deploy

1. Clique em **"Deploy"**
2. Aguarde ~1 minuto
3. O Vercel vai gerar uma URL tipo: `pluggy-demo-abc123.vercel.app`

Acesse essa URL no tablet para confirmar que está funcionando.

---

## Passo 5 — Salvar na tela inicial do tablet

1. No tablet Android, abra o **Chrome**
2. Acesse a URL do Vercel
3. Menu ⋮ → **"Adicionar à tela inicial"**
4. Dê o nome "Pluggy Demo" → confirme
5. Agora aparece como ícone de app na tela inicial

---

## Passo 6 — Setup antes do evento

1. Abra o app → aba **⚙️ Configuração**
2. Verifique que o status da API está **"✅ Autenticado"** (canto superior)
3. Crie 2-3 recebedores (sua conta da Pluggy ou contas de teste)
4. Teste um Pix Simples com R$ 0,01 para confirmar o fluxo completo

---

## Solução de problemas

| Problema | Causa provável | Solução |
|----------|---------------|---------|
| "Falha na autenticação" | Variáveis de ambiente erradas | Vercel → Settings → Environment Variables → verificar |
| QR code não aparece | JavaScript bloqueado | Usar Chrome, não modo incógnito |
| "Erro de rede" | Vercel offline | Verificar status.vercel.com |
| Recebedor não salva | Dados inválidos ou institucão errada | Verificar CNPJ e dados bancários |

---

## Atualizar o projeto

Se precisar atualizar o código:
1. Edite o arquivo no GitHub
2. O Vercel atualiza automaticamente em ~1 minuto

---

## Reset para nova demo

- **Auto-reset:** 90 segundos de inatividade zera a tela atual
- **Reset manual oculto:** toque no canto superior direito 
- **Limpar tudo:** aba Configuração → botão "Apagar recebedores e histórico"
