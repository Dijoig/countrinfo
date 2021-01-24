//defining global variables:
var feature;
var userLat;
var userLng;
var userISO3;
var clickISO3;
var infoTableStatus;


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
  
  //console.log(place);
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
        
        $('#countrySelection').append(optionElement);
      });
      $('#countrySelection > option[value="-99"]').remove();
    },
    error: function(error) {
      console.log(error);
    }
  });
}

//API CALLS FUNCTIONS BEGIN
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
      var countryData = result['data'];
      //console.log(countryData);
      country.fullName = countryData['name'];
      country.capital = countryData['capital'];
      country.region = countryData['region'];
      country.subregion = countryData['subregion'];
      country.population = countryData['population'];
      country.flagPath = countryData['flag'];
      country.wikipedia = 'https://en.wikipedia.org/wiki/' + country.fullName.replace(/ /g, '_');
      country.callingCode = countryData['callingCodes'][0];
      country.demonym = countryData['demonym'];
      country.languages = [];
      for (var i=0; i < countryData['languages'].length; i++) {
        country.languages.push({});
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
      //logic to pudate the general data table in case it is the one visible:
      if (infoTableStatus == "general data") {
        generalDataTableUpdate();
      }
      
      //calling the APIs:
      ajaxCovid19(country.code.iso3);
      //ajaxOpenExchangeRate(country.currency.code);
      ajaxHDI(country.code.iso3);
      ajaxOpenWeatherCapital(country.capital);
      //generalData();
      //wikipediaLink();
      
      
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
                wind: (weatherData['daily'][i]['wind_speed'] * 3.6).toFixed(2),
                sky: weatherData['daily'][i]['weather'][0]['description']
            }
          }
        
            
          //weatherUpdate();        
          //console.log(weather);
        },
        error: function(error) {
          console.log(error);
        }
      });
}

//defining function that will make call to openWeather to get the coords for the country capital, and display a marker on the map with the results;
const ajaxOpenWeatherCapital = function(city) {
  $.ajax({
    url: './php/openWeatherCapital.php',
    type: 'POST',
    dataType: 'json',
    data: {city: city},
    success: function(result) {
      //console.log(result);
      var markerCity = L.marker([result['data']['lat'], result['data']['lon']]).addTo(worldMap);
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
      if (result.length > 0) {
      var latestData = result[result.length - 1];
      country.covidData = {
        date: latestData['Date'],
        confirmed: latestData['Confirmed'],
        active: latestData['Active'],
        deaths: latestData['Deaths'],
        recovered: latestData['Recovered']
        }
      } else {
        country.covidData = {
        date: 'not available',
        confirmed: 'not available',
        active: 'not available',
        deaths: 'not available',
        recovered: 'not available'
      }
      }
      //covid19Data();
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
      if (result['data']['country_name']) {
        var indicatorValues = result['data']['indicator_value'][country.code.iso3];
        country.humanDevelopmentData = {
          lifeExpectancyAtBirth: indicatorValues['69206']['2019'],
          totalUnemploymentRate: indicatorValues['140606']['2019']
        }
          if (country.code.iso3 == "SOM" || country.code.iso3 == "PRK") {
            country.humanDevelopmentData.hdiValue = "not availabe";
            country.humanDevelopmentData.gniPerCapita = "not availabe";
            country.humanDevelopmentData.hdiRank = "not availabe";
            } else {
            country.humanDevelopmentData.hdiValue = indicatorValues['137506']['2019'];
            country.humanDevelopmentData.gniPerCapita = indicatorValues['195706']['2019'];
            country.humanDevelopmentData.hdiRank = indicatorValues['146206']['2019'];
          }
      } else {
        country.humanDevelopmentData = {
          lifeExpectancyAtBirth: "not available",
          hdiValue: "not available",
          totalUnemploymentRate: "not available",
          gniPerCapita: "not available",
          hdiRank: "not available"
        }
      }
      //lifeQualityData();
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
          //calls to the ajax routines using the user coords and iso3:
          ajaxCountryBorders(userISO3);
          ajaxOpenWeather(userLat, userLng);
          //updating the place object with data from the php routines and binding the popup with the user place data:
          placeUpdate(result);
          //popupGenerator(userLat, userLng);
          
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
          
            let isoCode = result['properties']['iso_a3'];
            country.name = result['properties']['name'];
            
            var myStyle = {"color": "#2D5EF9", "weight": 4, "opacity": 0.5};
            feature = L.geoJSON(result, {style: myStyle}).addTo(worldMap);
            worldMap.fitBounds(feature.getBounds());
            
            //ajaxOpenCage(countryName);
            ajaxRestCountries(isoCode);
          },
          error: function(error) {
            console.log(error);
          }
        });
      }
//API CALLS FUNCTIONS END



