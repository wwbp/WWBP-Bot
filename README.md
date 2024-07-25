# WWBP BOT

## Overview

**WWBP Bot** is designed to be a voice-interfaced chatbot that helps students practice course materials. This project contains two applications: **GritCoach** and **ChatFriend**. This project includes a Django backend, a React frontend, and a MySQL database, all containerized using Docker.

This monorepo contains the source code for a full-stack web application. It is divided into two main parts: the backend and the frontend. The backend is built with Django, while the frontend is built with React. The repository is structured to facilitate easy development and deployment.

## Directory Structure

```
monorepo/
├── backend/
│   ├── ...
├── client-react-gritcoach/
│   ├── ...
├── client-react-chatfriend/
│   ├── ...
├── .gitignore
├── docker-compose-gritcoach.yml
├── docker-compose-chatfriend.yml
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

2. Build and run the containers for GritCoach:

    ```bash
    docker-compose -f docker-compose-gritcoach.yml up --build
    ```

3. Build and run the containers for ChatFriend:

    ```bash
    docker-compose -f docker-compose-chatfriend.yml up --build
    ```

4. To stop and remove the volume:

    ```bash
    docker-compose -f docker-compose-<chatfriend/gritcoach>.yml down -v
    ```

Note: Since the Docker Compose files use default ports, make sure to update the ports if you are testing both applications simultaneously locally.

The backend should be accessible at `http://localhost:8000` and the frontend at `http://localhost:3000`.

## Development

### Backend

Navigate to the [backend README](./backend/README.md) for detailed instructions on setting up and running the backend server.

### Frontend

Navigate to the respective frontend READMEs for detailed instructions on setting up and running the frontend applications.

- [GritCoach Frontend README](./client-react-gritcoach/README.md)
- [ChatFriend Frontend README](./client-react-chatfriend/README.md)

## Contributing

Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE.md](./LICENSE.md) file for details.
