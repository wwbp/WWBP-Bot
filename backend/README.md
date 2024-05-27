
# Backend - Django Application

## Overview

This directory contains the backend code for the application, built using Django. It provides RESTful APIs and handles all the server-side logic and database interactions.

## Directory Structure

```
backend/
├── manage.py
├── myproject/
│   ├── settings.py
│   ├── urls.py
│   ├── wsgi.py
│   └── ...
├── Pipfile
├── Pipfile.lock
└── Dockerfile
```

## Getting Started

### Prerequisites

- Python 3.x
- Pipenv
- Docker (optional for containerized development)

### Setup

1. Navigate to the backend directory:

    ```bash
    cd backend
    ```

2. Install the required Python packages using Pipenv:

    ```bash
    pipenv install
    ```

3. Activate the Pipenv shell:

    ```bash
    pipenv shell
    ```

4. Apply the migrations and start the development server:

    ```bash
    python manage.py migrate
    python manage.py runserver
    ```

### Docker Setup

1. Build the Docker image:

    ```bash
    docker build -t backend .
    ```

2. Run the Docker container:

    ```bash
    docker run -p 8000:8000 backend
    ```

## Running Tests

To run tests, use the following command:

```bash
python manage.py test
```

## API Documentation

The API documentation is available at `/api/docs` when the server is running.

## Contributing

Please read `CONTRIBUTING.md` for details on our code of conduct, and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the `LICENSE.md` file for details.
