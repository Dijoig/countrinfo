
//map setup:
var worldMap = L.map('mapId').setView([51.505, -0.09], 6);

L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
	attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community'
}).addTo(worldMap);


//request to php  routine that retrieves the geojson feature for the selected country at the nav bar:
var $goBtn = $("#GoBtn");
var $countryCode = $('#CountrySelection');
var feature;
$goBtn.click(function() {
  $.ajax({
    url: './php/countryBordersHandler.php',
    type: 'POST',
    dataType: 'json',
    data: {countryCode: $countryCode.val()},
    success: function(result) {
      if (feature) {
        feature.clearLayers();
      }
      console.log(result.geometry.coordinates);
      var myStyle = {"color": "#2D5EF9", "weight": 4, "opacity": 0.5};
      feature = L.geoJSON(result, {style: myStyle}).addTo(worldMap);
      worldMap.fitBounds(feature.getBounds());
    },
    error: function(error) {
      console.log(error);
    }
  });
});

//logic for the clear map button:


