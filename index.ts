import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = 3000;

app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

const limiter = rateLimit({
  windowMs: 60_000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

app.use(express.static(path.join(process.cwd(), 'public')));

app.use((req: Request, res: Response, next: NextFunction) => {
  const clientIp =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'unknown';

  console.log(`[REQ] ${req.method} ${req.path} → ${clientIp}`);
  next();
});

app.get('/', (_req: Request, res: Response) => {
  res.send('Login Server Running');
});

app.all('/player/login/dashboard', async (req: Request, res: Response) => {
  const body = req.body;
  let clientData = '';

  if (body && typeof body === 'object' && Object.keys(body).length > 0) {
    clientData = Object.keys(body)[0];
  }

  const encodedClientData = Buffer.from(clientData).toString('base64');

  const templatePath = path.join(process.cwd(), 'template', 'dashboard.html');
  const templateContent = fs.readFileSync(templatePath, 'utf-8');

  const htmlContent = templateContent.replace('{{ data }}', encodedClientData);

  res.setHeader('Content-Type', 'text/html');
  res.send(htmlContent);
});

app.all('/player/growid/login/validate', async (req: Request, res: Response) => {
  try {
    let growId = '';
    let password = '';
    let _token = '';
    let email = '';

    if (typeof req.body === 'object' && req.body !== null) {
      const body = req.body as Record<string, string>;

      if (body.growId || body.password) {
        growId = body.growId || '';
        password = body.password || '';
        _token = body._token || '';
        email = body.email || '';
      } else if (Object.keys(body).length === 1) {
        const rawPayload = Object.keys(body)[0];
        const params = new URLSearchParams(rawPayload);

        growId = params.get('growId') || '';
        password = params.get('password') || '';
        _token = params.get('_token') || '';
        email = params.get('email') || '';
      }
    }

    if (!_token || _token === 'undefined') {
      _token = '';
    }

    if (!growId && !password) {
      const raw = `_token=${_token}&growId=&password=`;
      const token = Buffer.from(raw).toString('base64');

      return res.json({
        status: 'success',
        message: 'Register Mode',
        token,
        url: '',
        accountType: 'growtopia',
      });
    }

    if (!growId || !password) {
      return res.json({
        status: 'error',
        message: 'growId and password required',
      });
    }

    let raw = `_token=${_token}&growId=${growId}&password=${password}`;
    if (email) raw += `&email=${email}`;

    const token = Buffer.from(raw).toString('base64');

    return res.json({
      status: 'success',
      message: 'Account Validated.',
      token,
      url: '',
      accountType: 'growtopia',
    });

  } catch (error) {
    console.log(`[ERROR]: ${error}`);
    return res.status(500).json({
      status: 'error',
      message: 'Internal Server Error',
    });
  }
});
app.all('/player/growid/checktoken', async (_req: Request, res: Response) => {
  return res.redirect(307, '/player/growid/validate/checktoken');
});

app.all('/player/growid/validate/checktoken', async (req: Request, res: Response) => {
  try {
    let refreshToken = '';

    if (typeof req.body === 'object' && req.body !== null) {
      const body = req.body as Record<string, string>;

      if (body.refreshToken) {
        refreshToken = body.refreshToken;
      } else if (Object.keys(body).length === 1) {
        const rawPayload = Object.keys(body)[0];
        const params = new URLSearchParams(rawPayload);
        refreshToken = params.get('refreshToken') || '';
      }
    }

    if (!refreshToken) {
      return res.json({
        status: 'error',
        message: 'Missing refreshToken',
      });
    }

    const decoded = Buffer.from(refreshToken, 'base64').toString('utf-8');
    const token = Buffer.from(decoded).toString('base64');

    return res.json({
      status: 'success',
      message: 'Account Validated.',
      token,
      url: '',
      accountType: 'growtopia',
      accountAge: 2,
    });

  } catch (error) {
    console.log(`[ERROR]: ${error}`);
    return res.json({
      status: 'error',
      message: 'Internal Server Error',
    });
  }
});

app.listen(PORT, () => {
  console.log(`[SERVER] Running on http://localhost:${PORT}`);
});

export default app;
