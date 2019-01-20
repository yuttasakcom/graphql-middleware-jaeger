# graphql-middleware-jaeger

> The easiest way to add tracing support to your GraphQL service

Based on the [OpenCensus](https://opencensus.io/) project, this minimal library provides an easy solution to add basic tracing to your services. Recorded traces are exported to a supplied [Jaeger](https://www.jaegertracing.io/) instance automatically.

## getting started

First of all, install this middleware from your package registry by running the following:

```bash
yarn add graphql-middleware-jaeger

# or using npm
npm i graphql-middleware-jaeger
```

After this is done, you can simply add the middleware to your existing service, it could look like the following snippet

```typescript
import { graphqlJaegerMiddleware } from 'graphql-middleware-jaeger';
import { makeExecutableSchema } from 'graphql-tools';
import { applyMiddleware } from 'graphql-middleware';
import { gql, ApolloServer } from 'apollo-server';
import { Request, Response } from 'express';

...

const tracingMiddleware = graphqlJaegerMiddleware<IContext>(
  { logLevel: 3, samplingRate: 1 },
  { host: 'tracing', serviceName: 'example-service' },
  { rootSpanOptions: { name: 'graphqlRequest' } },
  {
    preResolve: [
      ({ context, rootSpan }) => {
        const { req } = context;
        rootSpan.addAttribute('ip', req.ip);
      }
    ]
  }
);

const withTracing = {
  Query: tracingMiddleware,
  Mutation: tracingMiddleware
};

const schema = applyMiddleware(
  makeExecutableSchema({ typeDefs, resolvers }),
  withTracing
);
```

## configuration

The core principle of this package is to stay as unopinionated as possible towards the actual usage, which is why you can configure every aspect, except the run-time behaviour of resolving the middleware.

### options

You can configure the OpenCensus tracer, as well as the Jaeger exporter. For more details, head over to the [OpenCensus Node.js repository](https://github.com/census-instrumentation/opencensus-node).

### hooks

Since there's contextual data that you might want to add to your span, this middleware allows you to define a number of hooks triggered at specific execution points. An example of the usage of hooks is included in the example code above.

Available hooks are: `preResolve`, `postResolve`, `resolveError`
