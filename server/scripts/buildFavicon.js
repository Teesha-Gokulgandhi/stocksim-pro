const fs = require('fs');
const path = require('path');

const favPngPath = path.resolve(__dirname, '../../client/public/brand-logo.png');
const favSvgPath = path.resolve(__dirname, '../../client/public/favicon.svg');
const favIcoPath = path.resolve(__dirname, '../../client/public/favicon.ico');
const favPngOut = path.resolve(__dirname, '../../client/public/favicon.png');

const b64 = fs.readFileSync(favPngPath).toString('base64');
const dataUri = `data:image/png;base64,${b64}`;

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <image href="${dataUri}" x="0" y="0" width="128" height="128" />
</svg>
`;

fs.writeFileSync(favSvgPath, svgContent);
fs.writeFileSync(favPngOut, fs.readFileSync(favPngPath));
fs.writeFileSync(favIcoPath, fs.readFileSync(favPngPath));
console.log("Favicon files updated with self-contained data URI!");
