FROM python:3.9

WORKDIR /app

RUN apt-get update && apt-get install -y \
    default-libmysqlclient-dev \
    gcc \
    pkg-config \
    python3-dev

RUN pip install pipenv

COPY . /app

RUN pipenv install --system --deploy

EXPOSE 8000

RUN chmod +x /app/wait-for-it.sh

ENTRYPOINT ["./wait-for-it.sh", "db:3306", "--"]

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
