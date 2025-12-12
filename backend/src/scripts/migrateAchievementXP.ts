import mongoose from 'mongoose';
import { User } from '../models/User.js';
import Achievement from '../models/Achievement.js';
import dotenv from 'dotenv';

dotenv.config();

const ACHIEVEMENT_XP_BONUS = 50;

// Calculate level from total XP
const calculateLevel = (totalXP: number): number => {
    let level = 1;
    let xpNeeded = 0;

    const getXPForLevel = (level: number): number => {
        return Math.floor(100 * Math.pow(1.5, level - 1));
    };

    while (xpNeeded <= totalXP) {
        xpNeeded += getXPForLevel(level);
        if (xpNeeded <= totalXP) {
            level++;
        }
    }

    return level;
};

async function migrateAchievementXP() {
    try {
        console.log('🔄 Starting achievement XP migration...');

        // Connect to MongoDB
        const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/nexusquest';
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');

        // Get all users with achievements
        const achievements = await Achievement.find({}).select('userId');
        const userIds = [...new Set(achievements.map(a => a.userId.toString()))];

        console.log(`📊 Found ${userIds.length} users with achievements`);

        let updatedUsers = 0;

        for (const userId of userIds) {
            // Count achievements for this user
            const achievementCount = await Achievement.countDocuments({ userId });

            if (achievementCount > 0) {
                const user = await User.findById(userId);

                if (user) {
                    const xpToAward = achievementCount * ACHIEVEMENT_XP_BONUS;
                    const oldXP = user.xp;
                    const oldLevel = user.level;

                    // Award XP
                    user.xp += xpToAward;

                    // Recalculate level
                    const newLevel = calculateLevel(user.xp);
                    user.level = newLevel;

                    await user.save();

                    console.log(`✅ User ${user.name || userId}:`);
                    console.log(`   - Achievements: ${achievementCount}`);
                    console.log(`   - XP awarded: ${xpToAward}`);
                    console.log(`   - XP: ${oldXP} → ${user.xp}`);
                    console.log(`   - Level: ${oldLevel} → ${newLevel}`);

                    updatedUsers++;
                }
            }
        }

        console.log(`\n🎉 Migration complete!`);
        console.log(`   - Users updated: ${updatedUsers}`);
        console.log(`   - Total achievements processed: ${achievements.length}`);

        await mongoose.disconnect();
        console.log('✅ Disconnected from MongoDB');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

// Run migration
migrateAchievementXP().then(() => {
    console.log('✅ Migration script completed successfully');
    process.exit(0);
}).catch((error) => {
    console.error('❌ Migration script failed:', error);
    process.exit(1);
});
