// Global variables
let map, heatmap, infoWindow;
let suggestionsClicked = false;
let heatmapsClicked = false;
let isDragging = false;
const center_HMTY = [38.28806669351595, 21.78915113469408];
let center1 = { lat: center_HMTY[0], lng: center_HMTY[1] };
const googleApiKey = getGoogleApiKey();


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
  //Hide the suggestions form if it is visible
  var suggestionsForm = document.getElementById('suggestionsForm');
  if (suggestionsForm.style.display === 'block') {
    suggestionsForm.style.display = 'none';
  }

  if (heatmapsForm.style.display === 'none') {
    heatmapsForm.style.display = 'block';
  } else {
    heatmapsForm.style.display = 'none';
  }




  heatmap.setMap(heatmap.getMap() ? null : map);

  suggestionsClicked = false;
  heatmapsClicked = !heatmapsClicked;
  clearMarkers();
}

function toggleSuggestions(){
  // Hide the heatmaps form if it is visible
  var heatmapsForm = document.getElementById('heatmapsForm');
  if (heatmapsForm.style.display === 'block') {
    heatmapsForm.style.display = 'none';
  }
  //Hide the heatmap if it is visible
  // clearHeatmap();
  
  var suggestionsForm = document.getElementById('suggestionsForm');

  if (suggestionsForm.style.display === 'none') {
    suggestionsForm.style.display = 'block';
  } else {
    suggestionsForm.style.display = 'none';
  }

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
async function nearbySearch() {
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
      maxResultCount: 5,
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

// Find a place by text (For the time being it searches for "Δένδρα Κουνάβη" and displays the markers on the map)
async function findPlacesByText(text, results = 15) {
    const { Place } = await google.maps.importLibrary("places");
    const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
    const request = {
    textQuery: text,
    fields: ["displayName", "location", "businessStatus"],
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

//Get directions from the center of the map to a specific location
function getDirections(origin, destination, travelMode = "WALKING") {
  if (!suggestionsClicked) {return;}
  // Clear any existing directions
  clearDirections();
  // Clear any existing markers
  clearMarkers();
  var directionsService = new google.maps.DirectionsService();
  var directionsRenderer = new google.maps.DirectionsRenderer();
  directionsRenderer.setMap(map);

  var request = {
    origin: origin,
    destination: { lat: destination.location.lat(), lng: destination.location.lng() }, 
    travelMode: travelMode,
  };
  directionsService.route(request, function(result, status) {
    if (status == 'OK') {
      directionsRenderer.setDirections(result);
    window.currentDirections = directionsRenderer;
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
  const { Map } = await google.maps.importLibrary("maps");

  map = new Map(document.getElementById("map"), {
    center: center1, // HMTY 38.26469392470636, 21.742012983437373
    zoom: 17,
    mapId: "DEMO_MAP_ID",
  });

  // Get the user's current location and store it in a global variable
  getCurrentLocation(() => {
    console.log("currentLocation", window.currentLocation);
  });

  infoWindow = new google.maps.InfoWindow();

  // Create the button to pan to the user's current location
  const locationButton = document.createElement("button");
  locationButton.textContent = "Pan to Current Location";
  locationButton.classList.add("btn");
  map.controls[google.maps.ControlPosition.TOP_CENTER].push(locationButton);
  locationButton.addEventListener("click", toggleCurrentLocation);

  // Create a button that shows a list of relative information about the user's location and the nearby places
  const notifsButton = document.createElement("button");
  notifsButton.textContent = "✉️";
  notifsButton.classList.add("btn");
  map.controls[google.maps.ControlPosition.TOP_RIGHT].push(notifsButton);
  notifsButton.addEventListener("click", toggleAirQuality);

  // Debounced version of nearbySearch
  const debouncedNearbySearch = debounce(() => {
    nearbySearch();
  }, 500); // Adjust the delay as needed (e.g., 1000ms)


  // For the heatmaps
  // map.addListener("dragend", () => {  
  //   console.log("dragend");
  //   if (suggestionsClicked){return;}
  //   if (!heatmapsClicked) {return;}
  //   // Clear directions if any
  //   clearDirections();
  //   isDragging = false;
  //   const newCenter = map.getCenter();
  //   center1 = { lat: newCenter.lat(), lng: newCenter.lng() };
  //   console.log("new center", center1);

  //   // Perform a debounced nearby search
  //   debouncedNearbySearch();
    
  // }
  // );

  // Show/hide suggestions cotrols
  document
  .getElementById('suggestions_button')
  .addEventListener('click', toggleSuggestions);

// Create a heatmap
heatmap = new google.maps.visualization.HeatmapLayer({
  data: getPoints(), //Fake data for the time being
  map: map,
});
//Hide the heatmap by default
heatmap.setMap(null);

// Show/hide heatmap
document
  .getElementById('heatmaps_button')
  .addEventListener('click', toggleHeatmap);

document
  .getElementById("change-gradient")
  .addEventListener("click", changeGradient);
document
  .getElementById("change-opacity")
  .addEventListener("click", changeOpacity);
document
  .getElementById("change-radius")
  .addEventListener("click", changeRadius);

// Get a list of results from a place search and store them for later use
document.getElementById('search_place').addEventListener('click', async function() {
  console.log("searching place");

  // Retrieve user input
  const userInput = document.getElementById('place_input').value;
  // console.log("user_input", userInput);

  // Find the place by text
  let selectedDestinations = await findPlacesByText(userInput, 5);
  // for (const place of selectedDestinations) {
  //   console.log("selectedDestination", place.displayName);
  // }


  //Display the results in a dropdown list
  const dropdown = document.getElementById('results_dropdown');
  dropdown.innerHTML = ''; // Clear previous results

  selectedDestinations.forEach((place, index) => {
    const option = document.createElement('option');
    option.value = index;
    option.text = place.displayName;
    dropdown.appendChild(option);
  });

  // Store the selected destination
  window.selectedPlace = selectedDestinations[0]; // Default to the first result

  dropdown.addEventListener('change', function() {
    const selectedIndex = dropdown.selectedIndex;
    const selectedPlace = selectedDestinations[selectedIndex];
    // Store the selected place for later use
    window.selectedPlace = selectedPlace;
  });
  

});

// Get directions to a place
document.getElementById('get_directions').addEventListener('click', async function() {
  console.log("searching place");
  const travelModeRadios = document.getElementsByName('travel_mode');
  let selectedTravelMode;
  let selectedDestination = window.selectedPlace;
  for (const radio of travelModeRadios) {
    if (radio.checked) {
      selectedTravelMode = radio.value;
      break;
    }
  }

  // Get directions to the place
  console.log("Original location", window.currentLocation);
  console.log("selectedDestination_name", selectedDestination.displayName);
  console.log("selectedTravelMode", selectedTravelMode);
  getDirections(window.currentLocation, selectedDestination, selectedTravelMode);
});

// Debounce function to limit API requests
function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

}


//Proper loading of Google Maps API
document.addEventListener("GoogleMapsLoaded", function () {
  console.log("🚀 Google Maps API is ready. Initializing map...");
  initMap();
});






