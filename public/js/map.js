// Global variables
let map,
  heatmapAP,
  heatmapAQ,
  infoWindow,
  selectedOrigin,
  selectedDestination,
  currentLocation,
  currentDirections,
  selectedDepartureTime,
  selectedArrivalTime,
  selectedDepartureDate,
  selectedArrivalDate,
  selectedMetric,
  selectedStart = "2025-02-10T15:36:00.000Z",
  selectedStop = "2025-02-10T16:42:00.000Z",
  markersAP = [],
  markersAQ = [];
let currentTotalAirQualityTrip = [];
let markers = [];
const center_bald = { lat: 38.23666252117088, lng: 21.732572423403976 }; // euagellobill
const center_HMTY = { lat: 38.28806669351595, lng: 21.78915113469408};
const center_dasylio = {lat: 38.24813853795226, lng: 21.744063705154087}
let default_center = center_dasylio;
const googleApiKey = getGoogleApiKey();
const userIdElemenent = document.getElementById("user-id");
const userId = userIdElemenent.getAttribute("data-value");
console.log("username: ", userId); // Outputs the Handlebars variable
const userRoleElemenent = document.getElementById("user-role");
const userRole = userRoleElemenent.getAttribute("data-value");
console.log("user role: ", userRole); // Outputs the Handlebars variable
let businessObj;
if (userRole === "business"){
  const businessObjElement = document.getElementById("business-obj");
  businessObj = JSON.parse(businessObjElement.getAttribute("data-value"));
  console.log("businessObj", businessObj);
}
let influxData = JSON.parse(document.getElementById("influxData").getAttribute("data-value"));
// console.log("influxData", influxData);
let egb = 0;

// HELPER FUNCTIONS - NOT ALL USED 
function componentToHex(c) {
  c = Math.round(c * 255);
  var hex = c.toString(16);
  return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(r, g, b) {
  return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

function getSelectedTimeDateObj(selectedDate, selectedTime) {
  // Make a Date obj out of the selected time and date;
  const dateTimeStr = `${selectedDate}T${selectedTime}:00`; // Adds seconds for full ISO format

  // Create a Date object and return it
  return new Date(dateTimeStr);
}

function generateIntermediateDates(startDate, endDate, numPoints = 100) {
  const startTime = startDate.getTime();
  const endTime = endDate.getTime();
  const interval = (endTime - startTime) / (numPoints + 1); // +1 ensures 100 points between

  return Array.from({ length: numPoints }, (_, i) => new Date(startTime + (i + 1) * interval));
}

// USER LOCATION
// Get the user's current location and store it in a global variable
function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          window.currentLocation = location;
          resolve(location);
        },
        (error) => {
          console.error("Error getting current location:", error);
          reject(error);
        }
      );
    } else {
      reject(new Error("Geolocation is not supported by this browser."));
    }
  });
}

// Center the map on the user's current location
async function toggleCurrentLocation() {
  infoWindow = new google.maps.InfoWindow();
  let location;
  if (userRole === "citizen") {
    location = window.currentLocation;
  }
  else if (userRole === "business") {
    location = await getCoordsFromPlaceName(`${businessObj.address}`+ ", " + `${businessObj.city}`);
  }
  infoWindow.setPosition(location);
  infoWindow.setContent("Location found.");
  infoWindow.open(map);
  map.setCenter(location);
}

// LIMIT API REQUESTS
function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// GET ADDRESS FROM COORDINATES
async function getAddressFromCoordinates(location) {
  const geocoder = new google.maps.Geocoder();
  const response = await geocoder.geocode({ location: location });
  return new Promise((resolve, reject) => {
    if (response && response.results && response.results.length) {
      resolve(response.results[0].formatted_address);
    } else {
      reject("No address found");
    }
  });
}

// GET COORDS FROM PLACE NAME
async function getCoordsFromPlaceName(placeName) {
  const geocoder = new google.maps.Geocoder();
  const response = await geocoder.geocode({ address: placeName });
  return new Promise((resolve, reject) => {
    if (response && response.results && response.results.length) {
      resolve(response.results[0].geometry.location);
    } else {
      reject("No address found");
    }
  });
}

function normalizeValue(value, type){
  if(type == "co2"){
    // console.log("co2", value);
    return value | 0;
  }
  else if(type == "AP"){
    // console.log("AP", value);
    return value;
  }
}

