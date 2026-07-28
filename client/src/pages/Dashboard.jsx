import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  FaArrowRight,
  FaClipboardList,
  FaComments,
  FaFileCircleCheck,
  FaHourglassHalf,
  FaListCheck,
  FaMoneyBillWave,
  FaReceipt,
  FaSquareCheck,
  FaTriangleExclamation,
  FaUsersGear,
} from "react-icons/fa6";
import ChartCard from "../components/dashboard/ChartCard";
import ChartTooltip from "../components/dashboard/ChartTooltip";
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

const initialAnalytics = {
  role: "",
  charts: {
    complaintsByStatus: [],
    complaintsTrend: [],
    tasksByStatus: [],
    paymentsTrend: [],
    completedTasksTrend: [],
  },
};

const statusColorMap = {
  open: "#f59e0b",
  pending: "#f59e0b",
  assigned: "#2563eb",
  in_progress: "#2563eb",
  resolved: "#16a34a",
  closed: "#166534",
  completed: "#16a34a",
  paid: "#16a34a",
  overdue: "#dc2626",
  failed: "#dc2626",
  rejected: "#dc2626",
  cancelled: "#dc2626",
  approved: "#16a34a",
  active: "#2563eb",
  expired: "#6b7280",
  terminated: "#dc2626",
  pending_renewal: "#8b5cf6",
  default: "#64748b",
};

const currencyFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const dayInMs = 24 * 60 * 60 * 1000;
const contractExpiringWindowInDays = 30;

