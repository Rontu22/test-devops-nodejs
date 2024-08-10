const express = require("express");
const si = require("systeminformation");
const QuickChart = require("quickchart-js");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));

// Function to create a chart URL using QuickChart
const createChartUrl = (labels, data, label, color) => {
  const chart = new QuickChart();
  chart.setConfig({
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: label,
          data: data,
          borderColor: color,
          fill: false,
        },
      ],
    },
    options: {
      scales: {
        y: {
          beginAtZero: true,
        },
      },
    },
  });
  return chart.getUrl();
};

// Continuous health check route with system metrics using SSE
app.get("/health", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const sendSystemMetrics = async () => {
    try {
      const cpu = await si.currentLoad();
      const mem = await si.mem();
      const osInfo = await si.osInfo();

      // Gather data for charts
      const cpuData = cpu.cpus.map((cpu) => cpu.load);
      const memData = [
        (mem.used / mem.total) * 100,
        (mem.free / mem.total) * 100,
      ];

      const cpuChartUrl = createChartUrl(
        cpu.cpus.map((_, i) => `CPU ${i + 1}`),
        cpuData,
        "CPU Load (%)",
        "rgba(75, 192, 192, 1)"
      );
      const memChartUrl = createChartUrl(
        ["Used", "Free"],
        memData,
        "Memory Usage (%)",
        "rgba(255, 99, 132, 1)"
      );
      console.log({
        os: `${osInfo.distro} (${osInfo.arch})`,
        cpu: `${cpu.avgLoad}%`,
        memory: `${(mem.used / 1024 / 1024 / 1024).toFixed(
          2
        )} GB used out of ${(mem.total / 1024 / 1024 / 1024).toFixed(2)} GB`,
      });

      res.write(
        `data: ${JSON.stringify({
          os: `${osInfo.distro} (${osInfo.arch})`,
          cpu: `${cpu.avgLoad}%`,
          memory: `${(mem.used / 1024 / 1024 / 1024).toFixed(
            2
          )} GB used out of ${(mem.total / 1024 / 1024 / 1024).toFixed(2)} GB`,
          cpuChartUrl: cpuChartUrl,
          memChartUrl: memChartUrl,
        })}\n\n`
      );
    } catch (error) {
      res.write(`data: Error retrieving system metrics\n\n`);
    }
  };

  // Send initial metrics
  sendSystemMetrics();

  // Send updated metrics every 5 seconds
  const intervalId = setInterval(sendSystemMetrics, 5000);

  // Close the connection when the client disconnects
  req.on("close", () => {
    clearInterval(intervalId);
    res.end();
  });
});

// Default route to serve the HTML file
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
