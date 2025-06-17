// Create placeholder icon files if they don't exist
// This prevents extension loading errors

const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');

function createIcon(size) {
  canvas.width = size;
  canvas.height = size;
  
  // Clear canvas
  ctx.clearRect(0, 0, size, size);
  
  // Draw purple background
  ctx.fillStyle = '#7c3aed';
  ctx.fillRect(0, 0, size, size);
  
  // Draw white lightning bolt
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  
  const scale = size / 24;
  ctx.moveTo(13 * scale, 2 * scale);
  ctx.lineTo(3 * scale, 14 * scale);
  ctx.lineTo(12 * scale, 14 * scale);
  ctx.lineTo(11 * scale, 22 * scale);
  ctx.lineTo(21 * scale, 10 * scale);
  ctx.lineTo(12 * scale, 10 * scale);
  ctx.closePath();
  ctx.fill();
  
  return canvas.toDataURL();
}

// Create and download icons
const sizes = [16, 32, 48, 128];
sizes.forEach(size => {
  const dataUrl = createIcon(size);
  const link = document.createElement('a');
  link.download = `icon${size}.png`;
  link.href = dataUrl;
  link.click();
});

console.log('Placeholder icons created! Check your downloads folder.');