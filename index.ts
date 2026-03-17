import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// DASHBOARD
app.all('/player/login/dashboard', (req: Request, res: Response) => {
  let clientData = '';

  if (req.body && Object.keys(req.body).length > 0) {
    clientData = Object.keys(req.body)[0];
  }

  const encoded = Buffer.from(clientData).toString('base64');

  const filePath = path.join(process.cwd(), 'template', 'dashboard.html');
  let html = fs.readFileSync(filePath, 'utf-8');

  html = html.replace('{{ data }}', encoded);

  res.send(html);
});

// LOGIN
app.post('/player/growid/login/validate', (req: Request, res: Response) => {
  const { growId, password, _token } = req.body;

  if (!growId || !password) {
    return res.json({
      status: 'error',
      message: 'Missing credentials'
    });
  }

  const token = Buffer.from(
    `_token=${_token}&growId=${growId}&password=${password}`
  ).toString('base64');

  res.json({
    status: 'success',
    message: 'Login success',
    token
  });
});

// REGISTER (AJAX)
app.post('/player/growid/register', (req: Request, res: Response) => {
  let { growId, password, _token } = req.body;

  if (!growId) growId = 'guest';
  if (!password) password = 'guest';

  const token = Buffer.from(
    `_token=${_token}&growId=${growId}&password=${password}`
  ).toString('base64');

  res.json({
    status: 'success',
    message: 'Register success',
    token
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
