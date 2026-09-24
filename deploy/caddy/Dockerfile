# Caddy con il modulo DNS di DuckDNS: serve per ottenere il certificato Let's Encrypt con la
# challenge DNS-01, senza aprire la porta 80 (sul Pi è occupata dal gateway di CasaOS).
# Costruita da noi e non presa da un'immagine di terzi: il container tiene il token DuckDNS.
FROM caddy:2-builder AS builder
RUN xcaddy build --with github.com/caddy-dns/duckdns

FROM caddy:2
COPY --from=builder /usr/bin/caddy /usr/bin/caddy
COPY Caddyfile /etc/caddy/Caddyfile
