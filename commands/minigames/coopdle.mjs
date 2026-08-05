import { SlashCommandBuilder } from "discord.js";

import { CHANNELS, CHICKEN, TIME } from "../../coop.mjs";

import EventsHelper from "../../operations/eventsHelper.mjs";
import CoopdleMinigame from "../../operations/minigames/small/coopdle.mjs";
import CoopdleStore, { STATUSES } from "../../operations/minigames/small/coopdle/coopdleStore.mjs";

export const name = 'coopdle';

export const description = 'Coopdle stats: the community board and your guessing record.';

export const data = new SlashCommandBuilder()
	.setName(name)
	.setDescription(description)
	.addUserOption(option =>
		option
			.setName('target')
			.setDescription('Whose Coopdle stats? (default yours)')
	);

const percent = (part, whole) => whole ? `${Math.round((part / whole) * 100)}%` : '0%';

export const execute = async (interaction) => {
	try {
		const targetInput = interaction.options.get('target');
		const target = targetInput ? targetInput.user : interaction.user;

		const [totals, stats, leaders, active] = await Promise.all([
			CoopdleStore.totals(),
			CoopdleStore.playerStats(target.id),
			CoopdleStore.leaderboard(5),
			CoopdleStore.active()
		]);

		const lines = [
			`🟩 **COOPDLE** 🟩`,
			`Boards solved: **${totals.solved}**/${totals.finished} (${percent(totals.solved, totals.finished)}), ` +
			`${totals.guesses} guesses from ${totals.players} player${totals.players === 1 ? '' : 's'}.`
		];

		// Boards only ever drop in talk, so that is where to point people.
		if (active && active.status === STATUSES.PLAYING)
			lines.push(`A board is live now: ${active.message_link || `find it in ${CHANNELS.textRef('TALK')}`}`);

		else {
			// Today's board is scheduled a random while after the coop day rolls.
			const due = parseInt(await CHICKEN.getConfigVal(CoopdleMinigame.DUE_KEY), 10) || 0;
			const waitSecs = due - TIME._secs();

			lines.push(waitSecs > 0
				? `Today's board drops in ${EventsHelper.msToReadable(waitSecs * 1000)}.`
				: `Today's board has already been played, another comes with the next coop day.`);
		}

		lines.push('');

		if (stats && stats.guesses)
			lines.push(
				`**${target.username}**`,
				`Guesses: ${stats.guesses} (${stats.correct_guesses} revealed something new, ${percent(stats.correct_guesses, stats.guesses)})`,
				`Solved: ${stats.solves}${stats.best_solve ? ` (best ${stats.best_solve} guesses)` : ''}`,
				`Boards helped with: ${stats.games} (${stats.wins} solved, ${stats.losses} lost)`
			);
		else
			lines.push(`**${target.username}** has not played a Coopdle yet.`);

		if (leaders.length) {
			lines.push('', '**Top solvers**');
			leaders.forEach((leader, index) => lines.push(
				`${index + 1}. ${leader.username || leader.player_id} - ` +
				`${leader.solves} solved, ${leader.correct_guesses} useful guesses`
			));
		}

		return await interaction.reply({ content: lines.join('\n'), ephemeral: true });

	} catch (e) {
		console.error(e);
		console.log('Error loading coopdle stats.');
		return await interaction.reply({ content: 'Error loading Coopdle stats.', ephemeral: true });
	}
};
