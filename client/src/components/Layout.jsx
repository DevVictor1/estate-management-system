import { NavLink, Outlet } from "react-router-dom";
import {
  FaClipboardCheck,
  FaFileContract,
  FaGaugeHigh,
  FaMoneyBillWave,
  FaTriangleExclamation,
  FaUsersGear,
} from "react-icons/fa6";
import Navbar from "./Navbar";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: FaGaugeHigh },
  {
    to: "/service-providers",
    label: "Service Providers",
    icon: FaUsersGear,
  },
  { to: "/tasks", label: "Tasks", icon: FaClipboardCheck },
  {
    to: "/complaints",
    label: "Complaints",
    icon: FaTriangleExclamation,
  },
  { to: "/contracts", label: "Contracts", icon: FaFileContract },
  { to: "/payments", label: "Payments", icon: FaMoneyBillWave },
];

function Layout() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-panel">
          <div className="brand">
            <span className="brand-mark">EMS</span>
            <div>
              <h1>Estate Manager</h1>
              <p>Operations Portal</p>
            </div>
          </div>

          <nav className="sidebar-nav" aria-label="Sidebar navigation">
            {navItems.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    isActive ? "nav-link active" : "nav-link"
                  }
                >
                  <span className="nav-link-icon">
                    <Icon />
                  </span>
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          <div className="sidebar-footer">
            <p className="sidebar-footer-label">Workspace</p>
            <h2>Estate Services Dashboard</h2>
            <p className="sidebar-footer-text">
              Track providers, complaints, contracts, and payments from one
              place.
            </p>
          </div>
        </div>
      </aside>

      <div className="content-shell">
        <Navbar />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default Layout;
