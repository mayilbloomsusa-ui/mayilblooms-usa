const fs = require('fs');
const path = require('path');

/**
 * CONFIGURATION
 */
const IMAGES_DIR = path.join(__dirname, 'images', 'product');
const CONFIG_FILE = path.join(__dirname, 'config.js');

// Ignore these images in the product grid (branding, logo, etc.)
const IGNORE_LIST = [
    'brand logo.jpeg',
    'logo.png',
    'logo.jpg',
    'favicon'
];

// Helper to check if file is an image
const isImage = (file) => {
    const ext = path.extname(file).toLowerCase();
    return ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'].includes(ext);
};

function main() {
    console.log('🔍 Scanning images folder...');

    if (!fs.existsSync(IMAGES_DIR)) {
        console.error(`❌ Error: Images directory not found at ${IMAGES_DIR}`);
        return;
    }

    // Read all files in images dir
    const allFiles = fs.readdirSync(IMAGES_DIR);

    // Filter for product images
    const productImages = allFiles.filter(file => {
        // Must be an image
        if (!isImage(file)) return false;

        // Must not be in ignore list (case insensitive)
        const lowerFile = file.toLowerCase();
        const isIgnored = IGNORE_LIST.some(ignore => lowerFile.includes(ignore.toLowerCase()));

        return !isIgnored;
    });

    console.log(`✅ Found ${productImages.length} product images.`);

    // Read config.js
    if (!fs.existsSync(CONFIG_FILE)) {
        console.error(`❌ Error: config.js not found at ${CONFIG_FILE}`);
        return;
    }

    let configContent = fs.readFileSync(CONFIG_FILE, 'utf8');

    // Replace the products array content
    // We look for "products: [" followed by anything until "],"
    const productsArrayRegex = /(products:\s*\[)([\s\S]*?)(\],)/;

    const newProductsList = productImages.map(img => `    "${img}"`).join(',\n');
    const replacement = `$1\n${newProductsList}\n  $3`;

    const updatedConfig = configContent.replace(productsArrayRegex, (match, p1, p2, p3) => {
        return `${p1}\n${newProductsList}\n  ${p3}`;
    });

    // Write back to config.js
    fs.writeFileSync(CONFIG_FILE, updatedConfig, 'utf8');

    console.log('✨ config.js has been automatically updated with the latest products!');
    console.log('🚀 Open index.html to see the changes.');
}

main();
