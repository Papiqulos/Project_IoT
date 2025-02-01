let map, heatmap, service, infoWindow;
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

// Debounced version of nearbySearch
const debouncedNearbySearch = debounce(() => {
    nearbySearch();
  }, 2000); // Adjust the delay as needed (e.g., 1000ms)

// Listen for the `center_changed` event
map.addListener("idle", () => {
    // Get the new center
    const newCenter = map.getCenter();
    center1 = { lat: newCenter.lat(), lng: newCenter.lng() };
    console.log(center1);


    // Perform a non-debounced nearby search
    // nearbySearch();

    // Perform a debounced nearby search
    debouncedNearbySearch();
  });

// findPlaces();
// nearbySearch();
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
        radius: 500,
      },
      // optional parameters
      maxResultCount: 3,
      rankPreference: SearchNearbyRankPreference.POPULARITY,
      language: "en-GR",
      region: "gr",
    };
    //@ts-ignore
    const { places } = await Place.searchNearby(request);
  
    if (places.length) {
    //   console.log(places);
  
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

