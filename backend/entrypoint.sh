#!/bin/sh
set -e

if [ "$DB_HOST" ]; then
    echo "Waiting for PostgreSQL database at $DB_HOST:$DB_PORT..."
    while ! nc -z "$DB_HOST" "${DB_PORT:-5432}"; do
      sleep 0.5
    done
    echo "PostgreSQL is up and accepting connections!"
fi

echo "Applying database migrations..."
python manage.py migrate --noinput

echo "Seeding initial demo data (if empty)..."
python manage.py seed_data || true

echo "Collecting static files..."
python manage.py collectstatic --noinput || true

echo "Starting backend process: $@"
exec "$@"
