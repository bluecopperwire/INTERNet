# Database seeding

Database seeds are explicit commands. Neither seed runs during NestJS startup,
and TypeORM synchronization remains disabled.

## Mandatory reference data

Run after migrations on every environment that needs application lookup data:

```powershell
npm run seed:reference
```

The command inserts or canonicalizes these standard industries with
`is_custom_text = false`:

- `Accounting/ Finance`
- `Customer Service/ Retail`
- `Engineering`
- `Healthcare`
- `Hospitality/ Tourism`
- `Human Resources`
- `Information Technology`
- `Office Administration`

It also inserts or canonicalizes these requirement types:

- `Proof of Residency`
- `Latest Credential`
- `Curriculum Vitae/ Resume`
- `Letter of Intent`
- `Recommendation Letter/ Registration Form`

The seed uses the existing TypeORM DataSource, a transaction, and a PostgreSQL
advisory lock. Case-insensitive matches keep their identifiers. An existing
predefined industry marked as the student-only custom industry is treated as a
data conflict and is not silently rewritten.

## Fake development data

The development seed is for local endpoint work only. Set all three variables:

```powershell
$env:NODE_ENV='development'
$env:ALLOW_DEV_SEED='true'
$env:DEV_SEED_PASSWORD='choose-a-local-password-of-at-least-12-characters'
npm run seed:dev
```

It refuses to run in production, requires the explicit opt-in, and has no
built-in password. The seed first runs the mandatory reference seed, then
creates deterministic fixtures owned by reserved `@seed.invalid` emails and
`[DEV-SEED:v1]` markers.

Fake login accounts:

- `dev.admin@seed.invalid` (`admin`)
- `dev.student.one@seed.invalid` (`student`)
- `dev.student.two@seed.invalid` (`student`, also linked to a synthetic Google subject)
- `dev.company@seed.invalid` (`company`)
- `dev.peso@seed.invalid` (`peso_personnel`)

All five use the password supplied through `DEV_SEED_PASSWORD`. The command
prints account emails and the password source, never the password or its hash.

The dataset includes two student profiles, academics, preferences, four
preferred-industry selections, four requirement submissions, one company,
three opportunities, four application attempts, an interview-stage referral,
a completed assignment path, three attendance records, feedback, and trigger-
generated status history. One rejected application and its later submitted
resubmission demonstrate the active-application uniqueness rule.

Required file-path columns use `/dev-seed/v1/placeholders/...`. No binary files
are created, so those rows support database/API metadata testing but not file
download testing.

Reruns preserve identifiers and create no duplicate fixtures. Seed-owned
password hashes change only when `DEV_SEED_PASSWORD` changes. If a reserved
fixture identity exists with an incompatible role, profile, or ownership
marker, the transaction fails instead of overwriting it. The seed never deletes
records and does not create `auth_session` rows.

No cleanup command is provided. Foreign-key restrictions and append-only status
history make a universally safe cleanup command inappropriate; use a disposable
database when a clean fixture reset is required.
