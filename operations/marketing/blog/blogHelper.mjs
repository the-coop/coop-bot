import { ChannelType, MessageMentions, PermissionsBitField } from "discord.js";

import { CATEGORIES } from "coop-shared/config.mjs";
import { CHANNELS, MESSAGES, TIME, USERS } from "../../../coop.mjs";

import Database from "coop-shared/setup/database.mjs";
import DatabaseHelper from "coop-shared/helper/databaseHelper.mjs";
import axios from "axios";

export default class BlogHelper {

    static async passed(suggestion) {
        const ownerID = MessageMentions.UsersPattern.exec(suggestion.content)[1] || null;
        const title = MESSAGES.getRegexMatch(/Title: __([^\r\n]*)__/gm, suggestion.content);
        const deadline = MESSAGES.getRegexMatch(/Deadline: ([^\r\n]*)/gm, suggestion.content);

        const member = await USERS._fetch(ownerID);
        
        const channel = await this.channelDraft(title, member, deadline);

        // Is this necessary??
        const announcementMsg = await CHANNELS._postToChannelCode('TALK', `Blog draft post created! <#${channel.id}>`);
    }

    static async publish(title, slug, content, authorID) {
        try {
            // Access the autohr username.
            const author = await USERS.loadSingle(authorID);

            // Add the channel to the database.
            const query = {
                name: "publish-post",
                text: `INSERT INTO blog_posts(
                        title, slug,
                        content,
                        author_id,
                        author_username,
                        date
                    )
                    VALUES($1, $2, $3, $4, $5, $6)`,
                values: [
                    title, slug,
                    content, authorID, author.username,
                    TIME._secs()
                ]
            };


            return await Database.query(query);
        } catch(e) {
            console.log('Error publishing channel draft to a blog post.');
            console.error(e);
        }
    }

    static async loadDraft(draftID) {
        const draft = await DatabaseHelper.singleQuery({
            name: "load-draft",
            text: `SELECT * FROM post_drafts WHERE id = $1`,
            values: [draftID]
        });
        return draft;
    }

    static async loadDrafts() {
        const draft = await DatabaseHelper.manyQuery({
            name: "load-drafts", text: `SELECT * FROM post_drafts`
        });
        return draft;
    }


    static loadPostByID(id) {
        return DatabaseHelper.singleQuery({
            name: "load-post-id", 
            text: `SELECT * FROM blog_posts WHERE id = $1`,
            values: [id]
        });
    }



    static async deleteDraft(draftID) {
        return Database.query({
            name: 'delete-draft',
            text: 'DELETE FROM post_drafts WHERE id = $1',
            values: [draftID]
        })
    }

    static async buildDraft(draftChannel) {
        const messages = await draftChannel.messages.fetch({});
        const content = messages.map(msg => {
            if (USERS.isCooperMsg(msg)) return null;

            let subContent = msg.content;
            msg.attachments.map(attachment => 
                subContent += `\n\n ![${attachment.name}](${attachment.url})`
            );
            return subContent;
        }).join('\n\n');
        return content;
    }

    static async fulfilDraft(draft) {
        try {
            // Save a channel to database as a piece of blog content.
            const chan = CHANNELS._get(draft.channel_id);
            const content = await this.buildDraft(chan);

            const slug = encodeURIComponent(draft.title.replaceAll(' ', '-').toLowerCase());

            // Save to blog posts database (public on website).
            this.publish(draft.title, slug, content, draft.owner_id);

            // Delete the channel.
            chan.delete();

            // Delete draft.
            this.deleteDraft(draft.id);

            // Inform the owner the draft has been published.
            USERS._dm(draft.owner_id, `Draft "${draft.title}" was just published!\n\n` + 
                'It will be live here when processed: https://www.thecoop.group/blog/' + slug);

        } catch(e) {
            console.log('Error turning blog post channel into a blog post.');
            console.error(e);
        }
    }
    
    static async channelDraft(name, owner, deadline) {
        try {
            // Create the channel under projects.
            const channel = await CHANNELS._create({
                name: 'post_' + name,
                type: ChannelType.GuildText,
                parent: CATEGORIES['PROPAGANDA'].id,
                // Set the owner and their permissons.
                permissionOverwrites: [
                    {
                        id: owner.id,
                        allow: [
                            PermissionsBitField.Flags.ManageChannels
                        ]
                    }
                ],
                reason: 'Democratically approve and paid for with GOLD_COIN',
                position: 9999
            });

            // Take human readable due time.
            const unixSecsDeadline = Math.round(TIME.parseHuman(deadline).getTime() / 1000);

            // Add the channel to the database.
            const query = {
                name: "create-post-draft",
                text: `INSERT INTO post_drafts(
                        title, description, 
                        channel_id, owner_id,
                        created, deadline
                    )
                    VALUES($1, $2, $3, $4, $5, $6)`,
                values: [
                    name, 'No description yet.',
                    channel.id, owner.id,
                    TIME._secs(), unixSecsDeadline
                ]
            };

            const result = await Database.query(query);

            return channel;

        } catch(e) {
            console.log('Error creating draft blog post channel!');
            console.error(e);
            return null;
        }
    }

