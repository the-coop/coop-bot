import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

import Items from "coop-shared/services/items.mjs";
import Useable from "coop-shared/services/useable.mjs";

import { STATE, ITEMS, MESSAGES, CHANNELS, INTERACTION } from "../../../coop.mjs";
import { EMOJIS } from "coop-shared/config.mjs";

import EconomyNotifications from "../../activity/information/economyNotifications.mjs";
import SkillsHelper from "../medium/skills/skillsHelper.mjs";
import Statistics from "../../activity/information/statistics.mjs";
import TemporaryMessages from "../../activity/maintenance/temporaryMessages.mjs";

export default class MiningMinigame {

    // User interaction "chipping" mining rocks.
    static async onInteraction(interaction) {
        try {
            // Interaction is not relevant to mining, skip.
            if (interaction.customId !== 'mine') return false;

            // Extract required attributes.
            const { message, channel, user } = interaction;

            // High chance of preventing any mining at all to deal with rate limiting.
            if (STATE.CHANCE.bool({ likelihood: 50 })) return await INTERACTION.reply(interaction, 'You missed...');

            // Calculate magnitude from message: more rocks, greater reward.
            const textMagnitude = Math.floor(message.content.length / 2);
            const rewardRemaining = STATE.CHANCE.natural({ min: 1, max: textMagnitude * 2 });

            // Check if has a pickaxe.
            const userPickaxesNum = await Items.getUserItemQty(user.id, 'PICK_AXE')
            if (userPickaxesNum <= 0) return await INTERACTION.reply(interaction, 'No pickaxe to mine with.');

            // Count the number of people mining to apply a multipler/bonus.
            const ptsEmoji = MESSAGES.emojiCodeText('COOP_POINT');

            // Adjust extracted ore by buffs and adjust to clamp above > 0.
            const extractedOreNum = Math.max(0, Math.ceil(rewardRemaining / 1.5));

            // Clamp lower and upper boundary for chance of pickaxe breaking
            const pickaxeBreakPerc = Math.min(15, Math.max(15, extractedOreNum));

            // Attempt to access the mining message.
            let updateMsg = await MESSAGES.getSimilarExistingMsg(channel, '**MINING IN PROGRESS**');
                
            // Test the pickaxe for breaking.
            const didBreak = STATE.CHANCE.bool({ likelihood: pickaxeBreakPerc });
            if (didBreak) {
                const pickaxeUpdate = await Useable.use(user.id, 'PICK_AXE', 1);
                const brokenPickDamage = -2;
                const pointsDamageResult = await Items.subtract(user.id, 'COOP_POINT', Math.abs(brokenPickDamage), 'Broken pickaxe damage');
                const ptsDmgText = ITEMS.displayQty(pointsDamageResult);
                
                // Update mining economy statistics.
                EconomyNotifications.add('MINING', {
                    playerID: user.id,
                    username: user.username,
                    brokenPickaxes: 1,
                    pointGain: brokenPickDamage
                });    

                // Add the experience.
                SkillsHelper.addXP(user.id, 'mining', 2);

                const actionText = `${user.username} broke a pickaxe trying to mine, ${userPickaxesNum - 1} remaining! Gained 2xp in mining for trying!.`;
                return await INTERACTION.reply(interaction, actionText);
            } 

            // See if updating the item returns the item and quantity.
            const addMetalOre = await Items.add(user.id, 'METAL_ORE', extractedOreNum, 'Mining');
            const addPoints = await Items.add(user.id, 'COOP_POINT', 1, 'Mining');
            let diamondsFound = 0;

            // Small probability reward.
            if (STATE.CHANCE.bool({ likelihood: 3.33 })) {
                diamondsFound = 1;
                const addDiamond = await Items.add(user.id, 'DIAMOND', diamondsFound, 'Mining rare event');
                CHANNELS.propagate(message, `${user.username} found a diamond whilst mining! (${addDiamond})`, 'ACTIONS');
            }

            // Extremely small probability of high value reward.
            if (STATE.CHANCE.bool({ likelihood: 0.25 })) {
                diamondsFound = STATE.CHANCE.natural({ min: 5, max: 25 });
                await Items.add(user.id, 'DIAMOND', diamondsFound, 'Mining very rare event');
                CHANNELS.propagate(message, `${user.username} hit a major diamond vein, ${diamondsFound}xDIAMOND found!`, 'TALK');
            }

            // Add the experience.
            SkillsHelper.addXP(user.id, 'mining', 1);

            // Add to economy stats for display.
            EconomyNotifications.add('MINING', {
                pointGain: 1,
                recOre: extractedOreNum,
                playerID: user.id,
                username: user.username,
                diamondsFound
            });

            // Reduce the number of rocks in the message.
            if (textMagnitude > 1) await message.edit(EMOJIS.ROCK.repeat(textMagnitude - 1));
            else await message.delete();

            // Provide feedback.
            const actionText = `${user.username} +${extractedOreNum}${EMOJIS.ROCK} +${1}${ptsEmoji}`;

            // Edit and update the message if found
            if (updateMsg) {
                // Track matching lines.
                let matchingAction = false;
                const updatedContent = updateMsg.content.split('\n').map(l => {
                    const regex = new RegExp(`\\b${user.username}\\b \\+(\\d+)${EMOJIS.ROCK} \\+(\\d+)${ptsEmoji}`, 'i');
                    const match = l.match(regex);

                    if (match) {
                        // Parse existing values from the text.
                        const rock = parseInt(match[1]);
                        const pts = parseInt(match[2]);

                        // Need to know if there is a match to prevent new line being added.
                        matchingAction = true;
                        
                        // Update the line with new rock and coop points
                        return `${user.username} +${rock + extractedOreNum}${EMOJIS.ROCK} +${pts + 1}${ptsEmoji}`;
                    }

                    // Return the original line if no match
                    return l;
                }).join('\n');

                // Edit the message with updated content
                if (matchingAction)
                    updateMsg.edit(updatedContent);

                // Add mining stats with no matching existing row.
                else
                    updateMsg.edit(updateMsg.content + '\n' + `${actionText}`);
            }

            // Store to track latest mining stats.
            EconomyNotifications.add('MINING', {
                pointGain: 1,
                recRock: extractedOreNum,
                playerID: user.id,
                username: user.username
            });

            // Add the experience.
            SkillsHelper.addXP(user.id, 'mining', 1);

            // Show user success message.
            return await INTERACTION.reply(interaction, actionText);


        } catch(e) {
            console.error(e);
            console.log('Mining error');
            return await INTERACTION.reply(interaction, 'Something went wrong when mining!');

        }
    };

