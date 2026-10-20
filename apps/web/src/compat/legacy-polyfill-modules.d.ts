/**
 * The two legacy-browser polyfill packages ship no TypeScript type
 * declarations (only side-effectful shim entry points), so declare the
 * imported modules as empty side-effect imports here. TypeScript's DOM lib
 * already provides the `fetch` / `AbortController` types they install.
 */
declare module "whatwg-fetch";
declare module "abort-controller/polyfill";
