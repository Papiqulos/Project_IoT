
let influxData = JSON.parse(document.getElementById("influxData").getAttribute("data-value"));
const dataAP = influxData.accessPoints;
const dataAQCo2 = influxData.airQuality.co2;
console.log(dataAP);
console.log(dataAQCo2);

function getOneTimeInstance(data, desiredTime) {
    // console.log(data)
    const closestPerMeasurement = data.reduce((acc, entry) => {
        const sensor = entry._measurement;
        const entryTime = new Date(entry._time);
        const diff = Math.abs(entryTime - desiredTime);
  
        // Keep only the closest timestamp per measurement
        if (!acc[sensor] || diff < acc[sensor].diff) {
            acc[sensor] = { ...entry, diff }; // Store closest entry
        }
  
        return acc;
    }, {});
  
    // Convert object back to an array
    const result = Object.values(closestPerMeasurement).map(({ diff, ...rest }) => rest);
    return result;
}

function groupSensorReadings(data) {
    return data.reduce((acc, obj) => {
        const key = obj._measurement; // Unique sensor identifier
        if (!acc[key]) {
            acc[key] = []; // Initialize array if key doesn't exist
        }
        acc[key].push(obj); // Add sensor reading to the corresponding group
        return acc;
    }, {});
}

const groupedReadings = groupSensorReadings(dataAP);
console.log(groupedReadings);

// Function to create charts
function createCharts(sensorData) {
    
    const container = document.getElementById("chart");

    Object.entries(sensorData).forEach(([sensorName, readings], index) => {
        // Create a canvas for each sensor
        const canvas = document.createElement("canvas");
        canvas.id = `chart-${index}`;
        container.appendChild(canvas);

        // Prepare data for Chart.js
        const labels = readings.map(r => new Date(r._time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })); // Convert timestamp
        const values = readings.map(r => r._value);

        new Chart(canvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: sensorName,
                    data: values,
                    borderColor: `hsl(${index * 60}, 70%, 50%)`,
                    backgroundColor: `hsl(${index * 60}, 70%, 70%)`,
                    fill: false,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: `Sensor: ${sensorName}`
                    }
                },
                scales: {
                    x: { title: { display: true, text: "Time" } },
                    y: { title: { display: true, text: "Value" } }
                }
            }
        });
    });
}

createCharts(groupedReadings);


// (async function() {
//   const data = [
//     { year: 2010, count: 10 },
//     { year: 2011, count: 20 },
//     { year: 2012, count: 15 },
//     { year: 2013, count: 25 },
//     { year: 2014, count: 22 },
//     { year: 2015, count: 30 },
//     { year: 2016, count: 28 },
//   ];

//   new Chart(
//     document.getElementById('chart'),
//     {
//       type: 'bar',
//       data: {
//         labels: data.map(row => row.year),
//         datasets: [
//           {
//             label: 'Acquisitions by year',
//             data: data.map(row => row.count)
//           }
//         ]
//       }
//     }
//   );
// })();