import CompetitionHelper from "../social/competitionHelper.mjs";

export default async function messageDeletedHandler(msg) {  
    try {
        CompetitionHelper.onDelete(msg);

    } catch(e) {
        console.log('Error handling deleted message.');
        console.error(e);
    }
};