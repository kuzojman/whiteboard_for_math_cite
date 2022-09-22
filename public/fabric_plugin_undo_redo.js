/**
 * Override the initialize function for the _historyInit();
 */
fabric.Canvas.prototype.initialize = (function (originalFn) {
  return function (...args) {
    originalFn.call(this, ...args);
    this._historyInit();
    return this;
  };
})(fabric.Canvas.prototype.initialize);

/**
 * Override the dispose function for the _historyDispose();
 */
fabric.Canvas.prototype.dispose = (function (originalFn) {
  return function (...args) {
    originalFn.call(this, ...args);
    this._historyDispose();
    return this;
  };
})(fabric.Canvas.prototype.dispose);

/**
 * Returns current state of the string of the canvas
 */
fabric.Canvas.prototype._historyNext = function () {
  return JSON.stringify(this.toDatalessJSON(this.extraProps));
};

/**
 * Returns an object with fabricjs event mappings
 */
fabric.Canvas.prototype._historyEvents = function () {
  return {
    "object:added": this._historySaveAction,
    "object:removed": this._historySaveAction,
    "object:modified": this._historySaveAction,
    "object:skewing": this._historySaveAction,
  };
};

/**
 * Initialization of the plugin
 */
fabric.Canvas.prototype._historyInit = function () {
  this.historyUndo = [];
  this.historyRedo = [];
  this.extraProps = ["selectable"];
  this.historyNextState = this._historyNext();

  this.on(this._historyEvents());
};

/**
 * Remove the custom event listeners
 */
fabric.Canvas.prototype._historyDispose = function () {
  this.off(this._historyEvents());
};

/**
 * It pushes the state of the canvas into history stack
 */
fabric.Canvas.prototype._historySaveAction = function () {
  if (this.historyProcessing) return;

  const json = this.historyNextState;
  this.historyUndo.push(json);
  this.historyNextState = this._historyNext();
  this.fire("history:append", { json: json });
};

/**
 * Undo to latest history.
 * Pop the latest state of the history. Re-render.
 * Also, pushes into redo history.
 */
fabric.Canvas.prototype.undo = function (callback) {
  // The undo process will render the new states of the objects
  // Therefore, object:added and object:modified events will triggered again
  // To ignore those events, we are setting a flag.
  this.historyProcessing = true;

  const history = this.historyUndo.pop();
  if (history) {
    // Push the current state to the redo history
    this.historyRedo.push(this._historyNext());
    this.historyNextState = history;
    this._loadHistory(history, "history:undo", callback);
  } else {
    this.historyProcessing = false;
  }
};

/**
 * Redo to latest undo history.
 */
fabric.Canvas.prototype.redo = function (callback) {
  // The undo process will render the new states of the objects
  // Therefore, object:added and object:modified events will triggered again
  // To ignore those events, we are setting a flag.
  this.historyProcessing = true;
  const history = this.historyRedo.pop();
  if (history) {
    // Every redo action is actually a new action to the undo history
    this.historyUndo.push(this._historyNext());
    this.historyNextState = history;
    this._loadHistory(history, "history:redo", callback);
  } else {
    this.historyProcessing = false;
  }
};

fabric.Canvas.prototype._loadHistory = function (history, event, callback) {
  var that = this;

  this.loadFromJSON(history, function () {
    that.renderAll();
    that.fire(event);
    that.historyProcessing = false;

    if (callback && typeof callback === "function") callback();
  });
};

/**
 * Clear undo and redo history stacks
 */
fabric.Canvas.prototype.clearHistory = function () {
  this.historyUndo = [];
  this.historyRedo = [];
  this.fire("history:clear");
};

/**
 * Off the history
 */
fabric.Canvas.prototype.offHistory = function () {
  this.historyProcessing = true;
};

/**
 * On the history
 */
fabric.Canvas.prototype.onHistory = function () {
  this.historyProcessing = false;

  this._historySaveAction();
};

