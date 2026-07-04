const Blacklist = require("../models/Blacklist");

class BlacklistService {
    /**
     * إضافة توكن إلى القائمة السوداء
     * @param {string} token - التوكن المراد إبطاله
     * @param {number} expiresIn - مدة الصلاحية بالثواني
     */
    static async addToBlacklist(token, expiresIn) {
        try {
            const expiresAt = new Date(Date.now() + expiresIn * 1000);
            
            await Blacklist.create({
                token,
                expiresAt
            });
            
            console.log(`✅ Token added to blacklist, expires at ${expiresAt}`);
            return true;
        } catch (error) {
            // إذا كان التوكن موجوداً مسبقاً
            if (error.code === 11000) {
                console.log('ℹ️ Token already in blacklist');
                return true;
            }
            console.error('❌ Error adding token to blacklist:', error);
            return false;
        }
    }

    /**
     * التحقق من وجود التوكن في القائمة السوداء
     * @param {string} token - التوكن المراد التحقق منه
     * @returns {Promise<boolean>} - true إذا كان في القائمة السوداء
     */
    static async isBlacklisted(token) {
        try {
            const result = await Blacklist.findOne({ token });
            return !!result;
        } catch (error) {
            console.error('❌ Error checking blacklist:', error);
            return false;
        }
    }

    /**
     * حذف توكن من القائمة السوداء (للتجربة)
     * @param {string} token - التوكن المراد حذفه
     */
    static async removeFromBlacklist(token) {
        try {
            await Blacklist.deleteOne({ token });
            console.log(`✅ Token removed from blacklist`);
            return true;
        } catch (error) {
            console.error('❌ Error removing token from blacklist:', error);
            return false;
        }
    }

    /**
     * الحصول على عدد التوكنات في القائمة السوداء
     */
    static async getBlacklistCount() {
        try {
            return await Blacklist.countDocuments();
        } catch (error) {
            console.error('❌ Error getting blacklist count:', error);
            return 0;
        }
    }

    /**
     * تنظيف التوكنات المنتهية (يدوياً)
     */
    static async cleanExpiredTokens() {
        try {
            const result = await Blacklist.deleteMany({
                expiresAt: { $lt: new Date() }
            });
            console.log(`✅ Cleaned ${result.deletedCount} expired tokens`);
            return result.deletedCount;
        } catch (error) {
            console.error('❌ Error cleaning expired tokens:', error);
            return 0;
        }
    }
}

module.exports = BlacklistService;