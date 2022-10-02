import EmojiHelper from "./emojiHelper.mjs";

import COOP, { SERVER, TIME, STATE } from "../../../../../coop.mjs";
import { EMOJIS, RAW_EMOJIS } from 'coop-shared/config.mjs';
import Useable from 'coop-shared/services/useable.mjs';

import Database from "coop-shared/setup/database.mjs";
import DatabaseHelper from "coop-shared/helper/databaseHelper.mjs";
import Items from "coop-shared/services/items.mjs";


export default class ItemsHelper {

    // Input Takes a string and extracts the items mentioned in it. Returns an array containing the item codes. The search is greedy so will extrct the longest possible name
    static parseItemCodes(inputString) {
        // Remove multiple spaces and make uppercase
        const str = inputString.replace(/\s\s+/g, ' ').toUpperCase();

        const usableItemsStr = Useable.getUsableItems();

        // Generate The regex to match the items. This is only done once to save server time
        const matchRegex = new RegExp("(" + usableItemsStr.join("|").replace("_", "[_\\s]") + ")", 'g');

        // Match with the regex. This returns an array of the found matches
        const matches = str.match(matchRegex);

        // Return matches as canonical item codes
        return matches.map(x => x.replace(/\s/g, '_'));
    }

    static beautifyItemCode(itemCode) {
        const lowerName = itemCode.replace("_", " ").toLowerCase();
        const nameCapitalized = lowerName.charAt(0).toUpperCase() + lowerName.slice(1);
        const emoji = COOP.MESSAGES.emojifyID(EMOJIS[itemCode]);
        return emoji + " " + nameCapitalized + " ";
    }

    static async getTransactionsSince(secs) {
        const since = TIME._secs() - secs;
        const query = {
            text: `SELECT * FROM item_qty_change_history WHERE occurred_secs > $1`,
            values: [since]
        };  
        const result = await DatabaseHelper.manyQuery(query);
        return result;
    }

    static async getTransactions(limit = 100) {
        const query = {
            name: "transactions",
            text: `SELECT * FROM item_qty_change_history LIMIT $1`,
            values: [limit]
        };  

        const result = await DatabaseHelper.manyQuery(query);
        return result;
    }

    static async getAllItemOwners(itemCode) {
        const query = {
            name: "get-all-user-items",
            text: `SELECT * FROM "items" WHERE item_code = $1 ORDER BY quantity DESC`,
            values: [itemCode]
        };

        return DatabaseHelper.many(await Database.query(query));
    }
    
    static async getUserItems(userID) {
        const query = {
            name: "get-all-user-items",
            text: `SELECT * FROM "items" WHERE owner_id = $1 ORDER BY quantity DESC`,
            values: [userID]
        };

        return DatabaseHelper.many(await Database.query(query));
    }

    static async perBeakRelativePrice(code, percPrice, min = 0.01) {
        const avg = await this.perBeak(code);
		const price = Math.max(min, (avg * percPrice).toFixed(2));
        return price;
    }
    
    static async perBeak(itemCode) {
        const userCount = SERVER._coop().memberCount || 0;
        const total = await Items.count(itemCode);
        return total / userCount;
    }

    static async read(userID, itemCode) {
        const query = {
            name: "read-item",
            text: "SELECT * FROM items WHERE owner_id = $1 AND item_code = $2",
            values: [userID, itemCode]
        };
        return await Database.query(query);
    }

    static async update(userID, itemCode, quantity) {
        const query = {
            name: "update-item",
            text: `UPDATE items SET quantity = $3 
                WHERE owner_id = $1 AND item_code = $2`,
            values: [userID, itemCode, quantity]
        };
        return await Database.query(query);
    }
    
    static formItemDropText(user, items) {
        let itemDisplayMsg = `${user.username}'s items:`;
        items.forEach(item => {
            const emojiIcon = COOP.MESSAGES.emojifyID(EMOJIS[item.item_code]);
            const displayQty = this.displayQty(item.quantity);
            const itemText = `\nx${displayQty} ${this.escCode(item.item_code)} ${emojiIcon}`;
            itemDisplayMsg += itemText;
        });
        return itemDisplayMsg;
    }