    // Event handler for dropping mining rocks.
    static async run() {
        const channel = CHANNELS._randomSpammable();
        
        // TODO: Adjust points and diamond rewards if more rocks
        // Add rare chances of a lot of rocks
        const base = Math.max(1, await Statistics.calcCommunityVelocity());
        let magnitude = STATE.CHANCE.natural({ min: base, max: base * 3 });
        if (STATE.CHANCE.bool({ likelihood: 5 }))
            magnitude = STATE.CHANCE.natural({ min: base * 5, max: base * 20 });

        if (STATE.CHANCE.bool({ likelihood: 1 }))
            magnitude = STATE.CHANCE.natural({ min: base * 7, max: base * 35 });

        // Post a message for collecting events against.
        const announce = await  channel.send('https://cdn.discordapp.com/attachments/1200884411135168583/1279503397791469701/mining-ready.png');
        const updates = await channel.send('**MINING IN PROGRESS**');
        const rocks = await channel.send(EMOJIS.ROCK.repeat(magnitude));
        rocks.edit({ 
            components: [
                new ActionRowBuilder().addComponents([
                    new ButtonBuilder()
                        .setEmoji('⛏️')
                        .setLabel("Mine")
                        .setCustomId('mine')
                        .setStyle(ButtonStyle.Primary)
                ])
            ]
        });

        // Ensure message is stored in database for clear up.
        // TODO: Count as ungathered rock in activity messages.
        TemporaryMessages.add(rocks, 30 * 60);
        TemporaryMessages.add(announce, 30 * 60);
        TemporaryMessages.add(updates, 30 * 60);
    };

};
