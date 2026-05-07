FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt /tmp/requirements.txt

RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r /tmp/requirements.txt

COPY . /app/

EXPOSE 8000

CMD ["sh", "-c", "mkdir -p /app/data /app/media /app/staticfiles && python manage.py migrate && if [ \"${DJANGO_CREATE_SUPERUSER:-0}\" = \"1\" ]; then python manage.py ensure_superuser; fi && if [ \"${DJANGO_LOAD_DEMO_DATA:-0}\" = \"1\" ]; then python manage.py seed_data; fi && python manage.py collectstatic --noinput && gunicorn core.wsgi:application --bind 0.0.0.0:8000 --workers ${GUNICORN_WORKERS:-3} --timeout ${GUNICORN_TIMEOUT:-120}"]
