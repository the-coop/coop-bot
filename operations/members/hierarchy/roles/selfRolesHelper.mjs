import { ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from 'discord.js';

import { CHANNELS } from '../../../../coop.mjs';
import RolesHelper from './rolesHelper.mjs';

export const SELECT_PREFIX = 'self_roles';

// The roles nobody else decides for you: no election, point total or item count
// hands these out, so members opt in and out of them whenever they like.
// Everything earned (Leader, Most Points, Most Items, Member, ...) stays out of here.
export const SELF_MANAGED = {
    INTERESTS: {
        placeholder: 'Interests - the subjects you care about',
        roles: {
            TECH: 'Programming, hardware and technology',
            MONEY: 'Trading, investing and the economy',
            ART: 'Art, design and creative work'
        }
    },
    ACCESS: {
        placeholder: 'Access - which parts of the server you want',
        roles: {
            SOCIAL: 'The social side of the community',
            PROJECTS: 'Building things together',
            GAMING: 'Gaming sessions and chat',
            CONQUEST: 'The Coop conquest game'
        }
    },
    NOTIFICATIONS: {
        placeholder: 'Pings - what Cooper is allowed to ping you for',
        roles: {
            SUBSCRIBER: 'Announcements and election results',
            NEW_COOP_DAY: 'The start of each new coop day',
            MINIGAME_PING: 'Crate drops and other minigame events',
            INSIDER: 'New members posting introductions',
            STOCKS_EARLY_BIRD: 'The stock market opening'
        }
    }
};

export default class SelfRolesHelper {

    // Codes are only offered if the role still exists on the server,
    // otherwise a stale config entry would break the whole menu.
    static _groups(member) {
        return Object.keys(SELF_MANAGED)
            .map(key => {
                const options = Object.entries(SELF_MANAGED[key].roles)
                    .map(([code, description]) => {
                        const role = RolesHelper._getByCode(code);
                        if (!role) return null;

                        return new StringSelectMenuOptionBuilder()
                            .setValue(code)
                            .setLabel(role.name)
                            .setDescription(description)
                            .setDefault(member.roles.cache.has(role.id));
                    })
                    .filter(option => !!option);

                return { key, options };
            })
            .filter(({ options }) => options.length);
    };

    static _components(member) {
        return this._groups(member).map(({ key, options }) =>
            new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId(`${SELECT_PREFIX}_${key}`)
                    .setPlaceholder(SELF_MANAGED[key].placeholder)
                    .setMinValues(0)
                    .setMaxValues(options.length)
                    .addOptions(options)
            )
        );
    };

    static _summary(member, changeText = '') {
        const held = this._groups(member)
            .flatMap(({ options }) => options.filter(option => option.data.default))
            .map(option => option.data.label);

        return [
            '**Your roles**',
            'Select the ones you want, deselect the ones you do not. ' +
            'Roles you earn (Leader, Member, Most Points, Most Items, ...) are not listed, Cooper handles those.',
            '',
            held.length ? `You currently have: ${held.join(', ')}.` : 'You currently have none of them.',
            changeText
        ].filter(line => line !== '').join('\n');
    };

    static _denied(member) {
        if (!member) return 'Use /roles inside The Coop server.';
        if (!RolesHelper._has(member, 'MEMBER'))
            return `Only members can manage their own roles, post an introduction in ${CHANNELS.textRef('INTRO')} to be voted in.`;

        return null;
    };

    // Slash command entry point, an ephemeral menu of the caller's own roles.
    static async open(interaction) {
        try {
            const member = interaction.member;

            const denied = this._denied(member);
            if (denied) return await interaction.reply({ content: denied, ephemeral: true });

            return await interaction.reply({
                content: this._summary(member),
                components: this._components(member),
                ephemeral: true
            });

        } catch (e) {
            console.error(e);
            console.log('Error opening self-managed roles menu.');
            return await interaction.reply({ content: 'Error loading your roles.', ephemeral: true });
        }
    };

    // Interaction interceptor for the menus opened by /roles.
    static async onInteraction(interaction) {
        try {
            const id = interaction.customId;
            if (!id || !id.startsWith(SELECT_PREFIX)) return false;
            if (!interaction.isStringSelectMenu()) return false;

            const key = id.slice(SELECT_PREFIX.length + 1);
            if (!SELF_MANAGED[key]) return false;

            return await this.apply(interaction, key);

        } catch (e) {
            console.error(e);
            console.log('Above error related to self-managed roles interaction handler.');
            return false;
        }
    };

    // Take the selection as the truth for that group and move the member towards it.
    static async apply(interaction, key) {
        let member = interaction.member;

        const denied = this._denied(member);
        if (denied) return await interaction.update({ content: denied, components: [] });

        const wanted = interaction.values;
        const additions = [];
        const removals = [];

        Object.keys(SELF_MANAGED[key].roles).forEach(code => {
            const role = RolesHelper._getByCode(code);
            if (!role) return;

            const has = member.roles.cache.has(role.id);
            if (wanted.includes(code) && !has) additions.push(role);
            if (!wanted.includes(code) && has) removals.push(role);
        });

        try {
            if (additions.length) member = await member.roles.add(additions.map(role => role.id));
            if (removals.length) member = await member.roles.remove(removals.map(role => role.id));

        } catch (e) {
            console.error(e);
            console.log('Error changing self-managed roles for ' + interaction.user.username);
            return await interaction.update({
                content: this._summary(member, 'Cooper could not change those roles, they may be above him.'),
                components: this._components(member)
            });
        }

        // Reflect the change back so the menu never lies about what they have.
        const changes = [
            additions.length ? `Added ${additions.map(role => role.name).join(', ')}.` : '',
            removals.length ? `Removed ${removals.map(role => role.name).join(', ')}.` : ''
        ].filter(change => change !== '');

        return await interaction.update({
            content: this._summary(member, changes.join(' ') || 'Nothing changed.'),
            components: this._components(member)
        });
    };

};