    static escCode(itemCode) {
        return `**${itemCode.replace('_', '\\_')}**`;
    }

    static parseFromStr(str) {
        let match = null;
        const usables = Useable.getUsableItems();
        const key = str.trim().replace(' ', '_').toUpperCase();
        usables.map(usable => {
            if (usable === key) match = usable;
        });
        return match;
    }

    static async getUserWithItem(itemCode) {
        const query = {
            name: "get-user-with-item",
            text: `SELECT * FROM "items" WHERE quantity > 0 AND item_code = $1`,
            values: [itemCode]
        };
        const result = await Database.query(query);
        return DatabaseHelper.single(result);
    }

    static async getUsersWithItem(itemCode) {
        const query = {
            name: "get-users-with-item",
            text: `SELECT * FROM "items" WHERE quantity > 0 AND item_code = $1`,
            values: [itemCode]
        };
        const result = await Database.query(query);
        return DatabaseHelper.many(result);
    }
    
    static itemEmojiQtyStr(itemCode, itemQty = 1) {
        return `${COOP.MESSAGES.emojiCodeText(itemCode)}x${itemQty}`;
    }

    static gainItemQtyStr(itemCode, itemQty = 1) {
        return `:arrow_right: ${this.itemEmojiQtyStr(itemCode, itemQty)}`;
    }

    static lossItemQtyStr(itemCode, itemQty = 1) {
        return `:arrow_left: ${this.itemEmojiQtyStr(itemCode, itemQty)}`;
    }

    static exchangeItemsQtysStr(lossItem, lossQty, gainItem, gainQty) {
        return `${this.lossItemQtyStr(lossItem, lossQty)}\n${this.gainItemQtyStr(gainItem, gainQty)}`;
    }

    static emojiToItemCode(emoji) {
        let itemCode = null;
        Object.keys(EMOJIS).map(emojiName => {
            if (EMOJIS[emojiName] === emoji) itemCode = emojiName;
        });
        return itemCode;
    }

    // Try to parse item codes.
    static interpretItemCodeArg(text = '') {
		let itemCode = null;
        
        // Interpret item code from the assumed item name not emoji.
        itemCode = this.parseFromStr(text.trim());

        // Prioritse emoji overwriting/preference over text (if supplied).
        const emojiID = COOP.MESSAGES.strToEmojiID(text);
        const emojiSupportedCode = this.emojiToItemCode(emojiID);
        if (emojiSupportedCode) itemCode = emojiSupportedCode;

        // Prioritise direct emoji overwriting if given as plain/raw/direct emoji encoded string.
        const rawToItem = EmojiHelper.rawEmojiToCode(text);
        if (rawToItem) itemCode = rawToItem;

        return itemCode;
    }

    // Get the total count of user's items.
    static async getUserTotal(id) {
        let total = 0;

        const query = {
            name: "get-user-owned-total",
            text: `SELECT owner_id, SUM(quantity) as total FROM items
                WHERE owner_id = $1
                GROUP BY owner_id ORDER BY total DESC LIMIT 1`,
            values: [id]
        };

        const result = await Database.query(query);
        const userItemsSum = DatabaseHelper.single(result);
        if (userItemsSum) total = userItemsSum.total;

        return total;
    }

    static codeToFlake(code) {
        return EMOJIS[code] || null;
    }

    static async getRichest() {
        return await DatabaseHelper.singleQuery({
            name: "get-richest",
            text: `SELECT owner_id, SUM(quantity) as total FROM items 
                WHERE item_code = 'GOLD_COIN'
                GROUP BY owner_id ORDER BY total DESC LIMIT 1`
        });
    }


