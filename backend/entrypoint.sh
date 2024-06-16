#!/bin/sh

# Run migrations
python manage.py migrate

# Collect static files
python manage.py collectstatic --noinput

if [ "$WORKER_TYPE" = "celery" ]; then
    # Start Celery worker and beat
    celery -A config worker --loglevel=info
else
    # Start Daphne server
    daphne -b 0.0.0.0 -p 8000 config.asgi:application
fi
