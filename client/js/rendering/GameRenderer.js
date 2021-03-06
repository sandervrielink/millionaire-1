const ASPECT_RATIO = require('./Constants.js').ASPECT_RATIO;

// Handles top-level rendering logic to be done by the HTML canvas.
class GameRenderer {

  constructor(canvas, htmlDocument, htmlWindow) {
    if (canvas !== undefined) {
      this.canvas = canvas;
      if (this.canvas.getContext !== undefined) {
        this.context = this.canvas.getContext('2d');
      }
      this.htmlDocument = htmlDocument;
      this.htmlWindow = htmlWindow;
      this.canvasElements = [];
      this.rendering = false;

      this.canvas.width = 1600;
      this.canvas.height = this.canvas.width / ASPECT_RATIO;

      this.canvas.onmousedown = (event) => {
        this.onClick(event);
      };
      this.canvas.onmouseup = (event) => {
        this.onMouseUp(event);
      };
      this.canvas.onmousemove = (event) => {
        this.onMouseMove(event);
      };
    }
  }


  // PRIVATE METHODS

  // Gets the mouse position of the given event relative to the given canvas.
  _getLocalCursorPosition(canvas, event) {
    var rect = canvas.getBoundingClientRect();
    var x = event.offsetX * canvas.width / rect.width;
    var y = event.offsetY * canvas.height / rect.height;
    return { x:x, y:y };
  }


  // PUBLIC METHODS

  // Executes when the user clicks on the game canvas.
  onClick(event) {
    var localPos = this._getLocalCursorPosition(this.canvas, event);
    this.canvasElements.forEach((element, index) => {
      if (element.isClickable()) {
        element.onClick(localPos.x, localPos.y);
      }
    });
  }

  // Executes when the user moves their mouse.
  onMouseMove(event) {
    var localPos = this._getLocalCursorPosition(this.canvas, event);
    this.canvasElements.forEach((element, index) => {
      if (element.onMouseMove) {
        element.onMouseMove(localPos.x, localPos.y);
      }
    });
    for (var i = 0; i < this.canvasElements.length; i++) {
      if (this.canvasElements[i].isClickable() &&
          this.canvasElements[i].isMouseHovering(localPos.x, localPos.y)) {
        this.htmlDocument.body.style.cursor = 'pointer';
        return;
      }
    }
    this.htmlDocument.body.style.cursor = 'initial';
  }

  onMouseUp(event) {
    var localPos = this._getLocalCursorPosition(this.canvas, event);
    this.canvasElements.forEach((element, index) => {
      if (element.onMouseUp) {
        element.onMouseUp(localPos.x, localPos.y);
      }
    });
  }

  // Render a frame.
  render(timestamp) {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.canvasElements.forEach((element, index) => {
      element.draw();
    });

    if (this.rendering) {
      this.htmlWindow.requestAnimationFrame((timestamp) => { this.render(timestamp); });
    }
  }

  startRendering() {
    this.rendering = true;
    this.htmlWindow.requestAnimationFrame((timestamp) => { this.render(timestamp); });
  }

  stopRendering() {
    this.rendering = false;
  }

  // Updates the game canvas with new CanvasElements.
  //
  // Overwrites any existing CanvasElements drawn on the canvas before.
  updateCanvasElements(newCanvasElements) {
    this.canvasElements = newCanvasElements;
  }
}

module.exports = GameRenderer;
