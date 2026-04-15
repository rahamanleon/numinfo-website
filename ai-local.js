const axios = require("axios");

// Modified for local API server - change this to your ngrok URL when ready
const LOCAL_API_URL = "http://127.0.0.1:3000";
// Or use: process.env.LOCAL_API_URL || "http://127.0.0.1:3000"

module.exports = {
        config: {
                name: "ai",
                version: "1.7-local",
                author: "MahMUD",
                countDown: 5,
                role: 0,
                description: {
                        bn: "AI এর সাথে চ্যাট করুন (Local)",
                        en: "Chat with local AI assistant"
                },
                category: "ai",
                guide: {
                        bn: '   {pn} <প্রশ্ন>: আপনার প্রশ্নটি লিখুন',
                        en: '   {pn} <question>: Type your question'
                }
        },

        langs: {
                bn: {
                        noQuery: "× বেবি, কিছু তো জিজ্ঞেস করো!",
                        noResponse: "দুঃখিত, কোনো উত্তর পাওয়া যায়নি।",
                        error: "× এআই কাজ করছে না: %1। প্রয়োজনে Contact MahMUD।"
                },
                en: {
                        noQuery: "× Please provide a question!",
                        noResponse: "Sorry, I couldn't generate a response.",
                        error: "× API error: %1. Contact MahMUD for help."
                }
        },

        onStart: async function ({ api, message, args, event, getLang }) {
                const authorName = String.fromCharCode(77, 97, 104, 77, 85, 68);
                if (this.config.author !== authorName) {
                        return api.sendMessage("You are not authorized to change the author name.", event.threadID, event.messageID);
                }

                const query = args.join(" ");
                if (!query) return message.reply(getLang("noQuery"));

                try {
                        // Use local API instead of fetching from GitHub
                        const apiUrl = `${LOCAL_API_URL}/api/ai`;

                        const response = await axios.post(apiUrl, 
                                { question: query },
                                { headers: { "Content-Type": "application/json" } }
                        );

                        const replyText = response.data.response || getLang("noResponse");

                        api.sendMessage(replyText, event.threadID, (error, info) => {
                                if (!error) {
                                        global.GoatBot.onReply.set(info.messageID, {
                                                commandName: this.config.name,
                                                author: event.senderID,
                                                messageID: info.messageID
                                        });
                                }
                        }, event.messageID);

                } catch (err) {
                        console.error("Error in AI command:", err);
                        return message.reply(getLang("error", err.message));
                }
        },

        onReply: async function ({ api, event, Reply, args, getLang, message }) {
                if (Reply.author !== event.senderID) return;
                
                const query = args.join(" ");
                if (!query) return;

                try {
                        // Use local API instead of fetching from GitHub
                        const apiUrl = `${LOCAL_API_URL}/api/ai`;

                        const response = await axios.post(apiUrl, 
                                { question: query },
                                { headers: { "Content-Type": "application/json" } }
                        );

                        const replyText = response.data.response || getLang("noResponse");

                        api.sendMessage(replyText, event.threadID, (error, info) => {
                                if (!error) {
                                        global.GoatBot.onReply.set(info.messageID, {
                                                commandName: this.config.name,
                                                author: event.senderID,
                                                messageID: info.messageID
                                        });
                                }
                        }, event.messageID);

                } catch (err) {
                        return message.reply(getLang("error", err.message));
                }
        }
};
