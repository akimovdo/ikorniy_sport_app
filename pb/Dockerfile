# PocketBase backend image.
# Скачивает официальный linux-бинарник и кладёт рядом версионированные миграции (pb_migrations),
# чтобы свежий контейнер всегда разворачивал одну и ту же схему коллекций на первом старте.

FROM --platform=$BUILDPLATFORM alpine:3.20 AS download

ARG POCKETBASE_VERSION=0.40.5
ARG TARGETARCH

RUN apk add --no-cache curl unzip ca-certificates

WORKDIR /tmp/pb

RUN case "${TARGETARCH}" in \
      "amd64") PB_ARCH="amd64" ;; \
      "arm64") PB_ARCH="arm64" ;; \
      *) echo "Unsupported architecture: ${TARGETARCH}" && exit 1 ;; \
    esac && \
    curl -fsSL -o pocketbase.zip \
      "https://github.com/pocketbase/pocketbase/releases/download/v${POCKETBASE_VERSION}/pocketbase_${POCKETBASE_VERSION}_linux_${PB_ARCH}.zip" && \
    unzip pocketbase.zip -d /tmp/pb-bin && \
    rm pocketbase.zip

FROM alpine:3.20

RUN apk add --no-cache ca-certificates tzdata wget

WORKDIR /pb

COPY --from=download /tmp/pb-bin/pocketbase /pb/pocketbase
COPY pb_migrations /pb/pb_migrations
COPY docker-entrypoint.sh /pb/docker-entrypoint.sh

RUN chmod +x /pb/pocketbase /pb/docker-entrypoint.sh

VOLUME ["/pb/pb_data"]

EXPOSE 8090

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=5 \
  CMD wget -qO- http://127.0.0.1:8090/api/health || exit 1

ENTRYPOINT ["/pb/docker-entrypoint.sh"]
