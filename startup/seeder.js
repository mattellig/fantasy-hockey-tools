const winston = require('winston');
const Goalie = require('../models/goalie');
const Skater = require('../models/skater');
const nhlStatsApi = require('../services/nhlStatsApi');
const config = require('../config.json');

(async function seedDatabase() {
    const skaterCount = await Skater.estimatedDocumentCount();
    if (skaterCount > 0) {
        // having any Skater docs means players are most likely already seeded, don't try again
        return;
    }

    try {
        winston.info('Seeding player collections...');

        // ensure there are no docs in either of the relevant collections
        await Skater.deleteMany();
        await Goalie.deleteMany();

        const teams = await nhlStatsApi.fetchTeamsWithRoster();

        for (let i = 0; i < teams.length; i++) {
            winston.info(`Seeding players for team ${i + 1} of ${teams.length}`);

            const team = teams[i];

            await seedSkatersForTeam(team);
            await seedGoaliesForTeam(team);
        }

        winston.info('Done seeding players');
    } catch (error) {
        winston.error(error.message);
    }
})();

async function seedGoaliesForTeam(team) {
    const ids = team.roster.roster
        .filter(rp => rp.position.code === 'G')
        .map(rp => rp.person.id);

    const goalies = [];

    for (let i = 0; i < ids.length; i++) {
        const id = ids[i];

        const playerDetails = await nhlStatsApi.fetchPlayerDetails(id);

        if (!playerDetails || playerDetails.primaryPosition.code !== 'G' || !playerDetails.active) {
            continue;
        }

        const playerStats = await nhlStatsApi.fetchPlayerStatsForSeason(id, config.currentSeason);

        if (!playerStats || playerStats.games < config.minGamesPlayed) {
            continue;
        }

        goalies.push({
            _id: playerDetails.id,
            name: {
                first: playerDetails.firstName,
                last: playerDetails.lastName
            },
            currentTeam: {
                nhlId: team.id,
                name: team.name,
                abbreviation: team.abbreviation
            },
            stats: {
                games: playerStats.games,
                gamesStarted: playerStats.gamesStarted,
                wins: playerStats.wins,
                losses: playerStats.losses,
                otLosses: playerStats.ot,
                shutouts: playerStats.shutouts,
                saves: playerStats.saves,
                savePercentage: playerStats.savePercentage,
                goalsAgainst: playerStats.goalsAgainst,
                goalsAgainstAverage: playerStats.goalAgainstAverage
            }
        });
    }

    await Goalie.insertMany(goalies);
}

async function seedSkatersForTeam(team) {
    const ids = team.roster.roster
        .filter(rp => rp.position.code !== 'G')
        .map(rp => rp.person.id);

    const skaters = [];

    for (let i = 0; i < ids.length; i++) {
        const id = ids[i];

        const playerDetails = await nhlStatsApi.fetchPlayerDetails(id);

        if (!playerDetails || playerDetails.primaryPosition.code === 'G' || !playerDetails.active) {
            continue;
        }

        const playerStats = await nhlStatsApi.fetchPlayerStatsForSeason(id, config.currentSeason);

        if (!playerStats || playerStats.games < config.minGamesPlayed) {
            continue;
        }

        skaters.push({
            _id: playerDetails.id,
            name: {
                first: playerDetails.firstName,
                last: playerDetails.lastName
            },
            currentTeam: {
                nhlId: team.id,
                name: team.name,
                abbreviation: team.abbreviation
            },
            positions: [playerDetails.primaryPosition.abbreviation],
            stats: {
                games: playerStats.games,
                goals: playerStats.goals,
                assists: playerStats.assists,
                points: playerStats.points,
                shots: playerStats.shots,
                blocks: playerStats.blocked,
                hits: playerStats.hits,
                powerPlayGoals: playerStats.powerPlayGoals,
                powerPlayPoints: playerStats.powerPlayPoints,
                shortHandedGoals: playerStats.shortHandedGoals,
                shortHandedPoints: playerStats.shortHandedPoints,
                timeOnIcePerGame: playerStats.timeOnIcePerGame,
                plusMinus: playerStats.plusMinus,
                penaltyMinutes: playerStats.pim,
                gameWinningGoals: playerStats.gameWinningGoals,
                faceOffPct: playerStats.faceOffPct
            }
        });
    }

    await Skater.insertMany(skaters);
}
