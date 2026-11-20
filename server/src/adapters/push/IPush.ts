// C-25 IPush (SDD 3.2.1): sends to the Android and iOS push services. SDD 3.2.3 does not list IPush operations;
// send(deviceToken, payload) is decision D-43 (needs team approval). A failed push never throws: the status stays
// visible in the app (IF-SW-06).

export interface PushPayload {
  type: string;
  [key: string]: unknown;
}

export interface IPush {
  send(deviceToken: string, payload: PushPayload): Promise<{ delivered: boolean }>;
}
