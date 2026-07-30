/* upgrades.js - Systeme d'ameliorations des statistiques via Seve specifique + Golds (V3) */

window.upgradesManager = {

    // Nombre de niveaux d'amelioration couverts par CHAQUE plante avant de passer
    // a la seve de la plante suivante (plus rare, donc plus dure a obtenir).
    LEVELS_PER_PLANT: 5,

    types: {
        damage:        { name: "Degats",                    icon: "⚔️", statStep: 5,    baseSap: 5,  growthSap: 1.28, baseGold: 20, growthGold: 1.35 },
        aoe:           { name: "Zone d'Effet",               icon: "⭕", statStep: 5,    baseSap: 8,  growthSap: 1.30, baseGold: 40, growthGold: 1.40 },
        critical:      { name: "Chances Critiques",          icon: "🎯", statStep: 0.02, baseSap: 10, growthSap: 1.32, baseGold: 60, growthGold: 1.45 },
        speed:         { name: "Vitesse d'Attaque",          icon: "⚡", statStep: -20,  baseSap: 9,  growthSap: 1.30, baseGold: 50, growthGold: 1.42 },
        symbioteAoe:   { name: "Zone d'Effet Symbiotes",     icon: "🌀", statStep: 5,    baseSap: 12, growthSap: 1.32, baseGold: 80, growthGold: 1.45 },
        symbioteSpeed: { name: "Vitesse des Symbiotes",      icon: "🐆", statStep: 0.5,  baseSap: 10, growthSap: 1.30, baseGold: 65, growthGold: 1.42 }
    },

    /**
     * S'assure que window.gameState.upgrades contient bien une entree (niveau 0 par defaut)
     * pour chaque type defini dans this.types.
     */
    ensureDefaults: function() {
        if (!window.gameState.upgrades) {
            window.gameState.upgrades = {};
        }
        Object.keys(this.types).forEach(typeId => {
            if (typeof window.gameState.upgrades[typeId] !== 'number') {
                window.gameState.upgrades[typeId] = 0;
            }
        });
    },

    /**
     * Retourne l'index (dans PLANT_DB) de la plante dont la seve est requise pour
     * acheter le niveau "level" (0-indexe) d'une amelioration. Se cape a la derniere
     * plante de la DB si on depasse (pour ne jamais planter meme a tres haut niveau).
     */
    getPlantIndexPourNiveau: function(level) {
        const maxIndex = (window.PLANT_DB ? window.PLANT_DB.length : 30) - 1;
        return Math.min(maxIndex, Math.floor(level / this.LEVELS_PER_PLANT));
    },

    /**
     * Quantite de seve (de la plante requise) necessaire pour acheter le niveau "level".
     */
    getSapCost: function(typeId, level) {
        const cfg = this.types[typeId];
        return Math.ceil(cfg.baseSap * Math.pow(cfg.growthSap, level));
    },

    /**
     * Cout en Golds necessaire pour acheter le niveau "level".
     * Le rabais permanent (Mutation Genetique + Arbre d'Evolution) s'applique
     * uniquement sur l'amelioration de Degats, comme avant.
     */
    getGoldCost: function(typeId, level) {
        const cfg = this.types[typeId];
        let cost = Math.floor(cfg.baseGold * Math.pow(cfg.growthGold, level));

        if (typeId === 'damage') {
            const reduction = window.evolutionManager
                ? window.evolutionManager.getBonusCombine('upgradeCostReduction', 'upgrade_discount')
                : (window.mutationManager && window.mutationManager.getBonusValue ? window.mutationManager.getBonusValue('upgradeCostReduction') : 0);
            cost = Math.floor(cost * (1 - reduction));
        }

        return cost;
    },

    initUpgradeMenu: function() {
        const container = document.getElementById('upgrades-container');
        if (!container) return;

        container.innerHTML = '';
        this.ensureDefaults();

        // En-tete : solde de Golds (rappel rapide, en plus de l'en-tete globale du jeu)
        const headerInfo = document.createElement('div');
        headerInfo.className = 'upgrades-header-info';
        headerInfo.innerHTML = `
            <div class="total-points-display">
                <span class="label">💰 Golds Disponibles :</span>
                <span class="value">${(window.gameState.golds || 0).toLocaleString()}</span>
            </div>
        `;
        container.appendChild(headerInfo);

        const grid = document.createElement('div');
        grid.className = 'upgrades-grid';

        Object.keys(this.types).forEach(typeId => {
            this.createUpgradeCard(typeId, grid);
        });

        container.appendChild(grid);
    },

    createUpgradeCard: function(typeId, container) {
        const upgrade = this.types[typeId];
        const level = window.gameState.upgrades[typeId];

        const plantIndex = this.getPlantIndexPourNiveau(level);
        const plantData = window.PLANT_DB ? window.PLANT_DB[plantIndex] : null;

        const sapCost = this.getSapCost(typeId, level);
        const goldCost = this.getGoldCost(typeId, level);

        const sapName = plantData ? plantData.sapName : '???';
        const sapStock = (plantData && window.gameState.inventaireSeves) ? (window.gameState.inventaireSeves[sapName] || 0) : 0;
        const goldStock = window.gameState.golds || 0;

        const sapOk = sapStock >= sapCost;
        const goldOk = goldStock >= goldCost;
        const canAfford = sapOk && goldOk && !!plantData;

        const plantImgHtml = plantData ? window.creerImgPlanteHTML(plantData.name, 'upgrade-req-plant-img') : '';

        const card = document.createElement('div');
        card.className = `upgrade-card ${canAfford ? '' : 'cannot-afford'}`;

        card.innerHTML = `
            <div class="upgrade-card-top">
                <span class="upgrade-icon">${upgrade.icon}</span>
                <div class="upgrade-info">
                    <span class="upgrade-name">${upgrade.name}</span>
                    <span class="upgrade-level">Niveau ${level}</span>
                </div>
            </div>

            <div class="upgrade-requirements">
                <div class="upgrade-req-row ${sapOk ? '' : 'req-manquant'}">
                    <span class="upgrade-req-icon">${plantImgHtml}</span>
                    <span class="upgrade-req-name">${sapName}</span>
                    <span class="upgrade-req-value">${sapStock.toLocaleString()} / ${sapCost.toLocaleString()}</span>
                </div>
                <div class="upgrade-req-row ${goldOk ? '' : 'req-manquant'}">
                    <span class="upgrade-req-icon upgrade-req-icon-gold">💰</span>
                    <span class="upgrade-req-name">Golds</span>
                    <span class="upgrade-req-value">${goldStock.toLocaleString()} / ${goldCost.toLocaleString()}</span>
                </div>
            </div>

            <button class="btn-upgrade" ${canAfford ? '' : 'disabled'}
                    onclick="window.upgradesManager.buyUpgrade('${typeId}')">
                ${canAfford ? 'AMELIORER' : 'RESSOURCES INSUFFISANTES'}
            </button>
        `;

        container.appendChild(card);
    },

    buyUpgrade: function(typeId) {
        this.ensureDefaults();
        const level = window.gameState.upgrades[typeId];

        const plantIndex = this.getPlantIndexPourNiveau(level);
        const plantData = window.PLANT_DB ? window.PLANT_DB[plantIndex] : null;
        if (!plantData) return;

        const sapName = plantData.sapName;
        const sapCost = this.getSapCost(typeId, level);
        const goldCost = this.getGoldCost(typeId, level);

        const sapStock = (window.gameState.inventaireSeves && window.gameState.inventaireSeves[sapName]) || 0;
        const goldStock = window.gameState.golds || 0;

        if (sapStock < sapCost || goldStock < goldCost) return;

        // Deduction des ressources
        window.gameState.inventaireSeves[sapName] -= sapCost;
        if (window.gameState.inventaireSeves[sapName] <= 0) {
            delete window.gameState.inventaireSeves[sapName];
        }
        window.gameState.golds -= goldCost;

        // Application de l'amelioration
        window.gameState.upgrades[typeId] = level + 1;
        this.applyStatsToSecateur(typeId);

        // Sauvegarde et rafraichissement
        window.sauvegarderProgression();
        this.initUpgradeMenu();
        if (window.updateHeaderUI) window.updateHeaderUI();
        if (window.updateInventoryUI) window.updateInventoryUI();
    },

    applyStatsToSecateur: function(typeId) {
        const upgrade = this.types[typeId];
        switch(typeId) {
            case 'damage':
                if (window.secateur) window.secateur.damage += upgrade.statStep;
                break;
            case 'aoe':
                if (window.secateur) window.secateur.radius += upgrade.statStep;
                break;
            case 'critical':
                if (window.secateur) window.secateur.critChance += upgrade.statStep;
                break;
            case 'speed':
                if (window.secateur) window.secateur.attackSpeed = Math.max(100, window.secateur.attackSpeed + upgrade.statStep);
                break;
            case 'symbioteAoe':
                if (window.symbiotesManager) window.symbiotesManager.aoeBonus = (window.symbiotesManager.aoeBonus || 0) + upgrade.statStep;
                break;
            case 'symbioteSpeed':
                if (window.symbiotesManager) window.symbiotesManager.speedBonus = (window.symbiotesManager.speedBonus || 0) + upgrade.statStep;
                break;
        }
    },

    /**
     * Recalcule les bonus du secateur et des symbiotes a partir des niveaux d'upgrades sauvegardes.
     * Necessaire car window.secateur et window.symbiotesManager repartent de leurs valeurs
     * par defaut a chaque chargement de page (ils ne sont pas sauvegardes eux-memes,
     * seuls les NIVEAUX d'amelioration le sont).
     */
    reappliquerAmeliorations: function() {
        this.ensureDefaults();
        const niveaux = window.gameState.upgrades;

        Object.keys(this.types).forEach(typeId => {
            const level = niveaux[typeId] || 0;
            for (let i = 0; i < level; i++) {
                this.applyStatsToSecateur(typeId);
            }
        });
    }
};

