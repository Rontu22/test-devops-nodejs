const express = require("express");
const si = require("systeminformation");
const QuickChart = require("quickchart-js");

const app = express();
const PORT = process.env.PORT || 3000;

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

// Health check route with system metrics
app.get("/health", async (req, res) => {
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

    res.send(`
            <h1>System Health</h1>
            <p>OS: ${osInfo.distro} (${osInfo.arch})</p>
            <p>CPU: ${cpu.avgLoad}%</p>
            <p>Memory: ${(mem.used / 1024 / 1024 / 1024).toFixed(
              2
            )} GB used out of ${(mem.total / 1024 / 1024 / 1024).toFixed(
      2
    )} GB</p>
            <img src="${cpuChartUrl}" alt="CPU Load">
            <img src="${memChartUrl}" alt="Memory Usage">
        `);
  } catch (error) {
    res.status(500).send("Error retrieving system metrics");
  }
});

// Default route
app.get("/", (req, res) => {
  res.send("Welcome to the Node.js application!");
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
