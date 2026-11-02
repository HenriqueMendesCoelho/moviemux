# Variáveis de ambiente do frontend Nuxt

Esta lista corresponde ao frontend da branch `refactor/nuxt-migration`, não ao Quasar antigo nem às configurações privadas do Java/gateway. Modelo sem segredos: [`.env.production.example`](../.env.production.example). Os nomes de serviços internos do modelo são exemplos, não uma infraestrutura criada. O link histórico do projeto é `www.moviemux.com`; confirme o domínio implantado e o permitido no widget existente.

## Obrigatórias para todas as funcionalidades

| Variável | Visibilidade | Valor/formato |
| --- | --- | --- |
| `NUXT_API_UPSTREAM` | Somente servidor | URL interna do gateway **incluindo `/api`**, por exemplo `http://gateway:8080/api`. Sem credenciais na URL, query ou fragmento. O BFF acrescenta `/login`, `/public/...` etc. |
| `NUXT_SOCKET_UPSTREAM` | Somente servidor | Origem HTTP(S) interna do serviço Socket.IO, por exemplo `http://events:3334`. **Sem `/ws`, namespace ou `/api`**: o bridge acrescenta namespaces e usa o transporte `/ws`. Não é a porta REST de eventos 3333. |
| `NUXT_TRUSTED_ORIGINS` | Somente servidor | Origens exatas do navegador separadas por vírgula, como `https://www.moviemux.com`. Inclua protocolo e porta se não padrão; sem caminho, barra final, wildcard ou inferência de Host/X-Forwarded-Host. |
| `NUXT_APP_SECRET` | **Segredo do servidor** | Aleatório, pelo menos 32 caracteres. Gere, por exemplo, com `openssl rand -base64 32`, e armazene no secret manager. Mantenha estável entre reinícios; trocar o segredo invalida sessões. |
| `NUXT_TURNSTILE_SECRET` | **Segredo do servidor** | Secret key do widget já existente. Não é a sitekey e não deve ir para chat, Git ou variável `NUXT_PUBLIC_*`. |
| `NUXT_TURNSTILE_HOSTNAMES` | Somente servidor | Hostnames exatos permitidos para o frontend, separados por vírgula, como `www.moviemux.com`. **Sem protocolo, porta ou caminho**. Devem corresponder à resposta Siteverify e às configurações reais do widget. Não inclua localhost em produção. |

As URLs internas não precisam ser públicas. Só o Nuxt precisa receber o navegador em `/api` e `/ws`. Gateway, monolito e serviços de eventos devem permanecer acessíveis aos seus chamadores internos. O proxy público precisa encaminhar HTTP, polling e upgrade WebSocket para o Nuxt. HTTPS público é necessário para cookies Secure. O servidor Nuxt também precisa de saída HTTPS para `challenges.cloudflare.com`; o navegador precisa carregar o script/frame oficial e as imagens públicas.

## Configuradas por padrão; ajuste somente se necessário

| Variável | Padrão | Observação |
| --- | --- | --- |
| `NUXT_PUBLIC_TURNSTILE_ENABLED` | `true` | Proteção falha fechada sem secret/hostnames. `false` só é aceito com origens explicitamente loopback, para testes isolados. Não use em produção. |
| `NUXT_PUBLIC_TURNSTILE_SITE_KEY` | `0x4AAAAAAFwyH9xyrHzMmwps` | Pública; já vem definida. Use apenas a sitekey correspondente ao secret do widget. Chaves oficiais de teste são recusadas em configuração não loopback. |
| `NUXT_PUBLIC_TMDB_IMAGE_BASE` | `https://image.tmdb.org/t/p` | CDN pública **sem tamanho** (`w500`, `original` etc.). O frontend escolhe tamanhos responsivos. Não é uma chave da API TMDB. |
| `NODE_ENV` | `production` no Docker/build de produção | O Docker já define. Não rode o artefato de produção como desenvolvimento para contornar guardas. |
| `NITRO_PORT` | `3000` | Porta de escuta do Nuxt. Tem prioridade sobre `PORT`; o Docker já define `PORT=3000`. |
| `NITRO_HOST` | Depende do runtime; Docker usa `HOST=0.0.0.0` | Defina `0.0.0.0` em container, `127.0.0.1` em testes locais. Tem prioridade sobre `HOST`. |

`PORT` e `HOST` são os aliases aceitos pelo servidor Nitro; não é necessário definir os dois pares. O Docker expõe 3000, mas a publicação/ingress dessa porta é responsabilidade do operador.

## Sessão: defaults seguros e overrides avançados

Não é necessário fornecer estas variáveis. Os defaults do projeto são:

