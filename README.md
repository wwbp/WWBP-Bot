# Project ChatFriend

## Overview

**ChatFriend** is designed to be a voice-interfaced chatbot that helps students practice course materials. This project includes a Django backend, a React frontend, and a MySQL database, all containerized using Docker.

## Project Structure

### Directories

- `backend/`: Contains all Django application files and REST API configurations.
- `frontend/`: Contains all React application files.
- `docker/`: Includes Dockerfiles and docker-compose configurations.

## Tech Stack

- **Backend**: Django + Django REST Framework
- **Database**: MySQL
- **Frontend**: React
- **Containerization**: Docker and Docker Compose

## Local Development Setup

### Prerequisites

Ensure you have Docker and Docker Compose installed on your system to handle containerization.

### Building and Running the Project

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd myproject

2. **Start the application using Docker Compose**

    ```bash
    docker-compose up --build

3. **Accessing the application**
Frontend is accessible at <http://localhost:3000>
Backend API is accessible at <http://localhost:8000>

### Useful Commands

- Rebuilding and restarting the Docker containers

    ```bash
    docker-compose up --build

### Docker Configuration

Docker is used to containerize the backend, frontend, and database services. Here’s a brief on the Docker services:

- db: Runs the MySQL database.
- backend: Runs the Django application.
- frontend: Serves the React application using Nginx as a static file server.

### Initial Development Achievements

- Set up a multi-container Docker environment with Django, React, and MySQL.
- Configured Docker Compose to manage container orchestration.
- Ensured basic connectivity between Django and React over Docker.
- Established a primary React component structure and basic Django settings for development.

### Testing

For now, manual testing is done by accessing the frontend and backend via browser and using API tools like Postman to test Django endpoints.

### Next Steps

#### Milestone 2: Initial Deployment Setup

- DevOps: Set up a staging environment on AWS using EC2 and RDS to mimic the production environment.
- Task: Deploy the current state of the application to the staging environment and ensure all components are functioning as expected.

#### Milestone 3: Course Structure Implementation

- Backend: Develop APIs for managing syllabi, modules, and tasks.
- Frontend: Implement interfaces for viewing and managing syllabi, modules, and tasks.
- Database: Design and implement schemas to support the course structure.

#### Milestone 4: Chatbot Integration

- Backend: Integrate with an LLM API for generating chatbot responses.
- Frontend: Create a chat interface that allows users to interact with the chatbot.
- Task: Ensure the chatbot can dynamically use course content to interact with users.

#### Milestone 5: Advanced Chatbot Features

- Backend: Implement voice capabilities alongside text-based chat.
- Frontend: Allow users to switch easily between text and voice interaction.
- Task: Test and optimize the performance of both text and voice interactions.

#### Milestone 6: Final Testing and Deployment

- Testing: Conduct comprehensive tests including unit, integration, and system tests.
- DevOps: Finalize the production environment setup on AWS, ensuring scalability and security.
- Deployment: Deploy the fully tested application to the production environment.
- Task: Monitor application performance and user interactions, adjust based on feedback.
