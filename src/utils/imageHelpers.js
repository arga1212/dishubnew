export const getCroppedImg = async (imageSrc, pixelCrop) => {
  const image = await new Promise((resolve) => {
    const img = new Image();
    img.src = imageSrc;
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
  });
  const canvas = document.createElement('canvas');
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height);
  return canvas.toDataURL('image/jpeg');
};

const createImageFromDataUrl = (dataUrl) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Gagal membaca gambar untuk kompresi'));
    img.src = dataUrl;
  });

const getBase64ByteSize = (dataUrl) => {
  if (!dataUrl || typeof dataUrl !== 'string') {
    return 0;
  }

  const base64 = dataUrl.split(',')[1] || '';
  const padding = (base64.match(/=+$/) || [''])[0].length;
  return Math.floor((base64.length * 3) / 4) - padding;
};

export const compressImageDataUrl = async (
  dataUrl,
  {
    maxWidth = 1280,
    maxHeight = 1280,
    maxBytes = 700 * 1024,
    initialQuality = 0.8,
    minQuality = 0.45,
  } = {}
) => {
  if (!dataUrl || typeof dataUrl !== 'string') {
    return dataUrl;
  }

  const sourceImage = await createImageFromDataUrl(dataUrl);
  const canvas = document.createElement('canvas');

  let width = sourceImage.width;
  let height = sourceImage.height;
  const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
  width = Math.round(width * ratio);
  height = Math.round(height * ratio);

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(sourceImage, 0, 0, width, height);

  let quality = initialQuality;
  let result = canvas.toDataURL('image/jpeg', quality);

  while (getBase64ByteSize(result) > maxBytes && quality > minQuality) {
    quality = Math.max(minQuality, quality - 0.1);
    result = canvas.toDataURL('image/jpeg', quality);
  }

  return result;
};