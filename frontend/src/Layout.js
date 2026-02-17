import React from "react";
import { Link, useLocation, Outlet } from "react-router-dom";

const breadcrumbMap = {
  "/dashboard": "Dashboard",
  "/guards": "Guards",
  "/guards/new": "Add Guard",
  "/guards/:id/history": "Guard History",
  "/payouts": "Payouts",
  "/transactions": "Transactions",
  "/reconciliation": "Reconciliation",
  "/audit": "Audit Log",
};

function Breadcrumbs() {
  const location = useLocation();
  const parts = location.pathname.split("/").filter(Boolean);

  if (parts.length === 0) return null;

  let path = "";

  return (
    <div className="text-sm text-yellow-300 mb-4">
      {parts.map((part, idx) => {
        path += `/${part}`;

        let label = breadcrumbMap[path];

        if (!label && idx > 0) {
          const basePath = "/" + parts.slice(0, idx).join("/");
          label =
            breadcrumbMap[`${basePath}/:id/history`] ||
            breadcrumbMap[`${basePath}/:id`] ||
            part;
        }

        return (
          <span key={path}>
            {idx > 0 && " / "}
            {label}
          </span>
        );
      })}
    </div>
  );
}

export default function Layout() {
  return (
    <div className="min-h-screen bg-[#2b145f] text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-yellow-400/30">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <img
            src="/shieldpay-logo.png"
            alt="PayShield Logo"
            className="h-8 w-auto"
          />
          <span className="text-xl font-semibold">PayShield</span>
        </div>

        {/* Top Navigation */}
        <nav className="flex gap-5 text-sm font-medium">
          <Link to="/dashboard" className="hover:text-yellow-400">
            Dashboard
          </Link>
          <Link to="/guards" className="hover:text-yellow-400">
            View Guards
          </Link>
          <Link to="/guards/new" className="hover:text-yellow-400">
            Add Guard
          </Link>
          <Link to="/payouts" className="hover:text-yellow-400">
            Payouts
          </Link>
          <Link to="/transactions" className="hover:text-yellow-400">
            Transactions
          </Link>
          <Link to="/reconciliation" className="hover:text-yellow-400">
            Reconciliation
          </Link>
          <Link to="/audit" className="hover:text-yellow-400">
            Admin Audit Log
          </Link>
        </nav>
      </header>

      {/* Page content */}
      <main className="p-6">
        <Breadcrumbs />
        <div className="bg-white text-gray-900 rounded-2xl shadow-xl p-6">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 text-center text-sm text-yellow-200/80 border-t border-yellow-400/20">
        Hosted by <span className="font-medium">Shields Consulting</span>
      </footer>
    </div>
  );
}
