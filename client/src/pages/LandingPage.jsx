import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaArrowRight,
  FaChartLine,
  FaClipboardCheck,
  FaFileContract,
  FaFileInvoiceDollar,
  FaMoneyBillWave,
  FaReceipt,
  FaShieldHeart,
  FaTriangleExclamation,
  FaUsersGear,
} from "react-icons/fa6";
import estateHubIcon from "../assets/branding/estatehub-icon.png";

const featureCards = [
  {
    title: "Complaint Management",
    description:
      "Capture resident issues quickly and keep every complaint visible from submission to resolution.",
    icon: FaTriangleExclamation,
  },
  {
    title: "Task Assignment",
    description:
      "Turn operational issues into accountable tasks with clear ownership, deadlines, and updates.",
    icon: FaClipboardCheck,
  },
  {
    title: "Service Provider Management",
    description:
      "Maintain trusted provider records, verification status, and operational contact details in one place.",
    icon: FaUsersGear,
  },
  {
    title: "Quotation Workflow",
    description:
      "Review provider quotations, manage revisions, and support approval decisions with a structured process.",
    icon: FaFileInvoiceDollar,
  },
  {
    title: "Contract Management",
    description:
      "Create and monitor provider contracts with reliable history, scope, and financial context.",
    icon: FaFileContract,
  },
  {
    title: "Payment Tracking",
    description:
      "Record staged payments, track financial progress, and keep payment records organized and auditable.",
    icon: FaMoneyBillWave,
  },
  {
    title: "Payment Evidence",
    description:
      "Attach proof of payment securely so administrators and providers can reference the same record.",
    icon: FaReceipt,
  },
  {
    title: "Dashboard Analytics",
    description:
      "Surface complaint, task, quotation, contract, and payment activity through role-aware operational insights.",
    icon: FaChartLine,
  },
];

const roleCards = [
  {
    title: "Resident",
    points: [
      "Submit complaints",
      "Track complaint activity",
      "View relevant tasks",
    ],
  },
  {
    title: "Service Provider",
    points: [
      "Receive assigned tasks",
      "Submit quotations",
      "View contracts and payments",
      "Maintain payment details",
    ],
  },
  {
    title: "Administrator",
    points: [
      "Manage providers",
      "Review quotations",
      "Create contracts",
      "Record and verify payments",
      "Monitor estate operations",
    ],
  },
];

const whyChooseCards = [
  {
    title: "Centralized Records",
    description:
      "Keep complaints, tasks, quotations, contracts, payments, and service-provider information in one secure platform.",
    icon: FaFileContract,
  },
  {
    title: "Clear Accountability",
    description:
      "Track responsibilities, updates, approvals, and service activities clearly across the estate management workflow.",
    icon: FaClipboardCheck,
  },
  {
    title: "Secure Role-Based Access",
    description:
      "Residents, service providers, and administrators access only the information and actions relevant to their roles.",
    icon: FaShieldHeart,
  },
  {
    title: "Transparent Payment Tracking",
    description:
      "Manage quotations, contracts, payment records, payment status, and supporting payment evidence with clear visibility.",
    icon: FaMoneyBillWave,
  },
];

