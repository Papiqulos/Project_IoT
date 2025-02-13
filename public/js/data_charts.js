
let influxData = JSON.parse(document.getElementById("influxData").getAttribute("data-value"));
const dataAP = influxData.accessPoints;
const dataAQCo2 = influxData.airQuality.co2;
console.log(dataAP);
console.log(dataAQCo2);


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

const groupedReadingsAP = groupSensorReadings(dataAP);
const groupedReadingsAQCo2 = groupSensorReadings(dataAQCo2);
console.log(groupedReadingsAP);


// Function to create charts
function createCharts(sensorData, flag) {
    
    const container = document.getElementById("chart");

    Object.entries(sensorData).forEach(([sensorName, readings], index) => {
        // Create a canvas for each sensor
        const canvas = document.createElement("canvas");
        canvas.id = `chart-${index}`;
        container.appendChild(canvas);

        // Prepare data for Chart.js
        
        const labels = readings.map(r => new Date(new Date(r._time).getTime() - 2*60*60*1000  ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })); // Convert timestamp
        let values;
        if (flag === "AP") {
             values = readings.map(r => r._value);
        } else if (flag === "AQCo2") {
             values = readings.map(r => (r._value - 400) / 5);
        }

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

createCharts(groupedReadingsAP, "AP");
createCharts(groupedReadingsAQCo2, "AQCo2");


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