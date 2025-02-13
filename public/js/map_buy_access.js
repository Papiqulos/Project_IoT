// Global variables
let map,
  heatmap,
  infoWindow,
  selectedOrigin,
  selectedDestination,
  currentLocation,
  currentDirections,
  selectedDepartureTime,
  selectedArrivalTime,
  selectedDepartureDate,
  selectedArrivalDate;
let currentTotalAirQuality = [];
let markers = [];
const center_bald = { lat: 38.23666252117088, lng: 21.732572423403976 }; // euagellobill
const center_HMTY = [38.28806669351595, 21.78915113469408];
let default_center = { lat: center_HMTY[0], lng: center_HMTY[1] };
const googleApiKey = getGoogleApiKey();
const userIdElemenent = document.getElementById("user-id");
const userId = userIdElemenent.getAttribute("data-value");
console.log("username: ", userId); // Outputs the Handlebars variable
const userRoleElemenent = document.getElementById("user-role");
const userRole = userRoleElemenent.getAttribute("data-value");
const businessSources = JSON.parse(document.getElementById("businessSources").getAttribute("data-value"));
console.log("business sources: ", businessSources); // Outputs the Handlebars variable
const availableSources = JSON.parse(document.getElementById("availableSources").getAttribute("data-value"));
console.log("user role: ", userRole); // Outputs the Handlebars variable

// Get the api key from the backend
async function getGoogleApiKey() {
    const response = await fetch("/api/key"); // Fetch API key from backend
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    const data = await response.json();
    // console.log("API Key Sent:", data.key); // Debugging output
    return data.key;
  }

async function initMap() {
    // var monitoringButton = document.getElementById("monitoringButton");
    // var analyticsButton = document.getElementById("analyticsButton");

    const { Map, InfoWindow } = await google.maps.importLibrary("maps");
    const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary(
        "marker"
    );

  //// Get the info window
  infoWindow = new InfoWindow();

  map = new Map(document.getElementById("map_buy_access"), {
    center: default_center, // HMTY 38.26469392470636, 21.742012983437373
    zoom: 17,
    mapId: "DEMO_MAP_ID",
    disableDefaultUI: true,
  });

  const bounds = new google.maps.LatLngBounds();
  // Show the business sources with blue markers
  businessSources.forEach((source) => {
    const lat = parseFloat(source.location.split(",")[0]);
    const lng = parseFloat(source.location.split(",")[1]);

    const bSmarker = new AdvancedMarkerElement({
        position: { lat: lat, lng: lng },
        map: map,
        title: `<strong>${source.type}</strong><br><span>Location: ${source.location_n}</span><br>`,
        content: new PinElement({
            background: "#3C4FE0",
            borderColor: "#3C4FE0",
            glyphColor: "#ffffff",
        }).element,
        gmpClickable: true,
    });
    bounds.extend({ lat: lat, lng: lng });
    bSmarker.addListener("click", () => {
        infoWindow.close();

        infoWindow.setContent(bSmarker.title);
        infoWindow.open(bSmarker.map, bSmarker);
    });

  });

  // Show the available sources with red markers
  availableSources.forEach((source) => {
        const lat = parseFloat(source.location.split(",")[0]);
        const lng = parseFloat(source.location.split(",")[1]);
    
        const aSmarker = new AdvancedMarkerElement({
            position: { lat: lat, lng: lng },
            map: map,
            title: `<strong>${source.type}</strong><br><span>Location: ${source.location_n}</span><br>`,
            content: new PinElement({
                background: "#e20000",
                borderColor: "#e20000",
                glyphColor: "#ffffff",
            }).element,
            gmpClickable: true,
        });
        bounds.extend({ lat: lat, lng: lng });
        aSmarker.addListener("click", () => {
            infoWindow.close();
            infoWindow.setContent(aSmarker.title);
            infoWindow.open(aSmarker.map, aSmarker);
        });
 });
    map.fitBounds(bounds);
  // monitoringButton.addEventListener("click", async function () {
  //   console.log("Monitoring Button Clicked1");
    
  //   window.location.href = "/home?event=MonitoringButtonClicked";

  // });   

  // analyticsButton.addEventListener("click", async function () {
  //       console.log("Analytics Button Clicked1");
        
  //       window.location.href = "/home?event=AnalyticsButtonClicked";
        
  // });
}



//Proper loading of Google Maps API
document.addEventListener("GoogleMapsLoaded", async function () {
    console.log("🚀 Google Maps API is ready. Initializing map...");
    await initMap();
  });
