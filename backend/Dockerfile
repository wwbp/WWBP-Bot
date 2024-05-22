# Use a slim Python base image
FROM python:3.9-slim

# Set environment variables to prevent Python from writing pyc files to disc and buffer stdout and stderr
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Define the DJANGO_SETTINGS_MODULE environment variable to point to your production settings file
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

# Run Django collectstatic, using your production settings
RUN python manage.py collectstatic --noinput

# Start Gunicorn with the module for WSGI located in your 'config' directory
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000"]

EXPOSE 8000