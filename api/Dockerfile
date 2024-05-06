FROM python:3.9

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

WORKDIR /code

COPY Pipfile Pipfile.lock /code/
RUN pip install --upgrade pip && pip install pipenv
RUN pipenv install --system --deploy

COPY . /code/

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]