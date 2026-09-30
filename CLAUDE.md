@AGENTS.md

# AqylRoute AI

## Что это

Веб-MVP для хакатона MedHub. Единый маршрут ребёнка с расстройством аутистического спектра (РАС) между тремя системами Казахстана: медицина, образование, соцзащита.

Тезис: «Мы не создаём ещё одну медицинскую систему. Мы соединяем существующие системы вокруг ребёнка».

Цепочка: AI-интервью (8–12 адаптивных вопросов) → межведомственный Case Plan → подтверждение куратором → контроль сроков → эскалация просрочки.

## Жёсткие правила продукта

1. AI не ставит диагноз и не делает выводов вида «у ребёнка аутизм» или «нужно оформить инвалидность». Допустимые формулировки: «по вашим ответам есть основания обратиться за профессиональной оценкой», «обсудить с врачом, есть ли основания для МСЭ».
2. AI берёт шаги только из справочника услуг (`data/services.json`). Любой шаг вне справочника отбрасывается на сервере.
3. Каждый шаг объясняется простым языком: зачем он нужен и что семья получит на выходе.
4. Без подписки на куратора маршрут от AI виден семье сразу (`plan.visibleToFamily`). С подпиской план, созданный после назначения куратора, семья видит только после подтверждения куратором.
5. Термин «динамическое наблюдение». Слово «психучёт» не используется никогда.
6. РАС не означает автоматическую инвалидность. МСЭ — только «при наличии оснований, которые определяет врач».
7. На каждом экране родителя дисклеймер: «AqylRoute не ставит диагноз и не заменяет врача. Решения принимают специалисты».
8. Весь интерфейс на русском и казахском языках. Всё новое добавляется сразу на двух языках: словари `lib/i18n/ru.ts` и `lib/i18n/kk.ts`, поля `*Kk` в справочнике, плане и вопросах.
9. Клиническая основа — КП МЗ РК №145 от 30.07.2021 (РАС), конспект в `docs/protocol.md`. Лекарства AI не упоминает.

## Стек

Требование организаторов (КМУ): Next.js, FastAPI/Node.js, OpenAI structured outputs, SQLite/Supabase, два синтетических кейса.

- Next.js 16 (App Router, TypeScript) — фронтенд и бэкенд (Route Handlers на Node.js), `proxy.ts` вместо middleware
- Tailwind CSS + shadcn/ui, иконки lucide-react
- Prisma 6 + SQLite: база — файл `prisma/aqylroute.db`; JSON-поля хранятся строками и валидируются zod
- OpenAI SDK, structured outputs через zod (`zodResponseFormat`), модель в `OPENAI_MODEL`; в схемах для OpenAI вместо `.optional()` — `.nullable()`
- Деплой: Heroku (`Procfile`, `scripts/heroku-deploy.sh|ps1`). При старте `prisma db push` и сид, если база пустая
- Переменные: `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_BASE_URL`, `SESSION_SECRET`, `SEED_PASSWORD`, `RESEED_ON_START`, `DEMO_RULES_ONLY`
- В коде не оставлять комментарии

## Роли

- `parent` — регистрируется сам, проходит интервью, видит маршрут, ведёт календарь и хранилище, покупает подписку, оставляет отзывы.
- `specialist` — регистрируется сам, анкета публикуется после одобрения комиссией.
- `curator` — назначается семье при покупке подписки: проверяет и подтверждает план, ведёт статусы, видит просрочки, календарь и хранилище семьи.
- `commission` — проверяет анкеты и документы специалистов.
- `moderator` — премодерация отзывов.
- `admin` — вопросы интервью (RU/KK, порядок, свои вопросы), пользователи.

Авторизация: email + пароль (scrypt), сессия в подписанной cookie (jose). Язык — cookie `aqyl_lang`.

## Модель данных

`User`, `Case` (facts/interview/plan — JSON-строки), `EscalationEvent`, `InterviewQuestion`, `SpecialistProfile`, `Review`, `Subscription`, `Consent`, `CalendarEvent`, `StoredFile` (файлы в SQLite как Bytes). Схема — `prisma/schema.prisma`.

## Case Plan — одна JSON-структура

Весь план хранится одним объектом в `Case.plan` и валидируется zod-схемой при каждом сохранении.

```json
{
  "version": 1,
  "generatedAt": "2026-10-01T10:00:00.000Z",
  "generatedBy": "ai",
  "approved": false,
  "approvedAt": null,
  "approvedBy": null,
  "visibleToFamily": true,
  "summary": "Короткое описание ситуации семьи простым языком, без диагнозов",
  "urgent": false,
  "summaryKk": "Отбасы жағдайының қысқаша сипаттамасы",
  "urgentReason": null,
  "urgentReasonKk": null,
  "nextStepId": "s1",
  "steps": [
    {
      "id": "s1",
      "serviceId": "edu_pmpk",
      "track": "education",
      "title": "Обследование в ПМПК",
      "organization": "Психолого-медико-педагогическая консультация (ПМПК)",
      "priority": "high",
      "responsible": "parent",
      "deadline": "2026-10-31",
      "documents": [
        { "id": "doc_parent_id", "name": "Удостоверение личности родителя", "ready": false }
      ],
      "explanation": "Зачем этот шаг и что семья получит на выходе",
      "explanationKk": "Бұл қадам не үшін керек және отбасы нені алады",
      "dependsOn": [],
      "status": "not_started",
      "history": [
        { "at": "2026-10-01T10:00:00.000Z", "by": "curator", "status": "not_started", "note": null, "noteKk": null }
      ]
    }
  ]
}
```

