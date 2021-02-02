//defining global variables:
var geoJsonFeature;
var geoJsonLayer;
var userLat;
var userLng;
var userISO3;
var clickISO3;
var infoTableStatus;
var weatherBtnStatus = false;
var wikiCluster = L.markerClusterGroup();


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
      ajaxGeonameId(country.code.iso2);
      ajaxCovid19(country.code.iso3);
      //ajaxOpenExchangeRate(country.currency.code);
      ajaxHDI(country.code.iso3);
      ajaxOpenWeatherCapital(country.capital);
      
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
        var capitalIcon = L.icon({
          iconUrl: 'img/capital.ico',
          iconSize: [30, 30],
          iconAnchor: [15, 0]
});
      var markerCity = L.marker([result['data']['lat'], result['data']['lon']], {icon: capitalIcon}).addTo(geoJsonLayer);
      markerCity.bindPopup(`${country.capital}`);
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
      country.covidData = {};
      var latestData = result[result.length - 1];
      var subtractionData = result[result.length - 2];
      if (result.length > 0) {
      country.covidData.total = {
        date: latestData['Date'],
        confirmed: latestData['Confirmed'],
        active: latestData['Active'],
        deaths: latestData['Deaths'],
        recovered: latestData['Recovered']
        }
        country.covidData.yesterday = {
          confirmed: latestData['Confirmed'] - subtractionData['Confirmed'],
          deaths: latestData['Deaths'] - subtractionData['Deaths'],
          recovered: latestData['Recovered'] - subtractionData['Recovered'],
          active: subtractionData['Active']
        }
      } else {
        country.covidData.total = {
        date: 'not available',
        confirmed: 'not available',
        active: 'not available',
        deaths: 'not available',
        recovered: 'not available'
      }
        country.covidData.yesterday = {
          confirmed: 'not available',
          deaths: 'not available',
          recovered: 'not available',
          active: 'not available'
        }
      }
      if (infoTableStatus == "covid data") {
        covidDataTableUpdate();
      }
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
      if (infoTableStatus == "hdi data") {
        hdiDataTableUpdate();
      }
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

//defining function that will make the ajax request to the php routine to get the geonameID from geonames API and call ajaxGeonameChildren using the geonameId:
const ajaxGeonameId = function(iso2) {
  $.ajax({
           url: './php/geonameId.php',
          type: 'POST',
          dataType: 'json',
          data: {countryCode: iso2},
          success: function(result) {
            console.log(result);
            var geoname = result['data'][0];
            country.areaKm = geoname['areaInSqKm'];
            country.geonameId = geoname['geonameId'];
            /*country.boundingBox = {north: geoname['north'], south: geoname['south'], east: geoname['east'], west: geoname['west']};*/
            
            //ajaxGeonameIdChildren(country.geonameId);
            ajaxGeonameWikipedia(country.boundingBox);
            //ajaxGeonameWeatherStations(country.boundingBox);
          },
          error: function(error) {
            console.log(error);
          }
        });
}

//defining function that will make the ajax request to the php routine and get the subregion of a geonameId using geoname API and add markers in the map:
const ajaxGeonameIdChildren = function(geonameId) {
  $.ajax({
          url: './php/geonameChildren.php',
          type: 'POST',
          dataType: 'json',
          data: {geonameId: geonameId},
          success: function(result) {
            //console.log(result);
            //var outerCluster = L.markerClusterGroup();
            result['data'].forEach(geoname => {
              var weatherIcon = L.icon({
                iconUrl: 'img/weather/weather2.ico',
                iconSize: [30, 30],
                iconAnchor: [15, 0]
            });
              let marker = L.marker([geoname.lat, geoname.lng], {icon: weatherIcon}).addTo(geoJsonLayer);
              marker.bindPopup(`${geoname.name}`);
            
              });
            
          },
          error: function(error) {
            console.log(error);
          }
        });
}

//defining function that will be called inside ajaxGeonameIdChildren to loop thorugh the subregion of the country and get markers for each of their own subregion:
/*const ajaxGeonameIdChildren2 = function(geonameId, markerCluster) {
  $.ajax({
          url: './php/geonameChildren.php',
          type: 'POST',
          dataType: 'json',
          data: {geonameId: geonameId},
          success: function(result) {
            //console.log(result);
            result['data'].forEach(geoname => {
              
              var townIcon = L.icon({
                iconUrl: 'img/town.ico',
                iconSize: [20, 20],
                iconAnchor: [15, 0]
            });
              
             let marker = L.marker([geoname.lat, geoname.lng], {icon: townIcon}).addTo(markerCluster);
              marker.bindPopup(`${geoname.name}`);
              marker.on('click', function() {
                ajaxGeonameWikipedia(geoname.lat, geoname.lng);
                //worldMap.flyTo([geoname.lat, geoname.lng]);
                if (this.clicked != true) {
                var innerCluster2 = L.markerClusterGroup();
                ajaxGeonameIdChildren3(geoname.geonameId, innerCluster2);
                geoJsonLayer.addLayer(innerCluster2);
                this.clicked = true;
                  }
              });
            })
          },
          error: function(error) {
            console.log(error);
          }
        });
}*/

