const port = Number(process.env.PORT ?? 3001);

function responseFor(pathname: string): Response {
  switch (pathname) {
    case '/health':
      return Response.json({ ok: true });
    default:
      return new Response('not found', { status: 404 });
  }
}

Bun.serve({
  hostname: '0.0.0.0',
  port,
  fetch(request) {
    return responseFor(new URL(request.url).pathname);
  },
});
