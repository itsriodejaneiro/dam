#!/bin/sh
set -e

# The first superuser comes from the environment: a credential in an image layer would
# be in every copy of the image.
#
# `create` and not `upsert`: upsert rewrites the password on every boot, undoing one
# changed in the admin. Create fails harmlessly once the account exists. The app's server
# side logs in with the same variables, so a changed password changes there too.
#
# The output is read because `superuser create` exits 0 on a duplicated e-mail.
if [ -n "$PB_SUPERUSER_EMAIL" ] && [ -n "$PB_SUPERUSER_PASSWORD" ]; then
	result=$(/pb/pocketbase superuser create "$PB_SUPERUSER_EMAIL" "$PB_SUPERUSER_PASSWORD" \
		--dir=/pb/pb_data 2>&1 || true)
	case "$result" in
	*Error*) echo "superuser $PB_SUPERUSER_EMAIL already exists: password left as it is" ;;
	*) echo "superuser $PB_SUPERUSER_EMAIL created" ;;
	esac
fi

# `--automigrate=0`: left on, every collection change through the API writes a migration
# file, setup.ts included. The schema has one home, src/lib/server/setup.ts.
exec /pb/pocketbase serve \
	--http=0.0.0.0:8090 \
	--dir=/pb/pb_data \
	--automigrate=0 \
	"$@"
