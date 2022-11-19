import { EMOJIS } from 'coop-shared/config.mjs';
import { CHANNELS, MESSAGES, USERS } from '../../../coop.mjs';

export default async function memberJoined(member) {

  try {
    // Notify community:
    const joinAnnouncementText = `**Someone new joined "${member.user.username}": ${CHANNELS.textRef('TALK')}!**`;
    CHANNELS._codes(['TALK'], joinAnnouncementText);

    // Send the welcome message.
    const welcomeMessage = await CHANNELS._postToChannelCode('TALK', 
      `Hey <@${member.user.id}>! Please introduce yourself in ${CHANNELS.textRef('INTRO')} so the community can fully approve you into the server :smile:!\n\n` +
      `_Be aware that you can only send one ${CHANNELS.textRef('INTRO')} message, make it good!_\n\n` +
      `Here in ${CHANNELS.textRef('TALK')} you get the chance to talk to the community while waiting to get accepted :D! `
    );
    
    // React with coop emoji... because.
    MESSAGES.delayReact(welcomeMessage, EMOJIS.COOP, 333);
    MESSAGES.delayReact(welcomeMessage, '👋', 666);

  } catch(e) {
    console.error(e)
  }
}