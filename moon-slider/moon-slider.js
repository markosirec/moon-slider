// the polyfill fix for requestAnimationFrame, so it works on Android
// by: https://gist.github.com/paulirish/1579671
(function() {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame'] 
                                   || window[vendors[x]+'CancelRequestAnimationFrame'];
    }
 
    if (!window.requestAnimationFrame)
        window.requestAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function() { callback(currTime + timeToCall); }, 
              timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };
 
    if (!window.cancelAnimationFrame)
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
}());


var generateMoonSlider = function(id, opts, event_handlers) {
    
    // if no id is submited, abort
    if (id === undefined)
        return {};
    
    event_handlers = (event_handlers !== undefined ? event_handlers : {});
    opts = (opts !== undefined ? opts : {});
    
    // set up defaults
    var defaults = {
        min_value: 0,
        max_value: 100,
        start_value: 0,
        step: 1,
        radius: 50,
        color: "#5f3b70",
        slider_classname: "moon-slider",
        button_classname: "moon-slider-button",
        base_line_color: "#d8d8d8"
    };
    
    for (var def in defaults) {
        // if option is not set, set it up with the default value
        if (opts[def] === undefined)
            opts[def] = defaults[def];
    }
    
    if (opts.start_value < opts.min_value)
        opts.start_value = opts.min_value;
    


    // the slider function/object
    var MoonSlider = function(id, opts, event_handlers) {
        
        // private properties
        var element = document.getElementById(id), // the div holding the slider
            button,
            input,
            canvas,
            current_value = opts.start_value, // hold the current slider value
            current_deg = 0, // hold the current degrees
            range = opts.max_value - opts.min_value, // range
            first_quart = true, // var for the validation of max movement range
            deg_step = range / 360, // how much is each degree worth
            is_android, // for specific android fixes
            
            // graphics vars, stuff that never changes and should not be calculated on each draw
            stroke_width = 22,
            stroke_width2 = stroke_width / 2, // half of the stroke width, so we don'T have to calculate it on each draw'
            xy = opts.radius + stroke_width2, // x and y coords of the circle,
            pi_1_5 = 1.5 * Math.PI,
            pi_2 = 2 * Math.PI;

        var onMoveHandler = function(event) {}; 

        // constructor
        (function() {
            
            // find out if android, for certain canvas bug fixes
            var agent = navigator.userAgent.toLowerCase();
            is_android = agent.indexOf("android") > -1;
            
            // create the canvas, button, etc.
            initGraphics();
            
            // if the start value is not the min value, draw the start value
            if (opts.start_value > opts.min_value) {
                var val = valueToPos(opts.start_value);
                coorToGraphics(val.pos.left, val.pos.top, val.deg);
            }
            
            // draw the empty lines (first render)
            else
                drawLines();
            
            // add listeners
            button.addEventListener("mousedown", function() {
                document.addEventListener("mousemove", moveListener);
            });
            
            // remove mousemove listener
            document.addEventListener("mouseup", function() {
                document.removeEventListener("mousemove", moveListener);
            });
            
            button.addEventListener("touchstart", function() {
                document.addEventListener("touchmove", moveListener);
            });
            
            // remove mousemove listener
            document.addEventListener("touchend", function() {
                document.removeEventListener("touchmove", moveListener);
            });

            // if the caller specified an event handler, save a reference to it
            if (event_handlers.onMoveHandler !== undefined)
                onMoveHandler = event_handlers.onMoveHandler;

        })();
        

        // private methods
        
        function initGraphics() {
            
            // add our classname to the element
            element.className += " "+opts.slider_classname;
            
            // create the holder div
            var holder = document.createElement("div");
            element.appendChild(holder);
            
            // create the button
            button = document.createElement("div");
            button.id = id+"-moon-button";
            button.className = opts.button_classname;
            button.style.left = (opts.radius - 3)+"px";
            holder.appendChild(button);
            
            // create canvas
            canvas = document.createElement("canvas");
            canvas.id = id+"-moon-canvas";
            canvas.width = opts.radius * 2 + stroke_width;
            canvas.height = opts.radius * 2 + stroke_width;
            holder.appendChild(canvas); 

            // create hidden input
            input = document.createElement("input");
            input.setAttribute("type", "hidden");
            input.setAttribute("name", id+"-input");
            input.id = id+"-moon-input";
            input.setAttribute("value", opts.min_value);
            
            holder.appendChild(input);

        }
        
        
        // this function draws 2 lines on the canvas
        function drawLines(rad) {

            // draw when the browser is ready via requestAnimationFrame
            requestAnimationFrame(function() {
                
                // if rad is undefined, start at the top
                rad = (rad !== undefined ? rad : pi_1_5);

                var ctx = canvas.getContext("2d");

                // clear the canvas
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                // android fix for clearing the rect
                // https://medium.com/@dhashvir/ffcb939af758
                if (is_android) {
                    canvas.style.display = "none";// detach from DOM
                    canvas.offsetHeight; // force the detach
                    canvas.style.display = "inherit"; // Reattach to DOM 
                }

                ctx.beginPath();
                ctx.arc(xy, xy, opts.radius, 0, pi_2);
                ctx.strokeStyle = opts.base_line_color;
                ctx.lineWidth = stroke_width;
                ctx.stroke();

                ctx.beginPath();
                ctx.arc(xy, xy, opts.radius, pi_1_5, rad);
                ctx.strokeStyle = opts.color;
                ctx.lineWidth = stroke_width;
                ctx.stroke();
                
            });

        }


        // catches mouse move events after click on button
        function moveListener(event) {
  
            event.preventDefault();

            if (event.type == "touchmove") {
                event.clientX = event.targetTouches[0].clientX;
                event.clientY = event.targetTouches[0].clientY;
            }

            coorToGraphics(event.clientX, event.clientY);

            return false;
        }
        


        // the main function for calculations - this is where the magic happens
        function coorToGraphics(coor_left, coor_top, deg, skip_step_check) {

            var canvas_offset = canvas.getBoundingClientRect();

            var left = coor_left - canvas_offset.left;
            var top = coor_top - canvas_offset.top; 

            var atan = Math.atan2(left - opts.radius, top - opts.radius); 

            // if deg are not yet set, calculate them
            // thx to this fiddle for the math help:
            // http://jsfiddle.net/phdphil/Zv4K7/#base
            if (!deg)
                deg = -atan / (Math.PI / 180) + 180; // final (0 - 360 positive) degrees from mouse position 

            // deg was passed to the function programmatically - set the quarter 
            else
                setQuarters(deg);

            var stopDrawing = false;
            var stopProcessing = false;

            // check if we can continue to move, or do we have to stop (the button stops at the max value)
            if (deg < 60 && !first_quart) {
                deg = 360;
                stopDrawing = true;
            }

            else if (deg > 300 && first_quart)
                deg = 0;
            
            current_deg = deg;

            // update the quarters
            setQuarters(deg);

            current_value = Math.round(opts.min_value + (deg * deg_step));

            // should we check the step sequence?
            if (skip_step_check === undefined && opts.step > 1) {
                
                var step_mod = current_value % opts.step;
                
                // if the new value is closer to a higher value, help the user
                if (step_mod > (opts.step/2)) {
                    
                    current_value = current_value - step_mod + opts.step;
                    
                    // get new data
                    var val = valueToPos(current_value);
                    
                    // restart the process, but skip the step check
                    coorToGraphics(val.pos.left, val.pos.top, val.deg, true);
                    return;

                }
                
                // if value is too small, don't do anything in this frame
                else if (step_mod != 0)
                    stopProcessing = true;
            }

            
            // stop everything if step validation fails
            if (!stopProcessing) {
                
                input.setAttribute("value", current_value);

                var pos = calculatePosition(deg, canvas_offset.left, canvas_offset.top);

                button.style.left = (pos.left - canvas_offset.left) + "px";
                button.style.top = (pos.top - canvas_offset.top) + "px";

                // draw the lines
                if (deg > 0 && !stopDrawing)
                    drawLines((atan - (Math.PI/2)) * (-1));
                
                // clear the lines
                else if (deg == 0)
                    drawLines();
                
                onMoveHandler({
                    id: id,
                    deg: current_deg,
                    value: current_value
                });

            }

        }
        
        
        // simple function which keeps track which quarter we have just passed
        // (first or last quarter)
        // is used to determine when to stop the rotation - on end and at the beginning, 
        // depending on the direction
        function setQuarters(deg) {
            
            if (deg < 90)
                first_quart = true;
            
            else if (deg > 270)
                first_quart = false;
            
        }
            
        
        // function returns X and Y position in the rotation
        function calculatePosition(deg, container_left, container_top) {

            var X = Math.round(opts.radius * Math.sin(deg * Math.PI / 180));    
            var Y = Math.round(opts.radius *  -Math.cos(deg * Math.PI / 180));

            return {
                left: (X + opts.radius + container_left - 2),
                top: (Y + opts.radius + container_top - 2)
            }

        }
        
        
        // converts value to pos in space and degrees
        function valueToPos(value) {
            
            var canvas_offset = canvas.getBoundingClientRect();
            
            var v = value - opts.min_value;
            var deg = v / (opts.max_value - opts.min_value) * 360;
            var pos = calculatePosition(deg, canvas_offset.left, canvas_offset.top);
            
            return {
                pos: pos,
                deg: deg
            }
        }

        
        // public methods
        return {

            // watch out when setting values programmatically - if you have a step set up, then the value
            // must correspond to that step sequence. otherwise it will start at the beginning.
            // for example, if you have a step sequence of 10 (110,120,...), then you
            // can't set a value of 112
            setValue: function(value) {

                // get pos and degrees from value
                var val = valueToPos(value);
                coorToGraphics(val.pos.left, val.pos.top, val.deg);

            },


            // set custom degrees
            setDeg: function(deg) {

                var canvas_offset = canvas.getBoundingClientRect();
                var pos = calculatePosition(deg, canvas_offset.left, canvas_offset.top);
                coorToGraphics(pos.left, pos.top, deg);

            },
            
            getValue: function() {
                return current_value;
            },
            
            getDeg: function() {
                return current_deg;
            }

        };
        
    }
    
    
    // finally, generate the new slider and return it
    return new MoonSlider(id, opts, event_handlers);

}
