import { readFileSync } from 'fs';

import Chicken from './chicken.mjs';
import { CHANNELS } from '../coop.mjs';

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)));

export default class VersionHelper {

    static version = version;

    // Announce in talk when Cooper starts on a version it hasn't announced yet.
    static async announceIfUpdated() {
        try {
            const previous = await Chicken.getConfigVal('bot_version');
            if (previous === version) return false;

            await Chicken.setConfig('bot_version', version);

            const fromText = previous ? `v${previous} → ` : '';
            await CHANNELS._send('TALK', `🐔 Cooper has updated: ${fromText}**v${version}**`);

            return true;
        } catch(e) {
            console.log('Version announcement failed.');
            console.error(e);
        }
    };

};
