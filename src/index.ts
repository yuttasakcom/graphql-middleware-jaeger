import tracing from '@opencensus/nodejs';
import { Config, Span, TraceOptions } from '@opencensus/core';
import { IMiddlewareFunction } from 'graphql-middleware';
import { GraphQLResolveInfo } from 'graphql';
import {
  JaegerTraceExporter,
  JaegerTraceExporterOptions
} from '@opencensus/exporter-jaeger';

export interface IMiddlewareOptions {
  rootSpanOptions: TraceOptions;
}

export interface IHookFnContext<T, D> {
  context: T;
  rootSpan: Span;
  data: {
    resolvedData?: D;
    args: any;
    parent: any;
    info: GraphQLResolveInfo;
  };
  err?: Error;
}

export type IMiddlewareHookFn<T, D> = (
  hookContext: IHookFnContext<T, D>
) => void | Promise<void>;

export interface IMiddlewareHooks<T, D> {
  [key: string]: Array<IMiddlewareHookFn<T, D>>;
}

const defaultOptions: IMiddlewareOptions = {
  rootSpanOptions: {
    name: 'graphqlRequest'
  }
};

const runHook = async <T, D>(
  hooks: IMiddlewareHooks<T, D>,
  name: string,
  hookFnContext: IHookFnContext<T, D>
) => {
  const hook = hooks[name];

  if (!Array.isArray(hook)) {
    return;
  }

  for (const hookFn of hook) {
    await hookFn.apply(null, [hookFnContext]);
  }
};

export const graphqlJaegerMiddleware: <T = any, D = any>(
  tracerConfig: Config,
  options: JaegerTraceExporterOptions,
  middlewareOptions: IMiddlewareOptions,
  hooks: IMiddlewareHooks<T, D>
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
          await runHook(hooks, 'preResolve', {
            rootSpan: span,
            context,
            data: { parent, args, info }
          });

          // Execute resolver and record root span
          try {
            span.start();
            const data = await resolve(parent, args, context, info);

            // Execute hooks
            await runHook(hooks, 'postResolve', {
              rootSpan: span,
              data: { resolvedData: data, parent, args, info },
              context
            });

            span.end();
            pResolve(data);
          } catch (err) {
            // Execute hooks
            await runHook(hooks, 'resolveError', {
              rootSpan: span,
              err,
              context,
              data: { parent, args, info }
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
