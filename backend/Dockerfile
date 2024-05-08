# Use an official Python runtime as a parent image
FROM python:3.9-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Set work directory
WORKDIR /code

# Install pipenv
RUN pip install pipenv

# Copy Pipfile and Pipfile.lock to the container at /code
COPY Pipfile Pipfile.lock /code/

# Install dependencies
RUN pipenv install --system --deploy

# Copy the current directory contents into the container at /code
COPY . /code/

# Run the command to start uWSGI
CMD ["pipenv", "run", "python", "manage.py", "runserver", "0.0.0.0:8000"]
