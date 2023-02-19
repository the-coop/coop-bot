import { ChannelType, MessageMentions, PermissionsBitField } from "discord.js";

import { CATEGORIES } from "coop-shared/config.mjs";
import { CHANNELS, MESSAGES, TIME, USERS } from "../../../coop.mjs";

import Database from "coop-shared/setup/database.mjs";
import DatabaseHelper from "coop-shared/helper/databaseHelper.mjs";
import axios from "axios";

export default class RedditHelper {

    // https://github.com/reddit-archive/reddit/wiki/API:-submit
    // https://github.com/reddit-archive/reddit/wiki/OAuth2

    static prompt() {        
        const params = new URLSearchParams({
            state: "CONGRATULATIONS",
            redirect_uri: "https://thecoop.group/auth/reddit",
            duration: "permanent",
            scope: "submit",
            client_id: "6__IrFgjs6cRXNkwgMwB7w",
            response_type: "code"
        });

        console.log(`https://www.reddit.com/api/v1/authorize?${params}`);
    }

    static onAccessCode(code) {
        // Receive access come from user.
    }

    static async codeToToken(code) {
        const basicAuth = Buffer.from(`${'6__IrFgjs6cRXNkwgMwB7w'}:${'uaDwAitDl3j8bxRtbR2zWHdm7S5Gww'}`).toString('base64');

        const body = '' + new URLSearchParams({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: "https://thecoop.group/auth/reddit"
        });

        
        try {
            const response = await axios.post('https://www.reddit.com/api/v1/access_token',
                // Post data as a string (Reddit are freaks).
                body,
                {
                    headers: {
                        'Content-Type':'application/x-www-form-urlencoded',
                        'Authorization': `Basic ${basicAuth}`,
                        'User-Agent': "thecoop-reddit-api", //some unique user agent
                    },
                    // auth: {
                    //     username: '6__IrFgjs6cRXNkwgMwB7w',
                    //     password: ''
                    // }
                }
            );
    
            // https%3A%2F%2Fthecoop.group%2Fauth%2Freddit
            // https%3A%2F%2Fthecoop.group%2Fauth%2Freddit
    
            console.log(response.data)
        } catch(e) {
            console.log('error');
        }
        console.log(body);
    }

    static saveRefreshToken(refreshToken) {}

    // static saveAccessCode?(refreshToken) {}



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
}
    