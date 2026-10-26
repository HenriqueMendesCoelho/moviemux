import { defineSsrMiddleware } from '#q-app';
import type { SsrRenderRedirectError, SsrRenderRouteNotFoundError } from '#q-app';

function isRedirectError(err: unknown): err is SsrRenderRedirectError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'redirectUrl' in err &&
    'redirectHttpStatusCode' in err
  );
}

function isRouteNotFoundError(err: unknown): err is SsrRenderRouteNotFoundError {
  return typeof err === 'object' && err !== null && 'routeNotFound' in err;
}

// This middleware should execute as last one
// since it captures everything and tries to
// render the page with Vue

export default defineSsrMiddleware(({ app, resolve, render, serve }) => {
  // we capture any other Express route and hand it
  // over to Vue and Vue Router to render our page
  app.get(resolve.urlPath('{*path}'), async (req, res) => {
    res.setHeader('Content-Type', 'text/html');

    try {
      // now let's send the rendered html to the client
      const html = await render({ req, res });
      res.send(html);
    } catch (err) {
      // oops, we had an error while rendering the page

      if (isRouteNotFoundError(err)) {
        // hmm, Vue Router could not find the requested route

        // Should reach here only if no "catch-all" route
        // is defined in /src/routes
        res.status(404).send('404 | Page Not Found');
        return;
      }

      if (isRedirectError(err)) {
        // we were told to redirect to another URL
        res.redirect(err.redirectHttpStatusCode, err.redirectUrl);
        return;
      }

      if (import.meta.env.QUASAR_DEV) {
        // well, we treat any other code as error;
        // if we're in dev mode, then we can use Quasar CLI
        // to display a nice error page that contains the stack
        // and other useful information

        // serve.devError is available on dev only
        const { errorHeaders, errorHtml } = serve.devError({ err, req });
        res.set(errorHeaders).status(500).send(errorHtml);
        return;
      }

      // we're in production, so we should have another method
      // to display something to the client when we encounter an error
      // (for security reasons, it's not ok to display the same wealth
      // of information as we do in development)

      // Render Error Page on production or
      // create a route (/src/routes) for an error page and redirect to it
      res.status(500).send('500 | Internal Server Error');

      if (import.meta.env.QUASAR_DEBUG) {
        console.error(err instanceof Error ? err.stack : err);
      }
    }
  });
});
