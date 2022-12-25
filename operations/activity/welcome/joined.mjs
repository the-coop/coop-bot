import { EMOJIS } from 'coop-shared/config.mjs';
import { ButtonStyle, ActionRowBuilder, ButtonBuilder } from 'discord.js';
import { CHANNELS, MESSAGES, USERS } from '../../../coop.mjs';

export default async function memberJoined(member) {

  try {
    // Send the welcome message.
    const welcomeMessage = await CHANNELS._postToChannelCode('TALK', 
      `Hey <@${member.user.id}>! Please introduce yourself in ${CHANNELS.textRef('INTRO')} so the community can fully approve you into the server :smile:!\n\n` +
      `_Be aware that you can only send one ${CHANNELS.textRef('INTRO')} message, make it good!_\n\n` +
      `Here in ${CHANNELS.textRef('TALK')} you get the chance to talk to the community while waiting to get accepted :D! `
    );
    
    // React with coop emoji... because.
    MESSAGES.delayReact(welcomeMessage, EMOJIS.COOP, 333);
    MESSAGES.delayReact(welcomeMessage, '👋', 666);

    // Register the member.
    await USERS.register(member.id, member.user.username, member.joinedTimestamp);

    const gameLoginLink = 'https://discord.com/api/oauth2/authorize?method=discord_oauth&client_id=799695179623432222' +
      "&redirect_uri=https%3A%2F%2Fthecoop.group%2Fauth%2Fauthorise&response_type=code&scope=identify&state=game";

    // Add informative buttons to the message.
    welcomeMessage.edit({ components: [		
      new ActionRowBuilder().addComponents([
        new ButtonBuilder()
          .setEmoji('📖')
          .setLabel("Guide")
          .setURL("https://www.thecoop.group/guide")
          .setStyle(ButtonStyle.Link),
        new ButtonBuilder()
          .setEmoji('🥚')
          .setLabel("Minigames")
          .setURL("https://www.thecoop.group/guide/minigames")
          .setStyle(ButtonStyle.Link),
        new ButtonBuilder()
          .setEmoji('🌎')
          .setLabel("Conquest")
          .setURL(gameLoginLink)
          .setStyle(ButtonStyle.Link),
        new ButtonBuilder()
          .setEmoji('👤')
          .setLabel("Profile")
          .setURL(`https://www.thecoop.group/members/${member.id}`)
          .setStyle(ButtonStyle.Link)
      ])]
    });
    

  } catch(e) {
    console.error(e)
  }
}