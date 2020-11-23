//defining variables:
var $goBtn = $("#GoBtn");
var $countryCode = $('#CountrySelection');
var feature;
var currencycode;
var currency;
var countryISO2;
var countryName;
var countryCapital;
var countryContinent;


//defining function that will call openCageISO2.php using iso2 code from countryBoirdersHandler to get core data from countries:
const ajaxOpenCage = function(iso2) {
  $.ajax({
    url: './php/openCageForward.php',
    type: 'POST',
    dataType: 'json',
    data: {countryName: countryName},
    success: function(result) {
      console.log(result);
      currencyCode = result['data'][0]['annotations']['currency']['iso_code'];
      currency = result['data'][0]['annotations']['currency']['name'];
      countryContinent = result['data'][0]['components']['continent'];
      console.log(countryName + ' currency: ' + currency + '(' + currencyCode + ')' + ', ' + countryContinent);
    },
    error: function(error) {
      console.log(error);
    }
  });
}
//defining the function that will make the ajax request to the php routine handling the country borders:
const ajaxCountryBorders = function(iso3) {
  $.ajax({
           url: './php/countryBordersHandler.php',
          type: 'POST',
          dataType: 'json',
          data: {countryCode: iso3},
          success: function(result) {
            if (feature) {
              feature.clearLayers();
            }
            console.log(result);
            
            countryName = result['properties']['name'];
            var myStyle = {"color": "#2D5EF9", "weight": 4, "opacity": 0.5};
            feature = L.geoJSON(result, {style: myStyle}).addTo(worldMap);
            worldMap.fitBounds(feature.getBounds());
            
            ajaxOpenCage(countryName);
          },
          error: function(error) {
            console.log(error);
          }
        });
      }
//declaring onready code:
$('document').ready(function() {
  //getting user coords:
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(pos) {
      var userLat = pos.coords.latitude;
      var userLng = pos.coords.longitude;
      
  //making call to opencage reverse geocoding api with the coords:
      $.ajax({
        url: './php/openCageReverse.php',
        type: 'POST',
        dataType: 'json',
        data: {
          lat: userLat,
          lng: userLng
        },
        success: function(result) {
          var userISO3 = result['data'][0]['components']["ISO_3166-1_alpha-3"];
  //call to the ajax request to handle borders using the user iso3 code:
          ajaxCountryBorders(userISO3);
        },
        error: function(error) {
          console.log(error);
        }
      });
      
    }, function(error) {
      console.log(error);
    })
  } else {
    alert("Your browser doesn't support geolocation, functions that require your location won't be avaiable... You can update your browser or use another one.");
  }
  
});
//getting user iso3 using opencage reverse geocoding:


//map setup:
var worldMap = L.map('mapId').setView([51.505, -0.09], 6);

L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
	attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community'
}).addTo(worldMap);



//Go button event listener to make a call to the border handler function, using the selected iso3 from the nav bar:
$goBtn.click(function() {
  ajaxCountryBorders($('#CountrySelection').val());
});





