//defining global variables:
var $goBtn = $("#goBtn");
var $myLocationBtn = $('#myLocationBtn');
var $countryCode = $('#CountrySelection');
var feature;
var userLat;
var userLng;
var userISO3;
var clickISO3;
var textbox;

//country obj that will store data from the selected country:
const country = {};
//weather object that will store data from the current weather and forecast:
const weather = {};
//place object that will store data from the user location or click event on map:
var place = {};
//defining function that will be called at openCageUser and openCageReverse to fill the place object:
const placeUpdate = function(openCageResult) {
  var placeData = openCageResult['data'][0];
  place = {};
  place.formatted = placeData['formatted'];
  place.timeZone = placeData['annotations']['timezone']['name'];
  place.components = placeData['components'];
  
  console.log(place);
}

//populating select element using a php routine that will get the countries from countryBroders.geo.json:
const populateSelectElement = function() {
  $.ajax({
    url: './php/populateSelect.php',
    type: 'POST',
    datatype: 'json',
    success: function(result) {
      var populateJson = JSON.parse(result);
      //logic to get the country list alphabetically and keep their isocodes:
      const countries = {};
      let populateIndex = 0;
      populateJson.names.forEach(function(name) {
          countries[name] = populateJson.iso3[populateIndex]; 
          populateIndex++;
        });
      
      const alphabeticalCountries = {};
      Object.keys(countries).sort().forEach(function(country) {
        alphabeticalCountries[country] = countries[country];
      });
      
      //logic to populate the select element using the alphabetical object:
      Object.keys(alphabeticalCountries).forEach(function(country) {
        let isoVal = '\"' + alphabeticalCountries[country] + '\"';
        let optionElement = '<option value=' + isoVal + '>' + country + '</option>';
        
        $('#countryOptions').append(optionElement);  
      }) 
    },
    error: function(error) {
      console.log(error);
    }
  });
}

//API CALLS BEGIN
//defining the function that will call restCountries.php, wich will request the RESTCountries api to retrieve additional data from the country and call the other APIs:
const ajaxRestCountries = function(countryName) {
  $.ajax({
    url: './php/restCountries.php',
    type: 'POST',
    dataType: 'json',
    data: {countryName: countryName},
    success: function(result) {
      //console.log(result);
      
      //assigning values to the properties of the country object, using the result from RestCountries API:
      var countryData = result['data'][0];
      country.fullName = countryData['name'];
      country.capital = countryData['capital'];
      country.region = countryData['region'];
      country.subregion = countryData['subregion'];
      country.population = countryData['population'];
      country.flagPath = countryData['flag'];
      country.wikipedia = 'https://en.wikipedia.org/wiki/' + country.name.replace(' ', '_');
      country.callingCode = countryData['callingCodes'][0];
      country.demonym = countryData['demonym'];
      country.languages = [{}, {}, {}];
      for (var i=0; i < countryData['languages'].length; i++) {
        country['languages'][i]['name'] = countryData['languages'][i]['name'];
        country['languages'][i]['code'] = countryData['languages'][i]['iso639_1'];
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
      if (countryData['regionalBlocs'].length != 0) {
        country.regionalBlock = {
          acronym: countryData['regionalBlocs'][0]['acronym'],
          name: countryData['regionalBlocs'][0]['name']
          }
        }
      
      console.log(country);
      
      //calling the APIs:
      ajaxCovid19(country.code.iso3);
      ajaxOpenExchangeRate(country.currency.code);
      ajaxHDI(country.code.iso3);
      
      wikipediaLink();
      
      
    },
    error: function(error) {
      console.log(error);
    }
  });
}

//defining function that will make the ajax request to the php routine handling the currency exchange rates and generalData() to add information to the html file:
const ajaxOpenExchangeRate = function(currencyCode) {
  $.ajax({
    url: './php/openExchangeRate.php',
    type: 'POST',
    dataType: 'json',
    success: function(result) {
      country.currency.exchangeUSD = result['data'][currencyCode];
      generalData();
    },
    error: function(error) {
      console.log(error);
    }
  });
}

//defining the function that will make the calls to the routines that will get weather data from openWeather api:
const ajaxOpenWeather = function(lat, lon) {
  $.ajax({
        url: './php/openWeatherOneCall.php',
        type: 'POST',
        dataType: 'json',
        data: {
          lat: lat,
          lon: lon
        },
        success: function(result) {
          //console.log(result);
          //adding data to the weather object defined at the top of the code using the openWeather data:
          var weatherData = result['data'];
          
          weather.currentTemp = weatherData['current']['temp'];
          weather.currentFeelsLike = weatherData['current']['feels_like'];
          
          
          for (var i = 0; i < weatherData['daily'].length; i++) {
            weather[i] = {
                timeUnix: weatherData['daily'][i]['dt'],
              
                tempAvg: ((weatherData['daily'][i]['temp']['day'] + weatherData['daily'][i]['temp']['morn'] + weatherData['daily'][i]['temp']['eve'] + weatherData['daily'][i]['temp']['night'])/4).toFixed(2),
              
                tempFeelsLikeAvg: ((weatherData['daily'][i]['feels_like']['day'] + weatherData['daily'][i]['feels_like']['morn'] + weatherData['daily'][i]['feels_like']['eve'] + weatherData['daily'][i]['feels_like']['night'])/4).toFixed(2),
              
                tempMax : weatherData['daily'][i]['temp']['max'],
                tempMin : weatherData['daily'][i]['temp']['min'],
                humidity: weatherData['daily'][i]['humidity'],
                wind: weatherData['daily'][i]['wind_speed'] * 3.6,
                sky: weatherData['daily'][i]['weather'][0]['description']
            }
          }
        
            
          
          console.log(weather);
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
      
      covid19Data();
    },
    error: function(error) {
      console.log(error);
    }
  });
}

//defining the function that will make the ajax request to humanDevelopment.php to get information about HDI from the country using isocode 3. it will also call lifeQualityData() to send it all to the map overlaid div:
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
      lifeQualityData();
      }
    ,
    error: function(error) {
      console.log(error);
    }
  });
}