// ACCESS POINTS HEATMAPS
// Get the points for the heatmap from the InfluxDB access points
async function getHeatmapData(accesPoints = influxData.accessPoints, dataCo2 = influxData.airQuality.co2,
                              startTime = selectedStart, stopTime = selectedStop) {
  // const accesPoints = influxData.accessPoints;
  // const dataCo2 = influxData.airQuality.co2;
  const compressedAccessPoints = {};
  const AP_counts = {};
  const compressedDataCo2 = {};
  const CO2_counts = {};
  let heatmapData = [];

  const maxNumber = 1000;

  // Compress Access Points
  accesPoints.forEach((point) => {
    if (!compressedAccessPoints[point.location_n]) {
      compressedAccessPoints[point.location_n] = { location: point.location, _value: point._value };
      AP_counts[point.location_n] = 1;
    } else {
      compressedAccessPoints[point.location_n]._value += point._value;
      AP_counts[point.location_n] += 1;
    }
  });

  // Calculate Averages
  Object.keys(compressedAccessPoints).forEach((key) => {
    compressedAccessPoints[key]._value /= AP_counts[key];
  });

  dataCo2.forEach((point) => {
    if (!compressedDataCo2[point.location_n]) {
      compressedDataCo2[point.location_n] = { location: point.location, _value: point._value };
      CO2_counts[point.location_n] = 1;
    } else {
      compressedDataCo2[point.location_n]._value += point._value;
      CO2_counts[point.location_n] += 1;
    }
  });

  Object.keys(compressedDataCo2).forEach((key) => {
    compressedDataCo2[key]._value /= CO2_counts[key];
  });

  const currentDate = new Date();
  if(currentDate>new Date(stopTime)){
    Object.keys(compressedDataCo2).forEach((key) => {
      const point = compressedDataCo2[key];
      const value = (point._value - 400) / 2;
      const lat = parseFloat(point.location.split(",")[0]);
      const lng = parseFloat(point.location.split(",")[1]);

      const actual_value = normalizeValue(value, "co2");
      heatmapData.push({ location: new google.maps.LatLng(lat, lng), weight: actual_value , location_n: key});
    });
    Object.keys(compressedAccessPoints).forEach((key) => {
      const point = compressedAccessPoints[key];
      const lat = parseFloat(point.location.split(",")[0]);
      const lng = parseFloat(point.location.split(",")[1]);
      const value = point._value;
      const actual_value = normalizeValue(value, "AP");
      heatmapData.push({ location: new google.maps.LatLng(lat, lng), weight: actual_value, location_n: key });
    });
    return heatmapData;
  }
  console.log("Welcome to the future");
  const greekDays = ["Κυριακή", "Δευτέρα", "Τρίτη", "Τετάρτη", "Πέμπτη", "Παρασκευή", "Σάββατο"];
  const currentGreekDay = greekDays[new Date().getDay()];
  const currentHour = new Date().getHours();

  const targetDateStart = startTime;
  const targetDateStop = stopTime;
  const targetDateStartObj = new Date(targetDateStart);
  const targetDateStopObj = new Date(targetDateStop);
  const targetDateStartGreekDay = greekDays[targetDateStartObj.getDay()];
  const targetDateStopGreekDay = greekDays[targetDateStopObj.getDay()];
  const targetDateStartHour = targetDateStartObj.getHours();
  const targetDateStopHour = targetDateStopObj.getHours();

  const fileNames = [
    "Arxaiologiko_mouseio", "Caravel_2", "Caravel", "Coffee_Island", "ELTA", "Faros", "Foititiki_Estia",
    "Habit_cafe", "Jumbo", "Katastima_keramikon", "Molos_cafe", "NN_double_shot", "OMNIA_downtown",
    "Parko_Eirinis", "Prytaneia", "Public", "Sinalio", "Sklavenitis_1", "Sklavenitis_2", "Tofalos",
    "Top_form_gym", "Vivliothiki_Panepistimiou", "Voi_Noi", "Xoriatiko", "ZARA"
  ];
  const curveAP = [0.3, 0.2, 0.2, 0.2, 0.1, 0.1, 0.2, 0.3, 0.7, 0.7, 0.8, 0.8, 0.8, 0.8, 0.7, 0,7, 0.4, 0.5, 0.6, 0.7, 0.7, 0.6, 0.6, 0.3 ]

  // Process Access Points
  Object.keys(compressedAccessPoints).forEach((key) => {
    const point = compressedAccessPoints[key];
    const lat = parseFloat(point.location.split(",")[0]);
    const lng = parseFloat(point.location.split(",")[1]);
    

    const current_mult = curveAP[currentHour];
    const target_mult = curveAP[targetDateStartHour] + curveAP[targetDateStopHour];
    const multiplier = target_mult / current_mult;
    
    const value = 2*point._value * multiplier;
    const actual_value = normalizeValue(value, "AP");
    heatmapData.push({ location: new google.maps.LatLng(lat, lng), weight: actual_value, location_n: key });
  });
  // console.log("TEST", accesPoints)

  // Create an array of fetch promises
  const fetchPromises = Object.keys(compressedDataCo2).map(async (key) => {
    const name = key;
    const point = compressedDataCo2[key];
    const value = (point._value - 400) / 2;
    const lat = parseFloat(point.location.split(",")[0]);
    const lng = parseFloat(point.location.split(",")[1]);

    if (!fileNames.includes(name)) {
      const actual_value = normalizeValue(value, "co2");
      heatmapData.push({ location: new google.maps.LatLng(lat, lng), weight: actual_value, location_n: key });
    } else {
      try {
        const response = await fetch(`../curves/${name}.json`);
        if (!response.ok) throw new Error(`Failed to fetch ${name}`);
        const data = await response.json();

        if (!data[currentGreekDay] || !data[targetDateStartGreekDay] || !data[targetDateStopGreekDay]) {
          const actual_value = normalizeValue(value, "co2");
          heatmapData.push({ location: new google.maps.LatLng(lat, lng), weight: actual_value, location_n: key });
        } else {
          const currentLevel = data[currentGreekDay][currentHour];
          const targetLevelStart = data[targetDateStartGreekDay][targetDateStartHour];
          const targetLevelStop = data[targetDateStopGreekDay][targetDateStopHour];
          const targetLevel = (targetLevelStart + targetLevelStop) / 2;

          let multiplier = targetLevel / (currentLevel + 1);
          multiplier = Math.min(multiplier, 3);
          const target_value = multiplier * value;
          const actual_value = normalizeValue(target_value, "co2");
          heatmapData.push({ location: new google.maps.LatLng(lat, lng), weight: actual_value, location_n: key });
        }
      } catch (error) {
        console.error(`Error fetching ${name}:`, error);
        const actual_value = normalizeValue(value, "co2");
        heatmapData.push({ location: new google.maps.LatLng(lat, lng), weight: actual_value, location_n: key });
      }
    }
  });

  // Wait for all fetch requests to finish
  await Promise.all(fetchPromises);



  // console.log("Final Heatmap Data:", heatmapData);
  return heatmapData;
}

// Show the heatmap from the access points on the map
function toggleHeatmap() {
  if (selectedDepartureDate === undefined || selectedDepartureTime === undefined || selectedArrivalDate === undefined || selectedArrivalTime === undefined) {
    // Default values
    selectedStart = "2025-02-10T15:36:00.000Z";
    selectedStop = "2025-02-10T16:42:00.000Z";
  }
  else{
    // selectedStart = `${selectedDepartureDate}T${selectedDepartureTime}:00.000Z`;
    // selectedStop = `${selectedArrivalDate}T${selectedArrivalTime}:00.000Z`;

    var startTime = document.getElementById("departureTime").value;
    var startDate = document.getElementById("departureDate").value;
    var stopTime = document.getElementById("arrivalTime").value;
    var stopDate = document.getElementById("arrivalDate").value;

    selectedStart = `${startDate}T${startTime}:00.000Z`;
    selectedStop = `${stopDate}T${stopTime}:00.000Z`;
    
    console.log("selectedStart", selectedStart); 
    console.log("selectedStop", selectedStop);
    // Compare the selected dates to make sure the start date is before the stop date
    if (new Date(selectedStart) > new Date(selectedStop)) {
      alert("Please select a valid time range");
      return;
    }
  }
  
  window.location.href = `/home?event=HeatmapsButtonClicked|${selectedStart}|${selectedStop}`;
  
}

function changeRadius(zoom) {
  heatmapAP.set("radius", zoom * 3);
  heatmapAQ.set("radius", zoom * 3);
}

// NOT USED
function clearHeatmap() {
  if (heatmapAP) {
    heatmapAP.setMap(null);
  }
}

// Get the api key from the backend
async function getGoogleApiKey() {
  const response = await fetch("/api/key"); // Fetch API key from backend
  if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
  const data = await response.json();
  // console.log("API Key Sent:", data.key); // Debugging output
  return data.key;
}

