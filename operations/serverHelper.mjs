import axios from 'axios';
import { ROLES } from 'coop-shared/config.mjs';

import { CHANNELS, TIME, STATE } from '../coop.mjs';

import Chicken from './chicken.mjs';
import RolesHelper from './members/hierarchy/roles/rolesHelper.mjs';

export default class ServerHelper {

    static _coop() { return this.getByID(STATE.CLIENT, process.env.GUILD_ID); }

    static getByID(client, id) { return client.guilds.cache.get(id); }

    static _count(numBots = 1) { return this._coop().memberCount - numBots || 0; }

    static checkMissingChannels() {
        Object.keys(CHANNELS.config).map(ck => {
            if (!CHANNELS._get(CHANNELS.config[ck].id)) 
                console.log('No channel ' + ck);
        });
    }

    static checkMissingRoles() {
        console.log('Checking missing roles');

        Object.keys(ROLES).map(roleKey => {
            const role = ROLES[roleKey];
            const realRole = RolesHelper._get(role.id)
            if (!realRole) console.log('No role ' + roleKey);

            // TODO Check for roles on the server but not in the config
        });
    }

    static async webRebuildHandler() {
        // Check last build time.
        const lastElecMsgSecs = parseInt(await Chicken.getConfigVal('last_website_build'));
        const nowSecs = TIME._secs();

        // Check if it has expired (week in seconds).
        const expiration = lastElecMsgSecs + 3600 * 24 * 7;
        if (nowSecs > expiration) {
            console.log('Web build required.');

            // Update build time.
            Chicken.setConfig('last_website_build', TIME._secs());
            
            // Trigger Netlify rebuild of static site.
            axios.post('https://api.netlify.com/build_hooks/61295f9514147c115d2db4e9?trigger_branch=master&trigger_title=built-by-cooper');

            // Post website is rebuilding to the activity logs channel.
            CHANNELS._send('ACTIONS', 'Website rebuild was triggered.');
        } else {
            // Post time until rebuild triggered in activity logs channel.
            const until = expiration - nowSecs;
            CHANNELS._send('ACTIONS', `Website rebuild is due in roughly ${Math.round(until / 3600)} hours.`);
        }
    }

}