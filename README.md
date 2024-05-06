# Project WWBP Bot

## Prerequisites

- Docker
- Docker Compose

## Setup

1. Clone the repo
2. Navigate to the repo root

## Development

### Start Services

`docker-compose up`

- Django Backend: `http://localhost:8000`
- Next.js Frontend: `http://localhost:3000`

### Stop Services

`docker-compose down`

### Rebuild Services

`docker-compose build`

## Testing

### Backend

`docker-compose run backend python manage.py test`

### Frontend

`docker-compose run frontend npm test`

## Deployment

See deployment documentation.

## Project Structure

- `backend/api`: Django backend
- `frontend`: Next.js frontend
- `docker-compose.yml`: Docker Compose configuration
- `README.md`: This file
