const fs = require('fs');
const path = require('path');

/**
 * CONFIGURATION
 */
const IMAGES_DIR = path.join(__dirname, 'images', 'product');
const CONFIG_FILE = path.join(__dirname, 'config.js');

// Helper to check if file is an image
const isImage = (file) => {
    const ext = path.extname(file).toLowerCase();
    return ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'].includes(ext);
};

function main() {
    console.log('🔍 Scanning images folder recursively...');

    if (!fs.existsSync(IMAGES_DIR)) {
        console.error(`❌ Error: Images directory not found at ${IMAGES_DIR}`);
        return;
    }

    const categories = [];
    const items = fs.readdirSync(IMAGES_DIR, { withFileTypes: true });

    items.forEach(item => {
        if (item.isDirectory()) {
            const catName = item.name;
            const catPath = path.join(IMAGES_DIR, catName);
            const files = fs.readdirSync(catPath)
                .filter(file => isImage(file))
                .map(file => `${catName}/${file}`);

            if (files.length > 0) {
                categories.push({
                    name: catName === 'crafts' ? 'Value Added Crafts' : (catName.charAt(0).toUpperCase() + catName.slice(1)),
                    id: catName,
                    products: files
                });
            }
        }
    });

    const rootFiles = items.filter(item => item.isFile() && isImage(item.name))
        .map(item => item.name);

    if (rootFiles.length > 0) {
        categories.unshift({
            name: "Other Products",
            id: "other",
            products: rootFiles
        });
    }

    if (!fs.existsSync(CONFIG_FILE)) {
        console.error(`❌ Error: config.js not found at ${CONFIG_FILE}`);
        return;
    }

    let configContent = fs.readFileSync(CONFIG_FILE, 'utf8');

    const categoriesJson = JSON.stringify(categories, null, 2)
        .replace(/"([^"]+)":/g, '$1:');

    // Use regular string replacement instead of regex with backreferences to avoid $ interpretation
    const productsStartMarker = 'products: [';
    const productsEndMarker = '],';
    const categoriesStartMarker = 'categories: [';

    if (configContent.includes(categoriesStartMarker)) {
        const startIndex = configContent.indexOf(categoriesStartMarker);
        const endIndex = configContent.indexOf(productsEndMarker, startIndex) + 2;
        configContent = configContent.slice(0, startIndex) + `categories: ${categoriesJson},` + configContent.slice(endIndex);
    } else if (configContent.includes(productsStartMarker)) {
        const startIndex = configContent.indexOf(productsStartMarker);
        const endIndex = configContent.indexOf(productsEndMarker, startIndex) + 2;
        configContent = configContent.slice(0, startIndex) + `categories: ${categoriesJson},` + configContent.slice(endIndex);
    }

    fs.writeFileSync(CONFIG_FILE, configContent, 'utf8');
    console.log('✨ config.js has been updated with categorized products!');
}

main();
