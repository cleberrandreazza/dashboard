/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as dashboards from "../dashboards.js";
import type * as http from "../http.js";
import type * as lib_audit from "../lib/audit.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_records from "../lib/records.js";
import type * as lookerExport from "../lookerExport.js";
import type * as lookerExportAction from "../lookerExportAction.js";
import type * as lookerExportInternal from "../lookerExportInternal.js";
import type * as presentations from "../presentations.js";
import type * as processing from "../processing.js";
import type * as processingMutations from "../processingMutations.js";
import type * as records from "../records.js";
import type * as sheetProfiles from "../sheetProfiles.js";
import type * as uploadCleanup from "../uploadCleanup.js";
import type * as uploads from "../uploads.js";
import type * as users from "../users.js";
import type * as usersInternal from "../usersInternal.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  dashboards: typeof dashboards;
  http: typeof http;
  "lib/audit": typeof lib_audit;
  "lib/auth": typeof lib_auth;
  "lib/records": typeof lib_records;
  lookerExport: typeof lookerExport;
  lookerExportAction: typeof lookerExportAction;
  lookerExportInternal: typeof lookerExportInternal;
  presentations: typeof presentations;
  processing: typeof processing;
  processingMutations: typeof processingMutations;
  records: typeof records;
  sheetProfiles: typeof sheetProfiles;
  uploadCleanup: typeof uploadCleanup;
  uploads: typeof uploads;
  users: typeof users;
  usersInternal: typeof usersInternal;
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
