import tracing from '@opencensus/nodejs';
import { Config, Span, TraceOptions } from '@opencensus/core';
import { IMiddlewareFunction } from 'graphql-middleware';
import {
  JaegerTraceExporter,
  JaegerTraceExporterOptions
} from '@opencensus/exporter-jaeger';

export interface IMiddlewareOptions {
  rootSpanOptions?: TraceOptions;
}

export interface IHookFnContext<T> {
  context: T;
  rootSpan: Span;
  data?: any;
  err?: Error;
}

export type IMiddlewareHookFn<T> = (
  hookContext: IHookFnContext<T>
) => void | Promise<void>;

export interface IMiddlewareHooks<T> {
  [key: string]: Array<IMiddlewareHookFn<T>>;
}

const defaultOptions = {
  rootSpanOptions: {
    name: 'graphqlRequest'
  }
};

const runHook = async <T>(
  hooks: IMiddlewareHooks<T>,
  name: string,
  hookFnContext: IHookFnContext<T>
) => {
  const hook = hooks[name];

  if (!Array.isArray(hook)) {
    return;
  }

  for (const hookFn of hook) {
    await hookFn.apply(null, [hookFnContext]);
  }
};

export const graphqlJaegerMiddleware: <T = any>(
  tracerConfig: Config,
  options: JaegerTraceExporterOptions,
  middlewareOptions: IMiddlewareOptions,
  hooks: IMiddlewareHooks<T>
) => IMiddlewareFunction = (config, options, middlewareOptions, hooks = {}) => {
  // Create tracer and register Jaeger instance
  const { tracer } = tracing.start(config);
  tracer.registerSpanEventListener(new JaegerTraceExporter(options));

  // Return middleware
  return (resolve, parent, args, context, info) => {
    // Add tracer to context
    context.tracing = {};
    context.tracing.tracer = tracer;

    return new Promise((pResolve, pReject) => {
      tracer.startRootSpan(
        middlewareOptions.rootSpanOptions || defaultOptions.rootSpanOptions,
        async span => {
          // Add rootSpan to context
          context.tracing.rootSpan = span;

          // Execute hooks
          await runHook(hooks, 'preResolve', { rootSpan: span, context });

          // Execute resolver and record root span
          try {
            span.start();
            const data = await resolve(parent, args, context, info);

            // Execute hooks
            await runHook(hooks, 'postResolve', {
              rootSpan: span,
              data,
              context
            });

            span.end();
            pResolve(data);
          } catch (err) {
            // Execute hooks
            await runHook(hooks, 'resolveError', {
              rootSpan: span,
              err,
              context
            });

            span.end();
            pReject(err);
          }
        }
      );
    });
  };
};

export default graphqlJaegerMiddleware;
