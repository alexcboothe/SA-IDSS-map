function idssMap() {

	// Las Vegas Default Map Display
	var lon = parseFloat(getUrlParam("lon", -115.14));
	var lat = parseFloat(getUrlParam("lat", 36.17));
	var zoom = parseInt(getUrlParam("zoom", 8));
	var fixMap = getUrlParam("fixed", "false");
	var basemap = getUrlParam("basemap", "NiceGray")

	// Basemapping
	var mapquestOSM = L.tileLayer("http://{s}.tiles.mapbox.com/v3/am3081.h0po4e8k/{z}/{x}/{y}.png");
	var Stadia_AlidadeSmoothDark = L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}.png', {
		maxZoom: 10,
		attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors'
	});
	var basemapSet;
	(basemap == "NiceGray") ? basemapSet =  mapquestOSM : basemapSet = L.esri.basemapLayer(basemap)

	// Set Map
	map = L.map("map", {
		center: [lat,lon],
		zoom: zoom,
        minZoom: 4,
        maxZoom: 14,
		layers: basemapSet,
		zoomControl: false,
	});

	// Add basemap labels
	if (basemap == "DarkGray" || basemap == "Gray" || basemap == "Terrain" || basemap == "ShadedRelief" || basemap == "Imagery" || basemap == "Oceans") {L.esri.basemapLayer(basemap+"Labels").addTo(map);} else { console.log("Basemap has no labels");}

	// Add variable to fix map in place (must be added to url: fixMap=true&
	(fixMap == "true") ? map.dragging.disable() : map.dragging.enable();
	

	/*
	   Radar mapping and related functions 
	*/
	
	// Add Date Control
	var info = L.control();
	info.onAdd = function (map) {
		this._div = L.DomUtil.create('div', 'info');
		this.update();
		return this._div;
	};
	
	// Valid Time Preparation
	let getRoundedDate = (minutes, d=new Date()) => {
		let ms = 1000 * 60 * minutes; // convert minutes to ms
		let roundedDate = new Date(Math.round(d.getTime() / ms) * ms);

		return roundedDate
	}
	
	// Format date & time
	function formatDate(date) {
		// Month dic
		var monthNames = [
				"Jan", "Feb", "Mar",
				"Apr", "May", "Jun",
				"Jul", "Aug", "Sep",
				"Oct", "Nov", "Dec"
		];
		
		// Extract date time vals
		var day = date.getDate();
		var monthIndex = date.getMonth();
		var year = date.getFullYear();
		var hour = date.getHours();
		var min  = date.getMinutes();
		
		// padding with zero
		if (min < 10) min = '0' + min;
		if (hour >= 12) {
			(hour == 24) ? ampm = 'am' : ampm = 'pm';
			(hour == 12) ? hour = hour : hour = hour-12;
		} else {
			ampm = 'am';
		}
		
		// return formatted time
		return hour + ':' + min + ' ' + ampm + '  ' + monthNames[monthIndex] + '. ' + day + ', ' + year;
	}
	
	// Radar valid time function
	info.update = function (time) {
		var nowDate  = getRoundedDate(5, new Date());
		var vDate = new Date();
		vDate.setMinutes(nowDate.getMinutes()-5);

		for (var j = 0; j < 10; j++) {
			
			// Set valid time
			var validTime = new Date();
			validTime.setMinutes(vDate.getMinutes()-((time-9)*-5));
			
			// Insert Valid Time
			if (time < 9 ) this._div.innerHTML = "Valid Time:" + formatDate(validTime);
			if (time == 9) this._div.innerHTML = "Current Composite Radar Mosaic";
		}
	};
	
	// Add timestep indicator to map
	info.addTo(map);
	console.log("Valid times loaded");

	// Add radar layers to array for loop
	var radarLayers = [];
	for(var hour = 0; hour <= 10; hour++){
		time = (50)-(hour*5);
		// Past radar images (differnt layer identifier)
		if (hour < 10) {
			var layer = 'nexrad-n0r-900913-m'+time+'m';
			radarLayers[hour] = L.tileLayer.wms("http://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0r.cgi", {
				layers: layer,
				format: 'image/png',
				transparent: true,
				opacity: 0.0,
			});
            radarLayers[hour].addTo(map);
		}
		// Latest Radar Image
		if (time == 0) {
			var layer = 'nexrad-n0r-900913';
			radarLayers[hour] = L.tileLayer.wms("http://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0r.cgi", {
				layers: layer,
				format: 'image/png',
				transparent: true,
				opacity: 0.0,
			});
			radarLayers[hour].addTo(map);
		}
	}

	// Create a radar loop function
	var i = 0;  
	function loop() {
		setTimeout(function () {
			radarLayers.map(function(layer){ layer.setOpacity(0)});
			radarLayers[i].setOpacity(0.5);
			info.update(i);
			
			// Time slider value adjusts to loop 
			$('#timeSlider').val(i);          //  your code here
			// Increment the counter
			i++;           
			//console.log(i);
			// Loop forever
			if (i < 10) { loop(); } else { i = 0; loop(); }
		}, 500)

		return i;
	}
	
	// Start radar loop on page load
	loop();

	// Input time slider (html)
	$('#timeSlider').on('change',function(){
		console.log($(this).val());
		radarLayers.map(function(layer){ layer.setOpacity(0)});
		radarLayers[$(this).val()].setOpacity(0.5);
	});
	
	
	/*
	  Additional mapping features
	*/

	// Add zoom control button
	map.addControl(new L.Control.ZoomMin());

	// Add GeoSearch
	new L.Control.GeoSearch({
		provider: new L.GeoSearch.Provider.Esri()
	}).addTo(map);

	//// Add Locate user
	map.addControl(L.control.locate({
		locateOptions: {
            maxZoom: 10
		}
	}));

	// Call DSS point overlay on page load
	getActiveDss();

} //End Radar Function

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


