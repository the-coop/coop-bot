import { MESSAGES, CHANNELS, STATE } from "../../../coop.mjs";
import { EGG_DATA } from '../../minigames/small/egghunt.mjs';


// Crate rarity event values mapped onto their totals field.
const CRATE_RARITY_KEYS = {
    AVERAGE_CRATE: 'average',
    RARE_CRATE: 'rare',
    LEGENDARY_CRATE: 'legendary'
};

export default class EconomyNotifications {

    static add(eventType, eventData = {}) {
        if (eventType === 'WOODCUTTING') this.updateWoodcutting(eventData);
        if (eventType === 'MINING') this.updateMining(eventData);
        if (eventType === 'EGG_HUNT') this.updateEgghunt(eventData);
        if (eventType === 'CRATE_DROP') this.updateCrateDrop(eventData);
        if (eventType === 'CHEST_POP') this.updateChestpop(eventData);
    }

    /**
     * Every event type accumulates the same way: add each numeric field of the
     * event onto whatever the bucket already holds. Keeping it in one place stops
     * totals and per-user rows drifting apart on a renamed or missing field.
     */
    static accumulate(bucket, changes) {
        Object.keys(changes).forEach(key => {
            const value = changes[key];
            if (typeof value !== 'number' || Number.isNaN(value)) return;
            bucket[key] = (bucket[key] || 0) + value;
        });
    };

    static async post() {
        let notificationString = '';
        const postTitle = '**Latest economy actions:**\n\n';
        
        const eventStatusesKeys = Object.keys(STATE.EVENTS_HISTORY);
        if (eventStatusesKeys.length > 0) {
            notificationString += postTitle;
            
            if (STATE.EVENTS_HISTORY['WOODCUTTING']) {
                const woodcutting = STATE.EVENTS_HISTORY['WOODCUTTING'];
                
                notificationString += `**Latest Woodcutting Totals:**\n` +
                    `Hits: ${woodcutting.totals.hits}\n` +
                    `Logs Cut: ${woodcutting.totals.cut}\n` +
                    `Broken Axes: ${woodcutting.totals.brokenAxes}\n` +
                    `Points Change: ${woodcutting.totals.points}\n` +

                    // Map woodcutting users string into visual feedback.
                    Object.keys(woodcutting.users)
                        .map(wcUserID => {
                            const wcUser = woodcutting.users[wcUserID];
                            return `${wcUser.username} ${wcUser.points}x${MESSAGES.emojiCodeText('COOP')} ${wcUser.cut}x:wood:`;
                        })
                        .join(', ') +

                    `\n\n`;
            }

            if (STATE.EVENTS_HISTORY['MINING']) {
                const mining = STATE.EVENTS_HISTORY['MINING'];

                const metalOreEmoji = MESSAGES.emojiCodeText('METAL_ORE');

                notificationString += `**Latest Mining Totals:**\n` +
                    `Hits: ${mining.totals.hits}\n` +
                    `Mined: ${mining.totals.mined}\n` +
                    `Diamonds: ${mining.totals.diamonds}\n` +
                    `Broken Pickaxes: ${mining.totals.brokenPickaxes}\n` +
                    `Points Change: ${mining.totals.points}\n\n` +

                    // Map mining users string into visual feedback.
                    Object.keys(mining.users)
                        .map(mnUserID => {
                            const mnUser = mining.users[mnUserID];
                            // TODO: Add metal ore and diamonds here (emojis display):
                            return `${mnUser.username} ${mnUser.points}x${MESSAGES.emojiCodeText('COOP')} ${mnUser.mined}x${metalOreEmoji}`;
                        })
                        .join(', ') +

                    `\n\n`;
            }

            const egghunt = STATE?.EVENTS_HISTORY?.['EGG_HUNT'];
            if (egghunt) {

                notificationString += '**Latest Egg Hunt Totals:**\n';

                // Map the eggs with the correct emoji.
                Object.keys(EGG_DATA).map(code => {
                    if (egghunt[code]) notificationString += 
                        `${MESSAGES.emojiCodeText(code)}x${egghunt[code]} \n`;
                })

                // Add the number of broken eggs.
                if (egghunt.broken)
                    notificationString += `${egghunt.broken} eggs were broken \n`;

                // AVERAGE_EGG: 0,
                // RARE_EGG: 0,
                // LEGENDARY_EGG: 0,
                // TOXIC_EGG: 0,

                // collected: 0,
                // broken: 0,
                // points: 0,

                // Broken eggs
                // Collected eggs total
                // Collect eggs by type
                // Points collected
                // Bombed eggs
                // Fried eggs

                // TODO 1: Ensure the data is structured correctly/added correctly.

                // TODO 2: Format and display the egg hunt data.
            }

            if (STATE.EVENTS_HISTORY['CRATE_DROP']) {
                const crateDrop = STATE.EVENTS_HISTORY['CRATE_DROP'];

                notificationString += `**Latest Crate Drop Totals:**\n` +
                    `Crates Opened: ${crateDrop.totals.opened}\n` +
                    `${MESSAGES.emojiCodeText('AVERAGE_CRATE')}x${crateDrop.totals.average} ` +
                    `${MESSAGES.emojiCodeText('RARE_CRATE')}x${crateDrop.totals.rare} ` +
                    `${MESSAGES.emojiCodeText('LEGENDARY_CRATE')}x${crateDrop.totals.legendary}\n` +
                    `Empty Crates: ${crateDrop.totals.empty}\n` +
                    `Hits: ${crateDrop.totals.hits}\n` +
                    `Items Looted: ${crateDrop.totals.loot}\n` +
                    `Points Change: ${crateDrop.totals.points}\n` +

                    // Map crate drop users string into visual feedback.
                    Object.keys(crateDrop.users)
                        .map(cdUserID => {
                            const cdUser = crateDrop.users[cdUserID];
                            return `${cdUser.username} ${cdUser.points}x${MESSAGES.emojiCodeText('COOP')} ${cdUser.loot}x📦`;
                        })
                        .join(', ') +

                    `\n\n`;
            }

            if (STATE.EVENTS_HISTORY['CHEST_POP']) {
                notificationString += `\nChestpop loot count: ${STATE.EVENTS_HISTORY['CHEST_POP'].loot}`;
            }

            // Nothing but the title means none of the tracked events fired, leave the channel alone.
            if (notificationString === postTitle) return null;

            // Keep one rolling stats post: update it in place when it is still nearby,
            // otherwise the accumulated totals would be cleared without ever being shown.
            const updateMsg = await MESSAGES.getSimilarExistingMsg(CHANNELS._getCode('TALK'), postTitle);
            if (updateMsg) await updateMsg.edit(notificationString);
            else await CHANNELS._send('TALK', notificationString);

            this.clear('WOODCUTTING');
            this.clear('MINING');
            this.clear('EGG_HUNT');
            this.clear('CRATE_DROP');
            this.clear('CHEST_POP');
        }
    };

