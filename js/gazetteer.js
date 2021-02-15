//defining global variables:
var geoJsonFeature;
var geoJsonLayer;
var userLat;
var userLng;
var userISO3;
var clickISO3;
var infoTableStatus;
var weatherBtnStatus = false;
var capitalMarker;
var wikiCluster = L.markerClusterGroup();
var weatherCluster;



//country obj that will store data from the selected country:
const country = {};
//weather object that will store data from the current weather and forecast:
const weather = {};
//place object that will store data from the user location or click event on map:
var place = {};
//defining function that will be called at openCageUser and openCageReverse to fill the place object:
/*const placeUpdate = function(openCageResult) {
  var placeData = openCageResult['data'][0];
  place = {};
  place.formatted = placeData['formatted'];
  place.timeZone = placeData['annotations']['timezone']['name'];
  place.components = placeData['components'];
  
  //console.log(place);
}*/

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
      
      //console.log(country);
      //logic to pudate the general data table in case it is the one visible:
      if (infoTableStatus == "general") {
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

//defining the function that will make the calls to the routines that will get weather forecast data from openWeather api:
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



//defining function that will make call to openWeather to get the coords for the country capital, and display a marker on the map with the results also will load a marker for the user location if the user location button is used;
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
      capitalMarker = L.marker([result['data']['lat'], result['data']['lon']], {icon: capitalIcon}).addTo(geoJsonLayer);
      capitalMarker.bindPopup(`${country.capital}`);
      
      if (userISO3 == country.code.iso3) {
        let userMarker = L.marker([userLat, userLng]).addTo(geoJsonLayer);
        userMarker.bindPopup('You');
      }
    },
    error: function(error) {
      console.log(error);
    }
  });
}

//defining the function that will make the ajax request to covid19 API to get information about covid from the country using isocode 3:
const ajaxCovid19 = function(iso3) {
  $.ajax({
    url: './php/covidTest.php',
    type: 'GET',
    dataType: 'json',
    data: {countryCode: iso3},
    success: function(result) {
      //console.log(result);
      country.covidData = {};
      
      
      if (result['data'] && result['data'].length > 0) {
      var latestData = result['data'][result['data'].length - 1];
      var subtractionData = result['data'][result['data'].length - 2];
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
      if (infoTableStatus == "covid") {
        covidDataTableUpdate();
      }
    },
    error: function(error) {
      //console.log(error);
      alert('Covid data not available for this country at the moment');
      country.covidData = {};
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
      if (infoTableStatus == "hdi") {
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
          //placeUpdate(result);
          
          if (clickISO3 && clickISO3 != country.code.iso3) {
            $('#countrySelection').val(clickISO3);
            $('#countrySelection').change();
            weatherBtnStatus = false;
            }
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
          $('#countrySelection').val(userISO3);
          $('#countrySelection').change();
          //ajaxOpenWeather(userLat, userLng);
          //updating the place object with data from the php routines and binding the popup with the user place data:
          //placeUpdate(result);
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
            country.boundingBox = {north: geoname['north'], south: geoname['south'], east: geoname['east'], west: geoname['west']};
            
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
            geoJsonLayer.removeLayer(wikiCluster);
            weatherCluster = L.markerClusterGroup();
            result['data'].forEach(geoname => {
              
              ajaxOpenWeatherMap(geoname.lat, geoname.lng, geoname.name);
              });
            
            worldMap.fitBounds(geoJsonLayer.getBounds());
            
          },
          error: function(error) {
            console.log(error);
          }
        });
}

//defining function that will call the php routine to get weather from openWeather to fill the weather map with info:
const ajaxOpenWeatherMap = function(lat, lon, name) {
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
  
          var weatherData = result['data'];
          
          var weatherIcon = new L.DivIcon({
                className: 'weatherDivIcon',
                html: `<figure>
                        <img class="weatherIconImg leaflet-control" src='https://openweathermap.org/img/w/${weatherData.current.weather[0].icon}.png'>
                        <figcaption>${weatherData.current.temp}°C</figcaption>  
                      </figure>
                      `
            });
          let marker = L.marker([lat, lon], {icon: weatherIcon});
          
          removeEventPropagation([marker], 'dblclick');
          marker.on('click', function() {
            if (infoTableStatus != 'weather') {
              weatherTableUpdate(weatherData, name);
                $('#tableCol').show();
                $('#weatherTable').show();
                $('#covidTable').hide();
                $('#hdiTable').hide();
                $('#infoTable').hide();
                infoTableStatus = 'weather';
            } else {
              if ($('#weatherNameTxt').html() != `${name} Weather Forecast`) {
                weatherTableUpdate(weatherData, name);
                $('#tableCol').show();
                $('#weatherTable').show();
                $('#covidTable').hide();
                $('#hdiTable').hide();
                $('#infoTable').hide();
                infoTableStatus = 'weather';
                removeEventPropagation([$('#weatherTable')], 'click');
                removeEventPropagation([$('#weatherTable')], 'dblclick');

              } else {
                $('#weatherTable').hide();
                $('#tableCol').hide;
                $('#weatherNameTxt').html('');
                infoTableStatus = '';
              }
            }
              
            event.stopPropagation();
          });
          
          marker.addTo(weatherCluster);
          weatherCluster.addTo(geoJsonLayer);
          
      },
        error: function(error) {
          console.log(error);
        }
      });
}


