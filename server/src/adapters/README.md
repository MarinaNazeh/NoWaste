# Adapters (SDD 3.1.1 Integration adapters)

One folder per external service. Each adapter implements one interface from SDD 3.2.3, so services never call an external API directly and every adapter can be mocked in tests (NFR-13).

C-24 Map View is not here: the SDD places it inside the mobile app (app/), because the map is drawn on the phone.
