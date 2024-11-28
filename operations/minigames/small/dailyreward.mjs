import { CHANNELS, MESSAGES, USERS } from '../../../coop.mjs';
import DropTable from '../medium/economy/items/droptable.mjs';
import TemporaryMessages from '../../activity/maintenance/temporaryMessages.mjs';
import ItemsShared from "coop-shared/services/items.mjs";
import Trading from "coop-shared/services/trading.mjs";

export default class DailyRewardMinigame {
    
    // onInteraction handler for Daily Reward Button (created in chicken.mjs)
    static async onInteraction(interaction) {
        
        // Only run the button for claim_daily_reward
        if (interaction.customId !== "claim_daily_reward") return false;

        try {
            // Define safeguard for allowing one claim in 24h window
            const allowClaimDate = async (lastClaim) => {
                // If the date is NULL (default in database) then can claim
                if (!lastClaim) return true;

                // Invalid date format safeguard
                if (isNaN(Date.parse(lastClaim))) return false;

                // If the date is atleast 24 hours ago then can claim
                const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000
                return new Date(lastClaim).getTime() <= twentyFourHoursAgo;
            };

            // Define safeguard for not passing over 15 item qty
            const hasUserOverItemLimit = async (userId, item) => {
                // Return result of user item amount >= 15
                return await ItemsShared.hasQty(userId, item, 15);
            };

            // Define safeguard for preventing reward
            // if user has active trade with the same item
            const hasOpenTradeForItem = async (userId, item) => {
                const openTrades = await Trading.getByTrader(userId);
                return openTrades.some(trade => trade.offer_item === item);
            };

            const userId = interaction.user.id;
            // Fetch the last claim date for user
            const lastClaim = await USERS.getUserLastClaim(userId);
            // Safeguard claim date
            if(!(await allowClaimDate(lastClaim.last_claim))) return false; 


            // Update the userLastClaim date
            await USERS.setUserLastClaim(userId)

            // Get one reward from droptable for Gathering drops
            const { item, qty } = DropTable.getRandomTieredWithQty('GATHERING');
            // Safeguard item quantity (if user has equal or over 15, dont reward)
            if (await hasUserOverItemLimit(userId, item)) return false;
            // Safeguard trading bypass (if user has outstanding trade with the itemtype, dont reward)
            if (await hasOpenTradeForItem(userId, item)) return false;

            // Announce the rewards in TALK
            const dailyRewardText = `<@${userId}> collected the daily reward: ${MESSAGES.emojiCodeText(item)}x${qty}`;
            const dailyRewardMessage = CHANNELS._send('TALK', dailyRewardText);
            TemporaryMessages.add(dailyRewardMessage, 30 * 60);

            // Reward user with the item
            // Items.add(interaction.user.id, item, qty, `Daily reward`);

        } catch (e) {
            console.error(e);
            console.log('Error while giving Daily Rewards');

        } finally {
            // Return interaction reply for Each interaction regardless of outcome
            return await interaction.reply({ content: `Daily Rewards! :chicken~1: `, ephemeral: true });
        }
    };

}