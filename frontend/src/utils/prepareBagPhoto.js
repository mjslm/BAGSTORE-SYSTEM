const supported = ['image/jpeg', 'image/png', 'image/webp'];
const maxUploadBytes = 10 * 1024 * 1024;

export async function prepareBagPhoto(file) {
  if (!supported.includes(file.type)) throw new Error('Choose a JPG, PNG or WebP photo.');
  if (!file.size || file.size > maxUploadBytes) throw new Error('Choose a photo smaller than 10 MB.');

  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    try { await image.decode(); }
    catch { throw new Error('This photo could not be opened. Try another image.'); }

    const scale = Math.min(1, 1024 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not prepare the photo on this device.');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const preview = canvas.toDataURL('image/jpeg', 0.8);
    const data = preview.split(',')[1];
    if (!data || !preview.startsWith('data:image/jpeg;') || data.length > 1398104) {
      throw new Error('The photo is still too large after resizing. Try a smaller image.');
    }
    return { data, mimeType: 'image/jpeg', preview, name: file.name };
  } finally {
    URL.revokeObjectURL(url);
  }
}
