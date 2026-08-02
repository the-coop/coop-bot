# Cooper (The Coop's Discord Bot)

PRIMARY_WEBSITE_URL:
https://thecoop.group/

PRIMARY_API_URL:


# Installing from source code:

Quick start current stable version:
Clone Github repository >> https://github.com/the-coop/coop-bot.git
yarn install

# Environment/configuration:
Create .env file in root (coop-bot/.env)

# Add following 3 lines to .env file in root.
DISCORD_TOKEN=<DISCORD_TOKEN >
DATABASE_URL=<DATABASE_URL>
GUILD_ID=<GUILD_ID>

# Local testing:
Local running (for accuracy/non-duplication only one instance per GUILD_ID supported*).
heroku local worker [for bot testing]
heroku local web [for API testing]

# Extra-Local or surgical testing:
yarn dev
Starts script text: nodemon --exec 'node --experimental-json-modules' ./origin/setup/shallow.mjs

# Production running:
yarn start-bot
Starts script text: node --experimental-json-modules ./index.mjs

yarn start-api
Starts script text: node --experimental-json-modules ./api.mjs

Note: For successful operation your deployment/hosting target must have a valid .env file.

# Deploying/updating slash commands via Discord API:
yarn deploy-commands
Starts script text: node --experimental-json-modules ./patching/deploy-commands.mjs

# Access database (Postgres):
yarn db
Starts script text: heroku pg:psql --app <PRIMARY_APP>

# Coopdle (collaborative Wordle minigame):
One board a day, dropped a random 20-120 mins after the new coop day rolls over
(that rollover drifts, so the board does too). Anybody can spend one of its eight
shared guesses via the Guess button, and when the word falls everyone who guessed
is rewarded, the solver most of all. Boards nobody finishes are closed after 20hrs.

Because the guesses are shared, a guess may not reuse a letter the board has already
ruled out: the guess box lists the pinned letters and the dead ones.

Needs its tables creating once before deploying:
yarn db < db/coopdle.sql

Guesses are working state and are deleted when a board ends. What persists is the
finished game row (total solved) and each player's running totals in coopdle_stats,
visible through /coopdle.

The answer is a random offset into the five letter dictionary, re-rolled if it lands
on a word the community has had recently, so boards don't repeat.

# Lint (we hate you):
yarn lint
Starts script text: eslint .

\* Single Server Bot (SSB**)
\*\* Idk if this exists, just made it up.





Steps that had to be taken to create host instance:

Security group
Key
Pipeline
appspec buildspec

Install nvm
nvm alias default lts/*



https://jeffmcneill.com/bashrc-bash_profile-path-on-ami/
