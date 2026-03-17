import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = 3000;

app.set('trust proxy', 1);
app.disable('x-powered-by');

// middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// rate limiter
app.use(rateLimit({
  windowMs: 60_000,
  max: 50,
}));

// static
app.use(express.static(path.join(process.cwd(), 'public')));

// logger
app.use((req: Request, _res: Response, next: NextFunction) => {
  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
    req.socket.remoteAddress;

  console.log(`[REQ] ${req.method} ${req.path} → ${ip}`);
  next();
});

// ================= ROOT =================
app.get('/', (_req, res) => {
  res.send('Hello, world!');
});

// ================= DASHBOARD =================
app.all('/player/login/dashboard', (req: Request, res: Response) => {
  const body = req.body;
  let clientData = '';

  if (body && Object.keys(body).length > 0) {
    clientData = Object.keys(body)[0];
  }

  const encoded = Buffer.from(clientData).toString('base64');

  const filePath = path.join(process.cwd(), 'template', 'dashboard.html');
  let html = fs.readFileSync(filePath, 'utf-8');

  html = html.replace('{{ data }}', encoded);

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

// ================= LOGIN =================
app.post('/player/growid/login/validate', (req: Request, res: Response) => {
  const { growId, password, _token } = req.body;

  if (!growId || !password) {
    return res.json({
      status: 'error',
      message: 'Missing credentials',
    });
  }

  const raw = `_token=${_token}&growId=${growId}&password=${password}`;
  const token = Buffer.from(raw).toString('base64');

  res.json({
    status: 'success',
    message: 'Login success',
    token,
  });
});

// ================= REGISTER PAGE =================
app.get('/register', (_req, res) => {
  res.send(`
    <h2>Register Page</h2>
    <form method="POST" action="/player/growid/register">
      <input name="growId" placeholder="Username"/><br>
      <input name="password" type="password" placeholder="Password"/><br>
      <button type="submit">Register</button>
    </form>
  `);
});

// ================= REGISTER =================
app.post('/player/growid/register', (req: Request, res: Response) => {
  const { growId, password } = req.body;

  if (!growId || !password) {
    return res.json({
      status: 'error',
      message: 'Missing credentials',
    });
  }

  res.json({
    status: 'success',
    message: 'Account Registered',
  });
});

// ================= CHECK TOKEN =================
app.post('/player/growid/validate/checktoken', (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.json({
      status: 'error',
      message: 'Missing refreshToken',
    });
  }

  const decoded = Buffer.from(refreshToken, 'base64').toString('utf-8');
  const token = Buffer.from(decoded).toString('base64');

  res.json({
    status: 'success',
    token,
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
