import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaArrowRight,
  FaClipboardList,
  FaComments,
  FaHourglassHalf,
  FaListCheck,
  FaTriangleExclamation,
  FaUsersGear,
} from "react-icons/fa6";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

const initialStats = {
  providers: {
    total: 0,
    approved: 0,
  },
  tasks: {
    total: 0,
    pending: 0,
    completed: 0,
    overdue: 0,
  },
  complaints: {
    total: 0,
    open: 0,
    resolved: 0,
  },
  contracts: {
    active: 0,
  },
  payments: {
    totalPaid: 0,
  },
};

const currencyFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(initialStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [residentComplaints, setResidentComplaints] = useState([]);
  const [approvedProviders, setApprovedProviders] = useState([]);
  const [residentComplaintsLoading, setResidentComplaintsLoading] = useState(false);
  const [providersLoading, setProvidersLoading] = useState(false);
  const [residentComplaintsError, setResidentComplaintsError] = useState("");
  const [providersError, setProvidersError] = useState("");
  const isAdmin = user?.role === "admin";
  const isResident = user?.role === "resident";
  const isServiceProvider = user?.role === "service_provider";

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      setError("");
      return;
    }

    const fetchDashboardStats = async () => {
      try {
        const response = await api.get("/api/dashboard/stats");
        setStats(response.data.data || initialStats);
      } catch (err) {
        setError(
          err.response?.data?.message ||
            "Failed to load dashboard statistics."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, [isAdmin]);

  useEffect(() => {
    if (!isResident) {
      setResidentComplaints([]);
      setApprovedProviders([]);
      setResidentComplaintsLoading(false);
      setProvidersLoading(false);
      setResidentComplaintsError("");
      setProvidersError("");
      return;
    }

    const fetchResidentComplaints = async () => {
      setResidentComplaintsLoading(true);
      setResidentComplaintsError("");

      try {
        const response = await api.get("/api/complaints");
        setResidentComplaints(response.data.data || []);
      } catch (err) {
        setResidentComplaintsError(
          "We couldn't load your recent complaints. Please try again."
        );
      } finally {
        setResidentComplaintsLoading(false);
      }
    };

    const fetchApprovedProviders = async () => {
      setProvidersLoading(true);
      setProvidersError("");

      try {
        const response = await api.get("/api/service-providers");
        const providers = response.data.data || [];
        setApprovedProviders(
          providers.filter(
            (provider) => provider.verificationStatus === "approved"
          )
        );
      } catch (err) {
        setProvidersError(
          "We couldn't load approved service providers right now."
        );
      } finally {
        setProvidersLoading(false);
      }
    };

    fetchResidentComplaints();
    fetchApprovedProviders();
  }, [isResident]);

  if (loading) {
    return <p>Loading dashboard stats...</p>;
  }

  if (isResident) {
    const firstName = user?.fullName?.trim()?.split(/\s+/)?.[0] || "Resident";
    const sortedComplaints = [...residentComplaints].sort((firstComplaint, secondComplaint) => {
      const firstCreatedAt = firstComplaint.createdAt
        ? new Date(firstComplaint.createdAt).getTime()
        : 0;
      const secondCreatedAt = secondComplaint.createdAt
        ? new Date(secondComplaint.createdAt).getTime()
        : 0;

      return secondCreatedAt - firstCreatedAt;
    });
    const recentComplaints = sortedComplaints.slice(0, 5);
    const complaintStats = {
      total: residentComplaints.length,
      open: residentComplaints.filter((complaint) => complaint.status === "open")
        .length,
      inProgress: residentComplaints.filter(
        (complaint) =>
          complaint.status === "assigned" ||
          complaint.status === "in_progress"
      ).length,
      resolved: residentComplaints.filter(
        (complaint) =>
          complaint.status === "resolved" || complaint.status === "closed"
      ).length,
    };
    const residentStatCards = [
      {
        label: "My Complaints",
        value: complaintStats.total,
        helper: "Total requests submitted",
        tone: "neutral",
        icon: FaComments,
      },
      {
        label: "Open Complaints",
        value: complaintStats.open,
        helper: "Awaiting assignment",
        tone: "warning",
        icon: FaTriangleExclamation,
      },
      {
        label: "In Progress",
        value: complaintStats.inProgress,
        helper: "Assigned or being worked on",
        tone: "neutral",
        icon: FaHourglassHalf,
      },
      {
        label: "Resolved",
        value: complaintStats.resolved,
        helper: "Resolved or closed",
        tone: "success",
        icon: FaListCheck,
      },
      {
        label: "Approved Providers",
        value: approvedProviders.length,
        helper: "Available for resident services",
        tone: "neutral",
        icon: FaUsersGear,
      },
    ];

    return (
      <section className="dashboard-page resident-dashboard">
        <div className="dashboard-hero resident-dashboard-header">
          <div>
            <p className="dashboard-eyebrow">Resident Dashboard</p>
            <h1>Welcome, {firstName}</h1>
            <p className="dashboard-subtitle">
              Manage your complaints, browse approved service providers, and
              track your requests.
            </p>
          </div>
        </div>

        <section className="dashboard-section-card">
          <div className="dashboard-section-header">
            <div>
              <h2>Overview</h2>
              <p>A quick snapshot of your complaint activity and available service providers.</p>
            </div>
          </div>

          {residentComplaintsLoading || providersLoading ? (
            <p>Loading your dashboard overview...</p>
          ) : null}

          <div className="resident-stat-grid">
            {residentStatCards.map((card) => {
              const Icon = card.icon;

              return (
                <article
                  key={card.label}
                  className={`resident-stat-card resident-stat-card-${card.tone}`}
                >
                  <div className="resident-stat-card-top">
                    <span className="resident-stat-icon">
                      <Icon />
                    </span>
                    <span className="resident-stat-label">{card.label}</span>
                  </div>
                  <strong className="resident-stat-value">{card.value}</strong>
                  <p className="resident-stat-helper">{card.helper}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="dashboard-section-card">
          <div className="dashboard-section-header">
            <div>
              <h2>Quick Actions</h2>
              <p>Jump straight to the most useful resident tools.</p>
            </div>
          </div>

          <div className="resident-quick-actions">
            <Link to="/complaints" className="resident-action-card">
              <span className="resident-action-icon">
                <FaTriangleExclamation />
              </span>
              <div>
                <h3>Submit New Complaint</h3>
                <p>Report a new issue and request assistance.</p>
              </div>
              <span className="resident-action-arrow">
                <FaArrowRight />
              </span>
            </Link>

            <Link to="/complaints" className="resident-action-card">
              <span className="resident-action-icon">
                <FaClipboardList />
              </span>
              <div>
                <h3>View My Complaints</h3>
                <p>Track the status of your submitted complaints.</p>
              </div>
              <span className="resident-action-arrow">
                <FaArrowRight />
              </span>
            </Link>

            <Link to="/service-providers" className="resident-action-card">
              <span className="resident-action-icon">
                <FaUsersGear />
              </span>
              <div>
                <h3>Browse Service Providers</h3>
                <p>Review approved providers available to the estate.</p>
              </div>
              <span className="resident-action-arrow">
                <FaArrowRight />
              </span>
            </Link>
          </div>
        </section>

        <div className="resident-dashboard-grid">
          <section className="dashboard-section-card resident-recent-complaints">
            <div className="dashboard-section-header resident-section-header-row">
              <div>
                <h2>Recent Complaints</h2>
                <p>Your five most recent complaints are shown here.</p>
              </div>
              <Link to="/complaints" className="resident-inline-link">
                View All Complaints
              </Link>
            </div>

            {residentComplaintsError ? (
              <p className="resident-section-error">{residentComplaintsError}</p>
            ) : null}

            {residentComplaintsLoading ? (
              <p>Loading your complaints...</p>
            ) : recentComplaints.length > 0 ? (
              <div className="resident-recent-list">
                {recentComplaints.map((complaint) => (
                  <article
                    key={complaint._id}
                    className="resident-complaint-card"
                  >
                    <div className="resident-complaint-card-top">
                      <div>
                        <h3>{complaint.title}</h3>
                        <p>
                          Submitted{" "}
                          {complaint.createdAt
                            ? dateFormatter.format(new Date(complaint.createdAt))
                            : "-"}
                        </p>
                      </div>
                      <span
                        className={`resident-status-badge resident-status-${complaint.status}`}
                      >
                        {formatResidentComplaintStatus(complaint.status)}
                      </span>
                    </div>
                    <div className="resident-complaint-meta">
                      <span className="resident-complaint-priority">
                        Priority: {formatResidentComplaintStatus(complaint.priority)}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="resident-empty-state">
                <h3>No Complaints Yet</h3>
                <p>
                  You have not submitted any complaints. Use “Submit New
                  Complaint” whenever you need assistance.
                </p>
                <Link to="/complaints" className="resident-primary-link">
                  Submit New Complaint
                </Link>
              </div>
            )}
          </section>

          <section className="dashboard-section-card resident-provider-preview">
            <div className="dashboard-section-header resident-section-header-row">
              <div>
                <h2>Approved Service Providers</h2>
                <p>Preview a few approved providers available to residents.</p>
              </div>
              <Link to="/service-providers" className="resident-inline-link">
                View All Providers
              </Link>
            </div>

            {providersError ? (
              <p className="resident-section-error">{providersError}</p>
            ) : null}

            {providersLoading ? (
              <p>Loading approved providers...</p>
            ) : approvedProviders.length > 0 ? (
              <div className="resident-provider-list">
                {approvedProviders.slice(0, 3).map((provider) => (
                  <article
                    key={provider._id}
                    className="resident-provider-card"
                  >
                    <div className="resident-provider-card-top">
                      <h3>{provider.companyName}</h3>
                      <span className="resident-provider-badge">Approved</span>
                    </div>
                    <p className="resident-provider-category">
                      {formatResidentComplaintStatus(provider.serviceCategory)}
                    </p>
                    <p className="resident-provider-phone">
                      {provider.phone || "Phone not available"}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="resident-empty-subtle">
                No approved service providers are available right now.
              </p>
            )}
          </section>
        </div>
      </section>
    );
  }

  if (isServiceProvider) {
    return (
      <section className="dashboard-page">
        <div className="dashboard-hero">
          <div>
            <p className="dashboard-eyebrow">Service Provider Dashboard</p>
            <h1>Welcome, {user?.fullName || "Service Provider"}</h1>
            <p className="dashboard-subtitle">
              Welcome. Use the Tasks section to view assigned work.
            </p>
          </div>
        </div>

        <div className="dashboard-sections">
          <section className="dashboard-section-card">
            <div className="dashboard-section-header">
              <div>
                <h2>Account Status</h2>
                <p>
                  Your service provider account is approved and ready for task
                  activity.
                </p>
              </div>
            </div>

            <div className="dashboard-stats-grid">
              <article className="dashboard-stat-card dashboard-stat-success">
                <span className="dashboard-stat-label">Approval Status</span>
                <strong className="dashboard-stat-value">Approved</strong>
              </article>
              <article className="dashboard-stat-card dashboard-stat-neutral">
                <span className="dashboard-stat-label">Primary Action</span>
                <strong className="dashboard-stat-value">
                  Check assigned tasks
                </strong>
              </article>
            </div>
          </section>
        </div>
      </section>
    );
  }

  if (error) {
    return <p style={{ color: "#c1121f" }}>{error}</p>;
  }

  const sections = [
    {
      title: "Service Providers",
      description: "Overview of registered providers and verification progress.",
      items: [
        {
          label: "Total Providers",
          value: stats.providers.total,
          tone: "neutral",
        },
        {
          label: "Approved Providers",
          value: stats.providers.approved,
          tone: "success",
        },
      ],
    },
    {
      title: "Tasks",
      description: "Track assignments, completions, and overdue work.",
      items: [
        { label: "Total Tasks", value: stats.tasks.total, tone: "neutral" },
        { label: "Pending Tasks", value: stats.tasks.pending, tone: "warning" },
        {
          label: "Completed Tasks",
          value: stats.tasks.completed,
          tone: "success",
        },
        { label: "Overdue Tasks", value: stats.tasks.overdue, tone: "danger" },
      ],
    },
    {
      title: "Complaints",
      description: "Monitor resident issues and their resolution progress.",
      items: [
        {
          label: "Total Complaints",
          value: stats.complaints.total,
          tone: "neutral",
        },
        {
          label: "Open Complaints",
          value: stats.complaints.open,
          tone: "warning",
        },
        {
          label: "Resolved Complaints",
          value: stats.complaints.resolved,
          tone: "success",
        },
      ],
    },
    {
      title: "Contracts",
      description: "Active service agreements currently running in the estate.",
      items: [
        {
          label: "Active Contracts",
          value: stats.contracts.active,
          tone: "success",
        },
      ],
    },
    {
      title: "Payments",
      description: "Summary of completed provider payouts.",
      items: [
        {
          label: "Total Paid Amount",
          value: currencyFormatter.format(stats.payments.totalPaid || 0),
          tone: "success",
          emphasis: "currency",
        },
      ],
    },
  ];

  return (
    <section className="dashboard-page">
      <div className="dashboard-hero">
        <div>
          <p className="dashboard-eyebrow">Operations Overview</p>
          <h1>Dashboard</h1>
          <p className="dashboard-subtitle">
            A quick summary of provider activity, task progress, complaints,
            contracts, and payments across the estate.
          </p>
        </div>
      </div>

      <div className="dashboard-sections">
        {sections.map((section) => (
          <section key={section.title} className="dashboard-section-card">
            <div className="dashboard-section-header">
              <div>
                <h2>{section.title}</h2>
                <p>{section.description}</p>
              </div>
            </div>

            <div className="dashboard-stats-grid">
              {section.items.map((item) => (
                <article
                  key={item.label}
                  className={`dashboard-stat-card dashboard-stat-${item.tone}`}
                >
                  <span className="dashboard-stat-label">{item.label}</span>
                  <strong
                    className={
                      item.emphasis === "currency"
                        ? "dashboard-stat-value dashboard-stat-value-currency"
                        : "dashboard-stat-value"
                    }
                  >
                    {item.value}
                  </strong>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}

function formatResidentComplaintStatus(value) {
  if (!value) {
    return "-";
  }

  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default Dashboard;
