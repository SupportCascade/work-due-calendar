/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ViktorSpacesEmail from "../ViktorSpacesEmail.js";
import type * as auth from "../auth.js";
import type * as constants from "../constants.js";
import type * as functions from "../functions.js";
import type * as http from "../http.js";
import type * as phiConsoleStatics from "../phiConsoleStatics.js";
import type * as phiLogging from "../phiLogging.js";
import type * as spaceSessionAuth from "../spaceSessionAuth.js";
import type * as users from "../users.js";
import type * as viktorEdgeHandoffAuth from "../viktorEdgeHandoffAuth.js";
import type * as viktorMembership from "../viktorMembership.js";
import type * as viktorSpaceAuthConfig from "../viktorSpaceAuthConfig.js";
import type * as viktorSpaceAuthEnv from "../viktorSpaceAuthEnv.js";
import type * as viktorTools from "../viktorTools.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ViktorSpacesEmail: typeof ViktorSpacesEmail;
  auth: typeof auth;
  constants: typeof constants;
  functions: typeof functions;
  http: typeof http;
  phiConsoleStatics: typeof phiConsoleStatics;
  phiLogging: typeof phiLogging;
  spaceSessionAuth: typeof spaceSessionAuth;
  users: typeof users;
  viktorEdgeHandoffAuth: typeof viktorEdgeHandoffAuth;
  viktorMembership: typeof viktorMembership;
  viktorSpaceAuthConfig: typeof viktorSpaceAuthConfig;
  viktorSpaceAuthEnv: typeof viktorSpaceAuthEnv;
  viktorTools: typeof viktorTools;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
