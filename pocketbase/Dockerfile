# PocketBase, the image `bun run dev` and a deploy both run.
#
# The build context is the repository root and PB_VERSION comes from compose.yaml,
# which pins it beside the tag of the image.
#
# pb_data is mounted from outside (compose.yaml): replacing this image never touches
# the database.

# The download stage keeps unzip out of the image that serves.
FROM alpine:3.21 AS build
ARG PB_VERSION
# `uname -m` and not BuildKit's TARGETARCH: Compose without buildx falls back to the
# classic builder, which leaves it empty and would pick the amd64 zip on an arm64 VM.
RUN apk add --no-cache unzip ca-certificates \
	&& case "$(uname -m)" in aarch64) arch=arm64 ;; *) arch=amd64 ;; esac \
	&& wget -O /tmp/pb.zip "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_${arch}.zip" \
	&& unzip /tmp/pb.zip -d /pb \
	&& chmod +x /pb/pocketbase

FROM alpine:3.21
# PocketBase makes outbound TLS calls (mail, S3 backups), and without a trust store
# they fail with an error that reads like a network problem.
RUN apk add --no-cache ca-certificates

COPY --from=build /pb/pocketbase /pb/pocketbase
COPY pocketbase/entrypoint.sh /pb/entrypoint.sh
# Here rather than trusting the checkout: a clone without the permission bit would
# land a script nobody can execute.
RUN chmod +x /pb/entrypoint.sh

WORKDIR /pb
VOLUME /pb/pb_data
EXPOSE 8090

# The start interval checks every 2 s while booting, so nothing that waits for a
# healthy service is held for the whole 30 s interval.
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --start-interval=2s \
	CMD wget -qO /dev/null http://127.0.0.1:8090/api/health || exit 1

ENTRYPOINT ["/pb/entrypoint.sh"]