    // Calculating person with most items and rewarding them.
    static async updateRichest() {
        // Calculate the community user with most items.
        const richestDb = await this.getRichest();

        // Access the member with the most items.
        const richestMember = COOP.USERS._get(richestDb.owner_id);
        const username = richestMember.user.username;

        // Load the most items role, cache is probably fine.
        const richestRole = COOP.ROLES._getByCode('RICHEST');

        // Calculate if they already had this reward role on last check.
        let alreadyHadRole = false;

        // Remove the role from previous winner and commiserate.
        let prevWinner = null;
        richestRole.members.map(prevMostMember => {
            if (prevMostMember.user.id === richestMember.user.id) alreadyHadRole = true;
            else {
                prevWinner = prevMostMember.user;
                prevMostMember.roles.remove(richestRole);
            }
        });

        // If the new winner didn't already have the role, award it and notify server.
        if (!alreadyHadRole) {
            // Add point reward to item leader.
            const pointsAfter = await Items.add(richestMember.user.id, 'COOP_POINT', 100, 'Won richest role');
            
            // Add the role to new item leader.
            richestMember.roles.add(richestRole);
            
            // Post Feedback.            
            let successText = `${username} is now the **richest**!`;
            if (prevWinner) successText = ` ${username} overtakes ${prevWinner.username} as richest member!`;
            successText += ` Given RICHEST reward role and 100 points (${pointsAfter})!`;
            COOP.CHANNELS._send('TALK', successText);
        }
    }

    // Calculating person with most items and rewarding them.
    static async getBiggestWhale() {
        // Calculate the community user with most items.
        const query = {
            name: "get-all-owned-sums",
            text: `SELECT owner_id, SUM(quantity) as total FROM items GROUP BY owner_id ORDER BY total DESC LIMIT 1`
        };
        
        const result = await Database.query(query);
        const mostItems = DatabaseHelper.single(result);

        return mostItems;
    }


    // Calculating person with most items and rewarding them.
    static async updateMostItems() {
        const mostItems = await this.getBiggestWhale();

        // Access the member with the most items.
        const mostItemsMember = COOP.USERS._get(mostItems.owner_id);
        const username = mostItemsMember.user.username;

        // Load the most items role, cache is probably fine.
        const mostItemsRole = COOP.ROLES._getByCode('MOST_ITEMS');

        // Calculate if they already had this reward role on last check.
        let alreadyHadRole = false;

        // Remove the role from previous winner and commiserate.
        let prevWinner = null;
        mostItemsRole.members.map(prevMostMember => {
            if (prevMostMember.user.id === mostItems.owner_id) alreadyHadRole = true;
            else {
                prevWinner = prevMostMember.user;
                prevMostMember.roles.remove(mostItemsRole);
            }
        });

        // If the new winner didn't already have the role, award it and notify server.
        if (!alreadyHadRole) {
            // Add point reward to item leader.
            
            const pointsAfter = await Items.add(mostItems.owner_id, 'COOP_POINT', 50, 'Won most items role');
            
            // Add the role to new item leader.
            mostItemsMember.roles.add(mostItemsRole);
            
            // Post Feedback.            
            let successText = `${username} is now the biggest hoarder.`;
            if (prevWinner) successText = ` ${username} overtakes ${prevWinner.username} for most items!`;
            successText += ` Given MOST ITEMS reward role and 50 points (${pointsAfter})!`;
            COOP.CHANNELS._send('TALK', successText);
        }
    }


    // Drop an item.
    // TODO: Maybe approach drop and other things on a channel basis?
    static async drop(msgRef, itemCode, lifetimeSecs = 400, unmarked = false) {
        // Drop the item based on its code.
        const emojiText = COOP.MESSAGES.emojiText(EMOJIS[itemCode]);

        // Send drop emoji text and update message ref
        msgRef = await COOP.MESSAGES.selfDestruct(msgRef, emojiText, 0, lifetimeSecs * 1000)

        // Add indicative and suggestive icons, maybe refactor.
        COOP.MESSAGES.delayReact(msgRef, EMOJIS.BASKET, 666);

        // Only mark it as dropped if not specified otherwise.
        if (!unmarked)
            COOP.MESSAGES.delayReact(msgRef, RAW_EMOJIS.DROPPED, 333);
    }

    // Round in a way that works for display.
    static displayQty(num) {
        const rounded = Math.round((num + Number.EPSILON) * 100) / 100;
        const noZeroes = rounded.toString();
        return noZeroes;
    }


}
