# NutriSun Frontend

Modern web frontend for the **NutriSun** meal subscription platform, built with **Next.js 16**, **React 19**, **TypeScript**, and **Tailwind CSS**.

---

## Overview

NutriSun Frontend delivers responsive customer and role-based staff dashboards:
- **Customer Portal**: Subscription enrollment, daily meal slot selection (Breakfast, Lunch, Dinner), meal skips, cycle pauses, credit transactions, and manual UPI payment confirmation with receipt uploads.
- **Admin Dashboard**: Subscription lifecycle oversight, sales analytics, customer profile management, staff activation/locking, temporary password resets, and plan pricing administration.
- **Chef Dashboard**: Live kitchen production quotas, dietary preference filtering (Veg, Non-Veg, Egg), and meal status progression.
- **Delivery Hub**: Real-time address dispatch lists, customer delivery instructions, and proof-of-delivery status.

---

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **State & Auth**: React Context API with JWT session handling

---

## Getting Started

### 1. Prerequisites

- Node.js 20+ installed
- NutriSun backend service running (default: `http://localhost:8080`)

### 2. Environment Setup

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Configure the backend API endpoint in `.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api
INTERNAL_BACKEND_URL=http://localhost:8080
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Building for Production

Create an optimized production build:

```bash
npm run build
```

Start the production server:

```bash
npm start
```

---

## Project Structure

```
.
├── public/                 # Static assets (logos, icons, UPI QR code)
├── src/
│   ├── app/                # Next.js App Router pages & layouts
│   │   ├── dashboard/      # Role-based dashboards (admin, customer, chef, delivery, menu)
│   │   ├── login/          # User login
│   │   ├── register/       # User registration
│   │   ├── globals.css     # Global styles & Tailwind directives
│   │   ├── layout.tsx      # Root layout
│   │   └── page.tsx        # Landing / marketing page
│   ├── components/         # Reusable UI components & modals
│   ├── config/             # Payment & app configurations
│   ├── context/            # AuthContext & session state
│   └── lib/                # API client utilities
├── .env.example            # Environment template
├── .gitignore              # Git ignore rules
├── next.config.ts          # Next.js configuration
├── package.json            # Project dependencies & scripts
├── tsconfig.json           # TypeScript configuration
└── README.md               # Documentation
```

---

## License

Proprietary - NutriSun Meal Services. All rights reserved.
