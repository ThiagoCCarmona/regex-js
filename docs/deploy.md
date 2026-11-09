# Deploy em regex-js.tccodes.com.br

O container escuta HTTP na porta 3000 e serve tudo: o site, o `/health` e o WebSocket `/ws` da Regex Arena. Na frente dele vai um proxy reverso com HTTPS.

## 1. Subir o container no servidor

```bash
git clone https://github.com/ThiagoCCarmona/regex-js.git
cd regex-js
HOST_PORT=3000 docker compose up -d --build
curl -s http://127.0.0.1:3000/health   # {"ok":true}
```

Para atualizar depois:

```bash
git pull && docker compose up -d --build
```

> Se o proxy roda no mesmo host, prefira publicar a porta só em loopback, trocando em `docker-compose.yml` a linha `ports` por `"127.0.0.1:3000:3000"`.

## 2. DNS

Crie um registro `A` (ou `CNAME`) para `regex-js.tccodes.com.br` apontando para o servidor.

## 3. Traefik (usado em produção)

Se o servidor já tem um Traefik com uma rede Docker externa (aqui chamada `proxy`), entrypoint `websecure` e um resolver ACME (`myresolver`), use o compose próprio. Ele não publica portas no host: o Traefik encaminha o tráfego pela rede `proxy`.

```bash
git clone https://github.com/ThiagoCCarmona/regex-js.git
cd regex-js
docker compose -f docker-compose.traefik.yml up -d --build
```

Para atualizar depois:

```bash
git pull && docker compose -f docker-compose.traefik.yml up -d --build
```

O Traefik repassa o WebSocket da Arena (`/ws`) sem configuração extra. Para outro domínio, rede ou resolver, crie um `.env` ao lado do compose com `DOMINIO=...`, `REDE_TRAEFIK=...` ou `CERTRESOLVER=...`.

O certificado é emitido pelo desafio TLS-ALPN, que exige o registro DNS já apontando para o servidor. Se o container subiu antes do DNS, recrie-o depois que o DNS propagar (`docker compose -f docker-compose.traefik.yml up -d --force-recreate`) para o Traefik tentar de novo.

## 3a. Caddy (HTTPS automático)

```caddy
regex-js.tccodes.com.br {
    encode zstd gzip
    reverse_proxy 127.0.0.1:3000
}
```

O Caddy já repassa o upgrade de WebSocket sem configuração extra.

## 3b. nginx

```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

server {
    listen 80;
    server_name regex-js.tccodes.com.br;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name regex-js.tccodes.com.br;

    ssl_certificate     /etc/letsencrypt/live/regex-js.tccodes.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/regex-js.tccodes.com.br/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket da Regex Arena
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_read_timeout 3600s;
    }
}
```

Para o certificado: `certbot --nginx -d regex-js.tccodes.com.br`.

## 4. Conferir

- `https://regex-js.tccodes.com.br/health` responde `{"ok":true}`.
- Abra `/arena/telao` no computador e `/arena` no celular. O PIN do telão deve funcionar no celular; se a conexão não fechar, falta o upgrade de WebSocket no proxy.

## Observações

- As salas da Arena ficam **em memória**: reiniciar o container encerra as salas abertas. Isso é intencional, porque elas só existem durante a aula.
- Uma única instância comporta folgadamente uma turma de 40 a 60 celulares. Não rode várias réplicas atrás de balanceador: as salas não são compartilhadas entre instâncias.
- A URL do QR code dos slides vem do build arg `VITE_PUBLIC_URL`, cujo padrão é `https://regex-js.tccodes.com.br`. O QR code da Arena usa o endereço em que o telão foi aberto.
