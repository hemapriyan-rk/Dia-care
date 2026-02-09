import { NavLink } from "react-router-dom";
import { LayoutDashboard, FileText, History, LogOut } from "lucide-react";
import { Button } from "./ui/button";
import { useAuth } from "../../contexts/AuthContext";

export function Navigation() {
  const { logout } = useAuth();

  const navItems = [
    { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/daily-entry", icon: FileText, label: "Daily Entry" },
    { to: "/history", icon: History, label: "History" },
  ];

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div className="flex space-x-8">
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center space-x-2 py-4 px-3 border-b-2 transition-colors ${
                    isActive
                      ? "border-cyan-600 text-cyan-600"
                      : "border-transparent text-gray-600 hover:text-cyan-600 hover:border-gray-300"
                  }`
                }
              >
                <Icon className="w-5 h-5" />
                <span>{label}</span>
              </NavLink>
            ))}
          </div>
          <Button
            onClick={logout}
            variant="ghost"
            className="flex items-center space-x-2 text-gray-600 hover:text-red-600"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </Button>
        </div>
      </div>
    </nav>
  );
}
