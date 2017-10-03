function session_new() {
    // Initialize server
    $.ajax({ url: "session",
        async: false,
        dataType: 'json',
        success: function(data, status) {
            enmodal.session_id = data["private_key"];
            window.history.pushState("", "", "?id="+enmodal.session_id);
            enmodal.sharing.update(data["public_key"], data["private_key"]);
        }
    });
        
    // Initialize service
    var service = new Service("MTA");
    service.mode = "heavy_rail";
    enmodal.transit_map.add_service(service);
    enmodal.transit_interface.active_service = service;
    enmodal.sidebar.update_service_selector(enmodal.transit_interface.active_service.sid);
    enmodal.sidebar.refresh_service_editor();
    var params = $.param({
        i: enmodal.session_id,
        service_id: service.sid,
        name: service.name
    });
    $.ajax({ url: "service_add?"+params,
        async: false,
        dataType: 'json',
        success: function(data, status) {
        }
    });
}

function session_load() {
    // Initialize session and map
    var params = $.param({
        i: enmodal.session_id
    });
    $.ajax({ url: "session_load?"+params,
        async: false,
        success: function(data, status) {
            
            //console.log(data);
            var j = JSON.parse(data);
            //console.log(j);
            if (j["error"] != undefined) {
                session_new();
            } else {
                var jdata = JSON.parse(j.data);
                console.log(jdata);
                enmodal.session_id = j.private_key;
                window.history.pushState("", "", "?id="+enmodal.session_id);
                enmodal.sharing.update(j.public_key, j.private_key);
                
                enmodal.transit_map.sid = jdata.sid;
                enmodal.transit_map.from_json(jdata);

                enmodal.transit_interface.active_service = enmodal.transit_map.primary_service();
                enmodal.transit_interface.active_line = enmodal.transit_map.primary_service().lines[0];
                enmodal.sidebar.update_service_selector(enmodal.transit_interface.active_service.sid, true);
                enmodal.sidebar.refresh_service_editor();
                enmodal.sidebar.update_line_selector(enmodal.transit_interface.active_line.sid);
                enmodal.sidebar.update_line_editor();
                enmodal.sidebar.refresh_line_editor();
                enmodal.sidebar.update_line_diagram();
                
                // Updating service selector is enough to draw the service.
                //enmodal.transit_interface.draw_service(enmodal.transit_interface.active_service, enmodal.transit_interface.layers.active, true, true);

                // use user settings where appropriate
                var user_settings = jdata.settings;
                for (var i = 0; i < user_settings.station_pairs.length; i++) {
                    var sp = user_settings.station_pairs[i];
                    var station_1 = enmodal.transit_map.get_station_by_id(sp.station_ids[0]);
                    var station_2 = enmodal.transit_map.get_station_by_id(sp.station_ids[1]);
                    var sp_real = enmodal.transit_interface.get_station_pair(station_1, station_2);
                    if (sp_real != null) {
                        for (var j = 0; j < sp.pins.length; j++) {
                            sp_real[0].add_pin(sp.pins[j].location[0], sp.pins[j].location[1]);
                        }
                    }
                }
                
                enmodal.transit_interface.draw_transfers();
                //enmodal.transit_interface.map.closePopup();
                var bounds = enmodal.transit_map.geographic_bounds();
                if (bounds != null) enmodal.leaflet_map.fitBounds(bounds);
                enmodal.data.get_ridership();
                $("#starter-city-picker").hide();
                $("#starter").hide();
            }
        }
    });

}

function session_save() {
    var params = $.param({
        i: enmodal.session_id
    });
    $("#tool-save").html('<i class="fa fa-spinner fa-spin fa-1x fa-fw"></i>');
    $.ajax({ url: "session_push?"+params,
        async: true,
        type: "POST",
        data: LZString.compressToUTF16(session_json()),
        dataType: 'text',
        success: function(data, status) {
            var params = $.param({
                i: enmodal.session_id
            });
            $.ajax({ url: "session_save?"+params,
                async: true,
                dataType: 'json',
                success: function(data, status) {
                    if (data["result"] == "OK") {
                        $("#tool-save").html('Save');
                        $("#tool-save").attr('data-balloon', 'Saved!');
                        $("#tool-save").attr('data-balloon-visible','');
                        setTimeout(function() {
                            $("#tool-save").removeAttr('data-balloon');
                            $("#tool-save").removeAttr('data-balloon-visible');
                        }, 3000);
                    } else if (data["message"] == "Anonymous user") {
                        $("#tool-save").html('Save');
                        $("#tool-save").attr('data-balloon', 'You must be logged in to save.');
                        $("#tool-save").attr('data-balloon-visible','');
                        setTimeout(function() {
                            $("#tool-save").removeAttr('data-balloon');
                            $("#tool-save").removeAttr('data-balloon-visible');
                        }, 3000);
                    } else {
                        $("#tool-save").html('Save');
                        $("#tool-save").attr('data-balloon', 'Error saving. Please try again later.');
                        $("#tool-save").attr('data-balloon-visible','');
                        setTimeout(function() {
                            $("#tool-save").removeAttr('data-balloon');
                            $("#tool-save").removeAttr('data-balloon-visible');
                        }, 3000);
                    }
                }
            });
        }
    });
}

function session_json() {
    var ret = {
        "map": enmodal.transit_map,
        "settings": enmodal.transit_interface.settings()
    }
    return JSON.stringify(ret);
}