function clearMarkers() {
  // Clear existing markers if any
  if (window.markers) {
    window.markers.forEach((marker) => marker.setMap(null));
  }
  window.markers = [];
}

function clearMarkersAP() {
  // Clear existing markers if any
  if (markersAP) {
    markersAP.forEach((marker) => marker.setMap(null));
  }
  markersAP = [];
}

function clearMarkersAQ() {
  // Clear existing markers if any
  if (markersAQ) {
    markersAQ.forEach((marker) => marker.setMap(null));
  }
  markersAQ = [];
}

// AIR QUALITY HEATMAPS
// Function to get Air Quality Data for a specific location through the Google Maps API or the InfuxDB sensors (ONLY GOOGLE MAPS API IS IMPLEMENTED)
async function getAirQualityDataLocation(location_, type = "google") {
  try {
    if (type === "google") {
      let googleApiKeyResolved = await googleApiKey;
      // console.log("googleApiKeyResolved", googleApiKeyResolved);
      // console.log("location_", location_);
      // console.log("location_.lat", location_.lat);
      // console.log("location_.lng", location_.lng);
      
        const response = await axios.post(
          `https://airquality.googleapis.com/v1/currentConditions:lookup?key=${googleApiKeyResolved}`,
          {
            location: {
              latitude: location_.lat,
              longitude: location_.lng,
            },
            //   extraComputations: ['HEALTH_RECOMMENDATIONS'], // Optional: Add extra computations
            languageCode: "en", // Optional: Set the language
          },
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        // Return the API response data
        return response.data;
      }else if (type === "influx") {
        console.log("InfluxDB");
      }
  }
  
   catch (error) {
    // Throw an error if the request fails
    throw new Error(
      "Error getting air quality data: " +
        JSON.stringify(error.response?.data || error.message)
    );
  }
}

// Function to get Air Quality Data from the InfuxDB sensors within a specific time frame and a given metric
function getAirQualityDataAll(metric = "co2", airQualityDataI = influxData.airQuality) {
  // const airQualityDataI = influxData.airQuality;
  const dataCo2 = airQualityDataI.co2;
  const dataHumidity = airQualityDataI.humidity;
  const dataTemperature = airQualityDataI.temperature;

  // Get the type of air quality data to display
  let data = [];
  // console.log("using metric", metric);
  // Get the air quality data for the selected metric
  switch (metric) {
    case "co2":
      // console.log("co2");
      dataCo2.forEach((element) => {
        const lat = parseFloat(element.location.split(",")[0]);
        const lng = parseFloat(element.location.split(",")[1]);
        const point = { location: new google.maps.LatLng(lat, lng), weight: element._value };
        data.push(point);
      });
      break;
    case "humidity":
      // console.log("humidity");
      dataHumidity.forEach((element) => {
        const lat = parseFloat(element.location.split(",")[0]);
        const lng = parseFloat(element.location.split(",")[1]);
        const point = { location: new google.maps.LatLng(lat, lng), weight: element._value };
        data.push(point);
      });
      break;
    case "temperature":
      // console.log("temperature");
      dataTemperature.forEach((element) => {
        const lat = parseFloat(element.location.split(",")[0]);
        const lng = parseFloat(element.location.split(",")[1]);
        const point = { location: new google.maps.LatLng(lat, lng), weight: element._value };
        data.push(point);
      });
      break;
      default:
        // console.log("default");
        dataCo2.forEach((element) => {
          const lat = parseFloat(element.location.split(",")[0]);
          const lng = parseFloat(element.location.split(",")[1]);
          const point = { location: new google.maps.LatLng(lat, lng), weight: element._value };
          data.push(point);
        });
        
  }
  
  return data;

}

// Show the air quality information based on the selected time range and metric
function toggleAirQualityAll() {
  const aqMetricRadios = document.getElementsByName("aq_metric");
  // Get the selected metric from the radio buttons
  for (const radio of aqMetricRadios) {
      if (radio.checked) {
        selectedMetric = radio.value;
        break;
      }
    }
  // If nothing is selected, default to CO2
  if(!selectedMetric){
    selectedMetric = "co2";
    }
  console.log("selected this metric", selectedMetric);
  
  // If no time range is selected, default to a specific time range
  if (selectedDepartureDate === undefined 
    || selectedDepartureTime === undefined 
    || selectedArrivalDate === undefined 
    || selectedArrivalTime === undefined 
    ) {
    // Default values for the selected time range
    selectedStart = "2025-02-10T15:36:00.000Z";
    selectedStop = "2025-02-10T16:42:00.000Z";
  }
  else{
    // selectedStart = `${selectedDepartureDate}T${selectedDepartureTime}:00.000Z`;
    // selectedStop = `${selectedArrivalDate}T${selectedArrivalTime}:00.000Z`;

    var startTime = document.getElementById("departureTime").value;
    var startDate = document.getElementById("departureDate").value;
    var stopTime = document.getElementById("arrivalTime").value;
    var stopDate = document.getElementById("arrivalDate").value;
    

    selectedStart = `${startDate}T${startTime}:00.000Z`;
    selectedStop = `${stopDate}T${stopTime}:00.000Z`;
    // Compare the selected dates to make sure the start date is before the stop date
    if (new Date(selectedStart) > new Date(selectedStop)) {
      alert("Please select a valid time range");
      return;
    }
  }
  
  window.location.href = `/home?event=AirQualityButtonClicked|${selectedStart}|${selectedStop}|${selectedMetric}`;
}

function getAverageMetricLevels() {
  // Get the average air quality data for the selected time range and all the metrics
  const dataCo2 = influxData.airQuality.co2;
  const dataHumidity = influxData.airQuality.humidity;
  const dataTemperature = influxData.airQuality.temperature;

  // Get the average values for each metric
  const averageCo2 = Math.round(dataCo2.reduce((acc, element) => acc + element._value, 0) / dataCo2.length);
  const averageHumidity = Math.round(dataHumidity.reduce((acc, element) => acc + element._value, 0) / dataHumidity.length);
  const averageTemperature = Math.round(dataTemperature.reduce((acc, element) => acc + element._value, 0) / dataTemperature.length);

  return { co2: averageCo2, humidity: averageHumidity, temperature: averageTemperature };
}

async function getTop3AP() {
  const data = await getHeatmapData(influxData.accessPoints, influxData.airQuality.co2);
  const sortedData = data.sort((a, b) => b.weight - a.weight);
  return sortedData.slice(0, 3);
}

// Show the air quality information based on his selected route
async function toggleInfoTrip() {
  egb++;
  console.log("egb", egb);
  if (egb > 30){
    window.location.href = "/eyyo ";
    egb=0;
  }
  try {
    const averageLevels = getAverageMetricLevels();
    const top3AP = await getTop3AP();
    if (userRole === "citizen") {
      //Append the container to the map if it doesn't exist
      
      if (!document.querySelector(".air-quality-container")) {
        console.log("appending airQualityContainer");

        const airQualityContainer = document.createElement("div");
        airQualityContainer.classList.add("air-quality-container");
        if (!currentDirections) {
          console.log("No directions found (KEEP YOURSELF SAFE)");
          airQualityContainer.innerHTML = `
          <div class="dropdown-content">
            <a>Average Co2 Levels: ${averageLevels.co2} p/m</a>
            <a>Average Humidity: ${averageLevels.humidity} %</a>
            <a>Average Temperature: ${averageLevels.temperature} °C</a>
            <a>Top 3 Crowded Locations</a>
            <a>${top3AP[0].location_n}: ${top3AP[0].weight} </a>
            <a>${top3AP[1].location_n}: ${top3AP[1].weight} </a>
            <a>${top3AP[2].location_n}: ${top3AP[2].weight} </a>
          </div>
          `;
        }
        else{
          let totalAqi = 0;
          let totalAqiCategory = [];
  
          currentTotalAirQualityTrip.forEach((element, index) => {
            totalAqi += element.aqi;
            totalAqiCategory.push(element.aqiCategory);
          });
  
          const averageAqi = totalAqi / currentTotalAirQualityTrip.length;
          const categoryCount = totalAqiCategory.reduce((acc, category) => {
            acc[category] = (acc[category] || 0) + 1;
            return acc;
          }, {});
  
          const mostOccurringCategory = Object.keys(categoryCount).reduce(
            (a, b) => (categoryCount[a] > categoryCount[b] ? a : b)
          );
  
          
  
  
          airQualityContainer.innerHTML = `
          <div class="dropdown-content">
            <a>Average AQI: ${averageAqi.toFixed(2)}</a>
            <a>Average Air Quality: ${mostOccurringCategory}</a>
            <a>Average Co2 Levels: ${averageLevels.co2} p/m</a>
            <a>Average Humidity: ${averageLevels.humidity} %</a>
            <a>Average Temperature: ${averageLevels.temperature} °C</a>
            <a>Top 3 Crowded Locations</a>
            <a>${top3AP[0].location_n}: ${top3AP[0].weight} </a>
            <a>${top3AP[1].location_n}: ${top3AP[1].weight} </a>
            <a>${top3AP[2].location_n}: ${top3AP[2].weight} </a>
          </div>
          `;
        }
        

        // Get the average air quality and its category for the selected route
        

        var generalButtonContainer = document.getElementById(
          "generalButtonContainer"
        );



        
        generalButtonContainer.appendChild(airQualityContainer);
      } else {
        console.log("removing airQualityContainer");
        document.querySelector(".air-quality-container").remove();
      }
    } else if (userRole === "business") {
      if (!document.querySelector(".air-quality-container")) {
      const airQualityContainer = document.createElement("div");
      airQualityContainer.classList.add("air-quality-container");
        if (!currentDirections) {
          console.log("No directions found (KEEP YOURSELF SAFE)");
          airQualityContainer.innerHTML = `
          <div class="dropdown-content">
            <a>Average Co2 Levels: ${averageLevels.co2} p/m</a>
            <a>Average Humidity: ${averageLevels.humidity} %</a>
            <a>Average Temperature: ${averageLevels.temperature} °C</a>
            <a>Top 3 Crowded Locations</a>
            <a>${top3AP[0].location_n}: ${top3AP[0].weight}</a>
            <a>${top3AP[1].location_n}: ${top3AP[1].weight}</a>
            <a>${top3AP[2].location_n}: ${top3AP[2].weight}</a>
          </div>
          `;
        }
        var generalButtonContainer = document.getElementById(
          "generalButtonContainer"
        );



        
        generalButtonContainer.appendChild(airQualityContainer);
      } else {
        console.log("removing airQualityContainer");
        document.querySelector(".air-quality-container").remove();
      }
    } else if (userRole === "admin") {
      console.log("Admin role detected");
    } else {
      console.log("No role detected KeepYourselfSafe");
    }
  } catch (error) {
    console.error(error);
  }
}

// Helpers for the influx data
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

// VARIOUS SEARCHES
// NOT USED
// Finds nearby places based on a given center 
async function nearbySearchPlace(center = default_center, results = 5) {
  const { Place, SearchNearbyRankPreference } = await google.maps.importLibrary(
    "places"
  );

  const request = {
    // required parameters
    fields: ["displayName", "location", "businessStatus", "userRatingCount"],
    locationRestriction: {
      center: center,
      radius: 700,
    },
    // optional parameters
    maxResultCount: results,
    rankPreference: SearchNearbyRankPreference.POPULARITY,
    language: "en-GR",
    region: "gr",
  };
  const { places } = await Place.searchNearby(request);

  if (places.length) {
    console.log("Found results");
    return places;
  } else {
    console.log("No results");
  }
}

// NOT USED
// Perform a text-based search for places 
async function textSearchPlace(text, results = 15) {
  console.log("text running");
  if (!text) {
    // console.log("No text provided");
    return;
  }
  const { Place } = await google.maps.importLibrary("places");
  const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
  const request = {
    textQuery: text,
    fields: ["displayName", "location", "businessStatus", "formattedAddress"],
    maxResultCount: results,
    minRating: 3.2,
    useStrictTypeFiltering: false,
  };
  //@ts-ignore
  const { places } = await Place.searchByText(request);

  if (places.length) {
    // console.log(places);

    // const { LatLngBounds } = await google.maps.importLibrary("core");
    // const bounds = new LatLngBounds();

    // // Loop through and get all the results.
    // places.forEach((place) => {
    //   const markerView = new AdvancedMarkerElement({
    //     map,
    //     position: place.location,
    //     title: place.displayName,
    //   });

    //   bounds.extend(place.location);

    // });
    // map.fitBounds(bounds);
    return places;
  } else {
    console.log("No results");
  }
}

// DIRECTONS
// Get directions and intermediate markers from an origin to a destination with a specific travel mode
async function getDirections(origin, destination, travelMode = "DRIVING", departureTime = new Date(), arrivalTime = new Date() + 1) {
  
  // Clear any existing directions
  // clearDirections();
  // Clear any existing markers
  // clearMarkers();
  var directionsService = new google.maps.DirectionsService();
  var directionsRenderer = new google.maps.DirectionsRenderer();
  currentDirections = directionsRenderer;
  directionsRenderer.setMap(map);
  // console.log("origin", origin);
  // console.log("destination", destination);
  // console.log("travelMode", travelMode);
  // console.log("departureTime", departureTime);
  // console.log("arrivalTime", arrivalTime);
  var request = {
    origin: origin,
    destination: destination,
    travelMode: travelMode,
  };
  if (travelMode === google.maps.TravelMode.DRIVING) {
    request.drivingOptions = {
      departureTime: departureTime, // Set to current time or any specific time
      trafficModel: 'bestguess', // Other options: 'pessimistic', 'optimistic'
    };
  } else if (travelMode === google.maps.TravelMode.TRANSIT) {
    request.transitOptions = {
      departureTime: departureTime, // Set departure time
      // arrivalTime: new Date('2024-02-08T15:30:00'), // Uncomment to use arrival time instead
    };
  }
  directionsService.route(request, async function (result, status) {
    if (status == "OK") {
      directionsRenderer.setDirections(result);
      // console.log("result", JSON.stringify(result.routes[0].legs[0].steps[0].path));

      try {
        const steps = result.routes[0].legs[0].steps;
        let heat = await getHeatmapData(influxData.accessPoints, influxData.airQuality.co2);
        if (steps) {
          // Clear the previous air quality data
          currentTotalAirQualityTrip = [];
          steps.forEach(async (step, i) => {
            const path = step.path;
            const middlePoint = path[Math.floor(path.length / 2)];

            // Get the air quality data for the middle point of each step
            const fetchedData = await getAirQualityDataLocation({
              lat: middlePoint.lat(),
              lng: middlePoint.lng(),
            });

            // Extract the AQI, AQI color, and AQI category
            const aqi = fetchedData.indexes[0].aqi;
            const aqiColor = fetchedData.indexes[0].color;
            const aqiCategory = fetchedData.indexes[0].category;
            currentTotalAirQualityTrip.push({ aqi, aqiColor, aqiCategory });

            const backgroundColor = rgbToHex(
              aqiColor.red,
              aqiColor.green,
              aqiColor.blue || 0
            );

            // Create a marker for each step
            const markerTitle = `Step ${i + 1}:\n${aqiCategory}\nAQI:${aqi}`;
            const { AdvancedMarkerElement, PinElement } =
              await google.maps.importLibrary("marker");

            const pin = new PinElement({
              glyph: `${i + 1}`,
              scale: 0.5,
              background: backgroundColor,
            });

            // Visualize the middle point of each step
            const markerView = new AdvancedMarkerElement({
              position: middlePoint,
              map: map,
              title: markerTitle,
              content: pin.element,
              gmpClickable: true,
            });

            markerView.addListener("click", ({ docEvent, latLng }) => {
              infoWindow.close();
              infoWindow.setContent(markerView.title);
              infoWindow.open(markerView.map, markerView);
            });
            // Store the marker for later removal
            window.markers.push(markerView);

            // Get Crowd Density information for the trip
            path.forEach(async (point) => {
              // For every point in the path find if an access point exits within a radius of 200m
              point = {lat: point.lat(), lng: point.lng()};
              heat.forEach(async (accessPoint) => {
                let gAccessPoint = {lat: accessPoint.location.lat(), lng: accessPoint.location.lng()};
                // console.log("accessPoint", accessPointLat, accessPointLng);
                // console.log("point", point.lat, point.lng);
                
                const dist = google.maps.geometry.spherical.computeDistanceBetween(point, gAccessPoint);
                // console.log("dist", dist);
                if (dist < 30) {
                  // console.log(gAccessPoint);
                  // Add a marker for path points that are close to access points
                  if(accessPoint.weight > 40){
                    const pin = new PinElement({
                      glyph: "📡",
                      scale: 0.9,
                      background: "#FF0000",
                    });
                    const markerView = new AdvancedMarkerElement({
                      position: point,
                      map: map,
                      title: `Estimated Crowd: ${Math.floor(accessPoint.weight)}`,
                      content: pin.element,
                      gmpClickable: true,
                    });
                    markerView.addListener("click", ({ docEvent, latLng }) => {
                      infoWindow.close();
                      infoWindow.setContent(markerView.title);
                      infoWindow.open(markerView.map, markerView);
                    });
                    window.markers.push(markerView);
                    // console.log("Access Point found");
                  }
                }
              });
              
            });
        });
        } else {
          console.log("No steps found");
        }
      } catch (error) {
        console.error("Error getting intermediate markers:", error);
      }
    }
  });
}

// Visualize the directions and the intermediate markers on the map
async function showDirections() {
  // console.log("searching place");
  const travelModeRadios = document.getElementsByName("travel_mode");
  let selectedTravelMode;
  const originInput = document.getElementById("origin_input").value;
  const destinationInput = document.getElementById("destination_input").value;

  selectedOrigin = originInput || window.currentLocation; // defaults to the user's current location
  selectedDestination = destinationInput || center_bald; // defaults to euagellobill

  for (const radio of travelModeRadios) {
    if (radio.checked) {
      selectedTravelMode = radio.value;
      break;
    }
  }

  // Get directions to the place
  // console.log("Origin", selectedOrigin);
  // console.log("Destination", selectedDestination);
  // console.log("selectedTravelMode", selectedTravelMode);
  clearDirections();
  clearMarkers();
  getDirections(selectedOrigin, selectedDestination, selectedTravelMode);
}

// Function to clear directions
function clearDirections() {
  
  // Remove any directions visible on the map
  if (currentDirections) {
    console.log("clearing directions");
    currentDirections.setMap(null);
  } else {
    console.log("No directions found");
  }
}

// INITIALIZE THE MAP AND ITS CONTROLS
async function initMap() {
  //// Initialize the map
  const { Map, InfoWindow } = await google.maps.importLibrary("maps");
  const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary(
    "marker"
  );
  

  const defaultBounds = {
    north: default_center.lat + 0.1,
    south: default_center.lat - 0.1,
    east: default_center.lng + 0.1,
    west: default_center.lng - 0.1,
  };

  // Get the user's current location
  try {
    const location = await getCurrentLocation();
    // console.log("currentLocation", location);

    const addr = await getAddressFromCoordinates(location); // Get the address of the user's current location
    // console.log("currentAddress", addr);
  } catch (error) {
    console.error("Failed to get current location:", error);
  }

  // //// Get the info window
  infoWindow = new InfoWindow();

  map = new Map(document.getElementById("map"), {
    center: default_center, // HMTY 38.26469392470636, 21.742012983437373
    zoom: 14,
    mapId: "DEMO_MAP_ID",
    disableDefaultUI: true,
  });

  //// TOP RIGHT CONTROLS
  const topRightControls = document.getElementById("top-right-controls"); //get the top right controls container
  map.controls[google.maps.ControlPosition.TOP_RIGHT].push(topRightControls); //push the top right controls container to the top right of the map

  // Listener for the "PAN TO CURRENT LOCATION" button
  // Pans the map to the user's current location
  document
    .getElementById("locationButton")
    .addEventListener("click", toggleCurrentLocation);

    const urlParams = new URLSearchParams(window.location.search);
    let event, start, stop, metric;
    // If the URL contains an event parameter, get the parameters
    if (urlParams.has("event")) {
      event = urlParams.get("event").split("|")[0];
      console.log("event", event);
      start = urlParams.get("event").split("|")[1];
      stop = urlParams.get("event").split("|")[2];
      metric = urlParams.get("event").split("|")[3];
    }
    // For the first time the page is loaded default to CO2
    else{
      start = new Date(new Date().getTime() - 60 * 60 * 1000).toISOString();
      stop = new Date().toISOString();
      metric = "co2";
    }
    

    // Listener for the "✉️" button
    // Relative information about the user's nearby places and their air quality
    document
      .getElementById("infoButton")
      .addEventListener("click", toggleInfoTrip);
      
    //// Initialize the heatmaps (AP and AQ)
    // Intermediate Dates based on selected time range
    const startObj = new Date(start);
    const stopObj = new Date(stop);
    const intermediateDates = generateIntermediateDates(startObj, stopObj);
    // Create a heatmap for the access points
    let heatMapDataAP = await getHeatmapData(influxData.accessPoints, influxData.airQuality.co2, start, stop);
    heatMapDataAP = new google.maps.MVCArray(heatMapDataAP);
    heatmapAP = new google.maps.visualization.HeatmapLayer({
      data: heatMapDataAP, 
      map: map,

    });

    let heatMapDataAQ = getAirQualityDataAll(metric, influxData.airQuality);
    heatMapDataAQ = new google.maps.MVCArray(heatMapDataAQ);
    // Create a heatmap for the air quality sensors
    heatmapAQ = new google.maps.visualization.HeatmapLayer({
      data: heatMapDataAQ,
      map: map,
    });

    // Set the gradient for the Air Quality heatmap
    const gradient = [
      "rgba(0, 255, 255, 0)",
      "rgba(0, 255, 255, 1)",
      "rgba(0, 191, 255, 1)",
      "rgba(0, 127, 255, 1)",
      "rgba(0, 63, 255, 1)",
      "rgba(0, 0, 255, 1)",
      "rgba(0, 0, 223, 1)",
      "rgba(0, 0, 191, 1)",
      "rgba(0, 0, 159, 1)",
      "rgba(0, 0, 127, 1)",
      "rgba(63, 0, 91, 1)",
      "rgba(127, 0, 63, 1)",
      "rgba(191, 0, 31, 1)",
      "rgba(255, 0, 0, 1)",
    ];
  
    heatmapAQ.set("gradient", gradient);

    

    

  if (userRole === "citizen") {
    // heatmapAP.setMap(null);
    heatmapAQ.setMap(null);
    const bounds = new google.maps.LatLngBounds();

    //// MARKERS FOR DIRECTIONS
    // Origin marker
    const originMarker = new AdvancedMarkerElement({
      position: window.currentLocation,
      map: map,
      title: "Origin",
      content: new PinElement({
        glyph: "🏠",
        scale: 1.5,
      }).element,
      gmpDraggable: true,
    });
    
    originMarker.addListener("dragend", async () => {
      const pos = originMarker.position;
      window.selectedOrigin = pos;
      
      // Reset the bounds first
      // bounds = new google.maps.LatLngBounds();
      bounds.extend(originMarker.position);
      bounds.extend(destinationMarker.position);
      map.fitBounds(bounds);
      const addr = await getAddressFromCoordinates(pos);
      var originInput = document.getElementById("origin_input");
      originInput.value = addr;
      
      try{
        const dist_bald = await google.maps.geometry.spherical.computeDistanceBetween(pos, center_bald);
        // console.log("dist_bald", dist_bald);
        if (dist_bald < 100){
          // console.log("billaras");
          // Change the glyph of the marker
          originMarker.content = new PinElement({
            glyph: "🧑🏼‍🦲",
            scale: 1.5,
          }).element;
        }
        else{
          originMarker.content = new PinElement({
            glyph: "🏠",
            scale: 1.5,
          }).element;
        }
      } catch (error) {
        console.log("nothing to see here")
      }
    });
    
    // Destination marker
    const destinationMarker = new AdvancedMarkerElement({
      position: center_bald,
      map: map,
      title: "Destination",
      content: new PinElement({
        glyph: "🏢",
        scale: 1.5,
      }).element,
      gmpDraggable: true,
    });
    
    destinationMarker.addListener("dragend", async () => {
      const pos = destinationMarker.position;
      window.selectedDestination = pos;
      // Reset the bounds first
      // bounds = new google.maps.LatLngBounds();
      bounds.extend(originMarker.position);
      bounds.extend(destinationMarker.position);
      map.fitBounds(bounds);
      const addr = await getAddressFromCoordinates(pos);
      var destinationInput = document.getElementById("destination_input");
      destinationInput.value = addr;
    });
    
    //// MAP CONTROLS
    // TOP LEFT CONTROLS
    const topLeftControls = document.getElementById("top-left-controls"); //get the top left controls container    
    map.controls[google.maps.ControlPosition.TOP_LEFT].push(topLeftControls); //push the top left controls container to the top left of the map

    // Listeners for the search bar
    const options = {
      bounds: defaultBounds,
      componentRestrictions: { country: "gr" },
      fields: ["address_components", "geometry", "icon", "name"],
      strictBounds: false,
    };

    // ORIGIN SEARCH BAR 
    var originInput = document.getElementById("origin_input");
    const autocompleteOrigin = new google.maps.places.Autocomplete(
      originInput,
      options
    );
    autocompleteOrigin.addListener("place_changed", () => {
      const place = autocompleteOrigin.getPlace();
      // console.log(place.geometry.location);
      originMarker.position = place.geometry.location;
      // selectedOrigin = place.geometry.location;
      // console.log("place changed");
    });

    // DESTINATION SEARCH BAR 
    var destinationInput = document.getElementById("destination_input");
    const autocompleteDestination = new google.maps.places.Autocomplete(
      destinationInput,
      options
    );
    autocompleteDestination.addListener("place_changed", () => {
      const place = autocompleteDestination.getPlace();
      // console.log(place.geometry.location);
      destinationMarker.position = place.geometry.location;
      // selectedDestination = place.geometry.location;
      // console.log("place changed");
    });

    // Listener for the "GET DIRECTIONS" button
    // Get directions to a place
    document
      .getElementById("get_directions")
      .addEventListener("click", showDirections);

    
    
    


    
    
    

  } else if (userRole === "business") {
    // Listeners for the toggling of the heatmaps
    var apSwitch = document.getElementById("ap-switch");
    var aqSwitch = document.getElementById("aq-switch");

    apSwitch.addEventListener("change", () => {
      heatmapAP.setMap(apSwitch.checked ? map : null);
    });

    aqSwitch.addEventListener("change", () => {
      heatmapAQ.setMap(aqSwitch.checked ? map : null);
    });

    // Listeners for the start and stop date and time
    var departureTimeElement = document.getElementById("departureTime");
    var arrivalTimeElement = document.getElementById("arrivalTime");
    var departureDateElement = document.getElementById("departureDate");
    var arrivalDateElement = document.getElementById("arrivalDate");

    // If the URL does not contain an event parameter, hide both heatmaps
    if (!event) {
      console.log("url does not contain event");
      clearMarkersAQ();
      clearMarkersAP();
      heatmapAP.setMap(null);
      heatmapAQ.setMap(null);
      departureTimeElement.value = "15:36";
      departureDateElement.value = "2025-02-10";
      arrivalTimeElement.value = "16:42";
      arrivalDateElement.value = "2025-02-10";
    }
    else{
      console.log("url contains event");
      departureTimeElement.value = new Date(startObj.getTime() - 2 * 60 * 60 * 1000).toTimeString().slice(0, 5);
      departureDateElement.value = startObj.toISOString().slice(0, 10);
      arrivalTimeElement.value = new Date(stopObj.getTime() - 2 * 60 * 60 * 1000).toTimeString().slice(0, 5);
      arrivalDateElement.value = stopObj.toISOString().slice(0, 10);
      // If the URL contains an event indicating the HeatmapsButtonClicked event toggle the heatmapAP and hide the heatmapAQ
      if (event === "HeatmapsButtonClicked") {
        console.log("toggling AP and hiding AQ");
        clearMarkersAQ();
        heatmapAQ.setMap(null);
        heatmapAP.setMap(map);
        apSwitch.checked = true;
      }

      // If the URL contains an event indicating the AirQualityButtonClicked event toggle the heatmapAQ and hide the heatmapAP
      if (event === "AirQualityButtonClicked") {
        console.log("toggling AQ and hiding AP");
        clearMarkersAP();
        heatmapAP.setMap(null);
        heatmapAQ.setMap(map);
        aqSwitch.checked = true;

        
      }
    }
    

    // Listener for the departure time
    departureTimeElement
    .addEventListener("change", () => {
      console.log("departureTime changed to", departureTimeElement.value);
      selectedDepartureTime = departureTimeElement.value;
      console.log("selectedDepartureTime", selectedDepartureTime);  
    });
    // Listener for the departure date
    departureDateElement
    .addEventListener("change", () => {
      console.log("departureDate changed to", departureDateElement.value);
      selectedDepartureDate = departureDateElement.value;
      console.log("selectedDepartureDate", selectedDepartureDate);
    });

    // Listener for the arrival time
    arrivalTimeElement
    .addEventListener("change", () => {
      console.log("arrivalTime changed to", arrivalTimeElement.value);
      selectedArrivalTime = arrivalTimeElement.value;
    });
    // Listener for the arrival date
    arrivalDateElement
    .addEventListener("change", () => {
      console.log("arrivalDate changed to", arrivalDateElement.value);
      selectedArrivalDate = arrivalDateElement.value;
    });

    map.addListener("zoom_changed", () => {
      // console.log("zoom changed", map.getZoom());
      changeRadius(map.getZoom());
    });

    // Listener for the slider
    // console.log("intermediateDates", intermediateDates);
    var slider = document.getElementById("myRange");
    slider.addEventListener("input", async () => {
      // console.log("slider value", slider.value);
      const intermediateDate = intermediateDates[slider.value-1];
      
      // Filter the AP data for the intermediate date
      const currentDate = new Date();
      const stopDate = new Date(stop);
      const startDate = new Date(start);
      if (currentDate > stopDate) {
        console.log("currentDate is greater than stopDate");

        const newDataAP = getOneTimeInstance(influxData.accessPoints, intermediateDate);
        const newDataCo2 = getOneTimeInstance(influxData.airQuality.co2, intermediateDate);
        
        // Convert the data to the heatmap format
        const newHeatMapDataAP = await getHeatmapData(newDataAP, newDataCo2, start, stop);
        // console.log("HeatMapDataAP", heatMapDataAP);
        heatMapDataAP.clear();
        newHeatMapDataAP.forEach((element) => {
          heatMapDataAP.push(element);
        });
      }
      else{
        const intermediateDateStart = new Date(intermediateDate - 1000*60*60);
        const newHeatMapDataAP = await getHeatmapData(influxData.accessPoints, influxData.airQuality.co2, intermediateDateStart, intermediateDate);
        heatMapDataAP.clear();
        newHeatMapDataAP.forEach((element) => {
          heatMapDataAP.push(element);
        });
      }
      
      

      // Filter the AQ data for the intermediate date
      let newDataAQ;
      switch (metric) {
        case "co2":
           newDataAQ = getOneTimeInstance(influxData.airQuality.co2, intermediateDate);
          break;
        case "humidity":
           newDataAQ = getOneTimeInstance(influxData.airQuality.humidity, intermediateDate);
          break;
        case "temperature":
           newDataAQ = getOneTimeInstance(influxData.airQuality.temperature, intermediateDate);
          break;
        default:
          // console.log("default");
          newDataAQ = getOneTimeInstance(influxData.airQuality.co2, intermediateDate);
          
    };
    // console.log(newDataAQ);
    // Convert the data to the heatmap format
    const newHeatMapDataAQ = getAirQualityDataAll(metric, {co2: newDataAQ, 
                                                          humidity: newDataAQ, 
                                                          temperature: newDataAQ});
    heatMapDataAQ.clear();
    newHeatMapDataAQ.forEach((element) => {
      heatMapDataAQ.push(element);
    });
    });
    // Listener for the "HEATMAPS" button
    // Toggles the heatmap on the map
    document
    .getElementById("heatmaps_button")
    .addEventListener("click", toggleHeatmap);
    
    // Toggles the air quality information on the map
    document
      .getElementById("air_quality_button")
      .addEventListener("click", toggleAirQualityAll);
    
    var monitoringButton = document.getElementById("monitoringButton");
    var analyticsButton = document.getElementById("analyticsButton");
    var mapContainer = document.getElementById("map");
    var grafanaContainer = document.getElementById("grafanaContainer");
    var areaInput = document.getElementById("areaInput");

    const options = {
      bounds: defaultBounds,
      componentRestrictions: { country: "gr" },
      fields: ["address_components", "geometry", "icon", "name"],
      strictBounds: false,
    };

    // If you're coming from the /buy_access page
    if (event === "MonitoringButtonClicked" || !event) {
      heatmapAP.setMap(null);
      heatmapAQ.setMap(null);
      console.log("Monitoring Button Clicked")

      // Show the map
      mapContainer.style.display = "block";

      // Show the top right controls
      topRightControls.style.display = "block";

      // Hide the Grafana Dashboard
      grafanaContainer.style.display = "none";

    }
    else if( event === "AnalyticsButtonClicked") {
      console.log("Analytics Button Clicked")
      // Hide the map
      mapContainer.style.display = "none";

      // Hide the top right controls
      topRightControls.style.display = "none";

      // Show the Grafana Dashboard
      grafanaContainer.style.display = "flex";

    }
    
    // If you're already in the /home page
    monitoringButton.addEventListener("click", async () => {
      console.log("Monitoring Button Clicked")

      // Show the map
      mapContainer.style.display = "block";

      // Show the top right controls
      topRightControls.style.display = "block";

      // Hide the Grafana Dashboard
      grafanaContainer.style.display = "none";

    });

    analyticsButton.addEventListener("click", async () => {
      console.log("Analytics Button Clicked")
      // Hide the map
      mapContainer.style.display = "none";

      // Show the Grafana Dashboard
      grafanaContainer.style.display = "flex";

    });

    

    console.log("Business role detected");
  } // NOT TESTED 
  else if (userRole === "admin") {
    // Origin marker
    console.log("default_center", window.currentLocation);
    const originMarker = new AdvancedMarkerElement({
      position: window.currentLocation,
      map: map,
      title: "Origin",
      content: new PinElement({
        glyph: "🏠",
        scale: 1.5,
      }).element,
      gmpDraggable: true,
    });
    //////////////////////////
    originMarker.addListener("dragend", async () => {
      const pos = originMarker.position;
      window.selectedOrigin = pos;
      const addr = await getAddressFromCoordinates(pos);
      var originInput = document.getElementById("origin_input");
      originInput.value = addr;
    });
    //////////////////////////

    // Destination marker
    const destinationMarker = new AdvancedMarkerElement({
      position: center_bald,
      map: map,
      title: "Destination",
      content: new PinElement({
        glyph: "🏢",
        scale: 1.5,
      }).element,
      gmpDraggable: true,
    });
    //////////////////////////
    destinationMarker.addListener("dragend", async () => {
      const pos = destinationMarker.position;
      window.selectedDestination = pos;
      const addr = await getAddressFromCoordinates(pos);
      var destinationInput = document.getElementById("destination_input");
      destinationInput.value = addr;
    });
    //////////////////////////

    /////// MAP CONTROLS
    //// TOP LEFT CONTROLS
    const topLeftControls = document.getElementById("top-left-controls"); //get the top left controls container
    map.controls[google.maps.ControlPosition.TOP_LEFT].push(topLeftControls); //push the top left controls container to the top left of the map

    // Listeners for the search bar
    const options = {
      bounds: defaultBounds,
      componentRestrictions: { country: "gr" },
      fields: ["address_components", "geometry", "icon", "name"],
      strictBounds: false,
    };

    // ORIGIN SEARCH BAR //
    var originInput = document.getElementById("origin_input");
    const autocompleteOrigin = new google.maps.places.Autocomplete(
      originInput,
      options
    );
    autocompleteOrigin.addListener("place_changed", () => {
      const place = autocompleteOrigin.getPlace();
      // console.log(place.geometry.location);
      originMarker.position = place.geometry.location;
      // selectedOrigin = place.geometry.location;
      // console.log("place changed");
    });

    // DESTINATION SEARCH BAR //
    var destinationInput = document.getElementById("destination_input");
    const autocompleteDestination = new google.maps.places.Autocomplete(
      destinationInput,
      options
    );
    autocompleteDestination.addListener("place_changed", () => {
      const place = autocompleteDestination.getPlace();
      // console.log(place.geometry.location);
      destinationMarker.position = place.geometry.location;
      // selectedDestination = place.geometry.location;
      // console.log("place changed");
    });

    // Listener for the "GET DIRECTIONS" button
    // Get directions to a place
    document
      .getElementById("get_directions")
      .addEventListener("click", showDirections);
    
      var monitoringButton = document.getElementById("monitoringButton");
      var analyticsButton = document.getElementById("analyticsButton");
      var mapContainer = document.getElementById("map");
      var grafanaContainer = document.getElementById("grafanaContainer");
      var analyticsSearchBar = document.getElementById("analyticsSearchBar");
      var areaInput = document.getElementById("areaInput");
  
      // BUSINESS SEARCH BAR //
      const analyticsAutoComplete = new google.maps.places.Autocomplete(
        areaInput,
        options
      );
      analyticsAutoComplete.addListener("place_changed", () => {
        const place = analyticsAutoComplete.getPlace();
        console.log(place.geometry.location);
      });
  
      monitoringButton.addEventListener("click", async () => {
        console.log("analyticsButton clicked")
  
        // Show the map
        mapContainer.style.display = "block";
  
        // Hide the Grafana Dashboard
        grafanaContainer.style.display = "none";
  
        // Hide the search bar
        analyticsSearchBar.style.display = "none";
      });
      analyticsButton.addEventListener("click", async () => {
        console.log("monitoringButton clicked")
        // Hide the map
        mapContainer.style.display = "none";
  
        // Show the Grafana Dashboard
        grafanaContainer.style.display = "flex";
  
        // Show the search bar
        analyticsSearchBar.style.display = "block";
      });
    console.log("Admin role detected");
  } else {
    console.log("No role detected KeepYourselfSafe");
  }
}



//Proper loading of Google Maps API
document.addEventListener("GoogleMapsLoaded", async function () {
  console.log("🚀 Google Maps API is ready. Initializing map...");

  await initMap();
});