//defining function that will make the ajax call to the php routine handling the openCageReverse API to get data from the address of the click event on map:
const ajaxOpenCageReverse = function(lat, lng) {
   $.ajax({
        url: './php/openCageReverse.php',
        type: 'POST',
        dataType: 'json',
        data: {
          lat: lat,
          lng: lng
        },
        success: function(result) {
          //console.log(result);
          clickISO3 = result['data'][0]['components']["ISO_3166-1_alpha-3"];
          placeUpdate(result);
            
            //console.log(clickISO3);
        },
        error: function(error) {
          console.log(error);
        }
      });
}

//defining function that will make the ajax call to the php routine handling the openCageReverse API to get data from the address of the user on document load:
const ajaxOpenCageUser = function(userLat, userLng) {
  $.ajax({
        url: './php/openCageReverse.php',
        type: 'POST',
        dataType: 'json',
        data: {
          lat: userLat,
          lng: userLng
        },
        success: function(result) {
          //console.log(result);
          userISO3 = result['data'][0]['components']["ISO_3166-1_alpha-3"];
          ajaxCountryBorders(userISO3);
          ajaxOpenWeather(userLat, userLng);
          placeUpdate(result);
  //call to the ajax request to handle borders using the user iso3 code:
          
        },
        error: function(error) {
          console.log(error);
        }
      });
}

//defining the function that will make the ajax request to the php routine handling the country borders and call ajaxRestCountries:
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
            if (country.name == 'United States') {
              country.name += ' of America';
            }
    
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
//API CALLS END



//map setup:
var worldMap = L.map('mapId').setView([51.505, -0.09], 6);

L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
	attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community'
}).addTo(worldMap);




//EVENT HANDLERS BEGIN
//Go button event listener to make a call to the border handler function, using the selected iso3 from the nav bar:
$goBtn.click(function() {
  ajaxCountryBorders($('#countryOptions').val());
});

//Back to location buttom event listener that takes the user back to the country his is in:
$myLocationBtn.click(function() {
  if (country.code.iso3 != userISO3) {
    ajaxOpenCageUser(userLat, userLng);
  } else {
    alert('Already showing information about the country you are currently in!');
  }
});

//defining onMap click event to get weather and address data from the click:
const onMapClick = function(e) {
  ajaxOpenWeather(e.latlng.lat, e.latlng.lng);
  ajaxOpenCageReverse(e.latlng.lat, e.latlng.lng);
  
  setTimeout(function() {
    if (clickISO3 != country.code.iso3) {
    ajaxCountryBorders(clickISO3);
  }
  }, 600);
  
  
 }
