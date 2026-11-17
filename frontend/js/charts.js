(function (global) {
  "use strict";

  const COLORS = {
    primary: "#6366F1",
    success: "#10B981",
    warning: "#F59E0B",
    danger: "#EF4444",
    info: "#38BDF8",
    slate: "#64748B"
  };

  function resolve(element) {
    return typeof element === "string" ? document.querySelector(element) : element;
  }

  function escape(value) {
    return String(value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }

  function axisStep(maxValue) {
    if (maxValue <= 4) return 1;
    const rough = maxValue / 4;
    const magnitude = Math.pow(10, Math.floor(Math.log10(rough)));
    const normalized = rough / magnitude;
    let step;
    if (normalized <= 1) step = 1;
    else if (normalized <= 2) step = 2;
    else if (normalized <= 5) step = 5;
    else step = 10;
    return step * magnitude;
  }

  function formatAxis(value) {
    if (value >= 1000) {
      const rounded = value % 1000 === 0 ? value / 1000 : (value / 1000).toFixed(1);
      return rounded + "k";
    }
    return String(Math.round(value));
  }

  function labelIndices(length, maxLabels) {
    const limit = maxLabels || 7;
    if (length <= limit) return Array.from({ length: length }, function (_, index) { return index; });
    const step = Math.ceil(length / limit);
    const indexes = [];
    for (let index = 0; index < length; index += step) indexes.push(index);
    if (indexes[indexes.length - 1] !== length - 1) indexes.push(length - 1);
    return indexes;
  }

  function colorClass(color) {
    const map = {
      [COLORS.primary]: "primary",
      [COLORS.success]: "success",
      [COLORS.warning]: "warning",
      [COLORS.danger]: "danger",
      [COLORS.info]: "info",
      [COLORS.slate]: "slate"
    };
    return map[color] || "primary";
  }

  function legend(series) {
    if (!series || series.length < 2) return "";
    return (
      '<div class="chart-legend">' +
      series
        .map(function (item) {
          return (
            '<span class="chart-legend-item"><span class="legend-dot ' + colorClass(item.color) + '"></span>' +
            escape(item.name) + "</span>"
          );
        })
        .join("") +
      "</div>"
    );
  }

  function line(element, options) {
    const container = resolve(element);
    if (!container) return;
    const config = options || {};
    const labels = config.labels || [];
    const series = (config.series || []).map(function (item, index) {
      return Object.assign({ color: [COLORS.primary, COLORS.success, COLORS.warning, COLORS.info][index % 4] }, item);
    });
    if (!labels.length || !series.length) {
      container.innerHTML = '<div class="chart-empty">No data available</div>';
      return;
    }

    const width = 720;
    const height = config.height || 268;
    const padding = { top: 14, right: 16, bottom: 32, left: 42 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;
    const maxValue = Math.max.apply(
      null,
      series.reduce(function (all, item) { return all.concat(item.data); }, [0])
    );
    const step = axisStep(maxValue);
    const topValue = Math.max(step * 4, step);
    const tickCount = 4;

    const ticks = [];
    for (let index = 0; index <= tickCount; index += 1) {
      const value = (topValue / tickCount) * index;
      const y = padding.top + plotHeight - (value / topValue) * plotHeight;
      ticks.push(
        '<line class="chart-grid-line" x1="' + padding.left + '" y1="' + y + '" x2="' + (width - padding.right) + '" y2="' + y + '"></line>' +
        '<text class="chart-axis-label" x="' + (padding.left - 9) + '" y="' + (y + 3) + '" text-anchor="end">' +
        formatAxis(value) +
        "</text>"
      );
    }

    function xFor(index) {
      return labels.length === 1
        ? padding.left + plotWidth / 2
        : padding.left + (plotWidth / (labels.length - 1)) * index;
    }

    function yFor(value) {
      return padding.top + plotHeight - (value / topValue) * plotHeight;
    }

    const xLabels = labelIndices(labels.length)
      .map(function (index) {
        return (
          '<text class="chart-axis-label" x="' + xFor(index) + '" y="' + (height - 10) + '" text-anchor="middle">' +
          escape(labels[index]) +
          "</text>"
        );
      })
      .join("");

    const paths = series
      .map(function (item) {
        const points = item.data.map(function (value, index) {
          return [xFor(index), yFor(value)];
        });
        const linePath = points
          .map(function (point, index) {
            return (index === 0 ? "M" : "L") + point[0].toFixed(1) + " " + point[1].toFixed(1);
          })
          .join(" ");
        const areaPath =
          linePath +
          " L " + points[points.length - 1][0].toFixed(1) + " " + (padding.top + plotHeight) +
          " L " + points[0][0].toFixed(1) + " " + (padding.top + plotHeight) +
          " Z";
        const dots = points
          .map(function (point, index) {
            return (
              '<circle class="chart-point" cx="' + point[0].toFixed(1) + '" cy="' + point[1].toFixed(1) +
              '" r="3" fill="' + item.color + '" stroke="#151F32" stroke-width="1.5">' +
              "<title>" + escape(labels[index]) + " — " + escape(item.name) + ": " + item.data[index] + "</title>" +
              "</circle>"
            );
          })
          .join("");
        return (
          '<path d="' + areaPath + '" fill="' + item.color + '" opacity="0.07"></path>' +
          '<path d="' + linePath + '" fill="none" stroke="' + item.color + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>' +
          dots
        );
      })
      .join("");

    container.innerHTML =
      (config.showLegend === false ? "" : legend(series)) +
      '<svg viewBox="0 0 ' + width + " " + height + '" role="img" aria-label="' +
      escape(config.ariaLabel || "Line chart") +
      '" preserveAspectRatio="none">' +
      ticks.join("") +
      xLabels +
      paths +
      "</svg>";
  }

  function bars(element, options) {
    const container = resolve(element);
    if (!container) return;
    const config = options || {};
    const labels = config.labels || [];
    const series = (config.series || []).map(function (item, index) {
      return Object.assign({ color: [COLORS.primary, COLORS.info][index % 2] }, item);
    });
    if (!labels.length || !series.length) {
      container.innerHTML = '<div class="chart-empty">No data available</div>';
      return;
    }
    const width = 720;
    const height = config.height || 268;
    const padding = { top: 14, right: 16, bottom: 32, left: 42 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;
    const maxValue = Math.max.apply(
      null,
      series.reduce(function (all, item) { return all.concat(item.data); }, [0])
    );
    const step = axisStep(maxValue);
    const topValue = Math.max(step * 4, step);
    const tickCount = 4;
    const ticks = [];
    for (let index = 0; index <= tickCount; index += 1) {
      const value = (topValue / tickCount) * index;
      const y = padding.top + plotHeight - (value / topValue) * plotHeight;
      ticks.push(
        '<line class="chart-grid-line" x1="' + padding.left + '" y1="' + y + '" x2="' + (width - padding.right) + '" y2="' + y + '"></line>' +
        '<text class="chart-axis-label" x="' + (padding.left - 9) + '" y="' + (y + 3) + '" text-anchor="end">' +
        formatAxis(value) + "</text>"
      );
    }
    const band = plotWidth / labels.length;
    const groupWidth = band * 0.56;
    const barWidth = groupWidth / series.length;
    const radius = Math.min(4, barWidth / 2);

    const barsMarkup = labels
      .map(function (labelValue, labelIndex) {
        const groupStart = padding.left + band * labelIndex + (band - groupWidth) / 2;
        return series
          .map(function (item, seriesIndex) {
            const value = item.data[labelIndex] || 0;
            const barHeight = Math.max(2, (value / topValue) * plotHeight);
            const x = groupStart + barWidth * seriesIndex;
            const y = padding.top + plotHeight - barHeight;
            return (
              '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + Math.max(2, barWidth - 2) +
              '" height="' + barHeight.toFixed(1) + '" rx="' + radius + '" fill="' + item.color + '">' +
              "<title>" + escape(labelValue) + " — " + escape(item.name) + ": " + value + "</title>" +
              "</rect>"
            );
          })
          .join("");
      })
      .join("");

    const xLabels = labels
      .map(function (labelValue, index) {
        return (
          '<text class="chart-axis-label" x="' + (padding.left + band * index + band / 2) + '" y="' + (height - 10) +
          '" text-anchor="middle">' + escape(labelValue) + "</text>"
        );
      })
      .join("");

    container.innerHTML =
      (config.showLegend === false ? "" : legend(series)) +
      '<svg viewBox="0 0 ' + width + " " + height + '" role="img" aria-label="' +
      escape(config.ariaLabel || "Bar chart") +
      '">' +
      ticks.join("") +
      barsMarkup +
      xLabels +
      "</svg>";
  }

  function donut(element, options) {
    const container = resolve(element);
    if (!container) return;
    const config = options || {};
    const segments = (config.segments || []).filter(function (item) { return item.value > 0; });
    const fallback = config.segments || [];
    const total = fallback.reduce(function (sum, item) { return sum + item.value; }, 0);
    const size = 180;
    const center = size / 2;
    const radius = 64;
    const stroke = 18;
    const circumference = 2 * Math.PI * radius;

    if (!total) {
      container.innerHTML = '<div class="chart-empty">No data available</div>';
      return;
    }

    let offset = 0;
    const rings = segments
      .map(function (item) {
        const fraction = item.value / total;
        const dash = fraction * circumference;
        const markup =
          '<circle cx="' + center + '" cy="' + center + '" r="' + radius + '" fill="none" stroke="' + item.color +
          '" stroke-width="' + stroke + '" stroke-dasharray="' + (dash - 3) + " " + (circumference - dash + 3) +
          '" stroke-dashoffset="' + (-offset) + '" stroke-linecap="round" transform="rotate(-90 ' + center + " " + center + ')">' +
          "<title>" + escape(item.label) + ": " + item.value + "</title>" +
          "</circle>";
        offset += dash;
        return markup;
      })
      .join("");

    const legendMarkup = segments
      .map(function (item) {
        return (
          '<div class="donut-legend-item"><span class="legend-dot ' + colorClass(item.color) + '"></span>' +
          '<span class="label">' + escape(item.label) + "</span>" +
          '<span class="value">' + item.value + "</span>" +
          '<span class="pct">' + Math.round((item.value / total) * 100) + "%</span></div>"
        );
      })
      .join("");

    container.innerHTML =
      '<div class="donut-wrap">' +
      '<svg class="donut-svg" viewBox="0 0 ' + size + " " + size + '" role="img" aria-label="' +
      escape(config.ariaLabel || "Donut chart") +
      '">' +
      '<circle cx="' + center + '" cy="' + center + '" r="' + radius + '" fill="none" stroke="rgba(148,163,184,0.1)" stroke-width="' + stroke + '"></circle>' +
      rings +
      '<text class="donut-center-value" x="' + center + '" y="' + (center - 2) + '" text-anchor="middle">' +
      (config.centerValue != null ? escape(config.centerValue) : total) +
      "</text>" +
      '<text class="donut-center-label" x="' + center + '" y="' + (center + 16) + '" text-anchor="middle">' +
      escape(config.centerLabel || "Total") +
      "</text></svg>" +
      '<div class="donut-legend">' + legendMarkup + "</div></div>";
  }

  global.Charts = {
    colors: COLORS,
    line: line,
    bars: bars,
    donut: donut
  };
})(window);