    static clear(type) {
        delete STATE.EVENTS_HISTORY[type];
    };

    static updateMining(miningEvent) {
        const userID = miningEvent.playerID;

        if (typeof STATE.EVENTS_HISTORY['MINING'] === 'undefined') {
            STATE.EVENTS_HISTORY['MINING'] = {
                users: {

                },
                totals: {
                    mined: 0,
                    diamonds: 0,
                    brokenPickaxes: 0,
                    points: 0,
                    hits: 0
                }
            }
        }

        const mining = STATE.EVENTS_HISTORY['MINING'];

        // One event is one swing, whether it landed ore or broke a pickaxe.
        const changes = {
            points: miningEvent.pointGain,
            mined: miningEvent.recOre,
            diamonds: miningEvent.diamondsFound,
            brokenPickaxes: miningEvent.brokenPickaxes,
            hits: 1
        };

        this.accumulate(mining.totals, changes);

        // Add or update user specific stats, counting the same fields as the totals.
        if (typeof mining.users[userID] === 'undefined')
            mining.users[userID] = {
                username: miningEvent.username,
                points: 0,
                mined: 0,
                diamonds: 0,
                brokenPickaxes: 0,
                hits: 0
            };

        if (miningEvent.username) mining.users[userID].username = miningEvent.username;

        this.accumulate(mining.users[userID], changes);
    };