//defining function that will be called inside ajaxGeonameIdChildren2 to loop thorugh the subregion of the country and get markers for each of their own subregion:
/*const ajaxGeonameIdChildren3 = function(geonameId, markerCluster) {
  $.ajax({
          url: './php/geonameChildren.php',
          type: 'POST',
          dataType: 'json',
          data: {geonameId: geonameId},
          success: function(result) {
           // console.log(result);
            result['data'].forEach(geoname => {
              var townIcon = L.icon({
                iconUrl: 'img/town2.ico',
                iconSize: [20, 20],
                iconAnchor: [15, 0]
            });
              let marker = L.marker([geoname.lat, geoname.lng], {icon:       townIcon}).addTo(markerCluster);
              marker.bindPopup(`${geoname.name}`);
            });
          },
          error: function(error) {
            console.log(error);
          }
        });
}*/

//defining function that will call the php routine wich will retrieve wikipedia articles to the marker clicked:
const ajaxGeonameWikipedia = function(boundingBox) {
  $.ajax({
           url: './php/geonameWikipedia.php',
          type: 'POST',
          dataType: 'json',
          data: {boundingBox: boundingBox},
          success: function(result) {
            console.log(result);
            
            result['data'].forEach(geoname => {
              var wikiIcon = L.icon({
                    iconUrl: `img/wikiFeatures/${geoname.feature}.ico`,
                    iconSize: [30, 30],
                    iconAnchor: [15, 0]
                  });
              let marker = L.marker([geoname.lat, geoname.lng], {icon: wikiIcon});
              var pipRes = leafletPip.pointInLayer(marker.getLatLng(), geoJsonLayer);
              if (pipRes.length) {
                  var imgHTML = '';
                  if (geoname.thumbnailImg) {
                    imgHTML = `<br><img id="wikiImg" src="${geoname.thumbnailImg}">`;
                    }
                  var popupContent = `<div id="wikiPopupDiv">
                                        <p>${geoname.summary}<a id="wikiAnchor" href='https:/${geoname.wikipediaUrl}' target='_blank'>read more</a></p>${imgHTML}
                                      </div>`;
                var wikiPopup = L.popup().setContent(popupContent);
                
                  
                  marker.addTo(wikiCluster);
                  marker.bindPopup(wikiPopup);
                  /*marker.on('click', function() {
                    worldMap.flyTo(marker.getLatLng());
                  });*/
                  }  
               })
            wikiCluster.addTo(geoJsonLayer);
          },
          error: function(error) {
            console.log(error.responseText);
          }
        });
}

