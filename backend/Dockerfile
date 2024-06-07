# Use a slim Python base image
FROM python:3.9-slim

# Set environment variables to prevent Python from writing pyc files to disc and buffer stdout and stderr
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV DJANGO_SETTINGS_MODULE config.settings

WORKDIR /app

# Install system and build dependencies
RUN apt-get update && \
    apt-get install -y libmariadb-dev-compat gcc pkg-config default-libmysqlclient-dev && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy the Pipfile and Pipfile.lock into the container
COPY ./Pipfile ./Pipfile.lock /app/

# Install Python dependencies
RUN pip install pipenv && pipenv install --system --deploy --ignore-pipfile

# Copy your Django project into the container
COPY . /app

# Run the script to fetch Google credentials
RUN python fetch_google_credentials.py

# Run Django collectstatic, using your production settings
RUN python manage.py collectstatic --noinput

# Run migrations for the database
RUN python manage.py migrate

# Start Daphne with the module for ASGI located in your 'config' directory
CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "config.asgi:application"]

EXPOSE 8000