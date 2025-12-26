import type * as ServerRuntime from "@remix-run/server-runtime";

declare module "@remix-run/cloudflare" {
  export type LinksFunction = ServerRuntime.LinksFunction;
  export type MetaFunction<Loader extends ServerRuntime.LoaderFunction | undefined = undefined> =
    ServerRuntime.ServerRuntimeMetaFunction<Loader>;
  export type LoaderFunctionArgs = ServerRuntime.LoaderFunctionArgs;
  export type ActionFunctionArgs = ServerRuntime.ActionFunctionArgs;
  export type EntryContext = ServerRuntime.EntryContext;

  export const json: typeof ServerRuntime.json;
  export const redirect: typeof ServerRuntime.redirect;
  export const redirectDocument: typeof ServerRuntime.redirectDocument;
  export const data: typeof ServerRuntime.data;
  export const defer: typeof ServerRuntime.defer;
}
