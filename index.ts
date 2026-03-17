import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = 3000;

// ===== CONFIG =====
app.set('trust proxy', 1);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

const limiter = rateLimit({
  windowMs: 60_000,
  max: 50,
});
app.use(limiter);

app.use(express.static(path.join(process.cwd(), 'public')));

// ===== DATABASE JSON =====
const DB_PATH = path.join(process.cwd(), 'database.json');

// auto create file kalau belum ada
if (!fs.existsSync(DB_PATH)) {
  fs.writeFileSync(DB_PATH, '[]');
}

function loadDB(): any[] {
  try {
    const data = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(data || '[]');
  } catch {
    return [];
  }
}

function saveDB(data: any[]) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// ===== LOGGING =====
app.use((req: Request, _res: Response, next: NextFunction) => {
  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
    req.socket.remoteAddress;

  console.log(`[REQ] ${req.method} ${req.path} → ${ip}`);
  next();
});

// ===== DASHBOARD =====
app.all('/player/login/dashboard', (req: Request, res: Response) => {
  let clientData = '';

  if (req.body && Object.keys(req.body).length > 0) {
    clientData = Object.keys(req.body)[0];
  }

  const encoded = Buffer.from(clientData).toString('base64');

  const template = fs.readFileSync(
    path.join(process.cwd(), 'template', 'dashboard.html'),
    'utf-8'
  );

  res.send(template.replace('{{ data }}', encoded));
});

// ===== LOGIN / REGISTER =====
app.all('/player/growid/login/validate', (req: Request, res: Response) => {
  try {
    const { _token, growId, password, email } = req.body;

    let db = loadDB();

    // ===== REGISTER =====
    if (email) {
      const exists = db.find((u) => u.growId === growId);

      if (exists) {
        return res.json({
          status: 'error',
          message: 'GrowID already exists',
        });
      }

      db.push({
        growId,
        password,
        email,
      });

      saveDB(db);
      console.log(`[REGISTER] ${growId}`);
    } else {
      // ===== LOGIN =====
      const user = db.find(
        (u) => u.growId === growId && u.password === password
      );

      if (!user) {
        return res.json({
          status: 'error',
          message: 'Invalid credentials',
        });
      }

      console.log(`[LOGIN] ${growId}`);
    }

    // ===== TOKEN (SINKRON C++) =====
    const raw = `_token=${_token}&growId=${growId}&password=${password}`;
    const token = Buffer.from(raw).toString('base64');

    res.json({
      status: 'success',
      message: 'Account Validated',
      token,
      accountType: 'growtopia',
    });
  } catch (e) {
    console.log(e);
    res.status(500).json({ status: 'error' });
  }
});

// ===== CHECK TOKEN =====
app.all('/player/growid/checktoken', (_req, res) => {
  return res.redirect(307, '/player/growid/validate/checktoken');
});

app.all('/player/growid/validate/checktoken', (req, res) => {
  try {
    const { refreshToken, clientData } = req.body;

    if (!refreshToken || !clientData) {
      return res.json({
        status: 'error',
        message: 'Missing token',
      });
    }

    let decoded = Buffer.from(refreshToken, 'base64').toString();

    const newToken = Buffer.from(
      decoded.replace(
        /(_token=)[^&]*/,
        `$1${Buffer.from(clientData).toString('base64')}`
      )
    ).toString('base64');

    res.json({
      status: 'success',
      token: newToken,
      accountType: 'growtopia',
    });
  } catch {
    res.json({ status: 'error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
