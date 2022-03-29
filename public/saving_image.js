const downloadImage = () =>
  {
   const ext = "png";
   const base64 = canvas.toDataURL({
     format: ext,
     enableRetinaScaling: true
   });
   const link = document.createElement("a");
   link.href = base64;
   link.download = `eraser_example.${ext}`;
   link.click();
 };
