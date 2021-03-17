/* eslint-disable prefer-template */
import { cloneJsonObject, pokeByName, randomArrayElement } from './utilities';
import { EXP_TABLE, POKEDEXFLAGS } from './data';
import EVOLUTIONS from './evolutions';
import POKEDEX from './db';

export default (player) => {
    const Poke = function (pokeModel, initialLevel, initialExp, shiny, caughtAt, prestigeLevel = 0) {
        this.poke = cloneJsonObject(pokeModel);
        this.expTable = EXP_TABLE[this.poke.stats['growth rate']];
        this.exp = initialLevel && this.expTable[initialLevel - 1] || initialExp;
        this.isShiny = (shiny === true);
        this.caughtAt = caughtAt || Date.now();
        this.prestigeLevel = prestigeLevel;
        this.hp = this.setHpValue(this.poke.stats.hp) * 3;
    };
    Poke.prototype.currentLevel = function () {
        return this.expTable
            .filter((xp_requirement) => xp_requirement <= this.exp)
            .length;
    };
    Poke.prototype.statValue = function (statName) {
        const raw = this.poke.stats[statName];
        let calculated = ((raw + 50) * this.currentLevel()) / 150;
        if (statName !== 'speed') {
            calculated *= Math.pow(1.25, this.prestigeLevel);
        }
        return Math.floor(calculated);
    };
    Poke.prototype.setHpValue = function (rawHp) {
        return Math.floor(((rawHp * this.currentLevel()) / 40));
    };

    const evoRequirementMet = (poke) => (evo) => {
        let typeReq;

        switch (evo.requires.type) {
        case 'level':
            typeReq = poke.currentLevel() >= evo.requires.level;
            break;
        case 'stone':
            typeReq = player.unlocked[evo.requires.stone];
            break;
        default:
            typeReq = false;
        }

        return typeReq && !player.hasPokemon(evo.to, false);
    };
    Poke.prototype.tryEvolve = function (shiny) {
        const evos = EVOLUTIONS[this.pokeName()];
        if (evos !== undefined) {
            const oldPokemon = this.pokeName();
            // Get the first evo for this pokemon which has requirements met
            const evo = evos.find(evoRequirementMet(this));
            if (evo !== undefined) {
                this.poke = cloneJsonObject(pokeByName(evo.to));
                player.addPokedex(evo.to, (shiny ? POKEDEXFLAGS.ownShiny : POKEDEXFLAGS.ownNormal));
                if (!player.hasPokemon(oldPokemon, shiny)) {
                    player.addPokedex(oldPokemon, (shiny ? POKEDEXFLAGS.ownedShiny : POKEDEXFLAGS.ownedNormal));
                }
            }
        }
    };
    Poke.prototype.canEvolve = function () {
        // pokemon Has Evolution
        const evos = EVOLUTIONS[this.pokeName()];
        if (evos !== undefined) {
            return evos.findIndex(evoRequirementMet(this)) > -1;
        }
        return false;
    };
    Poke.prototype.tryPrestige = function () {
        if (this.canPrestige()) {
            this.exp = this.expTable[4];
            this.setHp(this.maxHp());
            this.prestigeLevel++;
        }
    };
    Poke.prototype.canPrestige = function () {
        return this.level() >= 100;
    };

    Poke.prototype.setHp = function (hp) { this.hp = hp; };
    Poke.prototype.getHp = function () { return this.hp; };
    Poke.prototype.maxHp = function () { return this.setHpValue(this.poke.stats.hp) * 3; };
    Poke.prototype.attack = function () { return this.statValue('attack'); };
    Poke.prototype.defense = function () { return this.statValue('defense'); };
    Poke.prototype.spAttack = function () { return this.statValue('sp atk'); };
    Poke.prototype.spDefense = function () { return this.statValue('sp def'); };
    Poke.prototype.speed = function () { return this.statValue('speed'); };
    Poke.prototype.avgDefense = function () { return (this.defense() + this.spDefense()) / 2; };

    Poke.prototype.pokeName = function () {
        return this.poke.name;
    };
    Poke.prototype.image = function () {
        const imageType = (this.isShiny ? 'shiny' : 'normal');
        return {
            front: 'assets/sprites/' + [imageType] + '/front/' + this.pokeName() + '.png',
            back: 'assets/sprites/' + [imageType] + '/back/' + this.pokeName() + '.png',
            party: 'assets/sprites/partySprites/' + [imageType] + '/' + this.pokeName() + '.png',
        };
    };
    Poke.prototype.shiny = function () {
        return this.isShiny;
    };
    Poke.prototype.types = function () { return this.poke.stats.types; };
    Poke.prototype.catchRate = function () { return Number(this.poke.stats['catch rate']); };
    Poke.prototype.lifeAsText = function () { return '' + (this.getHp() < 0 ? 0 : this.getHp()) + ' / ' + this.maxHp(); };
    Poke.prototype.alive = function () { return this.getHp() > 0; };
    Poke.prototype.giveExp = function (amount) {
        this.exp += amount;
    };
    Poke.prototype.currentExp = function () { return this.exp; };
    Poke.prototype.nextLevelExp = function () { return this.expTable[this.currentLevel()]; };
    Poke.prototype.thisLevelExp = function () { return this.expTable[this.currentLevel() - 1] || 10; };
    Poke.prototype.level = function () { return this.currentLevel(); };
    Poke.prototype.attackSpeed = function () {
        const speed = Math.floor(1000 / (500 + this.speed()) * 800);
        if (speed <= 300) {
            return 300;
        } else {
            return speed;
        }
    };
    Poke.prototype.avgAttack = function () { return (this.attack() + this.spAttack()) / 2; };
    Poke.prototype.takeDamage = function (enemyAttack) {
        const damageToTake = (enemyAttack - this.avgDefense() / 10) > 0
        && Math.ceil((enemyAttack - this.avgDefense() / 10) * ((Math.random() + 0.1) * 2) / 100)
        || 0;
        this.setHp(this.getHp() - damageToTake);
        return damageToTake;
    };
    Poke.prototype.baseExp = function () { return Number(this.poke.exp); };
    Poke.prototype.heal = function () { return this.setHp(this.maxHp()); };
    Poke.prototype.save = function () { return [this.pokeName(), this.exp, this.isShiny, this.caughtAt, this.prestigeLevel]; };

    const makeRandomPoke = (level) => new Poke(randomArrayElement(POKEDEX), level);

    return {
        Poke,
        makeRandomPoke,
    };
};
