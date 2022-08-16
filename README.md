# Cooper (The Coop's Discord Bot & Web API)

PRIMARY_WEBSITE_URL:
https://thecoop.group/

PRIMARY_API_URL:
https://cooperchickenbot.herokuapp.com

PRIMARY_APP:
cooperchickenbot

# Installing from source code:

Quick start current stable version:
Clone Github repository >> https://github.com/the-coop/cooper.git
yarn install

Contributors only/development version:
Clone Github DEVELOPMENT repository >> git clone -b development https://github.com/the-coop/cooper.git

# Environment/configuration:
Create .env file in root (cooper/.env)

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