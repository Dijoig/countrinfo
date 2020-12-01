//defining variables:
var $goBtn = $("#GoBtn");
var $countryCode = $('#CountrySelection');
var feature;

//country obj that will store data from the selected country:
const country = {};

//defining the function that will call restCountries.php, wich will request the RESTCountries api to retrieve additional data from the country:
const ajaxRestCountries = function(countryName) {
  $.ajax({
    url: './php/restCountries.php',
    type: 'POST',
    dataType: 'json',
    data: {countryName: countryName},
    success: function(result) {
      //console.log(result);
      
      //assigning variables to the variables declared on top of the code, using the result from RestCountries API:
      var countryData = result['data'][0];
      country.fullName = countryData['name'];
      country.capital = countryData['capital'];
      country.region = countryData['region'];
      country.subregion = countryData['subregion'];
      country.population = countryData['population'];
      country.flagPath = countryData['flag'];
      country.wikipedia = 'https://en.wikipedia.org/wiki/' + country.name.replace(' ', '_');
      country.language = {
        name: countryData['languages'][0]['name'],
        code: countryData['languages'][0]['iso639_1']
      }
      country.code = {
        iso2: countryData['alpha2Code'],
        iso3: countryData['alpha3Code']
      }
      country.currency = {
        name: countryData['currencies'][0]['name'],
        code: countryData['currencies'][0]['code'],
        symbol: countryData['currencies'][0]['symbol']
      }
      
      console.log(country);
      
      ajaxCovid19(country.code.iso3);
      ajaxOpenWeather(country.capital);
      ajaxOpenExchangeRate(country.currency.code);
      ajaxHDI(country.code.iso3);
      
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
      country.currency.exchangeUSD = result['data'][currencyCode];
     
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
      //console.log(result);
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
          //console.log(result);
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

//defining the function that will make the ajax request to covid19 API to get information about covid from the country using isocode 3:
const ajaxCovid19 = function(iso3) {
  $.ajax({
    url: 'https://api.covid19api.com/total/country/' + iso3,
    type: 'GET',
    dataType: 'json',
    success: function(result) {
      //console.log(result)
      var latestData = result[result.length - 1];
      country.covidData = {
        date: latestData['Date'],
        confirmed: latestData['Confirmed'],
        active: latestData['Active'],
        deaths: latestData['Deaths'],
        recovered: latestData['Recovered']
      }
    },
    error: function(error) {
      console.log(error);
    }
  });
}

//defining the function that will make the ajax request to humanDevelopment.php to get information about HDI from the country using isocode 3:
const ajaxHDI = function(iso3) {
  $.ajax({
    url: './php/humanDevelopment.php',
    type: 'POST',
    dataType: 'json',
    data: {countryCode: iso3},
    success: function(result) {
      //console.log(result);
      var indicatorValues = result['data']['indicator_value'][country.code.iso3];
      country.humanDevelopmentData = {
          lifeExpectancyAtBirth: indicatorValues['69206']['2018'],
          hdiValue: indicatorValues['137506']['2018'],
          totalUnemploymentRate: indicatorValues['140606']['2018'],
          gniPerCapita: indicatorValues['141706']['2018'],
          hdiRank: indicatorValues['146206']['2018']
          }
      }
    ,
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
            //console.log(result);
            
            country.name = result['properties']['name'];
    
            var myStyle = {"color": "#2D5EF9", "weight": 4, "opacity": 0.5};
            feature = L.geoJSON(result, {style: myStyle}).addTo(worldMap);
            worldMap.fitBounds(feature.getBounds());
            
            //ajaxOpenCage(countryName);
            ajaxRestCountries(country.name);
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






