# DEPT_C

Computer department system — classes, registration, students, exams, books, and attendance.

## Stack

| Layer | Tech |
|-------|------|
| Frontend (`client/`) | React + Vite + Tailwind CSS |
| Backend (`server/`) | Node.js + Express |
| ORM | Prisma |
| Database | PostgreSQL |

## Modules

- **Dashboard** — overview stats
- **Classes** — search + create (class name can repeat; **class code must be unique**)
- **Registration** — student ID, name, class, picture, enrollment status
- **Students** — all students + single student detail
- **Exams** — each student gets **2** exams (Paper + Practical) → mark **COMPLETE**
- **Books** — **6** books, each with Paper + Practical → mark **COMPLETE**
- **Attendances** — daily attendance

## Setup

1. Create DB: `CREATE DATABASE dept_c;`
2. Set `server/.env` `DATABASE_URL` with your PostgreSQL password
3. Install + migrate + seed:

```bash
npm run install:all
cd server
npx prisma db push
npm run db:seed
cd ..
npm run dev
```

- App: http://localhost:5173  
- API: http://localhost:5000  

## Login

| Role | Email | Password |
|------|-------|----------|
| ADMIN | admin@deptc.com | admin123 |
| MANAGER | manager@deptc.com | manager123 |

## Sample classes (seeded)

- Team Group A – 2026 (`TGA-2026`)
- Team Group B – 2026 (`TGB-2026`)
- Team Group C – 2026 (`TGC-2026`)
- Team Group D – 2026 (`TGD-2026`)
