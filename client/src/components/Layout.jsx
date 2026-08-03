import { NavLink, Outlet } from "react-router-dom";
import {
  FaClipboardCheck,
  FaFileContract,
  FaFileInvoiceDollar,
  FaGaugeHigh,
  FaMoneyBillWave,
  FaTriangleExclamation,
  FaUsersGear,
} from "react-icons/fa6";
import Navbar from "./Navbar";
import { useAuth } from "../context/AuthContext";
import estateHubIcon from "../assets/branding/estatehub-icon.png";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: FaGaugeHigh },
  {
    to: "/service-providers",
    label: "Service Providers",
    icon: FaUsersGear,
  },
  { to: "/tasks", label: "Tasks", icon: FaClipboardCheck },
  { to: "/quotations", label: "Quotations", icon: FaFileInvoiceDollar },
  {
    to: "/complaints",
    label: "Complaints",
    icon: FaTriangleExclamation,
  },
  { to: "/contracts", label: "Contracts", icon: FaFileContract },
  { to: "/payments", label: "Payments", icon: FaMoneyBillWave },
];

function Layout() {
  const { user } = useAuth();
  const visibleNavItems = navItems
    .filter((item) => {
      if (user?.role === "service_provider" && item.to === "/complaints") {
        return false;
      }

      if (user?.role === "resident" && item.to === "/quotations") {
        return false;
      }

      if (user?.role === "resident" && item.to === "/contracts") {
        return false;
      }

      if (user?.role === "resident" && item.to === "/payments") {
        return false;
      }

      return true;
    })
    .map((item) => {
      if (user?.role === "service_provider" && item.to === "/contracts") {
        return {
          ...item,
          label: "My Contract",
        };
      }

      if (user?.role === "service_provider" && item.to === "/payments") {
        return {
          ...item,
          label: "My Payments",
        };
      }

      return item;
    });

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-panel">
          <div className="brand">
            <span className="brand-mark">
              <img src={estateHubIcon} alt="EstateHub icon" />
            </span>
            <div>
              <h1>EstateHub</h1>
              <p>Operations Portal</p>
            </div>
          </div>

          <nav className="sidebar-nav" aria-label="Sidebar navigation">
            {visibleNavItems.map((item) => {
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
            <h2>EstateHub Dashboard</h2>
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