//defining funtion that will call the php routine to retrieve the weatherstations data for the given boundingbox:
/*const ajaxGeonameWeatherStations = function(boundingBox) {
  $.ajax({
           url: './php/geonameWeatherStations.php',
          type: 'POST',
          dataType: 'json',
          data: {boundingBox: boundingBox},
          success: function(result) {
            console.log(result);
            
            result['data'].forEach(weatherStation => {
              var weatherIcon = L.icon({
                iconUrl: `img/weather/weather2.ico`,
                iconSize: [30, 30],
                iconAnchor: [15, 0]
              });
              
              var marker = L.marker([weatherStation.lat, weatherStation.lng], {icon: weatherIcon});
              var pipRes = leafletPip.pointInLayer(marker.getLatLng(), geoJsonLayer);
              if (pipRes.length) {
                marker.addTo(geoJsonLayer);
              }
            });
            
          },
          error: function(error) {
            console.log(error);
          }
        });
}*/
//defining the function that will make the ajax request to the php routine handling the country borders and call ajaxRestCountries:
const ajaxCountryBorders = function(iso3) {
  $.ajax({
           url: './php/countryBordersHandler.php',
          type: 'POST',
          dataType: 'json',
          data: {countryCode: iso3},
          success: function(result) {
            if (geoJsonLayer) {
              geoJsonLayer.clearLayers();
            }
            //console.log(result);
            geoJsonFeature = result;
            let isoCode = result['properties']['iso_a3'];
            country.name = result['properties']['name'];
            
            
            
            var myStyle = {"color": "#2D5EF9", "weight": 4, "opacity": 0.5};
            geoJsonLayer = L.geoJSON(geoJsonFeature, {style: myStyle}).addTo(worldMap);
            worldMap.fitBounds(geoJsonLayer.getBounds());
            
            country.boundingBox = {
              north: geoJsonLayer.getBounds().getNorth(),
              south: geoJsonLayer.getBounds().getSouth(),
              east: geoJsonLayer.getBounds().getEast(),
              west: geoJsonLayer.getBounds().getWest()
            }
            
            
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



//INSERTION OF DIV ELEMENTS TO THE MAP BEGIN:
//defining function to create a div element on the map:
function createDiv(idName, className, position, HTML) {
L.Control.textbox = L.Control.extend({
		onAdd: function(map) {
      var div = L.DomUtil.create('div');
      div.id = idName;
      div.className = className;
      div.innerHTML = HTML;
      return div;
		}
	});
const newDiv = function(opts) { return new L.Control.textbox(opts);}
newDiv({ position: position}).addTo(worldMap);
}
//seeting up the content of the top left div:
var topLeftDivHTML = `
    
    <div class="row" id="selectionRow">
      <div class="col-4 col-sm-5">
      </div> 
      <div id="selectDiv" class="col-8 col-sm-7">
        <select class="leaflet-control" id="countrySelection"><option>Afeganistan</option></select>
      </div>
    </div>
    
    <div class="row" id="btnRow">
      <div class="col-2 col-sm-1 leaflet-control" id="btnCol">

        <div class="row mt-1"><button class="btn" id="infoBtn"><img class="img-fluid figure" src="img/infoBtnIco.ico"></button></div>
        <div class="row mt-1"><button class="btn" id="covidBtn"><img class="img-fluid figure" src="img/covidBtnImg2.png"></button></div>
        <div class="row mt-1"><button class="btn" id="HDIBtn"><img class="img-fluid figure" src="img/lifeQualityIcon.ico"></button></div>
        <div class="row mt-1"><button class="btn" id="weatherBtn"><img class="img-fluid figure" src="img/weatherIcon2.ico"></button></div>

      </div> 

       <div class="col-9 col-sm-6 col-lg-4 col-xl-3 table-responsive" id="tableCol">
        
      </div>
    </div>
  `;
createDiv('topLeftDiv', 'container-fluid', 'topleft', topLeftDivHTML);
$('#topLeftDiv').removeClass('leaflet-control');

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
        <table class="table  table-sm table-striped table-hover table-light leaflet-control" id="infoTable">
          <thead>
            <tr>
              <th colspan="2"><img id="flagImg" class="img-fluid" src="${country.flagPath}">  ${country.name}<a href="https://www.wikipedia.org/wiki/${country.fullName.replace(' ', '_')}" class="btn" id="countryWikiBtn" target="_blank"><img class="img-fluid figure" src="img/wiki.ico"></a></th>
              
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><img class="img-fluid" src="img/capital.ico"></td>
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

const covidDataTableUpdate = function() {
  $('#tableCol')[0].innerHTML = `
        <table class="table  table-sm table-striped table-hover table-info leaflet-control" id="covidTable">
          <thead>
            <tr>
              <th colspan="3"><img class="img-fluid" id="flagImg" src="${country.flagPath}">  ${country.name} Covid Statics</th>
            </tr>
            <tr>
              <th><img class="img-fluid" src="img/covid.ico"></th>
              <th>Yesterday</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><img class="img-fluid" src="img/cases.ico"> Cases</td>
              <td>${country.covidData.yesterday.confirmed}</td>
              <td>${country.covidData.total.confirmed}</td>
            </tr>
            <tr>
              <td><img class="img-fluid" src="img/death.ico"> Deaths</td>
              <td>${country.covidData.yesterday.deaths}</td>
              <td>${country.covidData.total.deaths}</td>  
            </tr>
            <tr>
              <td><img class="img-fluid" src="img/injection.ico"> Cured</td>
              <td>${country.covidData.yesterday.recovered}</td>
              <td>${country.covidData.total.recovered}</td>     
            </tr>
            <tr>
              <td><img class="img-fluid" src="img/active.ico"> Active</td>
              <td>${country.covidData.yesterday.active}</td>
              <td>${country.covidData.total.active}</td>
            </tr>
          </tbody>
          </table>
`;
  
}

const hdiDataTableUpdate = function() {
  $('#tableCol')[0].innerHTML = `
        <table class="table  table-sm table-striped table-hover table-info leaflet-control" id="hdiTable">
          <thead>
            <tr>
              <th colspan="3"><img class="img-fluid" id="flagImg" src="${country.flagPath}"> ${country.name} Life Quality</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><img class="img-fluid" src="img/hdiValue.ico"></td>
              <td>HDI value</td>
              <td>${country.humanDevelopmentData.hdiValue}</td>     
            </tr>
            <tr>
              <td><img class="img-fluid" src="img/ladder.ico"></td>
              <td>HDI rank</td>
              <td>${country.humanDevelopmentData.hdiRank}</td>     
            </tr>
            <tr>
              <td><img class="img-fluid" src="img/gniCapita.ico"></td>
              <td>GNI/capita (USD)</td>
              <td>${country.humanDevelopmentData.gniPerCapita}</td>     
            </tr>
            <tr>
              <td><img class="img-fluid" src="img/jobs.ico"></td>
              <td>Unemployment</td>
              <td>${country.humanDevelopmentData.totalUnemploymentRate}%</td>     
            </tr>
            <tr>
              <td><img class="img-fluid" src="img/life.ico"></td>
              <td>Life Expctancy</td>
              <td>${country.humanDevelopmentData.lifeExpectancyAtBirth}</td>     
            </tr>
          </tbody>
          </table>
`;
}
//INFORMATION TABLE FUNCTIONS END:


//EVENT HANDLERS BEGIN

//function to remove double click event propagation from buttons (to stop the doubleclick zoom on these elements):
const removeEventPropagation = function(elementList, e) {
  elementList.forEach(element => {
    element.on(e, function() {
      event.stopPropagation();
    });
  });
}
removeEventPropagation([$("#countrySelection"), $('#myLocationBtn'), $('#infoBtn'), $('#covidBtn'), $('#HDIBtn'), $('#weatherBtn')], 'dblclick');

//adding an event listener to the click event at the country selection box to stop propagation of map click events:
removeEventPropagation([$('#countrySelection')], 'click');

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

//adding event listener to infoBtn:
$('#infoBtn').click(function() { 
  if (infoTableStatus != "general data") {
    generalDataTableUpdate();
    infoTableStatus = "general data";
    $('#tableCol').show();
    //avoiding bubling events on elements:
  removeEventPropagation([$('#countryWikiBtn'), $('#infoTable')], 'click');
  } else {
    $('#tableCol').toggle();
  }
  event.stopPropagation();
});

//adding an event listener to the covidBtn:
$('#covidBtn').click(function() {
  if (infoTableStatus != "covid data") {
    covidDataTableUpdate();
    infoTableStatus = "covid data";
    $('#tableCol').show();
    removeEventPropagation([$('#covidTable')], 'click');
  } else {
    $('#tableCol').toggle();
  }
  event.stopPropagation();
});

//adding an event listener to the HDI btn:
$('#HDIBtn').click(function() {
  if (infoTableStatus != "hdi data") {
    hdiDataTableUpdate();
    infoTableStatus = "hdi data";
    $('#tableCol').show();
    removeEventPropagation([$('#hdiTable')], 'click');
  } else {
    $('#tableCol').toggle();
  }
  event.stopPropagation();
});

//adding an event listener to the weather Btn:
$('#weatherBtn').click(function() {
  if (!weatherBtnStatus) {
  wikiCluster.clearLayers();
  ajaxGeonameIdChildren(country.geonameId);
  weatherBtnStatus = true;
  }
  event.stopPropagation();
});

 
//defining onMap click event to get weather and address data from the click:
const onMapClick = function(e) {
  //ajaxOpenWeather(e.latlng.lat, e.latlng.lng);
  ajaxOpenCageReverse(e.latlng.lat, e.latlng.lng);
  setTimeout(function() {
    if (clickISO3 != country.code.iso3) {
    ajaxCountryBorders(clickISO3);
    }
  }, 600);
  weatherBtnStatus = false;
 }
worldMap.on('click', onMapClick);
//defining onPopupOpen event function to center the map using the popup container:
const onPopupOpen = function(e) {
  var px = worldMap.project(e.target._popup._latlng); // find the pixel location on the map where the popup anchor is
    px.y -= e.target._popup._container.clientHeight/2; // find the height of the popup container, divide by 2, subtract from the Y axis of marker location
    worldMap.panTo(worldMap.unproject(px),{animate: true}); // pan to new center
}
worldMap.on('popupopen', onPopupOpen);
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
