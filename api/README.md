# Django Backend

This directory contains the Django backend for the project.

## Prerequisites

- Docker
- Python 3.9

## Setup

1. Navigate to the `backend/api` directory.

2. Build the Docker image:
`docker build -t django-backend .`

3. Run the Docker container:
`docker run -p 8000:8000 django-backend`

This will start the Django development server at `http://localhost:8000`.

## Development

While the Docker container is running, you can make changes to the code, and the server will automatically reload to reflect the changes.

If you need to install or update Python packages, you can do so by modifying the `Pipfile` and running `pipenv install` or `pipenv update` from within the container.

## Testing

To run the tests for the Django backend, execute the following command from within the container:
`python manage.py test`

## Deployment

For deployment instructions, refer to the project's deployment documentation.