/*////////////////////////////////////////
// Functions to grab active DSS points
////////////////////////////////////////*/

function getActiveDss() {
  $.ajax({url: "activeDSSpoints.csv",
	success: function(result){

	// create custom icon
    var customIcon = L.icon({
        iconUrl: 'https://www.weather.gov/images/vef/icons/infoRed.png',
        iconSize: [30, 30], // size of the icon
        });

	var data = [];
	data = result.split('\n');

	// Handle point itteration
	var radius = 16100; // Range ring radius...in meters
	var i,j,k;
	for (i=1; i<data.length; i++) {
		var bits = data[i].split(",");
		L.marker([bits[0],bits[1]], {icon : customIcon})
				.addTo(map)
				.bindPopup("<span style='font-size:18px;color:#059efc;'><b>" + bits[2] + "</b></span>" +
									 "<table>" +
									 "<tr><td style='width:27%;font-size:13px;'><br><em><b> Duration: </b></em></td>"  + "<td style='padding-top:20px;'>" + bits[3] + "</td></tr>" +
									 "<tr><td style='width:27%;font-size:13px;'><br><em><b> POC: </b></em></td>"       + "<td style='padding-top:20px;'>" + bits[4] + "</td></tr>" +
									 "<tr><td style='width:27%;font-size:13px;'><br><em><b> Concerns: </b></em></td>"  + "<td style='padding-top:20px;'>" + bits[5] + "</td></tr>" +
									 "</table>");
		// Log event info
		console.log(bits);
		
		// Create range ring
		var latlng = L.latLng(bits[0], bits[1]);
		L.circle(latlng, radius, {color: 'red', fillOpacity: 0.05})
				.addTo(map);
		
    }
  }
  });
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////



/*////////////////////////////////////////
// Functions to parse URL vars.
////////////////////////////////////////*/
	function getUrlVars() {
		var vars = {};
		var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
			vars[key] = value;
		});
		return vars;
	}


	function getUrlParam(parameter, defaultvalue){
		var urlparameter = defaultvalue;
		if(window.location.href.indexOf(parameter) > -1){
			urlparameter = getUrlVars()[parameter];
			}
		return urlparameter;
	}