worldMap.on('click', onMapClick);
//EVENT HANDLERS END




//declaring onready code that will get user position and make ajax request to the opencage reverse API, using the location of the user:
$('document').ready(function() {
  //populating select element from nav bar:
  populateSelectElement();
  //getting user coords:
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(pos) {
      userLat = pos.coords.latitude;
      userLng = pos.coords.longitude;
  //making call to opencage reverse geocoding api with the coords:
      ajaxOpenCageUser(userLat, userLng);
    }, function(error) {
      console.log(error);
    })
  } else {
    alert("Your browser doesn't support geolocation, functions that require your location won't be avaiable... You can update your browser or use another one.");
  }
  
});

//decalring functions that will overlay data to the map:
//function to add the wikipedia link of the current selected country to the nav bar:
const wikipediaLink = function() {
  $('#wikiLink').remove();
  $('#countryWikipedia').append(`<a id="wikiLink" target="_blank" href=${country.wikipedia}>${country.name} Wikipedia</a>`);
}

//funcrion to add a list that will show the user general information about the country, overlayed on the map:
const generalData = function() {
  var generalHTML = 
    `
      <object data="${country.flagPath}" width="100" height="70"> </object>
      <h1 class="dataH1">${country.name} data</h1>
      <ul id="generalList">
        <li>full name: ${country.fullName}</li>
        <li>ISO2: ${country.code.iso2}, ISO3: ${country.code.iso3}</li>
        <li>subregion: ${country.subregion}</li>
        <li>languages: <ul id="lngList"></ul></li>
        <li>calling code: ${country.callingCode}</li>
        <li>population: ${country.population}</li>
        <li>demonym: ${country.demonym}</li>
        <li>regional block: ${country.regionalBlock.name} (${country.regionalBlock.acronym})</li>
        <li>currency: ${country.currency.name} (${country.currency.code}, symbol: ${country.currency.symbol})</li>
        <li>currency exchange: 1 USD = ${country.currency.exchangeUSD} ${country.currency.code}</li>
      </ul>`;
   $('#generalData')[0].innerHTML = generalHTML;
  //looping through the languages list to programatically send them to the lngList <ul> element:
  country.languages.forEach(language => {
    if (language.name) {
    $('#lngList').append(`<li>${language.name} (${language.code})</li>`);
    }
  });
};

//function to add the life quality data overlaid to the map:
const lifeQualityData = function() {
  lifeQualityHTML = 
    ` <h1 class="dataH1">Life quality data</h1>
      <ul>
        <li>Human Development Index(HDI): ${country.humanDevelopmentData.hdiValue}</li>
        <li>HDI rank: ${country.humanDevelopmentData.hdiRank}</li>
        <li>Gross National Income per capita: ${country.humanDevelopmentData.gniPerCapita}</li>
        <li>Life Expctancy at Birth: ${country.humanDevelopmentData.lifeExpectancyAtBirth}</li>
        <li>Total Unemployment Rate: ${country.humanDevelopmentData.totalUnemploymentRate}</li>
      </ul>`;
  
  $('#lifeQualityData')[0].innerHTML = lifeQualityHTML;
}
 
//function to add the covid data overlaid to the map:
const covid19Data = function() {
  covid19DataHTML = 
    ` <h1 class="dataH1">Covid19 total data</h1>
      <ul>
        <li>confirmed cases: </li>
        <li>active cases: </li>
        <li>total deaths: </li>
        <li>total recoverys: </li>
      </ul>`;
  
  $('#covid19Data')[0].innerHTML = covid19DataHTML;
}


//code snippet to create a div on the map that will overlay general data about the country sleected:
L.Control.textbox = L.Control.extend({
		onAdd: function(map) {
		
    
		var div = L.DomUtil.create('div');
		div.id = "countryData";
		div.innerHTML = `<div id="generalData"></div>
                    <div id="lifeQualityData"></div>
                    <div id="covid19Data"></div>`
		return div;
		},
    onRemove: function(map) {
			//nothing
		}
		
	});
textbox = function(opts) { return new L.Control.textbox(opts);}
textbox({ position: 'topleft' }).addTo(worldMap);
