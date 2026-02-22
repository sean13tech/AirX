const { Client } = require('@whiskeysockets/baileys');
const { DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const P = require('pino');
const path = require('path');
const fs = require('fs');

// Import command handlers
const muteCommand = require('./commands/muteCommand');
const { handleAntiLinkCommand } = require('./commands/antiLinkCommands');
const antiLink = require('./commands/antiLink');
const logger = require('./lib/logger');
const isAdmin = require('./lib/isAdmin');

const COMMAND_PREFIX = '/';
let sock = null;

/**
 * Initialize the bot
 */
async function startBot() {
    try {
        const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

        sock = new Client({
            auth: state,
            printQRInTerminal: true,
            logger: P({ level: 'silent' }),
            browser: ['Ubuntu', 'Chrome', '121.0'],
            defaultQueryTimeoutMs: undefined,
            syncFullHistory: false,
        });

        // Handle credentials update
        sock.ev.on('creds.update', saveCreds);

        // Handle connection updates
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;

            if (connection === 'close') {
                const shouldReconnect =
                    lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;

                if (shouldReconnect) {
                    logger.warn('Connection closed, reconnecting...');
                    startBot();
                } else {
                    logger.info('Connection closed by user');
                }
            } else if (connection === 'open') {
                logger.info('✅ Bot Connected Successfully');
            }
        });

        // Handle messages
        sock.ev.on('messages.upsert', async (m) => {
            try {
                await onMessage(m);
            } catch (error) {
                logger.error('Error in message handler:', error);
            }
        });

        // Handle group updates
        sock.ev.on('groups.update', async (groupUpdates) => {
            try {
                for (const update of groupUpdates) {
                    logger.info(`Group update in ${update.id}:`, update);
                }
            } catch (error) {
                logger.error('Error handling group update:', error);
            }
        });

    } catch (error) {
        logger.error('Error starting bot:', error);
        process.exit(1);
    }
}

/**
 * Main message handler
 */
async function onMessage(m) {
    try {
        const message = m.messages[0];

        // Ignore empty messages and status updates
        if (!message || message.key.remoteJid === 'status@broadcast') {
            return;
        }

        const chatId = message.key.remoteJid;
        const senderId = message.key.participant || message.key.remoteJid;
        const messageId = message.key.id;
        const isGroupChat = chatId.endsWith('@g.us');

        // Get message text from different sources
        let messageText = '';
        if (message.message?.conversation) {
            messageText = message.message.conversation;
        } else if (message.message?.extendedTextMessage?.text) {
            messageText = message.message.extendedTextMessage.text;
        }

        // Get sender name
        const senderName = message.pushName || 'User';

        logger.info(`Message from ${senderName} in ${chatId}: ${messageText.substring(0, 50)}`);

        // Anti-link handler (run first to delete messages with links)
        if (isGroupChat) {
            await antiLink.handleAntiLink(sock, chatId, messageId, senderId, senderName, messageText);
        }

        // Check if message is a command
        if (!messageText.startsWith(COMMAND_PREFIX)) {
            return;
        }

        // Parse command
        const commandContent = messageText.slice(COMMAND_PREFIX.length).trim();
        const [command, ...args] = commandContent.split(/\s+/);
        const commandLower = command.toLowerCase();

        logger.info(`Command received: ${commandLower} | Args: ${args.join(' ')}`);

        // Ensure bot is in a group for group-only commands
        if (!isGroupChat && ['mute', 'unmute', 'antilink'].includes(commandLower)) {
            await sock.sendMessage(chatId, {
                text: '❌ This command only works in groups.'
            });
            return;
        }

        // Route commands
        switch (commandLower) {
            // ===== MUTE COMMANDS =====
            case 'mute':
                await handleMuteCommand(chatId, senderId, args);
                break;

            case 'unmute':
                await handleUnmuteCommand(chatId, senderId);
                break;

            // ===== ANTI-LINK COMMANDS =====
            case 'antilink':
                await handleAntiLinkCommand(sock, chatId, senderId, senderName, command, args);
                break;

            // ===== HELP COMMAND =====
            case 'help':
            case 'start':
                await showHelp(chatId);
                break;

            // ===== PING COMMAND =====
            case 'ping':
                await sock.sendMessage(chatId, {
                    text: '🏓 Pong! Bot is online.'
                });
                break;

            // ===== DEFAULT =====
            default:
                await sock.sendMessage(chatId, {
                    text: `❌ Unknown command: \`${commandLower}\`\n\nType \`/help\` to see available commands.`
                });
        }

    } catch (error) {
        logger.error('Error processing message:', error);
    }
}

