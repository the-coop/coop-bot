import CompetitionHelper from "../social/competitionHelper.mjs";

export default async function messageDeletedHandler(msg) {  
    try {
        console.log('Message deleted');

        CompetitionHelper.onDelete(msg);

    } catch(e) {
        console.log('Error handling added message.');
        console.error(e);
    }
};