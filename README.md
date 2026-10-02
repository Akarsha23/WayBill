This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Project Structure

WayBill/
├── public/              # Static assets and icons

├── src/

│   ├── app/             # Next.js App Router pages & API routes

│   ├── components/      # Reusable UI components

│   ├── lib/             # Utility functions and optimization logic

│   └── types/           # TypeScript type definitions

├── Dockerfile           # Container build configuration

├── docker-compose.yml   # Docker multi-container setup

├── package.json         # Project dependencies and scripts

└── README.md            # Project documentation


# WayBill 🚚📦

**WayBill** is an intelligent logistics, dispatch, and route optimization platform built for the **SLASSCOM Xcellerate Tech Triathlon 2026**. It streamlines package allocations, calculates optimized transport routes, and provides real-time shipment visibility for logistics operations.

---

## 🚀 Features

- **Route Optimization:** Algorithmic routing designed to minimize travel time and distance for vehicle fleets.
- **Logistics Allocation Engine:** Automated package-to-vehicle allocation based on capacity and destination.
- **Real-Time Tracking & Management:** Interactive dashboards to monitor fleet routes and shipment status.
- **Modern UI/UX:** Fast, responsive, and intuitive interface built with Next.js and modern styling frameworks.
- **Containerized Deployment:** Fully Dockerized setup for consistent development and production environments.

---

## 🛠️️ Tech Stack

- **Frontend / Framework:** [Next.js](https://nextjs.org/) (React, TypeScript)
- **Styling:** Tailwind CSS / UI Components
- **Containerization:** Docker & Docker Compose
- **Version Control:** Git & GitHub

---

## 📦 Installation & Setup

Follow these steps to get a local copy running on your machine:

### Prerequisites

Ensure you have the following installed:
- **Node.js** (v18.x or higher)
- **npm**, **yarn**, or **pnpm**
- **Docker** (optional, for containerized execution)

---

### Local Development Setup

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/Akarsha23/WayBill.git](https://github.com/Akarsha23/WayBill.git)
   cd WayBill
