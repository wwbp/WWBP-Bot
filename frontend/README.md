# Next.js Frontend

This directory contains the Next.js frontend for the project.

## Prerequisites

- Docker
- Node.js

## Setup

1. Navigate to the `frontend` directory.

2. Build the Docker image:
`docker build -t nextjs-frontend .`

3. Run the Docker container:
`docker run -p 3000:3000 nextjs-frontend`

This will start the Next.js development server at `http://localhost:3000`.

## Development

While the Docker container is running, you can make changes to the code, and the server will automatically reload to reflect the changes.

If you need to install or update Node.js packages, you can do so by modifying the `package.json` file and running `npm install` or `npm update` from within the container.

## Testing

To run the tests for the Next.js frontend, execute the following command from within the container:
`npm test`

## Deployment

For deployment instructions, refer to the project's deployment documentation.
