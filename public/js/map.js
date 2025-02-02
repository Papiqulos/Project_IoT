let map, heatmap, service, infoWindow, previousZoom, previousCenter, currentLocation;
let suggestionsClicked = false;
let heatmapsClicked = false;
let isDragging = false;
const center_HMTY = [38.28806669351595, 21.78915113469408];
let center1 = { lat: center_HMTY[0], lng: center_HMTY[1] };
let markers = [];



//Proper loading of Google Maps API
document.addEventListener("GoogleMapsLoaded", function () {
  console.log("🚀 Google Maps API is ready. Initializing map...");
  initMap();
});

// Initialize the map
async function initMap() {

  const { Map } = await google.maps.importLibrary("maps");

  map = new Map(document.getElementById("map"), {
    center: center1, // HMTY 38.26469392470636, 21.742012983437373
    zoom: 17,
    mapId: "DEMO_MAP_ID",
  });

  /////////////////////////////////////
  // Get the user's current location
  let cr = getCurrentLocation();
  console.log("currentLocationkhjgf", cr);
  /////////////////////////////////////

  // Get the user's current location
  infoWindow = new google.maps.InfoWindow();

  const locationButton = document.createElement("button");

  locationButton.textContent = "Pan to Current Location";
  locationButton.classList.add("custom-map-control-button");
  map.controls[google.maps.ControlPosition.TOP_CENTER].push(locationButton);
  locationButton.addEventListener("click", () => {
    // Try HTML5 geolocation.
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          window.currentLocation = pos;
          infoWindow.setPosition(pos);
          infoWindow.setContent("Location found.");
          infoWindow.open(map);
          map.setCenter(pos);
        },
        () => {
          handleLocationError(true, infoWindow, map.getCenter());
        },
      );
    } else {
      // Browser doesn't support Geolocation
      handleLocationError(false, infoWindow, map.getCenter());
    }
  });

  previousZoom = map.getZoom();
  previousCenter = map.getCenter();

  // Debounced version of nearbySearch
  const debouncedNearbySearch = debounce(() => {
    nearbySearch();
  }, 500); // Adjust the delay as needed (e.g., 1000ms)


  // For the heatmaps
  map.addListener("dragend", () => {  
    console.log("dragend");
    if (suggestionsClicked){return;}
    if (!heatmapsClicked) {return;}
    // Clear directions if any
    clearDirections();
    isDragging = false;
    const newCenter = map.getCenter();
    center1 = { lat: newCenter.lat(), lng: newCenter.lng() };
    console.log("new center", center1);

    // Perform a debounced nearby search
    debouncedNearbySearch();
    
  }
  );

  // Show/hide suggestions form
document.getElementById('suggestions_button').addEventListener('click', function() {
  suggestionsClicked = !suggestionsClicked;
  heatmapsClicked = false;
  clearMarkers();
  var form = document.getElementById('suggestionsForm');

  if (form.style.display === 'none') {
    form.style.display = 'block';
  } else {
    form.style.display = 'none';
  }

  // Debugging
  console.log("suggestionsClicked", suggestionsClicked);
  console.log("heatmapsClicked", heatmapsClicked);
});

// Show/hide heatmap
document.getElementById('heatmaps_button').addEventListener('click', function() {
  heatmapsClicked = !heatmapsClicked;
  clearDirections();
  var form = document.getElementById('suggestionsForm');
  form.style.display = 'none';
  suggestionsClicked = false;

  // Debugging
  console.log("suggestionsClicked", suggestionsClicked);
  console.log("heatmapsClicked", heatmapsClicked);
});

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
  console.log("selectedDestination_name", selectedDestination.displayName);
  console.log("selectedTravelMode", selectedTravelMode);
  getDirections(selectedDestination, selectedTravelMode);
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
async function findPlacesByText(text, results = 5) {
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
function getDirections(destination, travelMode = "WALKING") {
  if (!suggestionsClicked) {return;}
  // Clear any existing directions
  clearDirections();
  // Clear any existing markers
  clearMarkers();
  var directionsService = new google.maps.DirectionsService();
  var directionsRenderer = new google.maps.DirectionsRenderer();
  directionsRenderer.setMap(map);

  var request = {
    origin: window.currentLocation,
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


///////////////////////////////
// Get the user's current location
function getCurrentLocation() {
  infoWindow = new google.maps.InfoWindow();
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const pos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        currentLocation = pos;
        window.currentLocation = currentLocation;
        console.log("currentLocation1", currentLocation);
        // infoWindow.setPosition(pos);
        // infoWindow.setContent("Location found.");
        // infoWindow.open(map);
        // map.setCenter(pos);
      },
      () => {
        handleLocationError(true, infoWindow, map.getCenter());
      },
    );
    console.log("currentLocation2", currentLocation);
    return currentLocation;
  } else {
    // Browser doesn't support Geolocation
    handleLocationError(false, infoWindow, map.getCenter());
  }
}
  
///////////////////////////////



