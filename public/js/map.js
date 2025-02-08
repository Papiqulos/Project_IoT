// Global variables
let map, heatmap, infoWindow;
let suggestionsClicked = false;
let heatmapsClicked = false;
let isDragging = false;
const center_HMTY = [38.28806669351595, 21.78915113469408];
let center1 = { lat: center_HMTY[0], lng: center_HMTY[1] };
const googleApiKey = getGoogleApiKey();
let selectedOrigin;
let selectedDestination;
let currentLocation;
let currentDirections;

// Debounce function to limit API requests
function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

async function showDirections() {
  console.log("searching place");
    const travelModeRadios = document.getElementsByName('travel_mode');
    let selectedTravelMode;
    let selectedOrigin = window.selectedOrigin || window.currentLocation;
    let selectedDestination = window.selectedDestination || {lat : 38.23666252117088, lng: 21.732572423403976}; // defaults to euagellobill

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

async function autoCompleteOriginDestination() {
  // console.log("searching place");

  const results = document.getElementsByClassName('result');
  // console.log("number of results", results.length);

  // Get the origin input
  const originInput = document.getElementById('origin_input').value;

  // Find the origins based on the user input
  let selectedOrigins = await findPlacesByText(originInput, 5) || [];

  // Add the results below the input
  selectedOrigins.forEach((place, index) => {
    // console.log("place", place.displayName);
    // console.log("index", index);
    
    const result = results[index];
    console.log(result.text)
    result.value = index;
    result.textContent = place.displayName;
  });

  window.selectedOrigin = selectedOrigins[0]; // Default to the first result


  // Get the destination input
  const destinationInput = document.getElementById('destination_input').value;
  // console.log("user_input", userInput);

  // Find the destinations based on the user input
  let selectedDestinations = await findPlacesByText(destinationInput, 5) || [];

  // Add the results below the input
  selectedDestinations.forEach((place, index) => {
    console.log("place", place.displayName);
    console.log("index", index);
    
    const result = results[index+5];
    console.log(result.text)
    result.value = index;
    result.textContent = place.displayName;
  });

  // Store the selected destination
  window.selectedDestination = selectedDestinations[0]; // Default to the first result

}

async function toggleAirQuality() {
  try {

    const airQualityData = await getAirQualityData(window.currentLocation);
    // Create a container for the air quality data
    const airQualityContainer = document.createElement("div");
    airQualityContainer.classList.add("air-quality-container");

    // Populate the container with air quality data
    airQualityContainer.innerHTML = `
      <div class="notifications">

        <div class="notification">
      Date and Time: ${airQualityData.dateTime}
        </div>

        <div class="notification">
      Region Code: ${airQualityData.regionCode}
        </div>

        <div class="notifications" id="notifications">
      ${airQualityData.indexes.map(index => `
        
        <div class="notification">
          ${Object.entries(index).map(([key, value]) => `
        <div>
          ${key === 'color' ? Object.entries(value).map(([colorKey, colorValue]) => `
            <div>${colorKey}: ${colorValue}</div>
          `).join('') : `${key}: ${value}`}
        </div>
          `).join('')}
        </div>
      `).join('')}
        </div>
      </div>
    `;
    
    //Append the container to the map if it doesn't exist
    if (!document.querySelector(".air-quality-container")) {
      console.log("appending airQualityContainer");
      map.controls[google.maps.ControlPosition.RIGHT].push(airQualityContainer);
    } else {
      console.log("removing airQualityContainer");
      // Remove the container if it exists
      map.controls[google.maps.ControlPosition.RIGHT].pop();
    }
    
    
  }
  catch (error) {
    console.error(error);
  }
}

function toggleHeatmap() {

  // // Hide the greeting text if it is visible
  // var greetingText = document.getElementById('greeting-container');
  // console.log("greetingText", greetingText.style.display);
  // if (greetingText.style.display === 'block') {
  //   greetingText.remove();
  // }

  // //Hide the suggestions form if it is visible
  // var suggestionsForm = document.getElementById('suggestionsForm');
  // if (suggestionsForm.style.display === 'block') {
  //   suggestionsForm.style.display = 'none';
  // }

  // if (heatmapsForm.style.display === 'none') {
  //   heatmapsForm.style.display = 'block';
  // } else {
  //   heatmapsForm.style.display = 'none';
  // }

  heatmap.setMap(heatmap.getMap() ? null : map);
}

function toggleSuggestions(){

  // Hide the greeting text if it is visible
  // var greetingText = document.getElementById('greeting-container');
  // if (greetingText.style.display === 'block') {
  //   greetingText.style.display = 'none';
  // }

  // // Hide the heatmaps form if it is visible
  // var heatmapsForm = document.getElementById('heatmapsForm');
  // if (heatmapsForm.style.display === 'block') {
  //   heatmapsForm.style.display = 'none';
  // }

  // //Hide the heatmap if it is visible
  // // clearHeatmap();
  
  // var suggestionsForm = document.getElementById('suggestionsForm');

  // if (suggestionsForm.style.display === 'none') {
  //   suggestionsForm.style.display = 'flex';
  // } else {
  //   suggestionsForm.style.display = 'none';
  // }

  suggestionsClicked = !suggestionsClicked;
  heatmapsClicked = false;
  clearMarkers();

  // Debugging
  console.log("suggestionsClicked", suggestionsClicked);
  console.log("heatmapsClicked", heatmapsClicked);
}

function toggleCurrentLocation() {
  infoWindow = new google.maps.InfoWindow();
  infoWindow.setPosition(window.currentLocation);
  infoWindow.setContent("Location found.");
  infoWindow.open(map);
  map.setCenter(window.currentLocation);
}

function changeGradient() {
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

  heatmap.set("gradient", heatmap.get("gradient") ? null : gradient);
}

function changeRadius() {
  heatmap.set("radius", heatmap.get("radius") ? null : 20);
}

function changeOpacity() {
  heatmap.set("opacity", heatmap.get("opacity") ? null : 0.2);
}

// Heatmap data: 500 Points
function getPoints() {
  return [
    new google.maps.LatLng(38.247551, 21.735368),
    new google.maps.LatLng(38.247745, 21.734586),
    new google.maps.LatLng(38.247842, 21.733688),
    new google.maps.LatLng(38.247919, 21.732815),
    new google.maps.LatLng(38.247992, 21.732112),
    new google.maps.LatLng(38.2481, 21.731461),
    new google.maps.LatLng(38.248206, 21.730829),
    new google.maps.LatLng(38.248273, 21.730324),
    new google.maps.LatLng(38.248316, 21.730023),
    new google.maps.LatLng(38.248357, 21.729794)
  ];
  
}

// Get the api key from the backend
async function getGoogleApiKey() {
  const response = await fetch('/api/key'); // Fetch API key from backend
  if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
  const data = await response.json();
  // console.log("API Key Sent:", data.key); // Debugging output
  return data.key; 
}

// Finds nearby places and displays heatmap data for them (for the moment only markers appear on nearby places) 
async function nearbySearch(results = 5) {
    //@ts-ignore
    const { Place, SearchNearbyRankPreference } = await google.maps.importLibrary(
      "places",
    );
    const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
    // Restrict within the map viewport.
    let center = new google.maps.LatLng(center1.lat, center1.lng);
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
    //@ts-ignore
    const { places } = await Place.searchNearby(request);
  
    if (places.length) {
    //   console.log(places);
      
      // New bounds to fit all the markers
      const { LatLngBounds } = await google.maps.importLibrary("core");
      const bounds = new LatLngBounds();

      // Clear existing markers (optional)
      clearMarkers();
  
      // Loop through and get all the results.
      places.forEach((place) => {
        const markerView = new AdvancedMarkerElement({
          map,
          position: place.location,
          title: place.displayName,
        });
  
        bounds.extend(place.location);
        console.log(place.displayName);

        // Store the marker for later removal
        window.markers.push(markerView);
      });
      // Fit the map to the bounds
      map.fitBounds(bounds); 
    } else {
      console.log("No results");
    }
}

function clearMarkers() {
  // Clear existing markers if any
  if (window.markers) {
    window.markers.forEach((marker) => marker.setMap(null));
  }
  window.markers = [];
}

// Find a place by text 
async function findPlacesByText(text, results = 15) {

    if (!text) {
      console.log("No text provided");
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

// Get directions from the center of the map to a specific location
async function getDirections(origin, destination, travelMode = "DRIVING") {
  // Clear any existing directions
  clearDirections();
  // Clear any existing markers
  clearMarkers();
  var directionsService = new google.maps.DirectionsService();
  var directionsRenderer = new google.maps.DirectionsRenderer();
  directionsRenderer.setMap(map);
  console.log("origin", origin);
  console.log("destination", destination);
  console.log("travelMode", travelMode);
  var request = {
    origin: origin,
    destination: destination, 
    travelMode: travelMode,
  
  };
  directionsService.route(request, async function(result, status) {
    if (status == 'OK') {
      directionsRenderer.setDirections(result);
      // console.log("result", JSON.stringify(result.routes[0].legs[0].steps[0].path));
      
      const steps = result.routes[0].legs[0].steps;
      steps.forEach((step) => {
        const path = step.path;
        const middlePoint = path[Math.floor(path.length / 2)];
        // Visualize the middle point of each step
        const markerView = new google.maps.marker.AdvancedMarkerElement({
          position: middlePoint,
          map: map,
          title: step.instructions,
        });
        // Store the marker for later removal
        window.markers.push(markerView);
      });

      }
    });
  }

// Function to clear directions
function clearDirections() {
  if (window.currentDirections) {
    window.currentDirections.setMap(null);
    window.currentDirections = null;
  }
}

function clearHeatmap() {
  if (heatmap) {
    heatmap.setMap(null);
  }
}

// Function to get Air Quality Data for a specific location
async function getAirQualityData(location_) {
  const lat = location_.lat;
  const lng = location_.lng;

  let googleApiKeyResolved = await googleApiKey;

  try {
    const response = await axios.post(
      `https://airquality.googleapis.com/v1/currentConditions:lookup?key=${googleApiKeyResolved}`,
      {
        location: {
          latitude: lat, // Latitude from the location
          longitude: lng, // Longitude from the location
        },
      //   extraComputations: ['HEALTH_RECOMMENDATIONS'], // Optional: Add extra computations
        languageCode: 'en', // Optional: Set the language
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );


    // Return the API response data
    return response.data;
  } catch (error) {
    // Throw an error if the request fails
    throw new Error('Error getting air quality data: ' + JSON.stringify(error.response?.data || error.message));
  }

}

// Get the user's current location and store it in a global variable
function getCurrentLocation(callback) {
  infoWindow = new google.maps.InfoWindow();
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((position) => {
        const pos = 
        {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        window.currentLocation = pos;
        callback();
      }
      ,
      () => {
        handleLocationError(true, infoWindow, map.getCenter());
      },
    );
  } else {
    // Browser doesn't support Geolocation
    handleLocationError(false, infoWindow, map.getCenter());
    return 0;
  }
}

// Initialize the map
async function initMap() {

  //// Initialize the map
  const { Map } = await google.maps.importLibrary("maps");
  map = new Map(document.getElementById("map"), {
    center: center1, // HMTY 38.26469392470636, 21.742012983437373
    zoom: 17,
    mapId: "DEMO_MAP_ID",
    disableDefaultUI: true,
  });

  //// Initialize the heatmap
  // Create a heatmap
  heatmap = new google.maps.visualization.HeatmapLayer({
    data: getPoints(), //Fake data for the time being
    map: map,
  });

  //Hide the heatmap by default
  heatmap.setMap(null);

  //// Get the user's current location and store it in a global variable
  getCurrentLocation(() => {
    console.log("currentLocation", window.currentLocation);
  });

  //// Get the info window
  infoWindow = new google.maps.InfoWindow();

  
  // Debounced version of nearbySearch
  const debouncedNearbySearch = debounce(() => {
    nearbySearch();
  }, 500); // Adjust the delay as needed (e.g., 1000ms)

  /////// MAP CONTROLS

  //// TOP LEFT CONTROLS
  const topLeftControls = document.getElementById("top-left-controls"); //get the top left controls container
  map.controls[google.maps.ControlPosition.TOP_LEFT].push(topLeftControls); //push the top left controls container to the top left of the map

  // Listeners for the search bar
  // ORIGIN
  // When typing in the search bar
  document
    .getElementById("origin_input")
    .addEventListener("input", autoCompleteOriginDestination);

  //When the search bar is focused
  document
    .getElementById("origin_input")
    .addEventListener("focus", async function() {
    // console.log("focus");
    var results = document.getElementById("results");
    results.style.display = "flex";
    results.style.flexDirection = "row";
    // Get the nearby places accourding to the user's location
    // nearbySearch();
  });

  //When the search bar is unfocused
  document
    .getElementById("origin_input")
    .addEventListener("blur", async function() {
    // console.log("blur");
    // var results = document.getElementById("results");
    // results.style.display = "none";
  });

  // DESTINATION
  // When typing in the search bar
  document
    .getElementById("destination_input")
    .addEventListener("input", autoCompleteOriginDestination);

  //When the search bar is focused
  document
    .getElementById("destination_input")
    .addEventListener("focus", async function() {
    // console.log("focus");
    var results = document.getElementById("results");
    results.style.display = "flex";
    results.style.flexDirection = "row";
    // Get the nearby places accourding to the user's location
    // nearbySearch();
  });

  //When the search bar is unfocused
  document
    .getElementById("destination_input")
    .addEventListener("blur", async function() {
    // console.log("blur");
    // var results = document.getElementById("results");
    // results.style.display = "none";
  });

  // Listeners for the origin and destination results
  // When an origin result is clicked
  document
    .getElementById("results-list-origin")
    .addEventListener("click", async function(event) {
      const target = event.target;
      if (target.classList.contains("result")) {
        const buttonName = target.textContent;
        console.log("origin clicked:", buttonName);
        window.selectedOrigin = buttonName;
        const originInput = document.getElementById("origin_input");
        originInput.textContent = buttonName;
      }
  });

  // When a destination result is clicked
  document
    .getElementById("results-list-destination")
    .addEventListener("click", async function(event) {
      const target = event.target;
      if (target.classList.contains("result")) {
        const buttonName = target.textContent;
        console.log("destination clicked:", buttonName);
        window.selectedDestination = buttonName;
        const destinationInput = document.getElementById("destination_input");
        destinationInput.textContent = buttonName;
      }
  });



  // Listener for the "SEARCH PLACES" button
  // Get a list of results from a place search and store them for later use
  // document
  //   .getElementById('search_place')
  //   .addEventListener('click', autoCompleteOriginDestination);

  // Listener for the "GET DIRECTIONS" button
  // Get directions to a place
  document
    .getElementById('get_directions')
    .addEventListener('click', showDirections);


  //// TOP RIGHT CONTROLS
  const topRightControls = document.getElementById("top-right-controls"); //get the top right controls container
  map.controls[google.maps.ControlPosition.TOP_RIGHT].push(topRightControls); //push the top right controls container to the top right of the map

  // Listener for the "PAN TO CURRENT LOCATION" button
  // Pans the map to the user's current location
  document
    .getElementById("locationButton")
    .addEventListener("click", toggleCurrentLocation);
  
  // Listener for the "HEATMAPS" button
  // Toggles the heatmap on the map
  document
    .getElementById('heatmaps_button')
    .addEventListener('click', toggleHeatmap);

  // Listener for the "✉️" button
  // Relative information about the user's nearby places and their air quality
  document
    .getElementById("infoButton")
    .addEventListener("click", toggleAirQuality);
  
  // Misc listeners for various heatmap options
  document
    .getElementById("change-gradient")
    .addEventListener("click", changeGradient);
  document
    .getElementById("change-opacity")
    .addEventListener("click", changeOpacity);
  document
    .getElementById("change-radius")
    .addEventListener("click", changeRadius);

  // Listeners for map actions
  map.addListener("dragend", () => {  
    console.log("dragend");
    }
  );
}


//Proper loading of Google Maps API
document.addEventListener("GoogleMapsLoaded", function () {
  console.log("🚀 Google Maps API is ready. Initializing map...");
  initMap();
});