fabric.Arrow = fabric.util.createClass(fabric.Line, {

  type: 'Arrow',

  initialize: function(element, options) {
    options || (options = {});
    this.callSuper('initialize', element, options);
    this.padding=this.strokeWidth*1.5;
  },

  toObject: function() {
    let obj = {}
    try{
      obj = fabric.util.object.extend(this.callSuper('toObject'))
    }catch (e){
      console.error(e);
    }
    return obj;
  },

  _render: function(ctx){
    this.callSuper('_render', ctx);

    // do not render if width/height are zeros or object is not visible
    if (this.width === 0 && this.height === 0 || !this.visible) return;

    ctx.save();

    var xDiff = this.x2 - this.x1;
    var yDiff = this.y2 - this.y1;
    var angle = Math.atan2(yDiff, xDiff);
    ctx.translate((this.x2 - this.x1) / 2, (this.y2 - this.y1) / 2);
    ctx.rotate(angle);
    ctx.beginPath();
    //move 10px in front of line to start the arrow so it does not have the square line end showing in front (0,0)
    let linew = this.strokeWidth*1.2;
    if ( this.strokeWidth<=5 ) {
      linew = (this.strokeWidth+3)*1.2
    }
    ctx.moveTo(linew*1.2,0);
    ctx.lineTo(-linew*1.2, linew*1.2);
    ctx.lineTo(-linew*1.2, -linew*1.2);
    ctx.closePath();
    ctx.fillStyle = this.stroke;
    ctx.fill();

    ctx.restore();
  },

  clipTo: function(ctx) {
    this._render(ctx);
  }
});

fabric.Arrow.fromObject = function (object, callback) {
    callback && callback(new fabric.Arrow([object.x1, object.y1, object.x2, object.y2],object));
};

fabric.Arrow.async = true;


fabric.ArrowTwo = fabric.util.createClass(fabric.Line, {

  type: 'ArrowTwo',

  initialize: function(element, options) {
    options || (options = {});
    this.callSuper('initialize', element, options);
    this.padding=this.strokeWidth*1.5;
  },

  toObject: function() {
    let obj = {}
    try{
      obj = fabric.util.object.extend(this.callSuper('toObject'))
    }catch (e){
      console.error(e);
    }
    return obj;
  },

  _render: function(ctx){
    this.ctx=ctx
    this.callSuper('_render', ctx);
    
    // do not render if width/height are zeros or object is not visible
    if (this.width === 0 && this.height === 0 || !this.visible) return;
    let p = this.calcLinePoints();
    let xDiff = this.x2 - this.x1;
    let yDiff = this.y2 - this.y1;
    let angle = Math.atan2(yDiff, xDiff);
    this.drawArrow(angle, p.x2, p.y2);
    ctx.save();
    xDiff = -this.x2 + this.x1;
    yDiff = -this.y2 + this.y1;
    angle = Math.atan2(yDiff, xDiff);
    this.drawArrow(angle, p.x1, p.y1);
  },

  drawArrow: function(angle, xPos, yPos) {
    this.ctx.save();
    this.ctx.translate(xPos, yPos);
    this.ctx.rotate(angle);
    this.ctx.beginPath();
    // Move 5px in front of line to start the arrow so it does not have the square line end showing in front (0,0)
    let linew = this.strokeWidth*1.2;
    if ( this.strokeWidth<=5 ) {
      linew = (this.strokeWidth+3)*1.2
    }
    this.ctx.moveTo(linew,0);
    this.ctx.lineTo(-linew*1.2, linew*1.2);
    this.ctx.lineTo(-linew*1.2, -linew*1.2);
    this.ctx.closePath();
    this.ctx.fillStyle = this.stroke;
    this.ctx.fill();
    this.ctx.restore();
  },

  clipTo: function(ctx) {
    this._render(ctx);
  }
});

fabric.ArrowTwo.fromObject = function (object, callback) {
    callback && callback(new fabric.ArrowTwo([object.x1, object.y1, object.x2, object.y2],object));
};

fabric.ArrowTwo.async = true;