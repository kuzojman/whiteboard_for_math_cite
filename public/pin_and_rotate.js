//import { canvas } from "./some_functions.js"

const MAX_ZOOM_IN  = 4;
const MAX_ZOOM_OUT = 0.05;
const SCALE_STEP = 0.05;

let currentValueZoom = 1;

fabric.Canvas.prototype.toggleDragMode = function () 
{
    const STATE_IDLE = "idle";
    const STATE_PANNING = "panning";
    // Remember the previous X and Y coordinates for delta calculations
    let lastClientX;
    let lastClientY;
    // Keep track of the state
    let state = STATE_IDLE;
    // We're entering dragmode
    if (canvas.isDrawingMode) {
        // Discard any active object
        canvas.discardActiveObject();
        // Set the cursor to 'move'
        this.defaultCursor = "move";
        // Loop over all objects and disable events / selectable. We remember its value in a temp variable stored on each object
        this.forEachObject(function (object) {
            object.prevEvented = object.evented;
            object.prevSelectable = object.selectable;
            object.evented = false;
            object.selectable = false;
        });
        // Remove selection ability on the canvas
        this.selection = false;
        // // When MouseUp fires, we set the state to idle
        this.on("mouse:up", function (e) {
            state = STATE_IDLE;
        });
        // // When MouseDown fires, we set the state to panning
        this.on("mouse:down", (e) => {
            state = STATE_PANNING;
            lastClientX = e.e.clientX;
            lastClientY = e.e.clientY;
        });
        // When the mouse moves, and we're panning (mouse down), we continue
        this.on("mouse:move", (e) => {
            if (state === STATE_PANNING && e && e.e) {
                // let delta = new fabric.Point(e.e.movementX, e.e.movementY); // No Safari support for movementX and movementY
                // For cross-browser compatibility, I had to manually keep track of the delta
  
                // Calculate deltas
                let deltaX = 0;
                let deltaY = 0;
                if (lastClientX) {
                    deltaX = e.e.clientX - lastClientX;
                }
                if (lastClientY) {
                    deltaY = e.e.clientY - lastClientY;
                }
                // Update the last X and Y values
                lastClientX = e.e.clientX;
                lastClientY = e.e.clientY;
  
                let delta = new fabric.Point(deltaX, deltaY);
                this.relativePan(delta);
                // this.trigger("moved");
            }
        });
    } else {
        // When we exit dragmode, we restore the previous values on all objects
        this.forEachObject(function (object) {
            object.evented =
                object.prevEvented !== undefined ? object.prevEvented : object.evented;
            object.selectable =
                object.prevSelectable !== undefined
                    ? object.prevSelectable
                    : object.selectable;
        });
        // Reset the cursor
        this.defaultCursor = "default";
        // Remove the event listeners
        this.off("mouse:up");
        this.off("mouse:down");
        this.off("mouse:move");
        // Restore selection ability on the canvas
        this.selection = true;
    }
  };


function handleScale (delta)
{
    if (delta<0)
    {
        if(currentValueZoom<=MAX_ZOOM_OUT)
        {
            return;
        }
        else
        {
            currentValueZoom = (parseFloat(currentValueZoom)-SCALE_STEP).toFixed(2);

        }
    }
    else
    {
        if(currentValueZoom>=MAX_ZOOM_IN)
        {
            return;
        }
        else
        {
            currentValueZoom = (parseFloat(currentValueZoom)+SCALE_STEP).toFixed(2);

        }
    }
}


canvas.on('mouse:wheel',function(opt){
    const delta =opt.e.deltaY;
    handleScale(delta);
    as.textContent = (currentValueZoom * 100).toFixed(0)+'%';
    canvas.zoomToPoint({x:opt.e.offsetX, y: opt.e.offsetY},currentValueZoom);
    opt.e.preventDefault();
    opt.e.stopPropagation();
})

document.body.addEventListener('keydown',e =>
{
    if(e.code ==='Space' && !e.repeat)
    {
        e.preventDefault();
        canvas.toggleDragMode();
        canvas.isDrawingMode = false;
    }
});

document.body.addEventListener('keyup',e =>
{
    if(e.code ==='Space' && !e.repeat)
    {
        e.preventDefault();
        canvas.toggleDragMode();
        canvas.isDrawingMode = true;
    }
});


