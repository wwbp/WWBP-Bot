#!/bin/sh

# Run migrations
python manage.py migrate

# Collect static files
python manage.py collectstatic --noinput

# Tail logs so they appear in STDOUT (optional)
tail -F /var/log/gunicorn.stdout.log /var/log/gunicorn.stderr.log /var/log/daphne.stdout.log /var/log/daphne.stderr.log &

# Start Supervisor
exec supervisord -c /etc/supervisor/conf.d/supervisord.conf