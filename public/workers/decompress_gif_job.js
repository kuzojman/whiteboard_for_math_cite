importScripts("./modules/jsgif.js")

/**
 * Немного измененный для работы в webworker gifToSprite.js
 * @param ab - ArrayBuffer изображения
 * @param maxWidth - максимальная ширина
 * @param maxHeight - максимальная высота
 * @param maxDuration - максимальная продолжительность
 * @returns {Promise<{dataUrl: string, framesLength, frameWidth: number, delay: *}>}
 */

const gifToSprite = async (ab, maxWidth, maxHeight, maxDuration) => {
  // Parse and decompress the gif arrayBuffer to frames with the "gifuct-js" library
  let frames = decompressFrames(parseGIF(ab), true);

  // Create the needed canvass
  const dataCanvas = new OffscreenCanvas(frames[0].dims.width, frames[0].dims.height);
  const dataCtx = dataCanvas.getContext("2d");
  const frameCanvas = new OffscreenCanvas(frames[0].dims.width, frames[0].dims.height);
  const frameCtx = frameCanvas.getContext("2d");
  const spriteCanvas = new OffscreenCanvas(frames[0].dims.width, frames[0].dims.height);
  const spriteCtx = spriteCanvas.getContext("2d");


  // Get the frames dimensions and delay
  let [width, height, delay] = [
    frames[0].dims.width,
    frames[0].dims.height,
    frames.reduce((acc, cur) => (acc = !acc ? cur.delay : acc), null)
  ];

  // Set the Max duration of the gif if any
  // FIXME handle delay for each frame
  const duration = frames.length * delay;
  maxDuration = maxDuration || duration;
  if (duration > maxDuration) frames.splice(Math.ceil(maxDuration / delay));

  // Set the scale ratio if any
  maxWidth = maxWidth || width;
  maxHeight = maxHeight || height;
  const scale = Math.min(maxWidth / width, maxHeight / height);
  width = width * scale;
  height = height * scale;

  //Set the frame and sprite canvass dimensions
  frameCanvas.width = width;
  frameCanvas.height = height;
  spriteCanvas.width = width * frames.length;
  spriteCanvas.height = height;

  frames.forEach((frame, i) => {
    // Get the frame imageData from the "frame.patch"
    const frameImageData = dataCtx.createImageData(
        frame.dims.width,
        frame.dims.height
    );
    frameImageData.data.set(frame.patch);
    dataCanvas.width = frame.dims.width;
    dataCanvas.height = frame.dims.height;
    dataCtx.putImageData(frameImageData, 0, 0);

    // Draw a frame from the imageData
    if (frame.disposalType === 2) frameCtx.clearRect(0, 0, width, height);
    frameCtx.drawImage(
        dataCanvas,
        frame.dims.left * scale,
        frame.dims.top * scale,
        frame.dims.width * scale,
        frame.dims.height * scale
    );

    // Add the frame to the sprite sheet
    spriteCtx.drawImage(frameCanvas, width * i, 0);
  });

  // Get the sprite sheet dataUrl
  const blob = await spriteCanvas.convertToBlob();
  const dataUrl = new FileReaderSync().readAsDataURL(blob);

  return {
    "dataUrl": dataUrl,
    "frameWidth": width,
    "framesLength": frames.length,
    "delay": delay,
  };
};

self.addEventListener('message', async e => {
  try {
    let data = await gifToSprite(e.data, 200, 200)
    self.postMessage({data: data})
  } catch (err) {
    self.postMessage(err);
  }
});