import estateHubIcon from "../assets/branding/estatehub-icon.png";

function AppLoadingScreen() {
  return (
    <div className="app-loading-screen" role="status" aria-live="polite">
      <div className="app-loading-brand">
        <img
          src={estateHubIcon}
          alt=""
          className="app-loading-logo"
          aria-hidden="true"
        />
        <div className="app-loading-copy">
          <h1>EstateHub</h1>
          <p className="app-loading-text">Loading EstateHub...</p>
        </div>
      </div>
      <span className="app-loading-spinner" aria-hidden="true" />
    </div>
  );
}

export default AppLoadingScreen;
