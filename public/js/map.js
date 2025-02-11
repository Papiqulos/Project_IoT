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
const influxData = JSON.parse(document.getElementById("influxData").getAttribute("data-value"));

// HELPER FUNCTIONS - NOT USED RN
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
  infoWindow.setPosition(window.currentLocation);
  infoWindow.setContent("Location found.");
  infoWindow.open(map);
  map.setCenter(window.currentLocation);
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

// ACCESS POINTS HEATMAPS
// Get the points for the heatmap from the InfluxDB access points
function getHeatmapData() {
  
  const accesPoints = influxData.accessPoints;
  const dataCo2 = influxData.airQuality.co2;
  let heatmapData = [];
  accesPoints.forEach((point) => {
    const lat = parseFloat(point.location.split(",")[0]);
    const lng = parseFloat(point.location.split(",")[1]);
    const heatmapPoint = {location: new google.maps.LatLng(lat, lng), weight: point._value};
    // console.log(point);
    heatmapData.push(heatmapPoint);
    
  });

  // console.log(heatmapData.length);
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
function getAirQualityDataAll(metric = "co2") {
  const airQualityDataI = influxData.airQuality;
  const dataCo2 = airQualityDataI.co2;
  const dataHumidity = airQualityDataI.humidity;
  const dataTemperature = airQualityDataI.temperature;

  // Get the type of air quality data to display
  let data = [];
  console.log("using metric for data", metric);
  // Get the air quality data for the selected metric
  switch (metric) {
    case "co2":
      console.log("co2");
      dataCo2.forEach((element) => {
        const lat = parseFloat(element.location.split(",")[0]);
        const lng = parseFloat(element.location.split(",")[1]);
        const point = { location: new google.maps.LatLng(lat, lng), weight: element._value };
        data.push(point);
      });
      break;
    case "humidity":
      console.log("humidity");
      dataHumidity.forEach((element) => {
        const lat = parseFloat(element.location.split(",")[0]);
        const lng = parseFloat(element.location.split(",")[1]);
        const point = { location: new google.maps.LatLng(lat, lng), weight: element._value };
        data.push(point);
      });
      break;
    case "temperature":
      console.log("temperature");
      dataTemperature.forEach((element) => {
        const lat = parseFloat(element.location.split(",")[0]);
        const lng = parseFloat(element.location.split(",")[1]);
        const point = { location: new google.maps.LatLng(lat, lng), weight: element._value };
        data.push(point);
      });
      break;
      default:
        console.log("default");
        dataCo2.forEach((element) => {
          const lat = parseFloat(element.location.split(",")[0]);
          const lng = parseFloat(element.location.split(",")[1]);
          const point = { location: new google.maps.LatLng(lat, lng), weight: element._value };
          data.push(point);
        });
        
  }
  console.log(data.length);
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


// Show the air quality information based on his selected route
async function toggleAirQualityTrip() {
  try {
    if (userRole === "citizen") {
      //Append the container to the map if it doesn't exist
      if (!document.querySelector(".air-quality-container")) {
        if (!currentDirections) {
          console.log("No directions found (KEEP YOURSELF SAFE)");
          return;
        }
        console.log("appending airQualityContainer");

        const airQualityContainer = document.createElement("div");
        airQualityContainer.classList.add("air-quality-container");

        // Get the average air quality and its category for the selected route
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
        </div>
        `;

        var generalButtonContainer = document.getElementById(
          "generalButtonContainer"
        );
        generalButtonContainer.appendChild(airQualityContainer);
      } else {
        console.log("removing airQualityContainer");
        document.querySelector(".air-quality-container").remove();
      }
    } else if (userRole === "business") {
      console.log("Business role detected");
    } else if (userRole === "admin") {
      console.log("Admin role detected");
    } else {
      console.log("No role detected KeepYourselfSafe");
    }
  } catch (error) {
    console.error(error);
  }
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
  clearDirections();
  // Clear any existing markers
  clearMarkers();
  var directionsService = new google.maps.DirectionsService();
  var directionsRenderer = new google.maps.DirectionsRenderer();
  currentDirections = directionsRenderer;
  directionsRenderer.setMap(map);
  console.log("origin", origin);
  console.log("destination", destination);
  console.log("travelMode", travelMode);
  console.log("departureTime", departureTime);
  console.log("arrivalTime", arrivalTime);
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
  console.log("clearing directions");
  // Remove any directions visible on the map
  if (currentDirections) {
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
      metric = "co2";
    }
    // Listener for the "HEATMAPS" button
    // Toggles the heatmap on the map
    document
    .getElementById("heatmaps_button")
    .addEventListener("click", toggleHeatmap);
    
    // Toggles the air quality information on the map
    document
      .getElementById("air_quality_button")
      .addEventListener("click", toggleAirQualityAll);

    // Listener for the "✉️" button
    // Relative information about the user's nearby places and their air quality
    document
      .getElementById("infoButton")
      .addEventListener("click", toggleAirQualityTrip);
      
    //// Initialize the heatmaps (AP and AQ)
    // Create a heatmap for the access points
    const heatMapDataAP = getHeatmapData();
    heatmapAP = new google.maps.visualization.HeatmapLayer({
      data: heatMapDataAP, 
      map: map,

    });
    heatMapDataAP.forEach((element) => {
      const marker = new AdvancedMarkerElement({
        position: element.location,
        map: map,
        title: "Access Point",
        content: new PinElement({
          glyph: "📶",
          scale: 1.5,
        }).element,
        gmpDraggable: false,
      });
      markersAP.push(marker);
    });

    const heatMapDataAQ = getAirQualityDataAll(metric);
    // Create a heatmap for the air quality sensors
    heatmapAQ = new google.maps.visualization.HeatmapLayer({
      data: heatMapDataAQ,
      map: map,
    });
    heatMapDataAQ.forEach((element) => {
      const marker = new AdvancedMarkerElement({
        position: element.location,
        map: map,
        title: "Air Quality Sensor",
        content: new PinElement({
          glyph: "🔍",
          scale: 1.5,
        }).element,
        gmpDraggable: false,
      });
      markersAQ.push(marker);
    });

    // If the URL does not contain an event parameter, hide both heatmaps
    if (!event) {
      console.log("url does not contain event");
      clearMarkersAQ();
      clearMarkersAP();
      heatmapAP.setMap(null);
      heatmapAQ.setMap(null);
    }

    // If the URL contains an event indicating the HeatmapsButtonClicked event toggle the heatmapAP and hide the heatmapAQ
    if (event === "HeatmapsButtonClicked") {
      console.log("toggling AP and hiding AQ");
      clearMarkersAQ();
      heatmapAQ.setMap(null);
      heatmapAP.setMap(map);
    }

    // If the URL contains an event indicating the AirQualityButtonClicked event toggle the heatmapAQ and hide the heatmapAP
    if (event === "AirQualityButtonClicked") {
      console.log("toggling AQ and hiding AP");
      clearMarkersAP();
      heatmapAP.setMap(null);
      heatmapAQ.setMap(map);

      
    }

    // Listeners for the start and stop date and time
    var departureTimeElement = document.getElementById("departureTime");
    var arrivalTimeElement = document.getElementById("arrivalTime");
    var departureDateElement = document.getElementById("departureDate");
    var arrivalDateElement = document.getElementById("arrivalDate");

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
      console.log("zoom changed", map.getZoom());
      changeRadius(map.getZoom());
    });

  if (userRole === "citizen") {
    
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
