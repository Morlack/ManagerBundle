/*
 *   Javascript File for the EveMapp Web Application
 *   Made by Mitchell Herrijgers
 *
 *   All Functions except library functions are found here.
 *
 */

/**
 * Global Variables
 */
var map;
var layer;
var extent;
var selectedTool;
var selectedSubTool;
var selectedMarker;
var takenIds = [];
var previousZoom;
var heatMapLayer;
var heatMapMarker;
var eventStartDate;
var eventEndDate;
var oZoom;

setOverlay('loading', true, "Loading the map..");
/**
 * Code which needs Dojo/Esri Arcgis SDK
 */

require([
    "esri/map",
    "esri/graphic",
    "esri/symbols/SimpleMarkerSymbol",
    "esri/symbols/PictureMarkerSymbol",
    "esri/layers/GraphicsLayer",
    "esri/geometry/Point",
    "dojo/domReady!"
], function (Map, Graphic, SimpleMarkerSymbol, PictureMarkerSymbol, GraphicsLayer, Point) {

    // Create the map
    map = new Map("map", {
        basemap: "streets"
    });


    /**
     * Map load function.
     */
    map.on("load", function () {
        loadMapData();
        createTooltips();
        setEventHandlers();
        setOverlay('loading', false);
    });

    /**
     * Retrieves all map info and applies it to the application.
     */
    function loadMapData() {
        layer = new GraphicsLayer();

        $.ajax({
            url: "/editor/load",
            dataType: 'json',
            // Disable async for zooming problems
            async: false,

            // On error, display the error overlay
            error: function (xhr) {
                setOverlay('error', true, xhr.responseText);
            },

            // On success load and apply all data
            success: function (data) {
                // Set previous zoom to 19. All objects are saved to database with this level for size.
                previousZoom = 19;

                // Set the map's extent
                map.setExtent(new esri.geometry.Extent(data.bounds));

                // Calculate Event center coordinates
                var x = data.bounds.xmin + (data.bounds.xmax - data.bounds.xmin) / 2;
                var y = data.bounds.ymin + (data.bounds.ymax - data.bounds.ymin) / 2;

                // Set event dates
                eventStartDate = new Date(data.dates.start.date);
                eventEndDate = new Date(data.dates.end.date);

                // Initialize the heat map layer
                heatMapLayer = new GraphicsLayer();
                heatMapMarker = new Graphic(esri.geometry.geographicToWebMercator(new Point(x, y)),
                    new PictureMarkerSymbol('http://web.insidion.com/heatmap/get/-1/' + data.bounds.zoom + '/1/' + eventStartDate.getHours() + '/' + (eventEndDate.getMinutes() + 5), resizeByScale(650, 19, data.bounds.zoom), resizeByScale(400, 19, data.bounds.zoom)));
                heatMapLayer.add(heatMapMarker);
                map.addLayer(heatMapLayer);
                // Hide the heat map layer, since tool is not selected on load
                heatMapLayer.hide();

                oZoom = data.bounds.zoom;


                // Add graphics to the map
                $.each(data.objects, function (index, value) {
                    // Make the symbol and set its attributes
                    var symbol = new PictureMarkerSymbol(value.image_url, value.width, value.height);
                    symbol.setAngle(value.angle);

                    // Make the graphic and set its attributes
                    var geom = new Point(value.lat, value.lng);
                    var graphic = new Graphic(esri.geometry.geographicToWebMercator(geom), symbol);

                    // Set special Evemapp attributes
                    graphic.eveMappObjectId = value.id;
                    graphic.eveMappObjectType = value.type;
                    graphic.eveMappObjectInfo = {
                        desc: value.desc,
                        entries: value.entries
                    };
                    graphic.eveMappTableId = value.table_id;

                    // Add the graphic
                    layer.add(graphic);

                });
                map.addLayer(layer);
            }
        });
    }

    /**
     * INFO TOOL HANDLERS
     *
     * Handles all UI stuff for the info tool, such as the sliders.
     * @param event
     */
    function infoToolLayerMousedown(event) {
        selectedMarker = event.graphic;

        infoToolInitSliders();
        refreshImages();
        getObjectInformation();
        $("#accordion").show();
    }

    function infoToolInitSliders() {
        // Create the Accordion
        $('#accordion').accordion({
            collapsible: true,
            heightStyle: "content"
        });

        // Set height slider
        $("#slider_height").slider({
            min: 1,
            max: 300,
            value: selectedMarker.symbol.height,
            slide: function (event, ui) {
                selectedMarker.symbol.setHeight(ui.value);
                layer.redraw();
            },
            change: function () {
                saveObject(selectedMarker);
            }
        });

        // Set width slider
        $("#slider_width").slider({
            min: 1,
            max: 300,
            value: selectedMarker.symbol.width,
            slide: function (event, ui) {
                selectedMarker.symbol.setWidth(ui.value);
                layer.redraw();
            },
            change: function () {
                // User stopped sliding, save the object
                saveObject(selectedMarker);
            }
        });

        // Set angle slider
        $("#slider_angle").slider({
            min: 1,
            max: 360,
            value: selectedMarker.symbol.angle,
            slide: function (event, ui) {
                selectedMarker.symbol.setAngle(ui.value);
                layer.redraw();
            },
            change: function () {
                saveObject(selectedMarker);
            }
        });

        // Ajaxify Image upload form
        $('#imageUploadForm').ajaxForm(function () {
            refreshImages();
        });


    }

    /**
     * On mouse move, drag tool is selected and selectedMarker is set, move the marker to the mouse position.
     * @param event
     */
    function dragToolMapMouseMove(event) {
        if (selectedMarker != null) {
            selectedMarker.setGeometry(event.mapPoint);
        }
    }

    /**
     * On mouse down, if drag tool is selected, release or set the marker clicked on as the selectedMarker
     * @param event
     */
    function dragToolLayerMouseDown(event) {
        if (selectedMarker == null) {
            selectedMarker = event.graphic;
        } else {
            saveObject(selectedMarker);
            selectedMarker = null;
        }
    }

    /**
     * DELETE TOOL HANDLERS
     *
     *
     * Deletes an object from the map and sets the undo button.
     * @param event
     */

    function deleteToolLayerMouseDown(event) {
        deleteObject(event.graphic);
    }

    /**
     * MAP EVENT HANDLERS
     */

    /**
     * Triggered on the Map Mouse-Down event
     * Creates a new MapObject
     * @param event
     */
    function createToolMapMouseDown(event) {
        //create needed vars
        var imageUrl = selectedSubTool.children().first().attr('src');
        var symbol = new PictureMarkerSymbol(imageUrl, 24, 24);
        var graphic = new Graphic(event.mapPoint, symbol);

        // set values
        graphic.eveMappObjectId = getAvailableId();
        graphic.eveMappObjectType = selectedSubTool.data('objectType');
        graphic.eveMappTableId = -1;
        graphic.eveMappObjectInfo = {
            desc: "",
            entries: []
        };
        symbol.setAngle(0);

        // Save it to the server to get Table_id
        saveObject(graphic);

        // add to map
        layer.add(graphic);
    }

    /**
     * Sets the selected subtool. This is used in the Create window
     * @param event
     */
    function setSubTool(event) {
        if (selectedSubTool !== null &&
            selectedSubTool.hasClass("activeToolButton")) selectedSubTool.toggleClass("activeToolButton");
        selectedSubTool = $('#' + event.currentTarget.id);
        selectedSubTool.toggleClass("activeToolButton");
    }


    /**
     * Resizes all graphics in the main layer to the new scale.
     */
    function resizeGraphics() {
        // Loop over Graphics of the Layer and scale them
        $.each(layer.graphics, function (index, value) {
            value.symbol.width = resizeByScale(value.symbol.width, map.getZoom(), previousZoom);
            value.symbol.height = resizeByScale(value.symbol.height, map.getZoom(), previousZoom);
        });

        heatMapMarker.symbol.width = resizeByScale(heatMapMarker.symbol.width, map.getZoom(), previousZoom);
        heatMapMarker.symbol.height = resizeByScale(heatMapMarker.symbol.height, map.getZoom(), previousZoom);

        // Also reload sliders
        if (selectedMarker != null) {
            infoToolInitSliders();
        }

        // Redraw the layer and set the previousZoom to the current for the next cycle.
        layer.redraw();
        previousZoom = map.getZoom();

    }

    /**
     * TOOL BUTTON HANDLERS
     */

    /**
     * Fired when a toolButton is clicked.
     * Selects the toolButton and loads the appropriate subTool choices.
     * @param event
     */
    function toolButtonClickHandler(event) {
        if (selectedTool === event.currentTarget.id) return;

        // Make sure the right tools are selected
        selectedSubTool = null;
        selectedMarker = null;
        $("#" + selectedTool).toggleClass("activeToolButton");
        selectedTool = event.currentTarget.id;
        $("#" + selectedTool).toggleClass("activeToolButton");
        // Retrieve subTools with an Ajax request
        $.ajax({
            url: "/editor/subtool/" + selectedTool
        }).done(function (data) {
            if (data == "false") {
                data = "";
            }
            $("#toolWindow").html(data);
            $(".subToolButton").click(function (event) {
                setSubTool(event);

            });

            if (selectedTool == "heatMapToolButton") {
                initHeatMapTool();
            }
            // Set the tooltips again
            createTooltips();
        })
    }

    function initHeatMapTool() {
        $('#heatMapOpacity').slider({
            min: 0,
            max: 1,
            step: 0.05,
            slide: function (event, ui) {
                heatMapLayer.setOpacity(ui.value);
            }
        });

        $('#heatMapSwitch').change(function (evt) {
            var opa = $('#heatMapOpacityRow');
            var dat = $('#heatMapDateRow');

            if ($(this).is(":checked")) {
                heatMapLayer.show();
                heatMapLayer.setOpacity(0.5);
                $('#heatMapOpacity').slider({
                    value: 0.5
                });
                opa.show();
                dat.show();
            } else {
                heatMapLayer.hide();
                opa.hide();
                dat.hide();
            }
        });

        initHeatMapSlider();
    }

    /**
     * Loads the images uploaded for the event, and shows the ones appropriate for the object type.
     */
    function refreshImages() {
        $.ajax({
            url: "/editor/image/get"
        }).done(function (data) {
            $('#accordion_image_chooser').html(data);
            $('#mapObjectImage_type').val(selectedMarker.eveMappObjectType);

            var count = 0;
            $.each($("div.mapObjectImage"), function () {

                var element = $(this);
                if (element.data('type') == selectedMarker.eveMappObjectType) {
                    element.click(function () {
                        infoToolSetImage(element);
                    });
                    count++;
                } else {
                    element.hide();
                }
            });

            if (count == 0) {
                $('#accordion_image_chooser').html("You have not uploaded any images for this type of object yet!");
            }
        });
    }


    /**
     * Called when an image is clicked an we need to set that image on the symbol.
     * @param element Image element which is clicked on.
     */
    function infoToolSetImage(element) {
        // Set the url
        selectedMarker.symbol.url = element.data('url');
        layer.redraw();

        // Update the object server side
        saveObject(selectedMarker);
    }

    /**
     * CLICK HANDLER SPECIFICATION
     * All events should just specify a further handler, no logic executed.
     */

    function setEventHandlers() {
        /**
         * ZOOM HANDLER SPECIFICATION
         * Note: Using Zoom-end instead of Zoom, or things will get messed up.
         */
        map.on("zoom-end", function () {
            resizeGraphics();
        });


        /**
         * TOOLBAR BUTTONS HANDLER SPECIFICATION
         */

        $('.toolButton').click(function (event) {
            toolButtonClickHandler(event);
        });

        /**
         * MAP LISTENER SPECIFICATION
         */
        map.on("mouse-down", function (event) {
            switch (selectedTool) {
                case "createToolButton":
                    createToolMapMouseDown(event);
                    break;


            }
        });

        map.on("mouse-move", function (event) {
            switch (selectedTool) {
                case "dragToolButton":
                    dragToolMapMouseMove(event);
                    break;
            }

        });

        /**
         * LAYER LISTENER SPECIFICATION
         */
        layer.on("mouse-down", function (event) {

            switch (selectedTool) {
                case "dragToolButton":
                    dragToolLayerMouseDown(event);
                    break;
                case "deleteToolButton":
                    deleteToolLayerMouseDown(event);
                    break;
                case "infoToolButton":
                    infoToolLayerMousedown(event);
                    break;

            }

        });

    }

});