// Styles CSS V3
if (!document.getElementById('upgrade-styles')) {
    const style = document.createElement('style');
    style.id = 'upgrade-styles';
    style.textContent = `
        .upgrades-header-info {
            background: var(--panel-bg);
            padding: 15px;
            border-radius: 5px;
            border: 1px solid var(--neon-green);
            margin-bottom: 20px;
            text-align: center;
        }
        .total-points-display .label { color: #888; font-size: 0.9rem; }
        .total-points-display .value { 
            display: block;
            color: var(--neon-green);
            font-size: 1.8rem;
            font-weight: bold;
            text-shadow: 0 0 10px rgba(57, 255, 20, 0.5);
        }

        .upgrades-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
        }
        .upgrade-card {
            background: var(--panel-bg);
            border: 1px solid var(--dim-green);
            padding: 12px;
            border-radius: 4px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            transition: 0.2s;
            box-shadow: 0 0 8px rgba(57, 255, 20, 0.08);
        }
        .upgrade-card:hover:not(.cannot-afford) { border-color: var(--neon-green); transform: translateY(-2px); }
        .upgrade-card.cannot-afford { opacity: 0.85; }

        .upgrade-card-top { display: flex; align-items: center; gap: 10px; }
        .upgrade-icon { font-size: 1.5rem; }
        .upgrade-info { display: flex; flex-direction: column; }
        .upgrade-name { font-weight: bold; color: #fff; }
        .upgrade-level { font-size: 0.7rem; color: #888; }

        .upgrade-requirements {
            display: flex;
            flex-direction: column;
            gap: 5px;
            background: rgba(0,0,0,0.25);
            padding: 6px 8px;
            border-radius: 3px;
            border: 1px solid rgba(57, 255, 20, 0.1);
        }
        .upgrade-req-row {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 0.75rem;
        }
        .upgrade-req-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 20px;
            flex-shrink: 0;
        }
        .upgrade-req-plant-img { width: 18px; height: 18px; object-fit: contain; }
        .upgrade-req-icon-gold { font-size: 0.9rem; }
        .upgrade-req-name { flex: 1; color: #ccc; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .upgrade-req-value { color: var(--neon-green); font-weight: bold; white-space: nowrap; }
        .upgrade-req-row.req-manquant .upgrade-req-value { color: #ff5757; }

        .btn-upgrade {
            background: #1b4d1b;
            color: #fff;
            border: none;
            padding: 8px;
            border-radius: 3px;
            font-weight: bold;
            font-size: 0.75rem;
            cursor: pointer;
            border-bottom: 3px solid #0d2e0d;
        }
        .btn-upgrade:hover:not(:disabled) { background: #2a6e2a; box-shadow: 0 0 10px var(--neon-green); }
        .btn-upgrade:disabled { background: #333; border-bottom-color: #222; color: #666; cursor: not-allowed; }
    `;
    document.head.appendChild(style);
}