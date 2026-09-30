param(
  [string]$AppName = "aqylroute-demo",
  [string]$OpenAiModel = $(if ($env:OPENAI_MODEL) { $env:OPENAI_MODEL } else { "gpt-4.1-mini" }),
  [string]$SeedPassword = $(if ($env:SEED_PASSWORD) { $env:SEED_PASSWORD } else { "Aqyl2026!" }),
  [string]$ReseedOnStart = "false"
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command heroku -ErrorAction SilentlyContinue)) {
  Write-Output "Не найден Heroku CLI. Установите: https://devcenter.heroku.com/articles/heroku-cli"
  exit 1
}

git diff --quiet
$unstaged = $LASTEXITCODE
git diff --cached --quiet
$staged = $LASTEXITCODE
if ($unstaged -ne 0 -or $staged -ne 0) {
  Write-Output "Есть незакоммиченные изменения. Heroku получает только закоммиченный код: сделайте commit и запустите скрипт снова."
  exit 1
}

heroku whoami *> $null
if ($LASTEXITCODE -ne 0) { heroku login }

heroku apps:info -a $AppName *> $null
if ($LASTEXITCODE -ne 0) { heroku create $AppName }

heroku buildpacks:set heroku/nodejs -a $AppName *> $null
heroku git:remote -a $AppName

$existingSecret = heroku config:get SESSION_SECRET -a $AppName
if (-not $existingSecret) {
  $secret = node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  heroku config:set -a $AppName "SESSION_SECRET=$secret" | Out-Null
}

$rulesOnly = if ($env:DEMO_RULES_ONLY) { $env:DEMO_RULES_ONLY } else { "false" }
heroku config:set -a $AppName "OPENAI_MODEL=$OpenAiModel" "SEED_PASSWORD=$SeedPassword" "RESEED_ON_START=$ReseedOnStart" "DEMO_RULES_ONLY=$rulesOnly" | Out-Null

if ($env:OPENAI_API_KEY) {
  heroku config:set -a $AppName "OPENAI_API_KEY=$($env:OPENAI_API_KEY)" | Out-Null
}

git push heroku HEAD:main
heroku ps:scale web=1 -a $AppName

$info = heroku apps:info -a $AppName
$url = ($info | Select-String "Web URL").ToString().Split(" ", [System.StringSplitOptions]::RemoveEmptyEntries)[-1]

Write-Output ""
Write-Output "Готово: $url"
Write-Output ""
Write-Output "Тестовые аккаунты (пароль: $SeedPassword):"
Write-Output "  Администратор   admin@aqylroute.kz"
Write-Output "  Комиссия        commission@aqylroute.kz, commission2@aqylroute.kz"
Write-Output "  Модератор       moderator@aqylroute.kz"
Write-Output "  Куратор         curator@aqylroute.kz, curator2@aqylroute.kz, curator3@aqylroute.kz"
Write-Output "  Специалист      specialist@aqylroute.kz"
Write-Output "  Родитель        erlan@example.kz, dinara@example.kz, zhanna@example.kz, asel@example.kz, marat@example.kz"
Write-Output ""
Write-Output "Демо-данные создаются при первом запуске и после каждого перезапуска dyno (файловая система Heroku эфемерная)."
Write-Output "Пересоздать демо-данные вручную: heroku restart -a $AppName"
