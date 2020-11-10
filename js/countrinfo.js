
//map setup:
var worldMap = L.map('mapId').setView([51.505, -0.09], 13);

L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
	attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community'
}).addTo(worldMap);

//request to countryBorderHandler to get borders:
var $goBtn = $("#GoBtn");
var $countryCode = $('#CountrySelection');


$goBtn.click(function() {
  $.ajax({
    url: './php/countryBordersHandler.php',
    type: 'POST',
    dataType: 'json',
    data: {countryCode: $countryCode.val()},
    success: function(result) {
      console.log(result);
    },
    error: function(error) {
      console.log(error);
    }
  });
});