import app from '../apps/api/dist/app.js';

type HandlerRequest = Parameters<typeof app>[0] & {
  query?: Record<string, string | string[] | undefined>;
};

export default function handler(
  req: HandlerRequest,
  res: Parameters<typeof app>[1]
) {
  const rewrittenPath = req.query?.__path;

  if (typeof rewrittenPath === 'string') {
    const query = new URLSearchParams();

    for (const [key, value] of Object.entries(req.query ?? {})) {
      if (key === '__path' || value === undefined) continue;

      if (Array.isArray(value)) {
        value.forEach((item) => query.append(key, item));
      } else {
        query.set(key, value);
      }
    }

    const queryString = query.toString();
    req.url = `/api/${rewrittenPath}${queryString ? `?${queryString}` : ''}`;
  }

  return app(req, res);
}
