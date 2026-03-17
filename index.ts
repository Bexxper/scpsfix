import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = 3000;

app.set('trust proxy', 1);

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

// logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'unknown';

  console.log(`[REQ] ${req.method} ${req.path} → ${ip}`);
  next();
});

// root
app.get('/', (_req, res) => {
  res.send('OK');
});

// dashboard
app.all('/player/login/dashboard', async (req: Request, res: Response) => {
  let clientData = '';

  if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
    clientData = Object.keys(req.body)[0];
  }

  const encodedClientData = Buffer.from(clientData).toString('base64');

  const templatePath = path.join(process.cwd(), 'template', 'dashboard.html');
  const template = fs.readFileSync(templatePath, 'utf-8');

  const html = template.replace('<%= data %>', encodedClientData);

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

// LOGIN VALIDATE (FIXED)
app.all('/player/growid/login/validate', async (req: Request, res: Response) => {
  try {
    const form = req.body as Record<string, string>;

    const _token = form._token || '';
    const growId = form.growId || '';
    const password = form.password || '';
    const email = form.email || '';
    const reg = form.reg === '1';

    if (!growId || !password) {
      return res.json({
        status: 'error',
        message: 'Missing credentials',
      });
    }

    let payload = `_token=${_token}&growId=${growId}&password=${password}`;

    if (email) payload += `&email=${email}`;
    payload += `&reg=${reg ? 1 : 0}`;

    const token = Buffer.from(payload).toString('base64');

    res.json({
      status: 'success',
      message: 'Account Validated.',
      token,
      url: '',
      accountType: 'growtopia',
    });
  } catch (err) {
    console.log(err);
    res.json({ status: 'error' });
  }
});

// redirect
app.all('/player/growid/checktoken', (_req, res) => {
  res.redirect(307, '/player/growid/validate/checktoken');
});

// CHECKTOKEN (NO MODIFY TOKEN)
app.all('/player/growid/validate/checktoken', async (req: Request, res: Response) => {
  try {
    const form = req.body as Record<string, string>;

    const refreshToken = form.refreshToken;
    const clientData = form.clientData;

    if (!refreshToken || !clientData) {
      return res.json({
        status: 'error',
        message: 'Missing refreshToken or clientData',
      });
    }

    // 🔥 FIX: return token apa adanya
    const token = refreshToken;

    res.json({
      status: 'success',
      message: 'Account Validated.',
      token,
      url: '',
      accountType: 'growtopia',
      accountAge: 2,
    });
  } catch (err) {
    console.log(err);
    res.json({ status: 'error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running http://localhost:${PORT}`);
});

export default app;
