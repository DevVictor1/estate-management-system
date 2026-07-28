function ChartTooltip({
  active,
  payload,
  label,
  labelFormatter,
  valueFormatter,
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const formattedLabel = labelFormatter ? labelFormatter(label) : label;

  return (
    <div className="dashboard-chart-tooltip">
      {formattedLabel ? (
        <p className="dashboard-chart-tooltip-label">{formattedLabel}</p>
      ) : null}
      <div className="dashboard-chart-tooltip-values">
        {payload.map((item) => (
          <div
            key={`${item.name}-${item.dataKey}`}
            className="dashboard-chart-tooltip-row"
          >
            <span
              className="dashboard-chart-tooltip-dot"
              style={{ backgroundColor: item.color || item.fill || "#2563eb" }}
            />
            <span className="dashboard-chart-tooltip-name">
              {item.name || item.dataKey}
            </span>
            <strong className="dashboard-chart-tooltip-value">
              {valueFormatter
                ? valueFormatter(item.value, item.name || item.dataKey)
                : item.value}
            </strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ChartTooltip;
