// ml-treatment/services/imageService.js
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

class ImageService {
    constructor() {
        this.configPath = path.join(__dirname, '../config/config.json');
        this.imagesDir = path.join(__dirname, '../data/processed/images');
    }

    loadConfig() {
        try {
            if (fs.existsSync(this.configPath)) {
                return JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
            }
        } catch (error) {
            console.error('Error loading config:', error.message);
        }
        return { image: { width: 64, height: 64, channels: 3 } };
    }

    // ============================================================
    // 🖼️ معالجة صورة واحدة
    // ============================================================

    async processImage(imagePath) {
        try {
            const config = this.loadConfig();
            const { width, height } = config.image;

            const imageBuffer = await sharp(imagePath)
                .resize(width, height, { fit: 'cover' })
                .normalize()
                .toBuffer();

            // تحويل إلى مصفوفة قيم (flatten)
            return Array.from(imageBuffer);
        } catch (error) {
            console.error('Error processing image:', error.message);
            return null;
        }
    }

    // ============================================================
    // 🖼️ معالجة جميع الصور
    // ============================================================

    async processAllImages(imagePaths) {
        const results = [];
        const config = this.loadConfig();
        const { width, height } = config.image;

        for (const item of imagePaths) {
            try {
                const imageBuffer = await sharp(item.localPath)
                    .resize(width, height, { fit: 'cover' })
                    .normalize()
                    .toBuffer();

                results.push({
                    id: item.id,
                    case_type: item.case_type,
                    features: Array.from(imageBuffer)
                });

            } catch (error) {
                console.error(`Error processing image ${item.id}:`, error.message);
            }
        }

        return results;
    }

    // ============================================================
    // 🖼️ دمج ميزات الصورة مع البيانات النصية
    // ============================================================

    async getCombinedFeatures(textData, imagePaths) {
        const processedImages = await this.processAllImages(imagePaths);
        
        // إنشاء خريطة للصور حسب ID
        const imageMap = {};
        processedImages.forEach(img => {
            imageMap[img.id] = img.features;
        });

        // دمج البيانات
        const combined = textData.map(row => {
            const id = row._id || row.id;
            const imageFeatures = imageMap[id] || [];
            const textFeatures = [
                parseFloat(row.age) || 25,
                row.gender === 'female' ? 0 : 1,
                parseFloat(row.pain_severity) || 5,
                parseFloat(row.pain_time) || 3,
                parseFloat(row.tooth_location) || 20,
                row.is_pregnant === 'true' ? 1 : 0,
                row.previous_treatment === 'true' ? 1 : 0,
                row.takes_medication === 'true' ? 1 : 0,
                parseFloat(row.medication_type) || 0
            ];

            return {
                text_features: textFeatures,
                image_features: imageFeatures,
                case_type: row.case_type,
                has_image: imageFeatures.length > 0
            };
        });

        return combined;
    }
}

module.exports = new ImageService();