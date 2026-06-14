import app from '../apps/api/src/app';

export default function handler(
  req: Parameters<typeof app>[0],
  res: Parameters<typeof app>[1]
) {
  return app(req, res);
}