- `NUXT_SESSION_NAME=moviemux-session` — nome do cookie; mudar encerra o acesso aos cookies antigos. Não use o nome reservado `nuxt-session`.
- `NUXT_SESSION_MAX_AGE=3600` — default do módulo; no login este app calcula a duração a partir da expiração absoluta do JWT. Não prolonga o token upstream.
- `NUXT_SESSION_COOKIE_SECURE=true` em produção — `false` é permitido apenas em smoke tests HTTP com todas as origens configuradas loopback.
- `NUXT_SESSION_COOKIE_HTTP_ONLY=true` — mantenha; desativar quebraria o requisito de segurança.
- `NUXT_SESSION_COOKIE_SAME_SITE=lax` — mantenha para este fluxo same-origin.
- `NUXT_SESSION_COOKIE_PATH=/` — mantenha para API, sessão e sockets da aplicação.

O módulo instalado é `nuxt-auth-utils 0.6.0`: **`NUXT_SESSION_PASSWORD` é legado e não é usado**; o segredo correto é `NUXT_APP_SECRET`. Cookies selados e revogação local não substituem armazenamento compartilhado: múltiplas réplicas precisam de decisão explícita sobre sessões/revogação e afinidade de polling. Reiniciar o processo perde a lista local de gerações revogadas.

## Build, runtime e arquivos `.env`

- As variáveis `NUXT_*` acima são configuração **de runtime** do artefato Nitro. Não é necessário embutir segredos durante `pnpm build` ou no Dockerfile.
- O Dockerfile copia fontes explicitamente e define apenas `NODE_ENV`, `HOST` e `PORT`. Injete as demais variáveis na execução, pelo painel/secret manager/orquestrador.
- `node .output/server/index.mjs` **não carrega automaticamente um arquivo `.env`**. Use o ambiente do processo ou, para um arquivo local protegido e ignorado, Node 26 `node --env-file=.env.local .output/server/index.mjs`. No desenvolvimento: `pnpm dev --dotenv .env.local`.
- Não sobrescreva o `.env` histórico rastreado do projeto com segredos. `.env.local*` é ignorado pelo Git; confirme `git check-ignore .env.local` antes de salvar qualquer valor. Os modelos `.example` têm valores vazios/placeholders, nunca segredos reais.
- `TMDB_IMAGE_BASE` é somente um fallback **de build** lido em `nuxt.config.ts`; prefira `NUXT_PUBLIC_TMDB_IMAGE_BASE` no runtime.
- `NUXT_PUBLIC_API_URL` e `NUXT_PUBLIC_SOCKET_URL` correspondem a campos legados de compatibilidade (`/api` e vazio), mas os clientes HTTP/Socket.IO atuais usam os caminhos same-origin fixos. Não os use para conectar diretamente ao gateway.
- `VUE_APP_KB_CINE_API`, `VUE_APP_KB_CINE_SOCKET`, `VUE_APP_TMDB_IMAGE_BASE` e `MOVIEMUX_DEV_API_ORIGIN` não configuram o novo BFF. Chaves de TMDB/KIT/Discord/email/banco continuam nos serviços backend, não são envs necessárias do frontend.
- A aplicação foi validada na raiz `/`. Não altere `NUXT_APP_BASE_URL`/asset base/CDN de build para uma subpasta sem validação específica de rotas, PWA e `/ws`.

Nitro também oferece opções operacionais avançadas (`NITRO_UNIX_SOCKET`, `NITRO_SSL_CERT`, `NITRO_SSL_KEY`, `NITRO_SHUTDOWN_TIMEOUT`, `NITRO_SHUTDOWN_SIGNALS`, `NITRO_SHUTDOWN_DISABLED`, `NITRO_SHUTDOWN_NO_FORCE_EXIT`), mas nenhuma é necessária na topologia recomendada com TLS no proxy. Certificado/chave, se usados, são valores PEM privados do servidor; não os publique. Mantenha shutdown gracioso para encerrar os bridges.

## Antes de liberar produção

1. Configure URLs internas, origem pública, segredo de sessão e segredo/hostnames do widget no ambiente do servidor.
2. Mantenha o widget existente; não crie outro nem acrescente hosts locais ao widget de produção.
3. Migre o frontend antes de fechar os endpoints dos quais a versão Quasar ainda depende. Depois, impeça acesso público direto ao gateway/monolito/eventos para não permitir bypass da verificação no BFF.
4. Valide um token real novo no destino e confirme rejeição de replay. Testes automatizados e widget oficial de teste não provam as configurações privadas do widget real.
5. Verifique HTTPS, cookies, login, recuperação, cadastro, sockets e PWA no domínio final. Nenhuma implantação ou alteração de rede foi realizada neste trabalho.

Fontes no projeto: [`nuxt.config.ts`](../nuxt.config.ts), [`session-policy.ts`](../src/server/plugins/session-policy.ts), [`turnstile.ts`](../src/server/utils/turnstile.ts), [`socket-bridge.ts`](../src/server/plugins/socket-bridge.ts), [`Dockerfile`](../Dockerfile). Referências: [Siteverify](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/) e [hostname management](https://developers.cloudflare.com/turnstile/additional-configuration/hostname-management/).
