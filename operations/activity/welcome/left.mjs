import { USERS, CHANNELS } from '../../../coop.mjs';

export default async function memberLeft(member) {

  try {
    // Post in leaders channel.
    await CHANNELS._send('ACTIONS', `${member.user.username} has flown the coop. F for ${member.user.username}`);

    // Remove from database and cascade all other entries (optimisation)
    await USERS.removeFromDatabase(member);

  } catch(e) {
    console.error(e)
  }
}