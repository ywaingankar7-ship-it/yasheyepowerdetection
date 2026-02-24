import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { User } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface LayoutProps {
  user: User;
  onLogout: () => void;
}

export default function Layout({ user, onLogout }: LayoutProps) {
  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar user={user} onLogout={onLogout} />
      <div className="flex-1 ml-64 flex flex-col">
        <Header user={user} />
        <main className="flex-1 p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={window.location.pathname}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
