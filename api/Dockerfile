FROM python:3.9

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Set the working directory in the container
WORKDIR /code

# Copy the Pipfile and Pipfile.lock
COPY Pipfile Pipfile.lock /code/

# Install pipenv and dependencies
RUN pip install --upgrade pip && pip install pipenv && \
    pipenv install --system --deploy

# Copy the entire project directory into the container
COPY . /code/

# Copy the wait-for-it.sh script into the container
COPY wait-for-it.sh /code/wait-for-it.sh

# Grant execute permissions to the script
RUN chmod +x /code/wait-for-it.sh

# Log permissions to verify they are set correctly
RUN ls -l /code/wait-for-it.sh

# Set the entry point to wait-for-it.sh and pass the command to run the server as arguments
ENTRYPOINT ["./wait-for-it.sh", "db:3306", "--"]

# Command to run when the container starts
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
