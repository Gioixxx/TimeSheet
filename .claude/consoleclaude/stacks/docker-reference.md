# Docker (Reference)

> **Revisione doc:** 2026-10

> Contiene Dockerfile d'esempio per Node, .NET e Python, un `compose.yaml` con app, database e reti separate, come passare i segreti in build e a runtime, la scansione delle immagini e una checklist prima di pubblicare. Le regole brevi stanno nel modulo base.

## Dockerfile d'esempio

Gli esempi usano tag di esempio: in un progetto vero si sceglie il tag preciso della versione che si usa e lo si aggiorna di proposito.

### Node (applicazione web)

```dockerfile
# Stadio 1: dipendenze e build
FROM node:<versione>-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

# Stadio 2: solo ciò che serve a girare
FROM node:<versione>-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/main.js"]
```

I file restano di `root` (niente `--chown`): l'utente `node` li legge e li esegue ma non può modificarli; se l'app deve scrivere, ha una cartella sua (un volume o un `tmpfs`). `npm ci` (non `npm install`) rispetta il lockfile. Il controllo di salute usa il runtime dell'immagine: niente `curl` da installare.

### .NET (API)

```dockerfile
FROM mcr.microsoft.com/dotnet/sdk:<versione> AS build
WORKDIR /src
COPY *.sln ./
COPY src/Api/Api.csproj src/Api/
RUN dotnet restore
COPY . .
RUN dotnet publish src/Api/Api.csproj -c Release -o /out --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:<versione>
WORKDIR /app
COPY --from=build /out ./
ENV ASPNETCORE_URLS=http://+:8080
USER $APP_UID
EXPOSE 8080
ENTRYPOINT ["dotnet", "Api.dll"]
```

Le immagini ufficiali recenti portano l'utente non root già definito (`APP_UID`). La sonda di salute si mette in Compose o nell'orchestratore, perché l'immagine finale non ha `curl`.

### Python (FastAPI)

```dockerfile
FROM python:<versione>-slim AS build
WORKDIR /app
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

FROM python:<versione>-slim
ENV PATH="/opt/venv/bin:$PATH" PYTHONUNBUFFERED=1
WORKDIR /app
COPY --from=build /opt/venv /opt/venv
COPY app ./app
RUN useradd --system --uid 10001 appuser
USER appuser
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Le dipendenze con un hash (`pip install --require-hashes`) o un lockfile rendono la build ripetibile.

## `.dockerignore` di partenza

```text
.git
.gitignore
node_modules
bin
obj
__pycache__
.venv
venv
secrets
*.log
.env
.env.*
dist
coverage
Dockerfile
compose.yaml
```

Se la build copia `dist` dal contesto, togli `dist` dalla lista: con un build multi-stage di solito non serve.

## Compose: app, database e reti

```yaml
services:
  app:
    build: .
    ports:
      - "127.0.0.1:3000:3000"
    environment:
      DATABASE_HOST: db
      DATABASE_NAME: app
    secrets:
      - db_password
    depends_on:
      db:
        condition: service_healthy
    networks: [frontend, backend]
    read_only: true
    tmpfs:
      - /tmp
    deploy:
      resources:
        limits:
          cpus: "1.0"
          memory: 512M

  db:
    image: postgres:<versione>
    environment:
      POSTGRES_DB: app
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    secrets:
      - db_password
    volumes:
      - dbdata:/var/lib/postgresql   # PostgreSQL 18+; fino alla 17 il percorso è /var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d app"]
      interval: 10s
      timeout: 3s
      retries: 5
    networks: [backend]

networks:
  frontend:
  backend:
    internal: true

volumes:
  dbdata:

secrets:
  db_password:
    file: ./secrets/db_password.txt
```

- La rete `backend` è `internal`: il database non esce e non è raggiungibile da fuori. Solo `app` sta anche su `frontend`.
- Il file del segreto sta fuori dal repository (`.gitignore`) e non è nel contesto di build.
- In sviluppo si aggiunge un file di override (`compose.override.yaml`) per montare il codice; in produzione si usa solo il file base.

## Segreti

| Momento | Come | Da evitare |
|---|---|---|
| Build (token per un registro privato) | `RUN --mount=type=secret,id=...` e `docker build --secret` | `ARG`, `ENV`, `COPY` del file |
| Avvio | variabili dal gestore dell'orchestratore o file montato (`*_FILE`) | variabili scritte nel Dockerfile o nel `compose.yaml` versionato |
| Rotazione | si cambia il segreto e si riavvia il container | segreti incisi nell'immagine |

Un segreto finito in un livello resta nella cronologia dell'immagine anche se un `RUN` successivo lo cancella.

## Scansione delle immagini
- Si scansiona l'immagine appena costruita, nella pipeline, prima della pubblicazione: vulnerabilità note nelle dipendenze e nei pacchetti della base, segreti rimasti nei livelli, configurazioni a rischio del Dockerfile.
- Una soglia decisa in anticipo (per esempio: nessuna vulnerabilità critica con correzione disponibile) fa fallire la pipeline; il resto va in un elenco con una scadenza.
- Si ripete a intervalli anche sulle immagini già pubblicate: una vulnerabilità nuova colpisce un'immagine vecchia.
- Lo strumento si sceglie in base alla piattaforma; la regola è la stessa per tutti.

## Checklist prima di pubblicare
- [ ] Base con tag preciso (o digest), mai `latest`.
- [ ] Build multi-stage; l'immagine finale non ha compilatori, sorgenti né cache dei gestori di pacchetti.
- [ ] `USER` non root e file dell'app non scrivibili.
- [ ] `.dockerignore` presente; `docker history` non mostra segreti.
- [ ] Un processo, segnali di arresto gestiti, log su stdout.
- [ ] Controllo di salute significativo.
- [ ] Nessun segreto in `ENV`, `ARG` o nei livelli.
- [ ] Compose: reti separate, volumi con nome, `service_healthy`, porte minime, limiti di risorse.
- [ ] Scansione fatta con una soglia che blocca.
- [ ] Immagine taggata con la versione o l'identificativo del commit, non solo con un nome che scorre.
