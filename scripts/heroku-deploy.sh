#!/usr/bin/env bash
set -euo pipefail

APP_NAME="${1:-aqylroute-demo}"
OPENAI_MODEL="${OPENAI_MODEL:-gpt-4.1-mini}"
SEED_PASSWORD="${SEED_PASSWORD:-Aqyl2026!}"
RESEED_ON_START="${RESEED_ON_START:-false}"

if ! command -v heroku >/dev/null 2>&1; then
  echo "Не найден Heroku CLI. Установите: https://devcenter.heroku.com/articles/heroku-cli"
  exit 1
fi

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Есть незакоммиченные изменения. Heroku получает только закоммиченный код: сделайте commit и запустите скрипт снова."
  exit 1
fi

heroku whoami >/dev/null 2>&1 || heroku login

if ! heroku apps:info -a "$APP_NAME" >/dev/null 2>&1; then
  heroku create "$APP_NAME"
fi

heroku buildpacks:set heroku/nodejs -a "$APP_NAME" >/dev/null 2>&1 || true
heroku git:remote -a "$APP_NAME"

if [ -z "$(heroku config:get SESSION_SECRET -a "$APP_NAME")" ]; then
  SESSION_SECRET="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
  heroku config:set -a "$APP_NAME" SESSION_SECRET="$SESSION_SECRET" >/dev/null
fi

heroku config:set -a "$APP_NAME" \
  OPENAI_MODEL="$OPENAI_MODEL" \
  SEED_PASSWORD="$SEED_PASSWORD" \
  RESEED_ON_START="$RESEED_ON_START" \
  DEMO_RULES_ONLY="${DEMO_RULES_ONLY:-false}" >/dev/null

if [ -n "${OPENAI_API_KEY:-}" ]; then
  heroku config:set -a "$APP_NAME" OPENAI_API_KEY="$OPENAI_API_KEY" >/dev/null
fi

git push heroku HEAD:main
heroku ps:scale web=1 -a "$APP_NAME"

URL="$(heroku apps:info -a "$APP_NAME" | awk '/Web URL/ {print $3}')"
cat <<EOF

Готово: ${URL}

Тестовые аккаунты (пароль: ${SEED_PASSWORD}):
  Администратор   admin@aqylroute.kz
  Комиссия        commission@aqylroute.kz, commission2@aqylroute.kz
  Модератор       moderator@aqylroute.kz
  Куратор         curator@aqylroute.kz, curator2@aqylroute.kz, curator3@aqylroute.kz
  Специалист      specialist@aqylroute.kz
  Родитель        erlan@example.kz, dinara@example.kz, zhanna@example.kz, asel@example.kz, marat@example.kz

Демо-данные создаются при первом запуске и после каждого перезапуска dyno (файловая система Heroku эфемерная).
Пересоздать демо-данные вручную: heroku restart -a ${APP_NAME}
EOF
