document.addEventListener("GoogleMapsLoaded", function () {
  console.log("🚀 Google Maps API is ready. Initializing map...");
  initMap();
});
let map, heatmap, service, infoWindow, previousZoom, previousCenter;
let isDragging = false;
const center_HMTY = [38.28806669351595, 21.78915113469408];
let center1 = { lat: center_HMTY[0], lng: center_HMTY[1] };
let markers = [];

// Debounce function to limit API requests
function debounce(func, wait) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

async function initMap() {

const { Map } = await google.maps.importLibrary("maps");

map = new Map(document.getElementById("map"), {
    center: center1, // HMTY 38.26469392470636, 21.742012983437373
    zoom: 17,
    mapId: "DEMO_MAP_ID",
});

previousZoom = map.getZoom();
previousCenter = map.getCenter();

// Debounced version of nearbySearch
const debouncedNearbySearch = debounce(() => {
    nearbySearch();
  }, 500); // Adjust the delay as needed (e.g., 1000ms)

// Listeners for changes in the map viewport
map.addListener("dragstart", () => {
  isDragging = true;
  console.log("dragstart");
  }
);

map.addListener("dragend", () => {
  isDragging = false;
  const newCenter = map.getCenter();
  center1 = { lat: newCenter.lat(), lng: newCenter.lng() };
  console.log("new center", center1);


  // Perform a non-debounced nearby search
  // nearbySearch();

  // Perform a debounced nearby search
  debouncedNearbySearch();
  console.log("dragend");
  }
);

map.addListener("zoom_changed", () => {
  previousZoom = map.getZoom();
  const newCenter = map.getCenter();
  center1 = { lat: newCenter.lat(), lng: newCenter.lng() };
  console.log("new center", center1);


  // Perform a non-debounced nearby search
  // nearbySearch();

  // Perform a debounced nearby search
  // debouncedNearbySearch();
  console.log("zoom_changed");
  }
);


// findPlaces();
// Perform an initial nearby search
nearbySearch();
}

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
    if (window.markers) {
        window.markers.forEach((marker) => marker.setMap(null));
      }
      window.markers = [];
  
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

async function findPlacesByText() {
    const { Place } = await google.maps.importLibrary("places");
    const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
    const request = {
    textQuery: "Δένδρα Κουνάβη",
    fields: ["displayName", "location", "businessStatus"],
    maxResultCount: 8,
    minRating: 3.2,
    useStrictTypeFiltering: false,
  };
  //@ts-ignore
  const { places } = await Place.searchByText(request);

  if (places.length) {
    console.log(places);

    const { LatLngBounds } = await google.maps.importLibrary("core");
    const bounds = new LatLngBounds();

    // Loop through and get all the results.
    places.forEach((place) => {
      const markerView = new AdvancedMarkerElement({
        map,
        position: place.location,
        title: place.displayName,
      });

      bounds.extend(place.location);
      console.log(place);
    });
    map.fitBounds(bounds);
  } else {
    console.log("No results");
  }
}

initMap();



