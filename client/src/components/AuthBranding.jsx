import { Link } from "react-router-dom";
import estateHubIcon from "../assets/branding/estatehub-icon.png";

function AuthBranding({ subtitle }) {
  return (
    <Link to="/" className="auth-branding" aria-label="Go to EstateHub home">
      <img
        src={estateHubIcon}
        alt="EstateHub icon"
        className="auth-branding-logo"
      />
      <div className="auth-branding-copy">
        <h1 className="auth-branding-title">EstateHub</h1>
        <p className="auth-branding-subtitle">{subtitle}</p>
      </div>
    </Link>
  );
}

export default AuthBranding;
