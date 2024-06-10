import { EMOJIS } from 'coop-shared/config.mjs';
import { ButtonStyle, ActionRowBuilder, ButtonBuilder } from 'discord.js';
import { CHANNELS, MESSAGES, USERS } from '../../../coop.mjs';
import RolesHelper from '../../members/hierarchy/roles/rolesHelper.mjs';

export default async function memberJoined(member) {

  try {
    // Send the welcome message.
    const welcomeMessage = await CHANNELS._postToChannelCode('TALK', 
      `<@${member.user.id}>, please introduce yourself in ${CHANNELS.textRef('INTRO')} so the community can vote you in :smile:!\n\n` +
      `**We have unique features**: Use the guide button below to find out more!`
    );
    
    // React with coop emoji... because.
    MESSAGES.delayReact(welcomeMessage, EMOJIS.COOP, 333);
    MESSAGES.delayReact(welcomeMessage, '👋', 666);

    // Register the member.
    await USERS.register(member.id, member.user.username, member.joinedTimestamp);

    // Add the intro poster role.
    RolesHelper.add(member, 'POST_INTRO');
    RolesHelper.add(member, 'SUBSCRIBER');
    RolesHelper.add(member, 'SOCIAL');
    RolesHelper.add(member, 'BEGINNER');
    RolesHelper.add(member, 'PROJECTS');


    const gameLoginLink = 'https://discord.com/api/oauth2/authorize?method=discord_oauth&client_id=799695179623432222' +
      "&redirect_uri=https%3A%2F%2Fthecoop.group%2Fauth%2Fauthorise&response_type=code&scope=identify&state=game";

     // Add roles button to webhook messages.
    const rolesLoginLink = 'https://discord.com/api/oauth2/authorize?method=discord_oauth&client_id=799695179623432222' +
      "&redirect_uri=https%3A%2F%2Fthecoop.group%2Fauth%2Fauthorise&response_type=code&scope=identify&state=roles";

    // Add informative buttons to the message.
    welcomeMessage.edit({ components: [		
      new ActionRowBuilder().addComponents([
        new ButtonBuilder()
          .setEmoji('📖')
          .setLabel("Guide")
          .setURL("https://www.thecoop.group/guide")
          .setStyle(ButtonStyle.Link),
        new ButtonBuilder()
          .setEmoji('⚙️')
          .setLabel("Roles")
          .setURL(rolesLoginLink)
          .setStyle(ButtonStyle.Link),
        new ButtonBuilder()
          .setEmoji('🎮')
          .setLabel("Game")
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