//MAP SETUP BEGINS:
//creating map variable:
var worldMap = L.map('mapId', {zoomControl: false});
//adding zoom buttom to the bottom right
L.control.zoom({
     position:'bottomright'
}).addTo(worldMap);
//adding tile layers to visualize map:
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
	attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community'
}).addTo(worldMap);
//MAP SETUP ENDS

//DOCUMENT READY EVENT BEGINS
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
//DOCUMENT READY EVENT ENDS


 


  
 
//function to add weather data overlaid to the map:
/*const weatherUpdate = function() {
  var d = new Date();
  var todayMiliseconds = d.getTime();
  var day1 = new Date(todayMiliseconds);
  var day2 = new Date(todayMiliseconds + 86400000);
  var day3 = new Date(todayMiliseconds + 86400000*2);
  var day4 = new Date(todayMiliseconds + 86400000*3);
  weatherDataHTML = 
    `<table id="weatherTable">
      <tr>
        <th></th>
        <th>${day1.toDateString()}</th>
        <th>${day2.toDateString()}</th>
        <th>${day3.toDateString()}</th>
        <th>${day4.toDateString()}</th>
      </tr>
      <tr>
        <th>Avg temp</th>
        <td>${weather[0].tempAvg}°C</td>
        <td>${weather[1].tempAvg}°C</td>
        <td>${weather[2].tempAvg}°C</td>
        <td>${weather[3].tempAvg}°C</td>
      </tr>
      <tr>
        <th>Max temp</th>
        <td>${weather[0].tempMax}°C</td>
        <td>${weather[1].tempMax}°C</td>
        <td>${weather[2].tempMax}°C</td>
        <td>${weather[3].tempMax}°C</td>
      </tr>
      <tr>
        <th>Min temp</th>
        <td>${weather[0].tempMin}°C</td>
        <td>${weather[1].tempMin}°C</td>
        <td>${weather[2].tempMin}°C</td>
        <td>${weather[3].tempMin}°C</td>
      </tr>
      <tr>
        <th>Wind</th>
        <td>${weather[0].wind}km/h</td>
        <td>${weather[1].wind}km/h</td>
        <td>${weather[2].wind}km/h</td>
        <td>${weather[3].wind}km/h</td>
      </tr>
      <tr>
        <th>Sky</th>
        <td>${weather[0].sky}</td>
        <td>${weather[1].sky}</td>
        <td>${weather[2].sky}</td>
        <td>${weather[3].sky}</td>
      </tr>
      <tr>
        <th>Humidity</th>
        <td>${weather[0].humidity}%</td>
        <td>${weather[1].humidity}%</td>
        <td>${weather[2].humidity}%</td>
        <td>${weather[3].humidity}%</td>
      </tr>
     </table>
     <p>Currently: ${weather.currentTemp}°C (feels like ${weather.currentFeelsLike}°C)</p>`
  
  $('#weatherDiv')[0].innerHTML = weatherDataHTML;
  
}*/

//INSERTION OF DIV ELEMENTS TO THE MAP BEGIN:
//defining function to create a div element on the map:
function createDiv(idName, className, position, HTML) {
L.Control.textbox = L.Control.extend({
		onAdd: function(map) {
      var div = L.DomUtil.create('div');
      div.id = idName;
      div.class = className;
      div.innerHTML = HTML;
      return div;
		}
	});
const newDiv = function(opts) { return new L.Control.textbox(opts);}
newDiv({ position: position}).addTo(worldMap);
}
//seeting up the content of the top left div:
var topLeftDivHTML = `<div class="container-fluid">
    
    <div class="row">
      <div class="col-4 col-sm-5">
      </div> 
      <div id="selectDiv" class="col-8 col-sm-7">
        <select id="countrySelection"><option>Afeganistan</option></select>
      </div>
    </div>
    
    <div class="row">
      <div class="col-2 col-sm-1" id="btnCol">

        <div class="row mt-2"><button class="btn" id="infoBtn"><img class="img-fluid figure" src="img/infoBtnIco.ico"></button></div>
        <div class="row mt-1"><button class="btn" id="covidBtn"><img class="img-fluid figure" src="img/covidBtnImg2.png"></button></div>
        <div class="row mt-1"><button class="btn" id="HDIBtn"><img class="img-fluid figure" src="img/lifeQualityIcon.ico"></button></div>
        <div class="row mt-1"><button class="btn" id="weatherBtn"><img class="img-fluid figure" src="img/weatherIcon2.ico"></button></div>

      </div> 

       <div class="col-10 col-sm-6 col-lg-4 col-xl-3 mt-3 table-responsive" id="tableCol">
        
        

      </div>
    </div>
    
  </div>`;
createDiv('topLeftDiv', 'container-fluid', 'topleft', topLeftDivHTML);

//setting up the content of the right bottom div:
var bottomRightDivHTML = `
  <div class="row">

    <div class="col-6">
      
    </div>
    
    <div class="col-6">
      <button class="btn" id="myLocationBtn"><img class="img-fluid" id="locationImg" id="locationImg" src="img/locationIcon.ico"></button>
    </div>

  </div>  
`;
createDiv('bottomRightDiv', 'container-fluid', 'bottomright', bottomRightDivHTML);