    static updateWoodcutting(woodcuttingEvent) {
        const userID = woodcuttingEvent.playerID;

        if (typeof STATE.EVENTS_HISTORY['WOODCUTTING'] === 'undefined') {
            STATE.EVENTS_HISTORY['WOODCUTTING'] = {
                users: {

                },
                totals: {
                    cut: 0,
                    brokenAxes: 0,
                    points: 0,
                    hits: 0
                }
            }
        }

        const woodcutting = STATE.EVENTS_HISTORY['WOODCUTTING'];

        // One event is one swing, whether it landed wood or broke an axe.
        const changes = {
            points: woodcuttingEvent.pointGain,
            cut: woodcuttingEvent.recWood,
            brokenAxes: woodcuttingEvent.brokenAxes,
            hits: 1
        };

        this.accumulate(woodcutting.totals, changes);

        // Add or update user specific stats, counting the same fields as the totals.
        if (typeof woodcutting.users[userID] === 'undefined')
            woodcutting.users[userID] = {
                username: woodcuttingEvent.username,
                points: 0,
                cut: 0,
                brokenAxes: 0,
                hits: 0
            };

        if (woodcuttingEvent.username) woodcutting.users[userID].username = woodcuttingEvent.username;

        this.accumulate(woodcutting.users[userID], changes);
    };

    static updateCrateDrop(crateDropEvent) {
        if (typeof STATE.EVENTS_HISTORY['CRATE_DROP'] === 'undefined') {
            STATE.EVENTS_HISTORY['CRATE_DROP'] = {
                users: {

                },
                totals: {
                    opened: 0,
                    average: 0,
                    rare: 0,
                    legendary: 0,
                    empty: 0,
                    loot: 0,
                    points: 0,
                    hits: 0
                }
            }
        }

        const crateDrop = STATE.EVENTS_HISTORY['CRATE_DROP'];

        // The crate is counted once per opening, separately from the per-user rewards,
        // otherwise the rarity counts would multiply by the number of hitters.
        if (crateDropEvent.type === 'OPEN') {
            const rarityKey = CRATE_RARITY_KEYS[crateDropEvent.rarity];

            const crateChanges = {
                opened: 1,
                empty: crateDropEvent.empty ? 1 : 0
            };

            if (rarityKey) crateChanges[rarityKey] = 1;

            this.accumulate(crateDrop.totals, crateChanges);

            return;
        }

        const userID = crateDropEvent.playerID;

        // One event is one hitter's share of a single crate.
        const changes = {
            points: crateDropEvent.pointGain,
            loot: crateDropEvent.lootGain,
            hits: 1
        };

        this.accumulate(crateDrop.totals, changes);

        // Add or update user specific stats, counting the same fields as the totals.
        if (typeof crateDrop.users[userID] === 'undefined')
            crateDrop.users[userID] = {
                username: crateDropEvent.username,
                points: 0,
                loot: 0,
                hits: 0
            };

        if (crateDropEvent.username) crateDrop.users[userID].username = crateDropEvent.username;

        this.accumulate(crateDrop.users[userID], changes);
    };

    static updateEgghunt(egghuntEvent) {
        // const userID = egghuntEvent.playerID;

        console.log(egghuntEvent);

        // STATE.EVENTS_HISTORY['EGG_HUNT'][egg]

        if (typeof STATE.EVENTS_HISTORY['EGG_HUNT'] === 'undefined') {
            STATE.EVENTS_HISTORY['EGG_HUNT'] = {
                // totals: {}
                AVERAGE_EGG: 0,
                RARE_EGG: 0,
                LEGENDARY_EGG: 0,
                TOXIC_EGG: 0,

                collected: 0,
                broken: 0,
                points: 0,

                // These aren't implemented yet:
                // fried: 0,
                // bombed: 0
            }
        }

        // Count the collected egg.
        if (egghuntEvent.type === 'COLLECT') {
            STATE.EVENTS_HISTORY['EGG_HUNT'][egghuntEvent.eggType]++;
            STATE.EVENTS_HISTORY['EGG_HUNT'].points += egghuntEvent.pointGain;
        }

        // Count the broken egg.
        if (egghuntEvent.type === 'BROKEN')
            STATE.EVENTS_HISTORY['EGG_HUNT'].broken++;
        
        // EconomyNotifications.add('EGG_HUNT', {
        //     playerID: user.id,
        //     username: user.username,
        //     type: 'COLLECT',
        //     eggType: rarity,
        //     pointGain: reward
        // });


    };

    static updateChestpop(chestpopEvent) {

        if (typeof STATE.EVENTS_HISTORY['CHEST_POP'] === 'undefined') {
            STATE.EVENTS_HISTORY['CHEST_POP'] = {
                loot: 0
            }
        }

        this.accumulate(STATE.EVENTS_HISTORY['CHEST_POP'], { loot: chestpopEvent.loot });
    };
};