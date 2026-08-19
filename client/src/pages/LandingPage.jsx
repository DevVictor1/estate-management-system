import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaArrowRight,
  FaCircleCheck,
  FaClipboardCheck,
  FaFileContract,
  FaFileInvoiceDollar,
  FaMoneyBillWave,
  FaTriangleExclamation,
} from "react-icons/fa6";
import estateHubIcon from "../assets/branding/estatehub-icon.png";
import dashboardImage from "../assets/product/dashboard.png";
import quotationsImage from "../assets/product/quotations.png";
import serviceProviderImage from "../assets/product/serviceprovider.jpg";
import tasksImage from "../assets/product/tasks.png";

const workflowSteps = [
  { label: "Complaint", icon: FaTriangleExclamation },
  { label: "Task", icon: FaClipboardCheck },
  { label: "Quotation", icon: FaFileInvoiceDollar },
  { label: "Contract", icon: FaFileContract },
  { label: "Payment", icon: FaMoneyBillWave },
];

const roleGroups = [
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

const trustHighlights = [
  {
    title: "Centralized Records",
    description:
      "Keep complaints, tasks, quotations, contracts, payments, and provider information in one place.",
  },
  {
    title: "Clear Accountability",
    description:
      "Track assignments, approvals, deadlines, and status changes across the entire workflow.",
  },
  {
    title: "Secure Role-Based Access",
    description:
      "Residents, service providers, and administrators see only the actions and data meant for them.",
  },
  {
    title: "Transparent Payment Tracking",
    description:
      "Record payment stages, supporting evidence, and contract progress without losing audit context.",
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
              <span>Estate Service Provider &amp; Contractor Management System</span>
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
                to="/register?role=resident"
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
              <h1>Residential estate operations in one working system.</h1>
              <p className="landing-hero-text">
                Manage complaints, task assignments, service providers,
                quotations, contracts, payments, and supporting records from one
                secure platform built for residential communities.
              </p>

              <div className="landing-hero-actions">
                <Link
                  to="/login"
                  className="landing-button landing-button-secondary"
                >
                  Login to EstateHub
                </Link>
                <Link
                  to="/register?role=resident"
                  className="landing-button landing-button-primary"
                >
                  Register as Resident
                </Link>
              </div>

              <div className="landing-hero-highlights" aria-label="Platform areas">
                <span>Complaints</span>
                <span>Tasks</span>
                <span>Quotations</span>
                <span>Contracts</span>
                <span>Payments</span>
              </div>

              <p className="landing-hero-note">
                Admin and service-provider accounts are created securely through
                the platform&apos;s existing management workflow.
              </p>
            </div>

            <div className="landing-hero-visual">
              <div className="landing-product-frame landing-product-frame-hero">
                <div className="landing-product-frame-bar" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
                <img
                  src={dashboardImage}
                  alt="EstateHub dashboard overview"
                  className="landing-product-image"
                />
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="landing-section landing-workflow-section">
          <div className="landing-section-shell">
            <div className="landing-section-heading landing-workflow-heading">
              <p className="landing-eyebrow">Operational Flow</p>
              <h2>A clear path from reported issue to documented payment</h2>
              <p>
                EstateHub keeps operational work moving through a practical
                sequence so complaints, approvals, commercial decisions, and
                provider delivery stay connected.
              </p>
            </div>

            <div className="landing-workflow-strip" aria-label="EstateHub workflow">
              {workflowSteps.map(({ label, icon: Icon }, index) => (
                <div key={label} className="landing-workflow-node">
                  <div className="landing-workflow-step">
                    <span className="landing-workflow-icon" aria-hidden="true">
                      <Icon />
                    </span>
                    <span>{label}</span>
                  </div>
                  {index < workflowSteps.length - 1 ? (
                    <span className="landing-workflow-arrow" aria-hidden="true">
                      <FaArrowRight />
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-section landing-story-section">
          <div className="landing-section-shell landing-story-shell">
            <div className="landing-story-media">
              <div className="landing-product-frame">
                <img
                  src={tasksImage}
                  alt="EstateHub tasks interface"
                  className="landing-product-image"
                />
              </div>
            </div>

            <div className="landing-story-content">
              <p className="landing-story-kicker">Task Management</p>
              <h2>Assign work with clear priorities, deadlines, and follow-through</h2>
              <p>
                Administrators can turn operational issues into trackable tasks,
                assign the right service provider, and monitor progress without
                losing visibility across the estate.
              </p>
              <ul className="landing-story-list">
                <li>Track priority, deadline, and current status in one place.</li>
                <li>Keep provider responsibility tied directly to assigned work.</li>
                <li>Maintain a clearer audit trail for updates and completion.</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="landing-section landing-story-section landing-story-section-alt">
          <div className="landing-section-shell landing-story-shell landing-story-shell-reverse">
            <div className="landing-story-content">
              <p className="landing-story-kicker">Quotation Workflow</p>
              <h2>Review provider pricing without leaving the operational process</h2>
              <p>
                Providers can submit quotations for assigned tasks, while
                administrators review totals, request revisions, approve the
                right version, and move confidently toward contract creation.
              </p>
              <ul className="landing-story-list">
                <li>Keep revisions visible instead of overwriting earlier submissions.</li>
                <li>Capture approval decisions and comments in a structured flow.</li>
                <li>Bridge the gap between task delivery and contract setup.</li>
              </ul>
            </div>

            <div className="landing-story-media">
              <div className="landing-product-frame">
                <img
                  src={quotationsImage}
                  alt="EstateHub quotations review interface"
                  className="landing-product-image"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="landing-section landing-story-section landing-people-section">
          <div className="landing-section-shell landing-story-shell">
            <div className="landing-story-media landing-story-media-photo">
              <div className="landing-photo-frame">
                <img
                  src={serviceProviderImage}
                  alt="Service provider on site managing facility operations"
                  className="landing-photo-image"
                />
              </div>
            </div>

            <div className="landing-story-content">
              <p className="landing-story-kicker">Service Provider Coordination</p>
              <h2>Built for the people carrying work across the estate every day</h2>
              <p>
                EstateHub connects residents, administrators, and service
                providers inside one workflow so reported issues, approvals,
                commercial steps, and delivery updates do not drift apart.
              </p>
              <p className="landing-story-emphasis">
                The result is a more accountable process for the people managing
                estates and the people delivering the work.
              </p>
            </div>
          </div>
        </section>

        <section className="landing-section landing-role-section">
          <div className="landing-section-shell">
            <div className="landing-section-heading landing-role-heading">
              <p className="landing-eyebrow">User Roles</p>
              <h2>Designed for each part of the estate workflow</h2>
            </div>

            <div className="landing-role-grid">
              {roleGroups.map((role) => (
                <article key={role.title} className="landing-role-column">
                  <h3>{role.title}</h3>
                  <ul className="landing-role-list">
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

        <section id="about" className="landing-section landing-trust-section">
          <div className="landing-section-shell landing-trust-shell">
            <div className="landing-trust-intro">
              <p className="landing-eyebrow">Why EstateHub</p>
              <h2>Practical controls for a process that usually gets fragmented</h2>
              <p>
                EstateHub centralizes service-provider and contractor
                operations for residential communities so complaints, task
                delivery, quotation review, contract tracking, and payment
                records stay connected in one working system.
              </p>
            </div>

            <div className="landing-trust-grid">
              {trustHighlights.map((item) => (
                <article key={item.title} className="landing-trust-item">
                  <span className="landing-trust-icon" aria-hidden="true">
                    <FaCircleCheck />
                  </span>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-section landing-section-cta">
          <div className="landing-section-shell">
            <div className="landing-cta-panel">
              <div className="landing-cta-copy">
                <p className="landing-eyebrow">Get Started</p>
                <h2>Ready to access EstateHub?</h2>
                <p>
                  Sign in to continue your work, register as a resident to start
                  reporting issues, or join as a service provider through the
                  existing registration flow.
                </p>
              </div>

              <div className="landing-cta-actions">
                <Link to="/login" className="landing-button landing-button-secondary">
                  Login
                </Link>
                <Link
                  to="/register?role=resident"
                  className="landing-button landing-button-primary"
                >
                  Register as Resident
                </Link>
                <Link
                  to="/register?role=service_provider"
                  className="landing-button landing-button-tertiary"
                >
                  Register as Service Provider
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
