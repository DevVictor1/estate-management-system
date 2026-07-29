import estateHubIcon from "../assets/branding/estatehub-icon.png";

function AuthBranding({ subtitle }) {
  return (
    <div className="auth-branding">
      <img
        src={estateHubIcon}
        alt="EstateHub icon"
        className="auth-branding-logo"
      />
      <div className="auth-branding-copy">
        <h1 className="auth-branding-title">EstateHub</h1>
        <p className="auth-branding-subtitle">{subtitle}</p>
      </div>
    </div>
  );
}

export default AuthBranding;
