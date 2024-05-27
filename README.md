# Project GritCoach

## Overview

**GritCoach** is designed to be a voice-interfaced chatbot that helps students practice course materials. This project includes a Django backend, a React frontend, and a MySQL database, all containerized using Docker.

This monorepo contains the source code for a full-stack web application. It is divided into two main parts: the backend and the frontend. The backend is built with Django, while the frontend is built with React. The repository is structured to facilitate easy development and deployment.

## Directory Structure

```
monorepo/
├── backend/
│   ├── ...
├── frontend/
│   ├── ...
├── .gitignore
├── docker-compose.yml
├── README.md
```

## Getting Started

### Prerequisites

- Docker
- Docker Compose

### Setup

1. Clone the repository:

    ```bash
    git clone git@github.com:wwbp/WWBP-Bot.git
    cd WWBP-Bot
    ```

2. Build and run the containers:

    ```bash
    docker-compose up --build
    ```

3. The backend should be accessible at `http://localhost:8000` and the frontend at `http://localhost:3000`.

## Development

### Backend

Navigate to the [backend README](./backend/README.md) for detailed instructions on setting up and running the backend server.

### Frontend

Navigate to the [frontend README](./frontend/README.md) for detailed instructions on setting up and running the frontend application.

## Contributing

Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE.md](./LICENSE.md) file for details.
