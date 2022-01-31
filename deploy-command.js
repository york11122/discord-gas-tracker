const { SlashCommandBuilder } = require('@discordjs/builders');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');

const commands = [
    new SlashCommandBuilder().setName('alert').setDescription('gas fee 追蹤提醒').addIntegerOption(option => option.setName('gwei')
        .setRequired(true)
        .setDescription('低於此數值提醒')),
    new SlashCommandBuilder().setName('cancel').setDescription('gas fee 取消提醒')
]
    .map(command => command.toJSON());

const rest = new REST({ version: '9' }).setToken("OTM2NjI5ODk0Nzk0ODU0NDUw.YfP-kA.Pe_R6mjBK9uhHkxewRdMzvDG5MY");

rest.put(Routes.applicationCommands("936629894794854450"), { body: commands })
    .then(() => console.log('Successfully registered application commands.'))
    .catch(console.error);