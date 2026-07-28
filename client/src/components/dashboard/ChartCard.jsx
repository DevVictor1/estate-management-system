import EmptyChartState from "./EmptyChartState";

function ChartCard({
  title,
  description,
  loading,
  error,
  onRetry,
  empty,
  emptyMessage,
  summary,
  children,
  wide = false,
}) {
  return (
    <article
      className={`dashboard-chart-card${wide ? " dashboard-chart-card-wide" : ""}`}
    >
      <div className="dashboard-chart-header">
        <div>
          <h3>{title}</h3>
          {description ? (
            <p className="dashboard-chart-description">{description}</p>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className="dashboard-chart-loading">
          <div className="dashboard-chart-loading-bar dashboard-chart-loading-bar-short" />
          <div className="dashboard-chart-loading-canvas" />
        </div>
      ) : error ? (
        <div className="dashboard-chart-error">
          <p>{error}</p>
          {onRetry ? (
            <button
              type="button"
              className="dashboard-chart-retry"
              onClick={onRetry}
            >
              Retry
            </button>
          ) : null}
        </div>
      ) : empty ? (
        <EmptyChartState message={emptyMessage} />
      ) : (
        <>
          <div className="dashboard-chart-canvas">{children}</div>
          {summary ? <p className="dashboard-chart-summary">{summary}</p> : null}
        </>
      )}
    </article>
  );
}

export default ChartCard;
