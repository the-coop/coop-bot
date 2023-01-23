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

}