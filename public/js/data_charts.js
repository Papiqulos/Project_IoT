let influxData = JSON.parse(document.getElementById("influxData").getAttribute("data-value"));
const urlParams = new URLSearchParams(window.location.search);
    let event, startTime, stopTime;
    // If the URL contains an event parameter, get the parameters
    if (urlParams.has("event")) {
      event = urlParams.get("event").split("|")[0];
      console.log("event", event);
      startTime = urlParams.get("event").split("|")[1];
      stopTime = urlParams.get("event").split("|")[2];
      console.log("start", startTime);
      console.log("stop", stopTime);

      

    }
const dataAP = influxData.accessPoints;
const dataAQCo2 = influxData.airQuality.co2;
console.log(dataAP);
console.log(dataAQCo2);

let curveAP = [0.3, 0.2, 0.2, 0.2, 0.1, 0.1, 0.2, 0.3, 0.7, 0.7, 0.8, 0.8, 0.8, 0.8, 0.7, 0.7, 0.4, 0.5, 0.6, 0.7, 0.7, 0.6, 0.6, 0.3 ];
let fileNames = [
    "Arxaiologiko_mouseio", "Caravel_2", "Caravel", "Coffee_Island", "ELTA", "Faros", "Foititiki_Estia",
    "Habit_cafe", "Jumbo", "Katastima_keramikon", "Molos_cafe", "NN_double_shot", "OMNIA_downtown",
    "Parko_Eirinis", "Prytaneia", "Public", "Sinalio", "Sklavenitis_1", "sklavenitis_2", "Tofalos",
    "Top_form_gym", "Vivliothiki_Panepistimiou", "Voi_Noi", "Xoriatiko", "ZARA"
  ];
let greekDays = ["Κυριακή", "Δευτέρα", "Τρίτη", "Τετάρτη", "Πέμπτη", "Παρασκευή", "Σάββατο"];


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
console.log("grouped", groupedReadingsAP);


// Function to create charts
function createCharts(sensorData, flag) {
    
    const container = document.getElementById("chart");

    Object.entries(sensorData).forEach(([sensorName, readings], index) => {
        // Create a canvas for each sensor
        const canvas = document.createElement("canvas");
        canvas.id = `chart-${index}`;
        container.appendChild(canvas);

        // Prepare data for Chart.js
        
        const labels = readings.map(r => new Date(new Date(r._time).getTime() + 0*60*60*1000  ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })); // Convert timestamp
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
                    y: { title: { display: true, text: "Crowd Density" } }
                }
            }
        });
    });
}

if(new Date()<new Date(startTime)){
    await predictCharts(groupedReadingsAP, "AP", startTime, stopTime);
    await predictCharts(groupedReadingsAQCo2, "AQCo2", startTime, stopTime);
}
else {
    createCharts(groupedReadingsAP, "AP");
    createCharts(groupedReadingsAQCo2, "AQCo2");
}

function getIntermediateDates(startDate, endDate, divisions) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diff = end - start;
    const step = diff / divisions;
    const dates = [];
    for (let i = 0; i < divisions; i++) {
        dates.push(new Date(start.getTime() + i * step));
    }
    return dates;
}

async function predictCharts(sensorData, flag, startDate, endDate) {
    const container = document.getElementById("chart");
    const currentDay = new Date().getDay();
    const currentHour = new Date().getHours();
    const currentGreekDay = greekDays[currentDay];

    const divisions = 50;
    const intermediateDates = getIntermediateDates(startDate, endDate, divisions);

    console.log(flag, sensorData);
    const sensorDataList = Object.entries(sensorData);
    console.log(flag, sensorDataList);
    
    for (const [index, [sensorName, readings]] of Object.entries(sensorData).entries()) {
        // console.log(sensorName)
    
        // Create a canvas for each sensor
        const canvas = document.createElement("canvas");
        canvas.id = `chart-${index}`;
        container.appendChild(canvas);
        
        const targetDay = new Date(startDate).getDay();
        
        
        const avg_reading = readings.reduce((acc, obj) => acc + obj._value, 0) / readings.length;


        let values;
        const labels = intermediateDates.map(date => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));

        if (flag === "AP") {
            const currentMultiplier = curveAP[currentHour];
            
            values = intermediateDates.map((date, i) => {
                console.log("AP")
                const hour = date.getHours();
                const targetMultiplier = curveAP[hour];
                const multiplier = currentMultiplier / targetMultiplier + (0.8 + Math.random() * (1.2 - 0.8));
                return avg_reading * multiplier;
            });

        } else if (flag === "AQCo2" && fileNames.includes(sensorName.replace("air_quality_sensor_", ""))) {
            try {
                const _avg_reading = readings.reduce((acc, obj) => acc + obj._value, 0) / readings.length;
                const avg_reading = (_avg_reading - 400) / 5;
                console.log("trying to fetch", sensorName);
                const response = await fetch(`../curves/${sensorName.replace("air_quality_sensor_", "")}.json`);
                console.log("fetched")
                const data = await response.json();
                

                if (!data[currentGreekDay]) {
                    values = intermediateDates.map(date => {
                        const initial_value = avg_reading
                        const multiplier = 1 + (0.8 + Math.random() * (1.2 - 0.8));
                        return initial_value * multiplier;
                    }); // Fallback in case of missing data
                    console.log("heyheyhey");
                } else {
                    const currentMultiplier = data[currentGreekDay][currentHour];
                    

                    values = intermediateDates.map((date, i) => {
                        const targetDay = date.getDay();
                        const targetGreekDay = greekDays[targetDay];
                        const targetHour = date.getHours();
                        if(!data[targetGreekDay]){
                            const initial_value = avg_reading
                            const multiplier = 1 + (0.8 + Math.random() * (1.2 - 0.8));
                            return initial_value * multiplier;
                        }
                        const targetMultiplier = data[targetGreekDay][targetHour];
                        const multiplier = Math.min(currentMultiplier / targetMultiplier, 3);
                        console.log("multiplier", multiplier, avg_reading * multiplier);
                        return avg_reading * multiplier;
                    });
                }
            } catch (error) {
                console.error(`Error fetching data for ${sensorName}:`, error);
                values = readings.map(r => (r._value - 400) / 5); // Fallback in case of error
            }
        } else {
            const _avg_reading = readings.reduce((acc, obj) => acc + obj._value, 0) / readings.length;
            const avg_reading = (_avg_reading - 400) / 5;
            values = intermediateDates.map(date => {
                const initial_value = avg_reading
                const multiplier = 1 + (0.8 + Math.random() * (1.2 - 0.8));
                return initial_value * multiplier;

            });
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
                    y: { title: { display: true, text: "Crowd Density" } }
                }
            }
        });
    }
}