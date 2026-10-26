// Entry point 1 of 2 (SDD 2.4): the REST API, SDD C-02.
import { createApp } from './api/app.js';
import { loadConfig } from './config/index.js';

const { port } = loadConfig();

createApp().listen(port, () => {
  console.log(`NoWaste API listening on port ${port}`);
});
