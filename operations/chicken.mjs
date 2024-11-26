import moment from 'moment';

import ElectionHelper from './members/hierarchy/election/electionHelper.mjs';
import CooperMorality from './minigames/small/cooperMorality.mjs';

import { STATE, CHANNELS, TIME, ITEMS, ROLES, MESSAGES, USERS } from "../coop.mjs";
import Items from "coop-shared/services/items.mjs";
import DropTable from './minigames/medium/economy/items/droptable.mjs';
import TemporaryMessages from './activity/maintenance/temporaryMessages.mjs';

import Database from 'coop-shared/setup/database.mjs';
// import VisualisationHelper from './minigames/medium/conquest/visualisationHelper.mjs';

import ActivityHelper from './activity/activityHelper.mjs';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

const OAUTH_LOGIN_URL = 'https://discord.com/api/oauth2/authorize?method=discord_oauth&client_id=799695179623432222&redirect_uri=https%3A%2F%2Fthecoop.group%2Fauth%2Fauthorise&response_type=code&scope=identify';

export default class Chicken {

    static getDiscordID() {
        return STATE.CLIENT.user.id;
    };

    static async getConfig(key) {
        let value = null;

        try {
            const query = {
                name: "get-chicken-config",
                text: `SELECT * FROM chicken WHERE attribute = $1`,
                values: [key]
            };
            const result = await Database.query(query);
            if ((result.rows || []).length) {
                const resultData = result.rows[0] || null;
                if (resultData) value = resultData;
            }
        } catch(e) {
            console.error(e);
        }

        return value;
    };

    static async getConfigVal(key) {
        let val = null;

        const configEntry = await this.getConfig(key);
        if (configEntry) val = configEntry.value;

        return val;
    };

    static async setConfig(key, value) {
        const query = {
            name: "set-chicken-config",
            text: `INSERT INTO chicken(attribute, value)
                VALUES($1, $2) 
                ON CONFLICT (attribute)
                DO 
                UPDATE SET value = $2
                RETURNING value`,
            values: [key, value]
        };
        const result = await Database.query(query);
        return result;
    };

    static async _nextdayis() {
        const remainingMoment = await this._nextdayisMoment();
        const remainingReadable = moment.utc(remainingMoment).format("HH:mm:ss");
        return remainingReadable;
    };

    static async _nextdayisMoment() {
        const latestSecs = await this.getCurrentDaySecs();
        const presentSecs = Math.floor(+new Date() / 1000);
        const dayDuration = (3600 * 24);

        const latestMoment = moment.unix(latestSecs + dayDuration);
        const currentMoment = moment.unix(presentSecs);
        const remainingMoment = latestMoment.diff(currentMoment);

        return remainingMoment;
    };

    static async getCurrentDaySecs() {
        let secs = null;
        const currentDaySecs = await this.getConfigVal('current_day');
        if (currentDaySecs) secs = parseInt(currentDaySecs);
        return secs;
    };
    
    // TODO: Consider adding observable for checkIfNewDay (provide events)
    static async isNewDay() {
        const currentDaySecs = await this.getCurrentDaySecs();
        const nowSecs = TIME._secs();
        const dayDurSecs = (60 * 60) * 24
        const isNewDay = nowSecs >= currentDaySecs + dayDurSecs;

        return isNewDay;
    };

    static async getTransactionsPreviousDay() {
        const twentyFourHourSecs = 86400;
        const txs = await ITEMS.getTransactionsSince(twentyFourHourSecs);
        return txs;
    };

    static async checkIfNewDay() {
        try {
            // Comparison to internal state may show a way to detect day end too.
            const isNewDay = await this.isNewDay();
            if (!isNewDay) return false;

            // Check the most important things at the beginning of a new day.
            ElectionHelper.checkProgress();

            // Send the conquest visuals!
            // await VisualisationHelper.record("https://www.thecoop.group/conquest/world");
            // CHANNELS._getCode('TALK').send(newDayText, new MessageAttachment('/tmp/video.webm'));
            // + new AttachmentBuilder(buffer, { name: 'image.png' });

            // const txsPrevDay = await this.getTransactionsPreviousDay();
            // const summarisedTxs = ActivityHelper.summariseTransactions(txsPrevDay);

            const newDayMessage = `${ROLES._textRef('NEW_COOP_DAY')}\n\n`

            await CHANNELS._getCode('TALK').send('https://cdn.discordapp.com/attachments/723660447508725806/1056735020036935760/new-coop-day.png');
            const newDayMsg = await CHANNELS._getCode('TALK').send({
                content: newDayMessage,
                components: [
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setLabel('Daily Reward')
                            .setCustomId('claim_daily_reward')
                            .setStyle(ButtonStyle.Primary),
                        new ButtonBuilder()
                            .setLabel('Login')
                            .setURL(OAUTH_LOGIN_URL)
                            .setStyle(ButtonStyle.Link)

                    )
                ]
            });

            // Update the current day record.
            await this.setConfig('current_day', '' + TIME._secs());

            // Try to attempt a giveaway based on random roll.
            if (STATE.CHANCE.bool({ likelihood: 5 })) 
                CooperMorality.giveaway();

            return true;

        } catch(e) {
            console.log('New day detection failed.')
            console.error(e);
        }
    };

    // onInteraction handler for Daily Reward Button
    static async onInteraction(interaction) {
        // Only run the button for claim_daily_reward
        if (interaction.customId !== "claim_daily_reward") return false;

        try {
            // Fetch the last claim date for user
            const lastClaim = await USERS.getUserLastClaim(interaction.user.id)

            // Check if user can claim daily reward
            const allowClaim = (lastClaim) => {
                // If the date is NULL (default in database) then can claim
                if (!lastClaim) return true;
                // If the date is atleast 24 hours ago then can claim
                const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
                return new Date(lastClaim).getTime() <= twentyFourHoursAgo;
            };

            // Call the allowClaim function with lastClaim date (safeguard)
            if(!allowClaim(lastClaim.last_claim)) return false; 

            // Update the userLastClaim date
            await USERS.setUserLastClaim(interaction.user.id)

            // Get one reward from droptable for Gathering drops
            const { item, qty } = DropTable.getRandomTieredWithQty('GATHERING');

            // Announce the rewards in TALK
            const dailyRewardText = `<@${interaction.user.id}> collected the daily reward: ${MESSAGES.emojiCodeText(item)}x${qty}`;
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

};