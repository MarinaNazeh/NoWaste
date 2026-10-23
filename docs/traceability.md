# Traceability

Each SRS requirement, the user story it traces to, the tests that check it, the test level and its status.
Level is Unit, Integration (server with the real test database), Component (app screen with React Native Testing Library) or Manual.

| Requirement ID | User story         | Test IDs                                                                              | Level       | Status                             |
| -------------- | ------------------ | ------------------------------------------------------------------------------------- | ----------- | ---------------------------------- |
| BR-01          | US-18 (value only) | BR-01 settings row holds the SRS 5.5 value                                            | Integration | Value seeded; rule not built       |
| BR-02          | US-28 (value only) | BR-02 settings row holds the SRS 5.5 value                                            | Integration | Value seeded; rule not built       |
| BR-03          | US-28 (value only) | BR-03 settings row holds the SRS 5.5 value                                            | Integration | Value seeded; rule not built       |
| BR-04          | US-28 (value only) | BR-04 settings row holds the SRS 5.5 value                                            | Integration | Value seeded; rule not built       |
| BR-05          | US-29 (value only) | BR-05 settings row holds the SRS 5.5 value                                            | Integration | Value seeded; rule not built       |
| BR-06          | US-35 (value only) | BR-06 settings row holds the SRS 5.5 value                                            | Integration | Value seeded; rule not built       |
| BR-07          | US-35 (value only) | BR-07 settings row holds the SRS 5.5 value                                            | Integration | Value seeded; rule not built       |
| BR-08          | US-42 (value only) | BR-08 settings row holds the SRS 5.5 value                                            | Integration | Value seeded; rule not built       |
| BR-09          | US-33 (value only) | BR-09 settings row holds the SRS 5.5 value                                            | Integration | Value seeded; rule not built       |
| BR-10          | US-23 (value only) | BR-10 settings row holds the SRS 5.5 value; TBD-5 settings row exists with value null | Integration | Value open (TBD-5); rule not built |
| BR-11          | US-43 (value only) | BR-11 settings row holds the SRS 5.5 value                                            | Integration | Value seeded; rule not built       |
| BR-12          | US-12 (value only) | BR-12 settings row holds the SRS 5.5 value                                            | Integration | Value seeded; rule not built       |

## Skeleton checks (not SRS requirements)

| Check                                   | Test IDs  | Level       | Status  |
| --------------------------------------- | --------- | ----------- | ------- |
| GET /health with the database up        | HEALTH-01 | Integration | Passing |
| GET /health with the database down      | HEALTH-03 | Integration | Passing |
| Home screen shows Server: connected     | HEALTH-02 | Component   | Passing |
| Home screen shows Server: not reachable | HEALTH-04 | Component   | Passing |
