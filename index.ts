import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = 3000;

app.set('trust proxy', 1);
app.disable('x-powered-by');

// ================= MIDDLEWARE =================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

const limiter = rateLimit({
  windowMs: 60_000,
  max: 50,
});
app.use(limiter);

// ================= STATIC =================
app.use(express.static(path.join(process.cwd(), 'public')));

// ================= LOGGER =================
app.use((req: Request, res: Response, next: NextFunction) => {
  const clientIp =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'unknown';

  console.log(`[REQ] ${req.method} ${req.path} → ${clientIp}`);
  next();
});

// ================= ROOT =================
app.get('/', (_req: Request, res: Response) => {
  res.send('Login Server Running');
});

// ================= DASHBOARD =================
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

// ================= LOGIN VALIDATE =================
app.all('/player/growid/login/validate', async (req: Request, res: Response) => {
  try {
    const body = req.body;

    let growId = body.growId || body.growid || '';
    let password = body.password || '';
    let _token = body._token || body.token || '';

    // fallback parsing (Windows raw payload)
    if (!growId && Object.keys(body).length === 1) {
      const raw = Object.keys(body)[0];
      const params = new URLSearchParams(raw);

      growId = params.get('growId') || '';
      password = params.get('password') || '';
      _token = params.get('_token') || '';
    }

    // generate token ALWAYS
    const rawToken = `_token=${_token}&growId=${growId}&password=${password}`;
    const token = Buffer.from(rawToken).toString('base64');

    // ================= REGISTER MODE =================
    if (!growId && !password) {
      return res.json({
        status: 'success',
        message: 'Register Mode',
        token,
        url: '', // penting: kosong untuk Windows
        accountType: 'growtopia',
      });
    }

    // ================= LOGIN VALID =================
    return res.json({
      status: 'success',
      message: 'Account Validated.',
      token,
      url: '', // kosongkan untuk hindari flow checktoken Windows
      accountType: 'growtopia',
    });

  } catch (error) {
    console.log(`[ERROR]: ${error}`);
    res.status(500).json({
      status: 'error',
      message: 'Internal Server Error',
    });
  }
});

// ================= CHECKTOKEN =================
// hanya dipakai iOS, Windows tidak butuh
app.all('/player/growid/checktoken', async (req: Request, res: Response) => {
  return res.redirect(307, '/player/growid/validate/checktoken');
});

app.all('/player/growid/validate/checktoken', async (req: Request, res: Response) => {
  try {
    let refreshToken = req.body.refreshToken;

    // fallback parsing
    if (!refreshToken && Object.keys(req.body).length === 1) {
      const raw = Object.keys(req.body)[0];
      const params = new URLSearchParams(raw);
      refreshToken = params.get('refreshToken') || '';
    }

    if (!refreshToken) {
      // fallback supaya Windows gak error
      return res.json({
        status: 'success',
        message: 'Bypassed',
        token: '',
        url: '',
        accountType: 'growtopia',
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
    res.json({
      status: 'error',
      message: 'Internal Server Error',
    });
  }
});

// ================= START =================
app.listen(PORT, () => {
  console.log(`[SERVER] Running on http://localhost:${PORT}`);
});

export default app;
