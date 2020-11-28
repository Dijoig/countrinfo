//defining variables:
var $goBtn = $("#GoBtn");
var $countryCode = $('#CountrySelection');
var exchangeBtn = $('#exchangeBtn');
var feature;

//country variables that will be given values from the results of the requests to APIs:
var fullName;
var countryName;
var iso2;
var iso3;
var capital;
var region;
var subregion;
var population;
var language;
var languageCode;
var currency;
var currencyCode;
var currencySymbol;
var currencyexchangeUSD;
var covidData;



//defining function that will call openCageForward.php using country name from countryBordersHandler to get core data from countries:
const ajaxOpenCage = function(country) {
  $.ajax({
    url: './php/openCageForward.php',
    type: 'POST',
    dataType: 'json',
    data: {countryName: countryName},
    success: function(result) {
      //console.log(result); 
    },
    error: function(error) {
      console.log(error);
    }
  });
}

//defining the function that will call restCountries.php, wich will request the RESTCountries api to retrieve additional data from the country:
const ajaxRestCountries = function(country) {
  $.ajax({
    url: './php/restCountries.php',
    type: 'POST',
    dataType: 'json',
    data: {countryName: countryName},
    success: function(result) {
      console.log(result);
      
      //assigning variables to the variables declared on top of the code, using the result from RestCountries API:
      fullName = result['data'][0]['name'];
      capital = result['data'][0]['capital'];
      region = result['data'][0]['region'];
      subregion = result['data'][0]['subregion'];
      population = result['data'][0]['population'];
      language = result['data'][0]['languages'][0]['name'];
      languageCode = result['data'][0]['languages'][0]['iso639_1'];
      iso2 = result['data'][0]['alpha2Code'];
      iso3 = result['data'][0]['alpha3Code'];
      currency = result['data'][0]['currencies'][0]['name'];
      currencyCode = result['data'][0]['currencies'][0]['code'];
      currencySymbol = result['data'][0]['currencies'][0]['symbol'];
      
      console.log(fullName);
      console.log(countryName);
      console.log(iso2);
      console.log(iso3);
      console.log(capital);
      console.log(region);    
      console.log(subregion); 
      console.log(population);
      console.log(language);
      console.log(languageCode);
      console.log(currency);
      console.log(currencyCode);
      console.log(currencySymbol);
      
      ajaxCovid19(iso3);
      ajaxOpenWeather(capital);
      ajaxOpenExchangeRate(currencyCode);
      
    },
    error: function(error) {
      console.log(error);
    }
  });
}

//defining function that will make the ajax request to the php routine handling the currency exchange rates:
const ajaxOpenExchangeRate = function(currencyCode) {
  $.ajax({
    url: './php/openExchangeRate.php',
    type: 'POST',
    dataType: 'json',
    success: function(result) {
      currencyexchangeUSD = result['data'][currencyCode];
      console.log('1 USD = ' + currencyexchangeUSD + ' ' + currencyCode);
    },
    error: function(error) {
      console.log(error);
    }
  });
}

//defining the function that will make the calls to the routines that will get weather data from openWeather api:
const ajaxOpenWeather = function(capital) {
  $.ajax({
    url: './php/openWeatherCurrent.php',
    type: 'POST',
    dataType: 'json',
    data: {city: capital},
    success: function(result) {
      console.log(result);
      var capitalLat = result['data']['coord']['lat'];
      var capitalLon = result['data']['coord']['lon'];
      
      //ajax call to the php routine handling openWeatherOneCall forecast API:
      $.ajax({
        url: './php/openWeatherOneCall.php',
        type: 'POST',
        dataType: 'json',
        data: {
          lat: capitalLat,
          lon: capitalLon
        },
        success: function(result) {
          console.log(result);
        },
        error: function(error) {
          console.log(error);
        }
      });
    },
    error: function(error) {
      console.log(error);
    }
  });
}

//defininf the function that will make the ajax request to covid19 API to get information about covid from the country using isocode 3:
const ajaxCovid19 = function(iso3) {
  $.ajax({
    url: 'https://api.covid19api.com/total/country/' + iso3,
    type: 'GET',
    dataType: 'json',
    success: function(result) {
      covidData = result[result.length - 1];
      console.log(covidData);
    },
    error: function(error) {
      console.log(error);
    }
  });
}

//defining the function that will make the ajax request to the php routine handling the country borders and call the routines to the other APIs:
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
            
            //ajaxOpenCage(countryName);
            ajaxRestCountries(countryName);
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



//map setup:
var worldMap = L.map('mapId').setView([51.505, -0.09], 6);

L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
	attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community'
}).addTo(worldMap);



//Go button event listener to make a call to the border handler function, using the selected iso3 from the nav bar:
$goBtn.click(function() {
  ajaxCountryBorders($('#CountrySelection').val());
});






