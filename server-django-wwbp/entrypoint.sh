#!/bin/sh

# Run migrations
python manage.py migrate

# Collect static files
python manage.py collectstatic --noinput

# Start Supervisor
exec supervisord -c /etc/supervisor/conf.d/supervisord.conf