# Feedback changes

These points change or add to docs/SRS.pdf and docs/SDD.pdf. Every session must follow them.

- **US-02:** the shop location is a map pin (latitude and longitude stored as PostGIS GEOGRAPHY(Point,4326)) plus a written address.
- **US-10 and US-11:** every listing has its own pickup location. It starts at the vendor's shop pin and the vendor can move it.
- **US-18:** the perishability thresholds and the shelf-life values are read from database tables, never hard-coded, so an administrator can manage them later.
- **SDD:** the worker (C-19) is an entry point beside the API (C-02), not a layer under it. No worker jobs in Sprint 1.