- `generatedBy`: `ai` или `rules` (план собран без AI, по правилам).
- `track`: `medical` | `education` | `social`.
- `priority`: `high` | `medium` | `low`.
- `responsible`: `parent` | `curator` | `organization`.
- `status`: `not_started` (⚪ не начат), `in_progress` (🟡 в работе), `done` (🟢 выполнен), `blocked` (⛔ заблокирован).
- Просрочка не хранится, а вычисляется: `deadline` раньше текущей даты и `status` не `done` → 🔴 просрочен.
- `title`, `organization`, `track`, `documents` всегда берутся из справочника, а не от модели.

## Контроль сроков и эскалация

- Эскалации работают только для кейсов с куратором.
- Уровень 1: шаг просрочен → попадает в список «Просрочки» у куратора, красный бейдж.
- Уровень 2: шаг просрочен больше чем на 7 дней → «Эскалация руководителю службы», отдельный бейдж.
- Куратор может перенести срок (с обязательной причиной), сменить статус, отметить эскалацию решённой. Всё пишется в `history` шага.

## Интервью: слоты

Порядок и показ слотов определяются правилами в коде. AI только формулирует вопрос, варианты ответа и извлекает факты из свободного ответа. Тексты вопросов на двух языках хранятся в таблице `InterviewQuestion` и редактируются администратором; администратор может добавлять свои вопросы (ответы пишутся в `facts.extra`).

| Слот | Пример вопроса | Варианты | Когда спрашивать | Обязательный |
|---|---|---|---|---|
| child_age_months | Сколько лет ребёнку? | число месяцев | всегда | да |
| main_concerns | Что вас беспокоит в развитии ребёнка? | речь, контакт с людьми, поведение, сон или еда, другое (несколько) | всегда | да |
| red_flags | Бывало ли, что ребёнок перестал делать то, что уже умел, или есть поведение, опасное для него самого? | нет / потеря навыков / самоповреждение / сильная агрессия / судороги | всегда | да |
| diagnosis_status | Ставил ли специалист ребёнку диагноз? | нет / сейчас обследуемся / да | всегда | да |
| diagnosed_by | Какой специалист поставил диагноз? | детский психиатр / невролог / частная клиника / другой | diagnosis_status = confirmed | да |
| screening_done | Заполняли ли в поликлинике опросник о развитии (M-CHAT)? | да / нет / не помню | возраст 16–30 мес и diagnosis_status = none | да |
| hearing_checked | Проверяли ли ребёнку слух? | да / нет | diagnosis_status ≠ confirmed | да |
| specialists_done | Есть ли заключения невролога, офтальмолога, сурдолога? | есть / частично / нет | всегда | нет |
| dynamic_observation | Наблюдается ли ребёнок регулярно у детского психиатра? | да / нет | diagnosis_status = confirmed | да |
| pmpk_status | Проходили ли вы ПМПК? | нет / да, заключение есть / да, но давно | всегда | да |
| correction_help | Занимается ли ребёнок с логопедом, дефектологом или психологом? | нет / КППК / реабилитационный центр / частно | всегда | да |
| education_place | Где ребёнок проводит день? | дома / обычный сад / специальная группа / обычная школа / инклюзивный класс | всегда | да |
| disability_status | Установлена ли ребёнку инвалидность? | нет / в процессе / да | diagnosis_status = confirmed | да |
| vkk_done | Обсуждали ли с врачом направление на МСЭ (заключение ВКК)? | нет / да | diagnosis_status = confirmed и disability_status = none | да |
| ipr_benefits | Есть ли ИПР и оформлены ли пособия? | ИПР есть / пособия оформлены / ничего нет | disability_status = established | да |
| city | В каком городе вы живёте? | свободный ответ | если вопросов меньше 8 | нет |

Значения: `diagnosis_status`: `none` | `in_progress` | `confirmed`; `disability_status`: `none` | `in_process` | `established`; `pmpk_status`: `none` | `done` | `expired`.

## Правила допуска услуг

- Диагноз `none` или `in_progress`:
  - медицина: med_pmsp_visit, med_mchat (только 16–30 мес), med_hearing, med_specialists, med_psychiatrist_consult, med_complex_assessment;
  - образование: edu_pmpk, edu_kppk, edu_support;
  - соцзащита: недоступна.
- Диагноз `confirmed`:
  - медицина: med_dynamic_observation, med_specialists, med_rehab_program, med_rehab_course, med_parent_training;
  - образование: edu_pmpk, edu_kppk, edu_kindergarten (до 6 лет) или edu_school (от 6 лет), edu_support;
  - соцзащита при инвалидности `none`: soc_vkk, soc_mse;
  - соцзащита при инвалидности `established`: soc_ipr, soc_benefit, soc_caregiver_benefit, soc_services_portal, soc_special_services.
- Уже выполненное по фактам входит в план со статусом `done`: hearing_checked = да → med_hearing; screening_done = да → med_mchat; dynamic_observation = да → med_dynamic_observation; specialists_done = есть → med_specialists; pmpk_status = done → edu_pmpk; correction_help = КППК → edu_kppk; vkk_done = да → soc_vkk; disability_status = established → soc_vkk и soc_mse; ИПР есть → soc_ipr; пособия оформлены → soc_benefit и soc_caregiver_benefit.
- Инвалидность `in_process`: soc_vkk входит со статусом `done`, soc_mse — со статусом `in_progress`.
- red_flags ≠ нет → `urgent: true`, шаг med_psychiatrist_consult (или med_dynamic_observation при confirmed) с приоритетом `high` и сроком 7 дней.

## Справочник услуг

Справочник — `data/services.json` (поля `title/titleKk`, `organization/organizationKk`, `description/descriptionKk`, `conditions/conditionsKk`, документы `name/nameKk`). Любые изменения вносить в оба языка.
