const { SlashCommandBuilder } = require('@discordjs/builders');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
require('dotenv').config();

const commands = [
    new SlashCommandBuilder().setName('alert').setDescription('gas fee 追蹤提醒').addIntegerOption(option => option.setName('gwei')
        .setRequired(true)
        .setDescription('低於此數值提醒')),
    new SlashCommandBuilder().setName('cancel_alert').setDescription('gas fee 取消提醒'),
    new SlashCommandBuilder().setName('track').setDescription('追蹤用戶').addStringOption(option => option.setName('address')
        .setRequired(true)
        .setDescription('用戶錢包地址')),
    new SlashCommandBuilder().setName('cancel_track').setDescription('取消追蹤用戶').addStringOption(option => option.setName('address')
        .setRequired(true)
        .setDescription('用戶錢包地址')),
    new SlashCommandBuilder().setName('list_track').setDescription('列出當前追蹤用戶'),
    new SlashCommandBuilder().setName('get_nft').setDescription('列出用戶所擁有NFT').addStringOption(option => option.setName('address')
        .setRequired(true)
        .setDescription('用戶錢包地址')),
]
    .map(command => command.toJSON());

const rest = new REST({ version: '9' }).setToken(process.env.DISCORD_TOKEN);

rest.put(Routes.applicationCommands("936629894794854450"), { body: commands })
    .then(() => console.log('Successfully registered application commands.'))
    .catch(console.error);