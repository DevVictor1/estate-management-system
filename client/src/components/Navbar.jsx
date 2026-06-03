import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Navbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="topbar">
      <div>
        <p className="topbar-label">
          Estate Service Provider and Contractor Management System
        </p>
        <h2 className="topbar-title">Control Panel</h2>
      </div>

      <div className="topbar-actions">
        <div className="topbar-user">
          <p className="topbar-user-name">{user?.fullName || "User"}</p>
          <p className="topbar-user-role">
            {user?.role?.replace("_", " ") || "No role"}
          </p>
        </div>

        <button type="button" onClick={handleLogout} className="topbar-button">
          Logout
        </button>
      </div>
    </header>
  );
}

export default Navbar;