/**
 * Handle mute command
 */
async function handleMuteCommand(chatId, senderId, args) {
    try {
        if (args.length === 0) {
            await sock.sendMessage(chatId, {
                text: '❌ Usage: `/mute <minutes>`\n\nExample: `/mute 30`'
            });
            return;
        }

        const durationInMinutes = parseInt(args[0]);

        // Validate input
        if (isNaN(durationInMinutes) || durationInMinutes <= 0) {
            await sock.sendMessage(chatId, {
                text: '❌ Please provide a valid number of minutes.'
            });
            return;
        }

        if (durationInMinutes > 1440) {
            await sock.sendMessage(chatId, {
                text: '❌ Maximum mute duration is 1440 minutes (24 hours).'
            });
            return;
        }

        // Execute mute
        const success = await muteCommand.muteCommand(sock, chatId, senderId, durationInMinutes);
        if (!success) {
            logger.warn(`Mute command failed for ${chatId}`);
        }

    } catch (error) {
        logger.error('Error in mute command:', error);
        await sock.sendMessage(chatId, {
            text: '❌ An error occurred while processing the mute command.'
        });
    }
}

/**
 * Handle unmute command
 */
async function handleUnmuteCommand(chatId, senderId) {
    try {
        const success = await muteCommand.unmuteCommand(sock, chatId, senderId);
        if (!success) {
            logger.warn(`Unmute command failed for ${chatId}`);
        }
    } catch (error) {
        logger.error('Error in unmute command:', error);
        await sock.sendMessage(chatId, {
            text: '❌ An error occurred while processing the unmute command.'
        });
    }
}

/**
 * Show help message
 */
async function showHelp(chatId) {
    const helpMessage = `
🤖 **Bot Commands Help**

**📍 MUTE COMMANDS:**
• \`/mute <minutes>\` - Mute the group for specified minutes
  Example: \`/mute 30\`
• \`/unmute\` - Unmute the group immediately (admin only)

**🔗 ANTI-LINK COMMANDS:**
• \`/antilink on\` - Enable anti-link protection
• \`/antilink off\` - Disable anti-link protection
• \`/antilink stats\` - View violation statistics
• \`/antilink reset @username\` - Clear user's warnings
• \`/antilink help\` - Show anti-link help

**📋 GENERAL COMMANDS:**
• \`/help\` - Show this help message
• \`/ping\` - Check if bot is online
• \`/start\` - Show this help message

**📌 NOTES:**
✅ Group admin commands require bot admin status
✅ Admins bypass anti-link filter
✅ Anti-link: 2 warnings before automatic kick
✅ Mute duration: 1-1440 minutes (1-24 hours)

Need support? Contact the group admin.
    `;

    await sock.sendMessage(chatId, { text: helpMessage });
}

/**
 * Send a simple message (helper function)
 */
async function sendMessage(chatId, text) {
    try {
        await sock.sendMessage(chatId, { text });
    } catch (error) {
        logger.error(`Error sending message to ${chatId}:`, error);
    }
}

/**
 * Handle process signals
 */
process.on('SIGINT', () => {
    logger.info('Bot shutting down gracefully...');
    if (sock) {
        sock.logout();
    }
    process.exit(0);
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
});

// Start the bot
startBot().catch((error) => {
    logger.error('Failed to start bot:', error);
    process.exit(1);
});

module.exports = { onMessage, sendMessage };
