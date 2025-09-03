#!/bin/bash
set -e

echo "🚀 Initializing Saleor for E2E tests..."

# Wait for database to be ready
echo "⏳ Waiting for PostgreSQL..."
until PGPASSWORD=$POSTGRES_PASSWORD psql -h "$DATABASE_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c '\q' 2>/dev/null; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 2
done
echo "✅ PostgreSQL is ready"

# Run migrations
echo "📦 Running database migrations..."
python manage.py migrate --no-input

# Create superuser if it doesn't exist
echo "👤 Creating test superuser..."
python manage.py shell << EOF
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(email='admin@example.com').exists():
    User.objects.create_superuser(
        email='admin@example.com',
        password='admin123',
        is_active=True,
        is_staff=True
    )
    print('✅ Superuser created')
else:
    print('✅ Superuser already exists')
EOF

# Populate initial data if needed
echo "📊 Setting up initial shop data..."
python manage.py shell << EOF
from saleor.site.models import Site
from saleor.core.utils.editorjs import clean_editor_js
import json

# Ensure site exists
site = Site.objects.get_current()
if not site.name or site.name == 'example.com':
    site.name = 'E2E Test Store'
    site.domain = 'localhost:8000'
    site.save()
    print('✅ Site configured')
else:
    print('✅ Site already configured')

# Ensure shop exists
from saleor.site.models import SiteSettings
settings = site.settings
if not settings.description:
    settings.description = clean_editor_js(json.dumps({
        "blocks": [{"type": "paragraph", "data": {"text": "E2E Test Store"}}]
    }))
    settings.save()
    print('✅ Shop settings configured')
else:
    print('✅ Shop settings already configured')
EOF

echo "🎉 Saleor initialization complete!"