import { EMOJIS } from 'coop-shared/config.mjs';
import { CHANNELS, MESSAGES, USERS } from '../../../coop.mjs';
import RolesHelper from '../../members/hierarchy/roles/rolesHelper.mjs';

export default async function memberJoined(member) {

  try {
    // Send the welcome message.
    const welcomeMessage = await CHANNELS._postToChannelCode('TALK',
      `<@${member.user.id}>, please introduce yourself in ${CHANNELS.textRef('INTRO')} so the community can vote you in :smile:!\n\n` +
      `**We have unique features**: try /help to find out more, and /roles to pick what you are into.`
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

    // TODO: Could trigger events

  } catch(e) {
    console.error(e)
  }
}