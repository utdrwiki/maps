import { openUrl } from "./util.mjs";

const wikiHelpAction = tiled.registerAction('OpenWikiHelp', () =>
    openUrl('https://undertale.wiki/d/t/interactive-maps-project/318'));
wikiHelpAction.text = 'Wiki extension help ↗';
wikiHelpAction.icon = 'wiki.svg';

const wikiDiscordAction = tiled.registerAction('OpenWikiDiscord', () =>
    openUrl('https://undertale.wiki/w/Project:Discord'));
wikiDiscordAction.text = 'Undertale/Deltarune Wiki Discord ↗';
wikiDiscordAction.icon = 'discord.svg';

tiled.extendMenu('Help', [
    {
        separator: true
    },
    {
        action: 'OpenWikiHelp'
    },
    {
        action: 'OpenWikiDiscord'
    }
]);
