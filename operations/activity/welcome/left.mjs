import { USERS, CHANNELS } from '../../../coop.mjs';

export default async function memberLeft(member) {

  try {
    // Remove from database and cascade all other entries (optimisation)
    await USERS.removeFromDatabase(member);

  } catch(e) {
    console.error(e)
  }
}