    static async onChannelUpdate(chanUpdate) {
        // Ensure it's a project channel.
        if (chanUpdate.parentId !== CATEGORIES['PROPAGANDA'].id)
            return false;

        // Make sure to request the most up to date channel data.
        const freshChan = await chanUpdate.fetch();

        // Get the new title and description.
        if (freshChan.topic) {
            const topicParts = freshChan.topic.split('\n');
            const title = topicParts[0];
            const description = topicParts.slice(1).join('\n');
    
            // Store it in the database to make viewable from the website?
            await this.setTitle(chanUpdate.id, title);
            await this.setDescription(chanUpdate.id, description);
        }
    } 

    static async setTitle(channelID, title) {
        const slug = encodeURIComponent(title.replaceAll(' ', '-').toLowerCase());
        return await DatabaseHelper.singleQuery({
            name: "set-post-title",
            text: 'UPDATE posts SET title = $2, slug = $3 WHERE channel_id = $1',
            values: [channelID, title, slug]
        });
    }

    static async setDescription(channelID, description) {
        return await DatabaseHelper.singleQuery({
            name: "set-post-description",
            text: 'UPDATE posts SET description = $2 WHERE channel_id = $1',
            values: [channelID, description]
        });
    }

    // https://github.com/reddit-archive/reddit/wiki/API:-submit
    // https://github.com/reddit-archive/reddit/wiki/OAuth2


    // static async redditAccessToken() {
    //     let token = null;
        
    //     try {
    //         const basicAuth = Buffer.from(`${process.env.REDDIT_APP_ID}:${process.env.REDDIT_APP_SECRET}`).toString('base64');
    //         const response = await axios.post('https://www.reddit.com/api/v1/access_token',
    //             '' + new URLSearchParams({
    //                 grant_type: 'client_credentials',
    //                 device_id: 'PRIMARY_COOP_API'
    //             }),
    //             {
    //                 headers: {
    //                     'Content-Type':'application/x-www-form-urlencoded',
    //                     'Authorization': `Basic ${basicAuth}`
    //                 }
    //             }
    //         );

    //         console.log(response.data)

    //         token = response?.data?.access_token;
            
    //     } catch (error) {
    //         console.error(error);
    //     }

    //     return token;
    // }


    // static async test() {
    //     try {
    //         const accessToken = await this.redditAccessToken();

    //         // https://www.reddit.com/dev/api/oauth#POST_api_live_{thread}_update
    //         const response = await axios.post(
    //             'https://oauth.reddit.com/api/submit',
    //             {
    //                 ad: false,
    //                 api_type: 'json',
    //                 app: true,
    //                 // extension: '????',

    //                 // g-recaptcha-response	
    //                 kind: 'self',

    //                 nsfw: false,

    //                 sr: 'thecoopgroup',

    //                 // raw markdown text
    //                 title: 'TESTING TESTING TESTING',
    //                 text: 'TESTING TESTING TESTING',

    //                 // title of the submission. up to 300 characters long
    //                 // uh / X-Modhash header	
    //                 // a modhash
    //             },
    //             {
    //                 headers: {
    //                     'Authorization': `Bearer ${accessToken}`,
    //                     'User-Agent': 'nodejs:thecoopgroup:1'
    //                 }
    //             }
    //         );
            
    //         console.log(response);
    //         console.log(response.data);

    //         console.log(JSON.stringify(response.data, null, 4));

    //     } catch(e) {
    //         console.error(e);
    //     }
    // }
}

    // static async postToReddit(title, content) {
    //     try {
    //         const accessToken = await this.redditAccessToken();


    //         const uh = '????';

    //         const response = await axios.post(
    //             'https://www.reddit.com/api/submit',
    //             {
    //                 kind: 'self',
    //                 sr: 'thecoopgroup',
    //                 title: title,
    //                 text: content,
    //                 uh
    //             },
    //             {
    //                 headers: {
    //                     'Authorization': `Bearer ${accessToken}`,
    //                     'User-Agent': 'nodejs:thecoopgroup:1'
    //                 }
    //             }
    //         );
            
    //         console.log(response);
    //         console.log(response.data);
    //     } catch(e) {
    //         console.error(e);
    //     }
    // }

    