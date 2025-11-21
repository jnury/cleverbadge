# Clever Badge

Clever Badge is an online skills assessment tool.

## Tech Stack
- **Frontend**: React (Vite) + TailwindCSS
- **Backend**: Node.js (Express)
- **Database**: PostgreSQL (Prisma ORM)

## Getting Started

### Prerequisites
- Node.js
- PostgreSQL (Local installation)

### Database Setup
1. Open your terminal and log in to the PostgreSQL console:
   ```bash
   psql postgres
   ```
2. Run the following SQL commands to create the user and database:
   ```sql
   CREATE USER cleverbadge_user WITH PASSWORD 'secure_password';
   CREATE DATABASE cleverbadge;
   GRANT ALL PRIVILEGES ON DATABASE cleverbadge TO cleverbadge_user;
   \c cleverbadge
   GRANT ALL ON SCHEMA public TO cleverbadge_user;
   ```
4. **Setup Environment Variables**:
   - Copy `server/.env.example` to `server/.env`.
   - Update `DATABASE_URL` in `server/.env`:
   ```env
   DATABASE_URL="postgresql://cleverbadge_user:secure_password@localhost:5432/cleverbadge?schema=public"
   ```

### Server
```bash
cd server
npm install
# Create .env file if you haven't already
cp .env.example .env
# Run migrations
npx prisma migrate dev --name init
npm run dev
```

### Client
```bash
cd client
npm install
npm run dev
```
