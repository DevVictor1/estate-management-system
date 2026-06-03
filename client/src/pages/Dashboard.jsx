import { useEffect, useState } from "react";
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

function Dashboard() {
  const [stats, setStats] = useState(initialStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
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
  }, []);

  if (loading) {
    return <p>Loading dashboard stats...</p>;
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

export default Dashboard;
