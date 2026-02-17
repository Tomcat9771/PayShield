# GuardPay Backend (Express + Prisma)

This repository contains a ready-to-run backend for the GuardPay QR payment app.
It provides:
- Guards CRUD
- Transactions created via payment webhook or admin
- Payout creation endpoint
- Basic JWT admin auth
- Prisma schema and seed script

## Quickstart (local)

1. Install dependencies
```bash
npm install
```

2. Create a `.env` file (copy from `.env.example`) and set:
```
DATABASE_URL="postgresql://user:pass@localhost:5432/guardpay"
JWT_SECRET="change-this"
COMMISSION=0.05
PORT=4000
```

3. Generate Prisma client and run migrations:
```bash
npx prisma generate
npx prisma migrate dev --name init
node prisma/seed.js
```

4. Start the server:
```bash
npm run dev
```

The server will run on `http://localhost:4000` by default.

## Endpoints

Public:
- `GET /api/guards/:id` - get guard by id
- `POST /api/payments/webhook` - payment provider webhook

Admin (requires `Authorization: Bearer <token>`):
- `POST /api/auth/register` - create admin (seed creates one)
- `POST /api/auth/login` - login to receive JWT
- `GET/POST/PUT/DELETE /api/guards`
- `GET /api/transactions`
- `GET /api/payouts`

See `routes/` for implementation details.
