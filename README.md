# graphql-middleware-jaeger

> The easiest way to add tracing support to your GraphQL service

Based on the [OpenCensus](https://opencensus.io/) project, this minimal library provides an easy solution to add basic tracing to your services. Recorded traces are exported to a supplied Jaeger instance automatically.

## getting started

First of all, install this middleware from your package registry by running the following:

```bash
yarn add graphql-middleware-jaeger

# or using npm
npm i graphql-middleware-jaeger
```

After this is done, you can simply add the middleware to your existing service

```typescript
// TBA
```

## configuration

The core principle of this package is to stay as unopinionated as possible towards the actual usage, which is why you can configure every aspect, except the run-time behaviour of resolving the middleware.

### options

TBA

### hooks

Since there's contextual data that you might want to add to your span, this middleware allows you to define a number of hooks triggered at specific execution points.

Available hooks are `preResolve`, `postResolve`, `resolveError`