//INSERTION OF DIV ELEMENTS TO THE MAP END:

//INFORMATION TABLE fUNCTIONS BEGINS:
const generalDataTableUpdate = function() {
  $('#tableCol')[0].innerHTML = `
        <table class="table  table-sm table-striped table-hover table-light" id="infoTable">
          <thead>
            <tr>
              <th colspan="2"><img id="flagImg" class="img-fluid" src="${country.flagPath}">  ${country.name}</th>
              
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><img class="img-fluid" src="img/capitalIcon.ico"></td>
              
              <td>${country.capital}</td>     
            </tr>
            <tr>
              <td><img class="img-fluid" src="img/populationIcon.ico"></td>
              
              <td>${country.population}</td>     
            </tr>
            <tr>
              <td><img class="img-fluid" src="img/languageIcon.ico"></td>
              
              <td id="languagesCell"></td>     
            </tr>
            <tr>
              <td><img class="img-fluid" src="img/currencyIcon.ico"></td>
              
              <td>${country.currency.code}(${country.currency.name})</td>      
            <tr>
              <td><img class="img-fluid" src="img/exchange.ico"></td>
              
              <td>1 USD = ${country.currency.exchangeUSD} ${country.currency.code}</td>      
            </tr>
            <tr>
              <td><img class="img-fluid" src="img/union.ico"></td>
              
              <td>${country.regionalBlock.name}</td>      
            </tr>
            <tr>
              <td><img class="img-fluid" src="img/callCode.ico"></td>
              
              <td>+${country.callingCode}</td>      
            </tr>
          </tbody>
        </table>
`;
  
    country.languages.forEach(language => {
    $('#languagesCell')[0].insertAdjacentHTML('beforeend', language.name + ", ");
    });
}
//INFORMATION TABLE FUNCTIONS END:


//EVENT HANDLERS BEGIN
//adding an event listener to the click event at the country selection box to stop propagation of map click events:
$("#countrySelection").click(function(e) {
  e.stopPropagation();
});
//adding an event listener to the change event of the country selection:
$("#countrySelection").change(function(e) {
  ajaxCountryBorders($('#countrySelection').val());
});

//adding an event listener to the mylocationBtn:
$('#myLocationBtn').click(function() {
  if (country.code.iso3 != userISO3) {
    ajaxOpenCageUser(userLat, userLng);
  } else {
    alert('Already showing information about the country you are currently in!');
  }
  event.stopPropagation();
});
//adding an event listener to the infoBtn:
$('#infoBtn').click(function() {
  
  if (infoTableStatus != "general data") {
    generalDataTableUpdate();
    infoTableStatus = "general data";
    $('#tableCol').show();
    //avoiding bubling events on the table:
  $('#infoTable').click(function() {
    event.stopPropagation();
    });
  } else {
    $('#tableCol').toggle();
  }
  event.stopPropagation();
});
//adding an event listener to the covidBtn:
$('#covidBtn').click(function() {
  alert('covid button clicked');
  infoTableStatus = "covid data";
  event.stopPropagation();
});
//adding an event listener to the HDI btn:
$('#HDIBtn').click(function() {
  alert('hdi button clicked');
  event.stopPropagation();
});
//adding an event listener to the weather Btn:
$('#weatherBtn').click(function() {
  alert('weather button clicked');
  event.stopPropagation();
});



//defining the popup generator funtion that will display the click event place informatiom:
/*const popupGenerator = function(lat, lng) {
  let popup = L.popup();
  popup
    .setLatLng({lat: lat, lng: lng})
    .setContent(`Coordinates: ${lat.toFixed(4)}(lat), ${lng.toFixed(4)}(lng)<br>
                 Location: ${place.formatted}<br>
                 TimeZone: ${place.timeZone}<br>
                 `)
    .openOn(worldMap);
};*/
 
//defining onMap click event to get weather and address data from the click:
const onMapClick = function(e) {
  ajaxOpenWeather(e.latlng.lat, e.latlng.lng);
  ajaxOpenCageReverse(e.latlng.lat, e.latlng.lng);
  setTimeout(function() {
    if (clickISO3 != country.code.iso3) {
    ajaxCountryBorders(clickISO3);
  }
    //popupGenerator(e.latlng.lat, e.latlng.lng);
  }, 600);
 }
worldMap.on('click', onMapClick);
//EVENT HANDLERS END

//Test functions
/*var i = 0;
var testList = [];

  
setTimeout(function() {
  setInterval(function(){
    if (i < $('#countryOptions > option').length) {
      var isoTest = $('#countryOptions > option')[i].value;
      i++;
      try {
        ajaxCountryBorders(isoTest);
      } catch(e) {
        testList.push(isoTest);
      }
    } else {
      console.log(testList);
    }
  }, 5000)
}, 5000);*/
