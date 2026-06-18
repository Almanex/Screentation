const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const pngPath = path.join(__dirname, '../resources/icon.png');
const icoPath = path.join(__dirname, '../resources/icon.ico');

async function generateIco() {
  try {
    console.log('Reading source PNG from:', pngPath);
    if (!fs.existsSync(pngPath)) {
      throw new Error(`Source PNG not found at ${pngPath}`);
    }

    const sizes = [16, 32, 48, 256];
    const pngBuffers = [];

    // 1. Generate PNG buffers for each size
    for (const size of sizes) {
      console.log(`Resizing to ${size}x${size}...`);
      const buffer = await sharp(pngPath)
        .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();
      pngBuffers.push({ size, buffer });
    }

    // 2. Construct ICO Header (6 bytes)
    const header = Buffer.alloc(6);
    header.writeUInt16LE(0, 0); // Reserved
    header.writeUInt16LE(1, 2); // Type (1 = Icon)
    header.writeUInt16LE(sizes.length, 4); // Number of images

    // 3. Construct ICO Directory Entries (16 bytes per image)
    const directorySize = 16 * sizes.length;
    const directory = Buffer.alloc(directorySize);
    
    let currentOffset = 6 + directorySize;
    const imageBuffers = [];

    for (let i = 0; i < sizes.length; i++) {
      const { size, buffer } = pngBuffers[i];
      const entryOffset = i * 16;
      
      // Width and Height: 1 byte each (0 means 256)
      const w = size === 256 ? 0 : size;
      const h = size === 256 ? 0 : size;

      directory.writeUInt8(w, entryOffset + 0);
      directory.writeUInt8(h, entryOffset + 1);
      directory.writeUInt8(0, entryOffset + 2); // Color palette size (0 for PNG/truecolor)
      directory.writeUInt8(0, entryOffset + 3); // Reserved
      directory.writeUInt16LE(1, entryOffset + 4); // Color planes
      directory.writeUInt16LE(32, entryOffset + 6); // Bits per pixel
      directory.writeUInt32LE(buffer.length, entryOffset + 8); // Size of image data
      directory.writeUInt32LE(currentOffset, entryOffset + 12); // Offset to image data

      currentOffset += buffer.length;
      imageBuffers.push(buffer);
    }

    // 4. Concatenate all buffers
    const icoBuffer = Buffer.concat([header, directory, ...imageBuffers]);
    
    fs.writeFileSync(icoPath, icoBuffer);
    console.log(`Successfully generated multi-resolution ICO file at ${icoPath}`);
    console.log(`File size: ${icoBuffer.length} bytes`);
  } catch (err) {
    console.error('Failed to generate ICO:', err);
  }
}

generateIco();
