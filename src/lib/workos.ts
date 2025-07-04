// src/lib/workos.ts

/*
 * This file is used to initialize the WorkOS SDK
*/

import { WorkOS } from "@workos-inc/node";

if (!process.env.WORKOS_API_KEY) {
  throw new Error("WORKOS_API_KEY environment variable is required");
}

if (!process.env.WORKOS_CLIENT_ID) {
  throw new Error("WORKOS_CLIENT_ID environment variable is required");
}

export const workos = new WorkOS(process.env.WORKOS_API_KEY);

export const WORKOS_CLIENT_ID = process.env.WORKOS_CLIENT_ID;
export const WORKOS_COOKIE_PASSWORD = process.env.WORKOS_COOKIE_PASSWORD;