function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(initialStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [analytics, setAnalytics] = useState(initialAnalytics);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState("");
  const [residentComplaints, setResidentComplaints] = useState([]);
  const [approvedProviders, setApprovedProviders] = useState([]);
  const [residentComplaintsLoading, setResidentComplaintsLoading] =
    useState(false);
  const [providersLoading, setProvidersLoading] = useState(false);
  const [residentComplaintsError, setResidentComplaintsError] = useState("");
  const [providersError, setProvidersError] = useState("");
  const [adminProviders, setAdminProviders] = useState([]);
  const [adminComplaints, setAdminComplaints] = useState([]);
  const [adminTasks, setAdminTasks] = useState([]);
  const [adminContracts, setAdminContracts] = useState([]);
  const [adminPayments, setAdminPayments] = useState([]);
  const [adminProvidersLoading, setAdminProvidersLoading] = useState(false);
  const [adminComplaintsLoading, setAdminComplaintsLoading] = useState(false);
  const [adminTasksLoading, setAdminTasksLoading] = useState(false);
  const [adminContractsLoading, setAdminContractsLoading] = useState(false);
  const [adminPaymentsLoading, setAdminPaymentsLoading] = useState(false);
  const [adminProvidersError, setAdminProvidersError] = useState("");
  const [adminComplaintsError, setAdminComplaintsError] = useState("");
  const [adminTasksError, setAdminTasksError] = useState("");
  const [adminContractsError, setAdminContractsError] = useState("");
  const [adminPaymentsError, setAdminPaymentsError] = useState("");
  const isAdmin = user?.role === "admin";
  const isResident = user?.role === "resident";
  const isServiceProvider = user?.role === "service_provider";

  const fetchDashboardAnalytics = useCallback(async () => {
    if (!user?.role) {
      setAnalytics(initialAnalytics);
      setAnalyticsLoading(false);
      setAnalyticsError("");
      return;
    }

    setAnalyticsLoading(true);
    setAnalyticsError("");

    try {
      const response = await api.get("/api/dashboard/analytics");
      setAnalytics(response.data.data || initialAnalytics);
    } catch (err) {
      setAnalyticsError(
        err.response?.data?.message ||
          "We couldn't load dashboard charts right now."
      );
    } finally {
      setAnalyticsLoading(false);
    }
  }, [user?.role]);

  useEffect(() => {
    fetchDashboardAnalytics();
  }, [fetchDashboardAnalytics]);

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
    if (!isAdmin) {
      setAdminProviders([]);
      setAdminComplaints([]);
      setAdminTasks([]);
      setAdminContracts([]);
      setAdminPayments([]);
      setAdminProvidersLoading(false);
      setAdminComplaintsLoading(false);
      setAdminTasksLoading(false);
      setAdminContractsLoading(false);
      setAdminPaymentsLoading(false);
      setAdminProvidersError("");
      setAdminComplaintsError("");
      setAdminTasksError("");
      setAdminContractsError("");
      setAdminPaymentsError("");
      return;
    }

    const fetchAdminProviders = async () => {
      setAdminProvidersLoading(true);
      setAdminProvidersError("");

      try {
        const response = await api.get("/api/service-providers");
        setAdminProviders(response.data.data || []);
      } catch (err) {
        setAdminProvidersError(
          "We couldn't load service provider approvals right now."
        );
      } finally {
        setAdminProvidersLoading(false);
      }
    };

    const fetchAdminComplaints = async () => {
      setAdminComplaintsLoading(true);
      setAdminComplaintsError("");

      try {
        const response = await api.get("/api/complaints");
        setAdminComplaints(response.data.data || []);
      } catch (err) {
        setAdminComplaintsError(
          "We couldn't load complaint previews right now."
        );
      } finally {
        setAdminComplaintsLoading(false);
      }
    };

    const fetchAdminTasks = async () => {
      setAdminTasksLoading(true);
      setAdminTasksError("");

      try {
        const response = await api.get("/api/tasks");
        setAdminTasks(response.data.data || []);
      } catch (err) {
        setAdminTasksError("We couldn't load task previews right now.");
      } finally {
        setAdminTasksLoading(false);
      }
    };

    const fetchAdminContracts = async () => {
      setAdminContractsLoading(true);
      setAdminContractsError("");

      try {
        const response = await api.get("/api/contracts");
        setAdminContracts(response.data.data || []);
      } catch (err) {
        setAdminContractsError(
          "We couldn't load contract reminders right now."
        );
      } finally {
        setAdminContractsLoading(false);
      }
    };

    const fetchAdminPayments = async () => {
      setAdminPaymentsLoading(true);
      setAdminPaymentsError("");

      try {
        const response = await api.get("/api/payments");
        setAdminPayments(response.data.data || []);
      } catch (err) {
        setAdminPaymentsError("We couldn't load payment previews right now.");
      } finally {
        setAdminPaymentsLoading(false);
      }
    };

    fetchAdminProviders();
    fetchAdminComplaints();
    fetchAdminTasks();
    fetchAdminContracts();
    fetchAdminPayments();
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

  const adminOverview = useMemo(() => {
    const pendingProviderApprovals = adminProviders.filter(
      (provider) => provider.verificationStatus === "pending"
    );
    const assignedComplaints = adminComplaints.filter(
      (complaint) => complaint.status === "assigned"
    );
    const highPriorityOpenComplaints = adminComplaints
      .filter(
        (complaint) =>
          complaint.status === "open" &&
          (complaint.priority === "high" || complaint.priority === "urgent")
      )
      .sort(sortByDateDesc("createdAt"));
    const overdueTasks = adminTasks
      .filter((task) => task.status === "overdue")
      .sort(sortByDateAsc("deadline"));
    const activeTasks = adminTasks.filter((task) =>
      ["pending", "in_progress", "overdue"].includes(task.status)
    );
    const expiringContracts = adminContracts
      .filter((contract) => {
        if (!contract.endDate) {
          return false;
        }

        const endDate = new Date(contract.endDate).getTime();
        const now = Date.now();
        const threshold = now + contractExpiringWindowInDays * dayInMs;

        return endDate >= now && endDate <= threshold;
      })
      .sort(sortByDateAsc("endDate"));
    const pendingPayments = adminPayments
      .filter((payment) => payment.status === "pending")
      .sort(sortByDateDesc("paymentDate"));
    const recentComplaints = [...adminComplaints]
      .sort(sortByDateDesc("createdAt"))
      .slice(0, 5);
    const upcomingOrOverdueTasks = [...activeTasks]
      .sort((firstTask, secondTask) => {
        const firstIsOverdue = firstTask.status === "overdue" ? 0 : 1;
        const secondIsOverdue = secondTask.status === "overdue" ? 0 : 1;

        if (firstIsOverdue !== secondIsOverdue) {
          return firstIsOverdue - secondIsOverdue;
        }

        return sortByDateAsc("deadline")(firstTask, secondTask);
      })
      .slice(0, 5);

    return {
      pendingProviderApprovals,
      assignedComplaints,
      activeTasks,
      overdueTasks,
      expiringContracts,
      pendingPayments,
      highPriorityOpenComplaints,
      recentComplaints,
      upcomingOrOverdueTasks,
    };
  }, [adminComplaints, adminContracts, adminPayments, adminProviders, adminTasks]);

  const adminStatCards = useMemo(
    () => [
      {
        label: "Total Service Providers",
        value: stats.providers.total,
        tone: "neutral",
        icon: FaUsersGear,
        helper: "All registered providers",
      },
      {
        label: "Pending Provider Approvals",
        value: adminOverview.pendingProviderApprovals.length,
        tone: "warning",
        icon: FaHourglassHalf,
        helper: "Awaiting estate review",
      },
      {
        label: "Open Complaints",
        value: stats.complaints.open,
        tone: "warning",
        icon: FaComments,
        helper: "Still awaiting action",
      },
      {
        label: "Assigned Complaints",
        value: adminOverview.assignedComplaints.length,
        tone: "neutral",
        icon: FaSquareCheck,
        helper: "Already routed for work",
      },
      {
        label: "Active Tasks",
        value: adminOverview.activeTasks.length,
        tone: "neutral",
        icon: FaClipboardList,
        helper: "Pending, in progress, or overdue",
      },
      {
        label: "Overdue Tasks",
        value: stats.tasks.overdue,
        tone: "danger",
        icon: FaTriangleExclamation,
        helper: "Need immediate follow-up",
      },
      {
        label: "Active Contracts",
        value: stats.contracts.active,
        tone: "success",
        icon: FaFileCircleCheck,
        helper: "Currently in force",
      },
      {
        label: "Pending Payments",
        value: adminOverview.pendingPayments.length,
        tone: "warning",
        icon: FaReceipt,
        helper: "Waiting to be settled",
      },
    ],
    [adminOverview, stats]
  );

  const charts = analytics?.charts || initialAnalytics.charts;
  const totalPaidAmount = currencyFormatter.format(stats.payments.totalPaid || 0);

  const adminAttentionItems = [
    ...adminOverview.pendingProviderApprovals.slice(0, 2).map((provider) => ({
      key: `provider-${provider._id}`,
      title: provider.companyName || "Pending service provider",
      subtitle: "Verification approval pending",
      meta: provider.serviceCategory
        ? formatDisplayLabel(provider.serviceCategory)
        : "Review provider details",
      tone: "warning",
      route: "/service-providers",
      actionLabel: "Review Provider",
    })),
    ...adminOverview.highPriorityOpenComplaints
      .slice(0, 2)
      .map((complaint) => ({
        key: `complaint-${complaint._id}`,
        title: complaint.title || "Urgent complaint",
        subtitle: "High-priority complaint needs triage",
        meta: `${formatDisplayLabel(complaint.priority)} priority`,
        tone: "danger",
        route: "/complaints",
        actionLabel: "Review Complaint",
      })),
    ...adminOverview.overdueTasks.slice(0, 2).map((task) => ({
      key: `task-${task._id}`,
      title: task.title || "Overdue task",
      subtitle: task.serviceProvider?.companyName || "Assigned task",
      meta: task.deadline
        ? `Due ${dateFormatter.format(new Date(task.deadline))}`
        : "Deadline not provided",
      tone: "danger",
      route: "/tasks",
      actionLabel: "Open Tasks",
    })),
    ...adminOverview.expiringContracts.slice(0, 2).map((contract) => ({
      key: `contract-${contract._id}`,
      title: contract.contractTitle || "Expiring contract",
      subtitle: contract.serviceProvider?.companyName || "Contract review due",
      meta: contract.endDate
        ? `Ends ${dateFormatter.format(new Date(contract.endDate))}`
        : "End date not available",
      tone: "warning",
      route: "/contracts",
      actionLabel: "View Contracts",
    })),
    ...adminOverview.pendingPayments.slice(0, 2).map((payment) => ({
      key: `payment-${payment._id}`,
      title:
        payment.serviceProvider?.companyName ||
        payment.contract?.contractTitle ||
        "Pending payment",
      subtitle: "Payment record still pending",
      meta: currencyFormatter.format(payment.amount || 0),
      tone: "warning",
      route: "/payments",
      actionLabel: "Open Payments",
    })),
  ].slice(0, 5);

  if (loading) {
    return <p>Loading dashboard stats...</p>;
  }

  if (isResident) {
    const firstName = user?.fullName?.trim()?.split(/\s+/)?.[0] || "Resident";
    const sortedComplaints = [...residentComplaints].sort(
      sortByDateDesc("createdAt")
    );
    const recentComplaints = sortedComplaints.slice(0, 5);
    const complaintStats = {
      total: residentComplaints.length,
      open: residentComplaints.filter((complaint) => complaint.status === "open")
        .length,
      inProgress: residentComplaints.filter((complaint) =>
        ["assigned", "in_progress"].includes(complaint.status)
      ).length,
      resolved: residentComplaints.filter((complaint) =>
        ["resolved", "closed"].includes(complaint.status)
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
              <p>
                A quick snapshot of your complaint activity and available service
                providers.
              </p>
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

        <section className="dashboard-section-card dashboard-chart-section">
          <div className="dashboard-section-header">
            <div>
              <h2>Complaint Insights</h2>
              <p>
                Track how your own complaints are distributed and how activity
                has changed over the last six months.
              </p>
            </div>
          </div>

          <div className="dashboard-chart-grid resident-dashboard-chart-grid">
            <ChartCard
              title="My Complaints by Status"
              description="Only your complaint records are included here."
              loading={analyticsLoading}
              error={analyticsError}
              onRetry={fetchDashboardAnalytics}
              empty={!hasPositiveValue(charts.complaintsByStatus, "value")}
              emptyMessage="No complaint data yet"
              summary={buildStatusSummary(charts.complaintsByStatus)}
            >
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={charts.complaintsByStatus}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={68}
                    outerRadius={102}
                    paddingAngle={3}
                  >
                    {charts.complaintsByStatus.map((entry) => (
                      <Cell
                        key={entry.key}
                        fill={getChartColor(entry.key)}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={
                      <ChartTooltip
                        valueFormatter={(value) => `${value} complaints`}
                      />
                    }
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="My Complaint Activity"
              description="The last six calendar months, including this month."
              loading={analyticsLoading}
              error={analyticsError}
              onRetry={fetchDashboardAnalytics}
              empty={!hasPositiveValue(charts.complaintsTrend, "count")}
              emptyMessage="No complaint activity yet"
              summary={buildMonthlySummary(charts.complaintsTrend, "count", "complaints")}
            >
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={charts.complaintsTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d9e2ec" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    content={
                      <ChartTooltip
                        valueFormatter={(value) => `${value} complaints`}
                      />
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke={getChartColor("assigned")}
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
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
                        {formatDisplayLabel(complaint.status)}
                      </span>
                    </div>
                    <div className="resident-complaint-meta">
                      <span className="resident-complaint-priority">
                        Priority: {formatDisplayLabel(complaint.priority)}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="resident-empty-state">
                <h3>No Complaints Yet</h3>
                <p>
                  You have not submitted any complaints. Use "Submit New
                  Complaint" whenever you need assistance.
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
                      {formatDisplayLabel(provider.serviceCategory)}
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
    const providerTaskStatusData = charts.tasksByStatus || [];
    const completedTaskTrend = charts.completedTasksTrend || [];
    const providerPaymentsTrend = charts.paymentsTrend || [];

    return (
      <section className="dashboard-page service-provider-dashboard">
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

          <section className="dashboard-section-card dashboard-chart-section">
            <div className="dashboard-section-header">
              <div>
                <h2>Performance Overview</h2>
                <p>
                  These charts summarize only the tasks and payments linked to
                  your provider account.
                </p>
              </div>
            </div>

            <div className="dashboard-chart-grid provider-dashboard-chart-grid">
              <ChartCard
                title="My Tasks by Status"
                description="Only tasks assigned to your company are counted."
                loading={analyticsLoading}
                error={analyticsError}
                onRetry={fetchDashboardAnalytics}
                empty={!hasPositiveValue(providerTaskStatusData, "value")}
                emptyMessage="No task activity yet"
                summary={buildStatusSummary(providerTaskStatusData)}
              >
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={providerTaskStatusData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#d9e2ec" />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} />
                    <YAxis
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      content={
                        <ChartTooltip
                          valueFormatter={(value) => `${value} tasks`}
                        />
                      }
                    />
                    <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                      {providerTaskStatusData.map((entry) => (
                        <Cell
                          key={entry.key}
                          fill={getChartColor(entry.key)}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard
                title="Completed Tasks Trend"
                description="Completed work over the last six calendar months."
                loading={analyticsLoading}
                error={analyticsError}
                onRetry={fetchDashboardAnalytics}
                empty={!hasPositiveValue(completedTaskTrend, "count")}
                emptyMessage="No completed task activity yet"
                summary={buildMonthlySummary(
                  completedTaskTrend,
                  "count",
                  "completed tasks"
                )}
              >
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={completedTaskTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#d9e2ec" />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} />
                    <YAxis
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      content={
                        <ChartTooltip
                          valueFormatter={(value) =>
                            `${value} completed tasks`
                          }
                        />
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke={getChartColor("completed")}
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard
                title="My Payments Trend"
                description="Paid payment records linked to your contracts."
                loading={analyticsLoading}
                error={analyticsError}
                onRetry={fetchDashboardAnalytics}
                empty={!hasPositiveValue(providerPaymentsTrend, "amount")}
                emptyMessage="No payment activity yet"
                summary={buildMonthlySummary(
                  providerPaymentsTrend,
                  "amount",
                  "paid value",
                  formatCurrencyValue
                )}
                wide
              >
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={providerPaymentsTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#d9e2ec" />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} />
                    <YAxis
                      tickFormatter={formatCompactNaira}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      content={
                        <ChartTooltip
                          valueFormatter={(value) => formatCurrencyValue(value)}
                        />
                      }
                    />
                    <Bar
                      dataKey="amount"
                      radius={[10, 10, 0, 0]}
                      fill={getChartColor("paid")}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          </section>
        </div>
      </section>
    );
  }

  const firstName = user?.fullName?.trim()?.split(/\s+/)?.[0] || "Admin";

  return (
    <section className="dashboard-page admin-dashboard">
      <div className="dashboard-hero admin-dashboard-header">
        <div>
          <p className="dashboard-eyebrow">Operations Overview</p>
          <h1>Welcome back, {firstName}</h1>
          <p className="dashboard-subtitle">
            Here's what is happening across the estate today.
          </p>
        </div>
      </div>

      {error ? (
        <p className="admin-section-error">
          We couldn't load the top-line statistics right now. The preview
          sections below may still be available.
        </p>
      ) : null}

      <section className="dashboard-section-card admin-overview-section">
        <div className="dashboard-section-header">
          <div>
            <h2>Overview</h2>
            <p>
              Track provider verification, complaint activity, task progress,
              contracts, and payments at a glance.
            </p>
          </div>
        </div>

        <div className="admin-stat-grid">
          {adminStatCards.map((card) => {
            const Icon = card.icon;

            return (
              <article
                key={card.label}
                className={`admin-stat-card admin-stat-card-${card.tone}`}
              >
                <div className="admin-stat-card-top">
                  <span className="admin-stat-icon">
                    <Icon />
                  </span>
                  <span className="admin-stat-label">{card.label}</span>
                </div>
                <strong className="admin-stat-value">{card.value}</strong>
                <p className="admin-stat-helper">{card.helper}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="dashboard-section-card dashboard-chart-section">
        <div className="dashboard-section-header">
          <div>
            <h2>Operations Trends</h2>
            <p>
              Estate-wide status distribution and six-month activity patterns
              across complaints, tasks, and payments.
            </p>
          </div>
        </div>

        <div className="dashboard-chart-grid admin-dashboard-chart-grid">
          <ChartCard
            title="Complaints by Status"
            description="Current complaint distribution across valid workflow states."
            loading={analyticsLoading}
            error={analyticsError}
            onRetry={fetchDashboardAnalytics}
            empty={!hasPositiveValue(charts.complaintsByStatus, "value")}
            emptyMessage="No complaint data yet"
            summary={buildStatusSummary(charts.complaintsByStatus)}
          >
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={charts.complaintsByStatus}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={68}
                  outerRadius={102}
                  paddingAngle={3}
                >
                  {charts.complaintsByStatus.map((entry) => (
                    <Cell key={entry.key} fill={getChartColor(entry.key)} />
                  ))}
                </Pie>
                <Tooltip
                  content={
                    <ChartTooltip
                      valueFormatter={(value) => `${value} complaints`}
                    />
                  }
                />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Complaints Created Over Time"
            description="The most recent six calendar months, including this month."
            loading={analyticsLoading}
            error={analyticsError}
            onRetry={fetchDashboardAnalytics}
            empty={!hasPositiveValue(charts.complaintsTrend, "count")}
            emptyMessage="No complaint data yet"
            summary={buildMonthlySummary(charts.complaintsTrend, "count", "complaints")}
          >
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={charts.complaintsTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d9e2ec" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                <Tooltip
                  content={
                    <ChartTooltip
                      valueFormatter={(value) => `${value} complaints`}
                    />
                  }
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke={getChartColor("assigned")}
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Tasks by Status"
            description="Operational task load across all current task states."
            loading={analyticsLoading}
            error={analyticsError}
            onRetry={fetchDashboardAnalytics}
            empty={!hasPositiveValue(charts.tasksByStatus, "value")}
            emptyMessage="No task data yet"
            summary={buildStatusSummary(charts.tasksByStatus)}
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={charts.tasksByStatus}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d9e2ec" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                <Tooltip
                  content={
                    <ChartTooltip valueFormatter={(value) => `${value} tasks`} />
                  }
                />
                <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                  {charts.tasksByStatus.map((entry) => (
                    <Cell key={entry.key} fill={getChartColor(entry.key)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Payment Activity"
            description="Paid payment amounts recorded over the last six months."
            loading={analyticsLoading}
            error={analyticsError}
            onRetry={fetchDashboardAnalytics}
            empty={!hasPositiveValue(charts.paymentsTrend, "amount")}
            emptyMessage="No payment activity yet"
            summary={buildMonthlySummary(
              charts.paymentsTrend,
              "amount",
              "paid value",
              formatCurrencyValue
            )}
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={charts.paymentsTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d9e2ec" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis
                  tickFormatter={formatCompactNaira}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  content={
                    <ChartTooltip
                      valueFormatter={(value) => formatCurrencyValue(value)}
                    />
                  }
                />
                <Bar
                  dataKey="amount"
                  radius={[10, 10, 0, 0]}
                  fill={getChartColor("paid")}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </section>

      <section className="dashboard-section-card">
        <div className="dashboard-section-header">
          <div>
            <h2>Quick Actions</h2>
            <p>Move quickly to the areas that need attention today.</p>
          </div>
        </div>

        <div className="admin-quick-actions">
          <Link to="/complaints" className="admin-action-card">
            <span className="admin-action-icon">
              <FaComments />
            </span>
            <div>
              <h3>Review Complaints</h3>
              <p>Monitor resident issues and triage new reports.</p>
            </div>
            <span className="admin-action-arrow">
              <FaArrowRight />
            </span>
          </Link>

          <Link to="/service-providers" className="admin-action-card">
            <span className="admin-action-icon">
              <FaUsersGear />
            </span>
            <div>
              <h3>View Pending Providers</h3>
              <p>Approve or reject new provider registrations.</p>
            </div>
            <span className="admin-action-arrow">
              <FaArrowRight />
            </span>
          </Link>

          <Link to="/tasks" className="admin-action-card">
            <span className="admin-action-icon">
              <FaClipboardList />
            </span>
            <div>
              <h3>Manage Tasks</h3>
              <p>Track assignments, deadlines, and follow-ups.</p>
            </div>
            <span className="admin-action-arrow">
              <FaArrowRight />
            </span>
          </Link>

          <Link to="/contracts" className="admin-action-card">
            <span className="admin-action-icon">
              <FaFileCircleCheck />
            </span>
            <div>
              <h3>Add Contract</h3>
              <p>Create or review provider contract records.</p>
            </div>
            <span className="admin-action-arrow">
              <FaArrowRight />
            </span>
          </Link>

          <Link to="/payments" className="admin-action-card">
            <span className="admin-action-icon">
              <FaMoneyBillWave />
            </span>
            <div>
              <h3>Record Payment</h3>
              <p>Capture payment activity and pending settlements.</p>
            </div>
            <span className="admin-action-arrow">
              <FaArrowRight />
            </span>
          </Link>
        </div>
      </section>

      <div className="admin-dashboard-grid">
        <section className="dashboard-section-card">
          <div className="dashboard-section-header">
            <div>
              <h2>Attention Required</h2>
              <p>
                High-priority items, overdue work, upcoming expiries, and
                pending approvals.
              </p>
            </div>
          </div>

          {hasAnySectionError([
            adminProvidersError,
            adminComplaintsError,
            adminTasksError,
            adminContractsError,
            adminPaymentsError,
          ]) ? (
            <p className="admin-section-error">
              Some attention items may be missing because one or more preview
              sources could not be loaded.
            </p>
          ) : null}

          {hasAnySectionLoading([
            adminProvidersLoading,
            adminComplaintsLoading,
            adminTasksLoading,
            adminContractsLoading,
            adminPaymentsLoading,
          ]) && adminAttentionItems.length === 0 ? (
            <p>Loading attention items...</p>
          ) : adminAttentionItems.length > 0 ? (
            <div className="admin-attention-grid">
              {adminAttentionItems.map((item) => (
                <article
                  key={item.key}
                  className={`admin-preview-item admin-preview-item-${item.tone}`}
                >
                  <div className="admin-preview-main">
                    <div>
                      <h3>{item.title}</h3>
                      <p>{item.subtitle}</p>
                    </div>
                    <span
                      className={`admin-status-badge admin-status-badge-${item.tone}`}
                    >
                      {item.meta}
                    </span>
                  </div>
                  <Link to={item.route} className="admin-inline-link">
                    {item.actionLabel}
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <div className="admin-empty-state">
              <h3>All clear for now</h3>
              <p>
                No urgent approvals, overdue tasks, high-priority complaints,
                expiring contracts, or pending payments need immediate action.
              </p>
            </div>
          )}
        </section>

        <section className="dashboard-section-card">
          <div className="dashboard-section-header">
            <div>
              <h2>Payment Snapshot</h2>
              <p>
                Keep an eye on pending settlements while tracking overall paid
                volume.
              </p>
            </div>
          </div>

          {adminPaymentsError ? (
            <p className="admin-section-error">{adminPaymentsError}</p>
          ) : null}

          <div className="admin-finance-card">
            <div className="admin-finance-item">
              <span className="admin-finance-label">Total Paid</span>
              <strong>{totalPaidAmount}</strong>
            </div>
            <div className="admin-finance-item">
              <span className="admin-finance-label">Pending Payments</span>
              <strong>{adminOverview.pendingPayments.length}</strong>
            </div>
          </div>

          {adminPaymentsLoading && adminOverview.pendingPayments.length === 0 ? (
            <p>Loading payment preview...</p>
          ) : adminOverview.pendingPayments.length > 0 ? (
            <div className="admin-preview-list">
              {adminOverview.pendingPayments.slice(0, 3).map((payment) => (
                <article key={payment._id} className="admin-preview-item">
                  <div className="admin-preview-main">
                    <div>
                      <h3>
                        {payment.serviceProvider?.companyName || "Pending payment"}
                      </h3>
                      <p>
                        {payment.paymentDate
                          ? `Recorded ${dateFormatter.format(
                              new Date(payment.paymentDate)
                            )}`
                          : "Payment date not available"}
                      </p>
                    </div>
                    <span className="admin-status-badge admin-status-badge-warning">
                      {currencyFormatter.format(payment.amount || 0)}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="admin-empty-subtle">
              No pending payments are waiting to be recorded.
            </p>
          )}
        </section>
      </div>

      <div className="admin-dashboard-grid">
        <section className="dashboard-section-card">
          <div className="dashboard-section-header admin-section-header-row">
            <div>
              <h2>Recent Complaints</h2>
              <p>The latest complaints reported by residents.</p>
            </div>
            <Link to="/complaints" className="admin-inline-link">
              Review Complaints
            </Link>
          </div>

          {adminComplaintsError ? (
            <p className="admin-section-error">{adminComplaintsError}</p>
          ) : null}

          {adminComplaintsLoading && adminOverview.recentComplaints.length === 0 ? (
            <p>Loading recent complaints...</p>
          ) : adminOverview.recentComplaints.length > 0 ? (
            <div className="admin-preview-list">
              {adminOverview.recentComplaints.map((complaint) => (
                <article key={complaint._id} className="admin-preview-item">
                  <div className="admin-preview-main">
                    <div>
                      <h3>{complaint.title}</h3>
                      <p>
                        {complaint.resident?.fullName || "Resident not available"}
                        {" • "}
                        {formatDisplayLabel(complaint.category)}
                      </p>
                    </div>
                    <span
                      className={`admin-status-badge admin-status-badge-${getComplaintTone(
                        complaint.status
                      )}`}
                    >
                      {formatDisplayLabel(complaint.status)}
                    </span>
                  </div>
                  <div className="admin-preview-meta">
                    <span>
                      Priority: {formatDisplayLabel(complaint.priority)}
                    </span>
                    <span>
                      Provider: {complaint.serviceProvider?.companyName || "-"}
                    </span>
                    <span>
                      Submitted:{" "}
                      {complaint.createdAt
                        ? dateFormatter.format(new Date(complaint.createdAt))
                        : "-"}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="admin-empty-subtle">
              No complaints have been submitted yet.
            </p>
          )}
        </section>

        <section className="dashboard-section-card">
          <div className="dashboard-section-header admin-section-header-row">
            <div>
              <h2>Upcoming or Overdue Tasks</h2>
              <p>Overdue work is shown first, followed by nearest deadlines.</p>
            </div>
            <Link to="/tasks" className="admin-inline-link">
              Manage Tasks
            </Link>
          </div>

          {adminTasksError ? (
            <p className="admin-section-error">{adminTasksError}</p>
          ) : null}

          {adminTasksLoading && adminOverview.upcomingOrOverdueTasks.length === 0 ? (
            <p>Loading task preview...</p>
          ) : adminOverview.upcomingOrOverdueTasks.length > 0 ? (
            <div className="admin-preview-list">
              {adminOverview.upcomingOrOverdueTasks.map((task) => (
                <article key={task._id} className="admin-preview-item">
                  <div className="admin-preview-main">
                    <div>
                      <h3>{task.title}</h3>
                      <p>
                        {task.serviceProvider?.companyName ||
                          "Service provider not assigned"}
                      </p>
                    </div>
                    <span
                      className={`admin-status-badge admin-status-badge-${getTaskTone(
                        task.status
                      )}`}
                    >
                      {task.status === "overdue"
                        ? "Overdue"
                        : formatDisplayLabel(task.status)}
                    </span>
                  </div>
                  <div className="admin-preview-meta">
                    <span>
                      Deadline:{" "}
                      {task.deadline
                        ? dateFormatter.format(new Date(task.deadline))
                        : "-"}
                    </span>
                    <span>
                      Priority: {formatDisplayLabel(task.priority)}
                    </span>
                    <span>Status: {formatDisplayLabel(task.status)}</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="admin-empty-subtle">
              No active or overdue tasks need immediate review.
            </p>
          )}
        </section>
      </div>
    </section>
  );
}

function formatDisplayLabel(value) {
  if (!value) {
    return "-";
  }

  return String(value)
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function sortByDateDesc(field) {
  return (firstItem, secondItem) => {
    const firstValue = firstItem[field] ? new Date(firstItem[field]).getTime() : 0;
    const secondValue = secondItem[field]
      ? new Date(secondItem[field]).getTime()
      : 0;

    return secondValue - firstValue;
  };
}

function sortByDateAsc(field) {
  return (firstItem, secondItem) => {
    const firstValue = firstItem[field]
      ? new Date(firstItem[field]).getTime()
      : Number.MAX_SAFE_INTEGER;
    const secondValue = secondItem[field]
      ? new Date(secondItem[field]).getTime()
      : Number.MAX_SAFE_INTEGER;

    return firstValue - secondValue;
  };
}

function getComplaintTone(status) {
  if (status === "resolved" || status === "closed") {
    return "success";
  }

  if (status === "assigned" || status === "in_progress") {
    return "neutral";
  }

  if (status === "open") {
    return "warning";
  }

  return "neutral";
}

function getTaskTone(status) {
  if (status === "overdue") {
    return "danger";
  }

  if (status === "completed") {
    return "success";
  }

  if (status === "pending") {
    return "warning";
  }

  return "neutral";
}

function hasAnySectionLoading(values) {
  return values.some(Boolean);
}

function hasAnySectionError(values) {
  return values.some(Boolean);
}

function hasPositiveValue(data = [], key) {
  return Array.isArray(data) && data.some((item) => Number(item[key]) > 0);
}

function getChartColor(key) {
  return statusColorMap[key] || statusColorMap.default;
}

function formatCurrencyValue(value) {
  return currencyFormatter.format(Number(value) || 0);
}

function formatCompactNaira(value) {
  const amount = Number(value) || 0;

  if (amount >= 1000000) {
    return `₦${(amount / 1000000).toFixed(amount >= 10000000 ? 0 : 1)}M`;
  }

  if (amount >= 1000) {
    return `₦${(amount / 1000).toFixed(amount >= 100000 ? 0 : 1)}K`;
  }

  return `₦${amount}`;
}

function buildStatusSummary(data = []) {
  if (!data.length) {
    return "";
  }

  return data
    .slice(0, 3)
    .map((item) => `${item.name}: ${item.value}`)
    .join(" • ");
}

function buildMonthlySummary(data = [], valueKey, noun, formatter) {
  if (!data.length) {
    return "";
  }

  const latest = [...data]
    .reverse()
    .find((item) => Number(item[valueKey]) > 0);

  if (!latest) {
    return "";
  }

  const formattedValue = formatter
    ? formatter(latest[valueKey])
    : `${latest[valueKey]}`;

  return `${latest.month}: ${formattedValue} ${noun}`.trim();
}

export default Dashboard;
