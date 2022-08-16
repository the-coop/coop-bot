import _ from 'lodash';
import { SlashCommandBuilder } from "@discordjs/builders";
import COOP  from '../../organisation/coop.mjs';

import { 
	validItemQtyArgFloatGuard, usableItemCodeGuard 
} from '../../operations/minigames/medium/economy/itemCmdGuards.mjs';

import FlareHandler from '../../operations/minigames/medium/economy/items/handlers/flareHandler.mjs';
import LaxativeHandler from '../../operations/minigames/medium/economy/items/handlers/laxativeHandler.mjs';
import ShieldHandler from '../../operations/minigames/medium/economy/items/handlers/shieldHandler.mjs';
import RPGHandler from '../../operations/minigames/medium/economy/items/handlers/rpgHandler.mjs';
import EasterEggHandler from '../../operations/minigames/medium/economy/items/handlers/easterEggHandler.mjs';
import GoldCoinHandler from '../../operations/minigames/medium/economy/items/handlers/goldCoinHandler.mjs';
import MineHandler from '../../operations/minigames/medium/economy/items/handlers/mineHandler.mjs';
import DefuseKitHandler from '../../operations/minigames/medium/economy/items/handlers/defuseKitHandler.mjs';

export const name = 'use';

export const description = 'Use items you own';

export const data = new SlashCommandBuilder()
    .setName(name)
    .setDescription(description)
	.addStringOption(option => 
		option
			.setName('item_code')
			.setDescription('Use which item [ITEM_CODE or item emoji]')
	// )
	// .addIntegerOption(option => 
	// 	option
	// 		.setName('item_qty')
	// 		.setDescription('Use how many?')
	);

const handlers = {
    // RPG: RPGHandler,
    // GOLD_COIN: GoldCoinHandler,
    LAXATIVE: LaxativeHandler,
    FLARE: FlareHandler,
    SHIELD: ShieldHandler,
    EASTER_EGG: EasterEggHandler,
    MINE: MineHandler,
    DEFUSE_KIT: DefuseKitHandler
};

export const execute = async (interaction) => {
    // Guard to a proper float input.
    const qty = 1;
	// let qty = interaction.options.get('item_qty').value ?? null;
    // qty = parseFloat(qty);

    // Maybe it fails in DMs?
    
    if (!validItemQtyArgFloatGuard(interaction.channel, interaction.user, qty))
        return null;

    // Interpret item code from text/string/emoji/item_code.
    const itemCodeInput = interaction.options.get('item_code');
    let itemCode = _.get(itemCodeInput, 'value');
    itemCode = COOP.ITEMS.interpretItemCodeArg(itemCode);

    // Usable item guard
    if (!usableItemCodeGuard(interaction.channel, itemCode, interaction.user.username))
        return null;

    // Item is usable, therefore use it.
    const handler = handlers[itemCode];
    if (handler)
        return handler.use(interaction, interaction.user);
}
