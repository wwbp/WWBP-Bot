#!/bin/sh

# Run migrations
python manage.py migrate

# Collect static files
python manage.py collectstatic --noinput

# Start Gunicorn with Uvicorn workers
gunicorn config.asgi:application \
  -k uvicorn.workers.UvicornWorker \
  --workers=4 \
  --bind 0.0.0.0:8000 \
  --timeout 120