function LandingPage() {
  const [navigationOpen, setNavigationOpen] = useState(false);

  useEffect(() => {
    document.body.classList.add("landing-page-active");

    return () => {
      document.body.classList.remove("landing-page-active");
    };
  }, []);

  const closeNavigation = () => {
    setNavigationOpen(false);
  };

  return (
    <div className="landing-page">
      <header className="landing-header">
        <div className="landing-header-shell">
          <Link
            to="/"
            className="landing-brand"
            aria-label="EstateHub home"
            onClick={closeNavigation}
          >
            <img
              src={estateHubIcon}
              alt="EstateHub icon"
              className="landing-brand-logo landing-brand-logo-icon"
            />
            <div className="landing-brand-copy">
              <strong>EstateHub</strong>
              <span>Smart Estate Operations Platform</span>
            </div>
          </Link>

          <button
            type="button"
            className="landing-menu-button"
            aria-expanded={navigationOpen}
            aria-controls="landing-navigation"
            onClick={() => setNavigationOpen((current) => !current)}
          >
            Menu
          </button>

          <div
            id="landing-navigation"
            className={
              navigationOpen
                ? "landing-header-nav landing-header-nav-open"
                : "landing-header-nav"
            }
          >
            <nav className="landing-nav" aria-label="Landing page">
              <a href="#home" onClick={closeNavigation}>
                Home
              </a>
              <a href="#features" onClick={closeNavigation}>
                Features
              </a>
              <a href="#about" onClick={closeNavigation}>
                About
              </a>
            </nav>

            <div className="landing-header-actions">
              <Link
                to="/login"
                className="landing-button landing-button-secondary"
                onClick={closeNavigation}
              >
                Login
              </Link>
              <Link
                to="/register"
                className="landing-button landing-button-primary"
                onClick={closeNavigation}
              >
                Register as Resident
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="landing-main">
        <section id="home" className="landing-hero">
          <div className="landing-hero-shell">
            <div className="landing-hero-copy">
              <p className="landing-eyebrow">EstateHub</p>
              <h1>Estate Management, Simplified.</h1>
              <p className="landing-hero-text">
                EstateHub brings complaints, tasks, service providers,
                quotations, contracts, payments, and operational records into
                one secure platform for residential communities.
              </p>

              <div className="landing-hero-actions">
                <Link
                  to="/login"
                  className="landing-button landing-button-primary"
                >
                  Login to EstateHub
                </Link>
                <Link
                  to="/register"
                  className="landing-button landing-button-secondary"
                >
                  Register as a Resident
                </Link>
              </div>

              <p className="landing-hero-note">
                Admin and service-provider accounts are created securely by
                authorized management.
              </p>
            </div>

            <div className="landing-hero-panel" aria-label="EstateHub overview">
              <div className="landing-hero-panel-card">
                <div className="landing-hero-panel-header">
                  <span className="landing-hero-panel-icon">
                    <FaShieldHeart />
                  </span>
                  <div>
                    <h2>Secure, role-aware operations</h2>
                    <p>
                      Coordinate complaints, provider work, quotations, and
                      payments with structured access for each user type.
                    </p>
                  </div>
                </div>

                <div className="landing-hero-panel-list">
                  <div className="landing-hero-panel-item">
                    <strong>Residents</strong>
                    <span>Submit issues and stay informed.</span>
                  </div>
                  <div className="landing-hero-panel-item">
                    <strong>Service Providers</strong>
                    <span>Respond to assigned work and pricing requests.</span>
                  </div>
                  <div className="landing-hero-panel-item">
                    <strong>Administrators</strong>
                    <span>Oversee delivery, approvals, and payment records.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="landing-section">
          <div className="landing-section-shell">
            <div className="landing-section-heading">
              <p className="landing-eyebrow">Core Capabilities</p>
              <h2>One platform for estate operations and contractor workflow</h2>
              <p>
                EstateHub is designed to reduce fragmentation by connecting
                service requests, provider coordination, commercial approvals,
                and payment records in one place.
              </p>
            </div>

            <div className="landing-feature-grid">
              {featureCards.map(({ title, description, icon: Icon }) => (
                <article key={title} className="landing-feature-card">
                  <span className="landing-feature-icon" aria-hidden="true">
                    <Icon />
                  </span>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-section landing-why-section">
          <div className="landing-section-shell">
            <div className="landing-section-heading landing-why-header">
              <p className="landing-eyebrow">Why EstateHub</p>
              <h2>Why Choose EstateHub?</h2>
              <p>
                EstateHub simplifies estate operations by providing a secure,
                organized, and transparent platform for managing residential
                community services.
              </p>
            </div>

            <div className="landing-why-grid">
              {whyChooseCards.map(({ title, description, icon: Icon }) => (
                <article key={title} className="landing-why-card">
                  <span className="landing-why-icon" aria-hidden="true">
                    <Icon />
                  </span>
                  <h3 className="landing-why-card-title">{title}</h3>
                  <p className="landing-why-card-text">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-section landing-section-roles">
          <div className="landing-section-shell">
            <div className="landing-section-heading">
              <p className="landing-eyebrow">Role-Based Access</p>
              <h2>Built for the people who keep residential communities running</h2>
              <p>
                EstateHub supports clear responsibilities for residents, service
                providers, and estate administrators without exposing the wrong
                data to the wrong audience.
              </p>
            </div>

            <div className="landing-role-grid">
              {roleCards.map((role) => (
                <article key={role.title} className="landing-role-card">
                  <h3>{role.title}</h3>
                  <ul>
                    {role.points.map((point) => (
                      <li key={point}>
                        <FaArrowRight aria-hidden="true" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="about" className="landing-section">
          <div className="landing-section-shell">
            <div className="landing-about-card">
              <p className="landing-eyebrow">About EstateHub</p>
              <h2>Designed for accountability, transparency, and service coordination</h2>
              <p>
                EstateHub is a web-based management platform designed to improve
                accountability, transparency, communication, and service
                coordination within residential communities.
              </p>
            </div>
          </div>
        </section>

        <section className="landing-section landing-section-cta">
          <div className="landing-section-shell">
            <div className="landing-cta-card">
              <div>
                <p className="landing-eyebrow">Get Started</p>
                <h2>Ready to access EstateHub?</h2>
                <p>
                  Sign in to continue your work, or create a resident account to
                  start submitting and tracking estate complaints.
                </p>
              </div>

              <div className="landing-cta-actions">
                <Link to="/login" className="landing-button landing-button-primary">
                  Login
                </Link>
                <Link
                  to="/register"
                  className="landing-button landing-button-secondary"
                >
                  Register as Resident
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-footer-shell">
          <div className="landing-footer-brand">
            <img src={estateHubIcon} alt="EstateHub icon" />
            <div>
              <strong>EstateHub</strong>
              <span>Estate Service Provider &amp; Contractor Management System</span>
            </div>
          </div>
          <p>&copy; 2026 EstateHub. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
