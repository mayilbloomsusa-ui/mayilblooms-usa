/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║          MAYILBLOSSOM CATALOG CONFIGURATION              ║
 * ║                                                          ║
 * ║  Edit ONLY this file to update your catalog.             ║
 * ║  Do NOT touch index.html unless you know what you do.    ║
 * ╚══════════════════════════════════════════════════════════╝
 *
 * PRODUCT IMAGES:
 *   - Drop your product images into the "images/" folder
 *   - Name them like:  flower-name-$price.jpg
 *     Example: jathi-poo-$30.jpg  →  Name: "Jathi Poo", Price: "$30"
 *   - Then add the filename to the "products" array below
 *
 * HERO IMAGES:
 *   - These are the big banner images at the top of the page
 *   - Use your best product photos for maximum impact
 */

const catalogConfig = {

    // ─── Business Info ────────────────────────────────────────
    businessName: "Mayil blooms",
    tagline: "Premium Artificial Flowers — Delivery Available within USA",
    description: "Wholesale & retail supplier of high-quality artificial flowers, garlands, and decorations. Long-lasting beauty that never wilts.",

    // Festival Message (Global fallback - set to empty string "" to hide)
    festivalMessageFallback: "",

    // Path to your logo image (place the file in the images/ folder)
    logo: "images/brand logo.jpeg",

    // ─── Pricing & Discounts ──────────────────────────────────
    flatDiscount: 30,

    // ─── Contact Details ──────────────────────────────────────
    contactDetails: {
        phone: "+1 9472759100",
        whatsapp: "+19472759100",
        email: "mayilbloomsusa@gmail.com",
        instagram: "https://www.instagram.com/mayilblooms/",
        youtube: "https://youtube.com/@mayilblooms?si=iVFXLzdmqX_64wpF",
        facebook: "https://www.facebook.com/share/18UF7pNgmC/?mibextid=wwXIfr",
        address: "Farmington Hills, Michigan",
    },

    // ─── Hero Banner Slides ───────────────────────────────────
    // These cycle at the top and synchronize with titles and festival messages!
    heroSlides: [
        {
            image: "images/BLOOMED JASMINE MALLIPOO 16INCH_$35.jpg",
            title: "Exquisite Artificial Flowers",
            subtitle: "Premium quality that lasts forever — for temples & weddings",
            festivalMessage: "Special Offer for Telugu New Year!"
        },
        {
            image: "images/CLOSED MALLIPOO STRING 16INCH_$35.webp",
            title: "Long Lasting Garlands",
            subtitle: "Handcrafted beauty that never wilts",
            festivalMessage: "Blessings for Ramadan Month"
        }
    ],

    // ─── Products ─────────────────────────────────────────────
    // List your product image filenames here.
    //
    // RULES:
    // 1. Name & Price are parsed from filename: flower-name-$price.ext
    // 2. Images with the SAME flower name will be grouped automatically!
    // 3. Variations like "16inch" or "8inch" are ignored in the name.
    // 4. Price in filename is the FINAL price after discount.
    //
    products: [
    "Artificial-Jasmine-Bud-Hair-Rubber-Band.jpg",
    "BLOOMED  MULLIPOO 16INCH STRING_$30 - Copy.jpeg",
    "BLOOMED JAATHI MALLIPOO 16INCH STRING_$30 - Copy.jpeg",
    "BLOOMED JASMINE MALLIPOO 16INCH_$35.jpg",
    "CLOSED MALLIPOO STRING 16INCH_$35 - Copy.jpeg",
    "CLOSED MALLIPOO STRING 16INCH_$35.webp",
    "MALLI CENTER MEDIUM HAIR CLIP BACK_$8.webp",
    "MALLI CENTER MEDIUM HAIR CLIP FRONT_$8.webp",
    "Realistic Jasmine 9 pieces Jadai Set full set_$40.webp",
    "Realistic Jasmine 9 pieces Jadai Set.webp",
    "Realistic Jasmine Hair U Pin_$4.webp",
    "closed mullaiPOO STRING 16 INCH_$35(1).webp",
    "closed mullaiPOO STRING 16 INCH_$35.webp",
    "jathi-poo-$30.jpg"
  ],

    // ─── Appearance ───────────────────────────────────────────
    accentColor: "#C8102E",
    currency: "$",
    imagesFolder: "images",
};