//function to get the image of the wikipedia marker:
const ajaxWikipediaImage = function(geoname) {
    $.ajax({
          url: './php/wikipediaImage.php',
          type: 'POST',
          dataType: 'json',
          data: {title: encodeURIComponent(geoname.title)},
          success: function(result) {
            //console.log(result);
            var wikiIcon = L.icon({
                    iconUrl: `img/wikiFeatures/${geoname.feature}.ico`,
                    iconSize: [30, 30],
                    iconAnchor: [15, 0]
                  });
              let marker = L.marker([geoname.lat, geoname.lng], {icon: wikiIcon});
              var pipRes = leafletPip.pointInLayer(marker.getLatLng(), geoJsonLayer);
              if (pipRes.length) {
                  var imageHTML = '';
                  var imageUrl;
                  if (result.data) {
                    var pages = result.data.query.pages;
                    var page0 = pages[Object.keys(pages)[0]];
                    if (page0.thumbnail) {
                      imageUrl = page0.thumbnail.source;
                      }
                 }
                  
                if (imageUrl) {
                    imageHTML = `<br><img class="img-fluid" id="wikiImg" src="${imageUrl}">`;
                    }
                  var popupContent = `<div id="wikiPopupDiv">
                                        <p>${geoname.summary}<a id="wikiAnchor" href="https://${geoname.wikipediaUrl}" target='_blank'>read more</a>${imageHTML}</p>
                                      </div>`;
                var wikiPopup = L.popup().setContent(popupContent);
                
                  
                  marker.addTo(wikiCluster);
                  marker.bindPopup(wikiPopup);
                  removeEventPropagation([$(marker)], 'dblclick');
                  }  
            
          },
          error: function(error) {
            console.log(error);
          }
        });
  
  
}
//defining function that will call the php routine wich will retrieve wikipedia articles to the marker clicked:
const ajaxGeonameWikipedia = function(boundingBox) {
  $.ajax({
          url: './php/geonameWikipedia.php',
          type: 'POST',
          dataType: 'json',
          data: {boundingBox: boundingBox},
          success: function(result) {
            //console.log(result);
            
            result['data'].forEach(geoname => {
              ajaxWikipediaImage(geoname);
              /*var wikiIcon = L.icon({
                    iconUrl: `img/wikiFeatures/${geoname.feature}.ico`,
                    iconSize: [30, 30],
                    iconAnchor: [15, 0]
                  });
              let marker = L.marker([geoname.lat, geoname.lng], {icon: wikiIcon});
              var pipRes = leafletPip.pointInLayer(marker.getLatLng(), geoJsonLayer);
              if (pipRes.length) {
                  var imageHTML = '';
                  ajaxWikipediaImage(geoname, marker);
                if (geoname.thumbnailImg) {
                    imageHTML = `<br><img id="wikiImg" src="${geoname.thumbnailImg}">`;
                    }
                  var popupContent = `<div id="wikiPopupDiv">
                                        <p>${geoname.summary}<a id="wikiAnchor" href="https://${geoname.wikipediaUrl}" target='_blank'>read more</a>${imageHTML}</p>
                                      </div>`;
                var wikiPopup = L.popup().setContent(popupContent);
                
                  
                  marker.addTo(wikiCluster);
                  marker.bindPopup(wikiPopup);
                  removeEventPropagation([$(marker)], 'dblclick');
                  } */ 
               });
            wikiCluster.addTo(geoJsonLayer);
            
            
          },
          error: function(error) {
            //console.log(error.responseText);
            alert('There was an error trying to retrieve data for this country... Please try again by clicking on the country');
            country.code = {};
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
            if (geoJsonLayer) {
              geoJsonLayer.clearLayers();
              wikiCluster.clearLayers();
            }
            if (weatherCluster) {
              weatherCluster.clearLayers();
              weatherCluster = 0;
            }
            
            
            //console.log(result);
            geoJsonFeature = result;
            let isoCode = result['properties']['iso_a3'];
            country.name = result['properties']['name'];
            
            
            
            var myStyle = {"color": "#2D5EF9", "weight": 4, "opacity": 0.5};
            geoJsonLayer = L.geoJSON(geoJsonFeature, {style: myStyle}).addTo(worldMap);
            worldMap.fitBounds(geoJsonLayer.getBounds());
            
            /*country.boundingBox = {
              north: geoJsonLayer.getBounds().getNorth(),
              south: geoJsonLayer.getBounds().getSouth(),
              east: geoJsonLayer.getBounds().getEast(),
              west: geoJsonLayer.getBounds().getWest()
            }*/
            
            
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
  $('#infoNameTxt').html(` ${country.name}`);
  $('#infoFlagImg').attr('src', country.flagPath);
  $('#countryWikiBtn').attr('href', `https://en.wikipedia.org/wiki/${country.fullName.replace(' ', '_')}`);
  $('#capitalTxt').html(country.capital);
  $('#populationTxt').html(country.population);
  $('#currencyTxt').html(`${country.currency.name} (${country.currency.code})`);
  $('#currencyExchangeTxt').html(`1 USD = ${country.currency.exchangeUSD} ${country.currency.code}`);
  $('#unionTxt').html(country.regionalBlock.name);
  $('#callingCodeTxt').html(`+${country.callingCode}`);
  
  country.languages.forEach(language => {
    $('#languagesTxt')[0].insertAdjacentHTML('beforeend', language.name + ", ");
    });
}

const covidDataTableUpdate = function() {
  $('#covidNameTxt').html(` ${country.name} Covid Statistics`);
  $('#covidFlagImg').attr('src', country.flagPath);
  $('#yesterdayConfirmed').html(country.covidData.yesterday.confirmed);
  $('#totalConfirmed').html(country.covidData.total.confirmed);
  $('#yesterdayDeaths').html(country.covidData.yesterday.deaths);
  $('#totalDeaths').html(country.covidData.total.deaths);
  $('#yesterdayRecovered').html(country.covidData.yesterday.recovered);
  $('#totalRecovered').html(country.covidData.total.recovered);
  $('#yesterdayActive').html(country.covidData.yesterday.active);
  $('#totalActive').html(country.covidData.total.active);
}

const hdiDataTableUpdate = function() {
  $('#hdiNameTxt').html(` ${country.name} Life Quality`);
  $('#hdiFlagImg').attr('src', country.flagPath);
  $('#hdiValueTxt').html(country.humanDevelopmentData.hdiValue);
  $('#hdiRankTxt').html(country.humanDevelopmentData.hdiRank);
  $('#gniTxt').html(country.humanDevelopmentData.gniPerCapita);
  $('#unemploymentTxt').html(country.humanDevelopmentData.totalUnemploymentRate + '%');
  $('#lifeExpctancyTxt').html(country.humanDevelopmentData.lifeExpectancyAtBirth);
}

const weatherTableUpdate = function(weatherData, place) {
  var weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var daysMs = [];
  var icons = [];
  var humidities = [];
  var windSpeeds = [];
  var minTemps = [];
  var maxTemps = [];
  for (var i=0; i<weatherData.daily.length; i++) {
    daysMs[i] = new Date(weatherData.daily[i].dt * 1000);
    icons[i] = weatherData.daily[i].weather[0].icon;
    humidities[i] = weatherData.daily[i].humidity;
    windSpeeds[i] = (weatherData.daily[i].wind_speed*3.6).toFixed(1);
    minTemps[i] = weatherData.daily[i].temp.min;
    maxTemps[i] = weatherData.daily[i].temp.max;
  }
  
  $('#weatherNameTxt').html(`${place} Weather Forecast`);
  
  $('#day0Txt').html(weekDays[daysMs[0].getDay()]);
  $('#day0Icon').attr('src', `https://openweathermap.org/img/w/${icons[0]}.png`);
  $('#day0TempTxt').html(`${minTemps[0]}°C <span style="color:grey">/</span> ${maxTemps[0]}°C`);
  $('#day0HumidityTxt').html(humidities[0] + '%');
  $('#day0WindSpeedTxt').html(windSpeeds[0] + 'km/h');
  
  $('#day1Txt').html(weekDays[daysMs[1].getDay()]);
  $('#day1Icon').attr('src', `https://openweathermap.org/img/w/${icons[1]}.png`);
  $('#day1TempTxt').html(`${minTemps[1]}°C <span style="color:grey">/</span> ${maxTemps[1]}°C`);
  $('#day1HumidityTxt').html(humidities[1] + '%');
  $('#day1WindSpeedTxt').html(windSpeeds[1] + 'km/h');
  
  $('#day2Txt').html(weekDays[daysMs[2].getDay()]);
  $('#day2Icon').attr('src', `https://openweathermap.org/img/w/${icons[2]}.png`);
  $('#day2TempTxt').html(`${minTemps[2]}°C <span style="color:grey">/</span> ${maxTemps[2]}°C`);
  $('#day2HumidityTxt').html(humidities[2] + '%');
  $('#day2WindSpeedTxt').html(windSpeeds[2] + 'km/h');
  
  $('#day3Txt').html(weekDays[daysMs[3].getDay()]);
  $('#day3Icon').attr('src', `https://openweathermap.org/img/w/${icons[3]}.png`);
  $('#day3TempTxt').html(`${minTemps[3]}°C <span style="color:grey">/</span> ${maxTemps[3]}°C`);
  $('#day3HumidityTxt').html(humidities[3] + '%');
  $('#day3WindSpeedTxt').html(windSpeeds[3] + 'km/h');
  
  $('#day4Txt').html(weekDays[daysMs[4].getDay()]);
  $('#day4Icon').attr('src', `https://openweathermap.org/img/w/${icons[4]}.png`);
  $('#day4TempTxt').html(`${minTemps[4]}°C <span style="color:grey">/</span> ${maxTemps[4]}°C`);
  $('#day4HumidityTxt').html(humidities[4] + '%');
  $('#day4WindSpeedTxt').html(windSpeeds[4] + 'km/h');
  
  $('#day5Txt').html(weekDays[daysMs[5].getDay()]);
  $('#day5Icon').attr('src', `https://openweathermap.org/img/w/${icons[5]}.png`);
  $('#day5TempTxt').html(`${minTemps[5]}°C <span style="color:grey">/</span> ${maxTemps[5]}°C`);
  $('#day5HumidityTxt').html(humidities[5] + '%');
  $('#day5WindSpeedTxt').html(windSpeeds[5] + 'km/h');
  
  $('#day6Txt').html(weekDays[daysMs[6].getDay()]);
  $('#day6Icon').attr('src', `https://openweathermap.org/img/w/${icons[6]}.png`);
  $('#day6TempTxt').html(`${minTemps[6]}°C <span style="color:grey">/</span> ${maxTemps[6]}°C`);
  $('#day6HumidityTxt').html(humidities[6] + '%');
  $('#day6WindSpeedTxt').html(windSpeeds[6] + 'km/h');
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
    $('#countrySelection').val(userISO3);
    $('#countrySelection').change();
  } else {
    alert('Already showing information about the country you are currently in!');
  }
  event.stopPropagation();
});

//adding event listener to infoBtn:
$('#infoBtn').click(function() { 
  if (infoTableStatus != "general") {
    generalDataTableUpdate();
    infoTableStatus = "general";
    $('#covidTable').hide();
    $('#hdiTable').hide();
    $('#weatherTable').hide();
    $('#infoTable').show();
    $('#tableCol').show();
    //avoiding bubling events on elements:
  removeEventPropagation([$('#countryWikiBtn'), $('#infoTable')], 'click');
  removeEventPropagation([$('#countryWikiBtn'), $('#infoTable')], 'dblclick');
  } else {
    $('#tableCol').toggle();
  }
  event.stopPropagation();
});

//adding an event listener to the covidBtn:
$('#covidBtn').click(function() {
  if (infoTableStatus != "covid") {
    covidDataTableUpdate();
    infoTableStatus = "covid";
    $('#infoTable').hide();
    $('#hdiTable').hide();
    $('#weatherTable').hide();
    $('#tableCol').show();
    $('#covidTable').show();
    removeEventPropagation([$('#covidTable')], 'click');
    removeEventPropagation([$('#covidTable')], 'dblclick')
  } else {
    $('#tableCol').toggle();
  }
  event.stopPropagation();
});

//adding an event listener to the HDI btn:
$('#HDIBtn').click(function() {
  if (infoTableStatus != "hdi") {
    hdiDataTableUpdate();
    infoTableStatus = "hdi";
    $('#infoTable').hide();
    $('#covidTable').hide();
    $('#weatherTable').hide();
    $('#hdiTable').show();
    $('#tableCol').show();
    removeEventPropagation([$('#hdiTable')], 'click');
    removeEventPropagation([$('#hdiTable')], 'dblclick');
  } else {
    $('#tableCol').toggle();
  }
  event.stopPropagation();
});

//adding an event listener to the weather Btn:
$('#weatherBtn').click(function() {
  
  $('#tableCol').hide();
  if (!weatherBtnStatus) {
    if(!weatherCluster) {
      ajaxGeonameIdChildren(country.geonameId);
    } else {
      geoJsonLayer.removeLayer(wikiCluster);
      weatherCluster.addTo(geoJsonLayer);
    }
    geoJsonLayer.removeLayer(capitalMarker);
    weatherBtnStatus = true;
  } else {
      if (infoTableStatus != 'weather') {
        geoJsonLayer.removeLayer(weatherCluster);
        wikiCluster.addTo(geoJsonLayer);
        capitalMarker.addTo(geoJsonLayer);
        $('#weatherNameTxt').html('');
        weatherBtnStatus = false;
      } else {
        infoTableStatus = '';
        
      }
    
  }
  event.stopPropagation();
});

 
//defining onMap click event to get weather and address data from the click:
const onMapClick = function(e) {
  ajaxOpenCageReverse(e.latlng.lat, e.latlng.lng);
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



