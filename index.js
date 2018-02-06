'use strict'

var map, infoWindow, marker;

function getEVStations(latitude, longitude) {

	var stationServiceUrl = 'http://developer.nrel.gov/api/alt-fuel-stations/v1/';
	var fuelType = 'ELEC';
	var access = 'public'; 
	var status = 'E';
	var urlString = `${stationServiceUrl}nearest.json?api_key=${NREL_API_KEY}&latitude=${latitude}&longitude=${longitude}&fuel_type=${fuelType}&access=${access}&status=${status}`;
	
	$.getJSON(urlString,function(json){    
	    var fuel_stations = json.fuel_stations;
	    var str = "";
	    $.each(fuel_stations, function(index, station) {
	      str += `lat: ${station.latitude}, long: ${station.longitude};    
	      				<b><u>Name:</u> ${station.station_name}</b>;        
	      				<b><u>Address:</u> ${station.street_address}, ${station.city}, ${station.state} ${station.zip}</b>
	      				<br>`;
	    });

	    $('#results').html(str);
	});  
}

// Initialize app with geolocation
function initMap() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(position) {
      var pos = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      map = new google.maps.Map(document.getElementById('map'), {
			  zoom: 13,
			  center: pos
			});

      marker = new google.maps.Marker({
		    position: pos,
		    map: map
  		});

      infoWindow = new google.maps.InfoWindow;

      infoWindow.setContent('You are here');
      infoWindow.open(map, marker);
      map.setCenter(pos);

			getEVStations(pos.lat, pos.lng);

    }, function() {
      handleLocationError(true, infoWindow, map.getCenter());
    });
  } else {
    // Browser doesn't support Geolocation
    handleLocationError(false, infoWindow, map.getCenter());
  }
}

function handleLocationError(browserHasGeolocation, infoWindow, pos) {
  infoWindow.setPosition(pos);
  infoWindow.setContent(browserHasGeolocation ?
                        'Error: The Geolocation service failed.' :
                        'Error: Your browser doesn\'t support geolocation.');
  infoWindow.open(map);
}

function searchAddress() {
	map = new google.maps.Map(document.getElementById('map'), {
	  zoom: 15
	});

	var geocoder = new google.maps.Geocoder();
	geocodeAddress(geocoder, map);
}

function geocodeAddress(geocoder, resultsMap) {
  var address = document.getElementById('address').value;

  geocoder.geocode({'address': address}, function(results, status) {
    if (status === 'OK') {
    	var pos = results[0].geometry.location;

    	infoWindow = new google.maps.InfoWindow;

      resultsMap.setCenter(pos);

      marker = new google.maps.Marker({
        map: resultsMap,
        position: pos
      });

      infoWindow.setContent(results[0].formatted_address);
      infoWindow.open(map, marker);

      getEVStations(pos.lat(), pos.lng());
    } else {
      alert('Geocode was not successful for the following reason: ' + status);
    }
  });
}

// Open Side Navbar menu
function openNav() {
  $("#mySidenav")[0].style.width = "250px";
  $("#main")[0].style.marginLeft = "250px";
  $("#main")[0].style.width = "calc(100% - 250px)";
}

// Close Side Navbar menu
function closeNav() {
  $("#mySidenav")[0].style.width = "0";
  $("#main")[0].style.marginLeft= "0";
  $("#main")[0].style.width = "100%";
}

$(document).ready(function() {

	const URL = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&callback=initMap`;
	let scriptNode = $('<script></script>').attr('src', URL);
	
	scriptNode.attr('async', 'async');
	scriptNode.attr('defer', 'defer');
	$('body').append(scriptNode);

	// show and hide divs accordion style
	var links = $('.sidebar-links > div');

  links.on('click', function () {
		links.removeClass('selected');
		$(this).addClass('selected');
	});

  // to capture 'enter' or 'return' keystroke and force submit button
  $("#address").bind("keydown", function(event) {
    // track enter key
    var keycode = (event.keyCode ? event.keyCode : (event.which ? event.which : event.charCode));
    if (keycode === 13) { // keycode for enter key
      // force the 'Enter Key' to implicitly click the submit button
      document.getElementById('submit').click();
    }
  }); 

});