import { USERS, MESSAGES, ROLES, CHANNELS, TIME } from '../../../coop.mjs';
import { RAW_EMOJIS, ROLES as ROLES_CONFIG, CHANNELS as CHANNEL_CONFIG } from 'coop-shared/config.mjs';
import RolesHelper from '../../members/hierarchy/roles/rolesHelper.mjs';

export default async (msg) => {
  try {
    if (msg.channel.id !== CHANNEL_CONFIG.INTRO.id) return false;
    if (msg.author.bot) return false;

    // Access the full featured member object for the user.
    const memberSubject = USERS._get(msg.author.id);

    // Check they haven't already posted an intro
    const savedUser = await USERS.loadSingle(memberSubject.user.id);

    // Add intro message link and time to intro if in the database.
    const introLink = MESSAGES.link(msg);

    const hasMemberRole = USERS.hasRoleID(memberSubject, ROLES_CONFIG.MEMBER.id);
    
    // Add an intro link for a member without an existing intro.
    if (!savedUser.intro_link)
      await USERS.setIntro(memberSubject.user.id, msg.content, introLink, TIME._secs());

    // Prevent users from adding two intro_links.
    if (savedUser.intro_link) {

      const warningText = `**You have already posted an intro**, only one introduction message allowed. \n\n` +
      `Deleting your message in 6 seconds, copy it if you want to preserve it.`;

      // Send warning.
      MESSAGES.silentSelfDestruct(msg, warningText, 0, 5000);

      // Delete the intro.
      MESSAGES.delayDelete(msg, 3333 * 2);

      return null;
    }

    // Send avatar + header embed (due to loading jitter issue)
    const username = memberSubject.user.username;

    // Send embed to approval channel for redeeming non-members via introduction.
    if (!hasMemberRole) {
      // Inform the server and general chat (ping intro posted subscribers.
      const introText = `${ROLES._textRef('INSIDER')}, ${username} posted an introduction in ${CHANNELS.textRef('INTRO')}! 👋`;
      await CHANNELS._send('TALK', introText, {});
    
      await CHANNELS._postToChannelCode('TALK', MESSAGES.embed({
        url: MESSAGES.link(msg),
        title: `${username} needs your vote for approval!`,
        description: `Please read ${CHANNELS.textRef('INTRO')} and submit your vote! \n`,
        thumbnail: USERS.avatar(memberSubject.user)
      }));

      // Add the emojis
      MESSAGES.delayReact(msg, RAW_EMOJIS.VOTE_FOR, 111);
      MESSAGES.delayReact(msg, RAW_EMOJIS.VOTE_AGAINST, 222);

      // Add the intro poster role.
      RolesHelper._remove(memberSubject.user.id, 'POST_INTRO');
    }

  } catch(e) {
    console.error(e);
    console.log('Intro handling error above. ^');
  }
}
