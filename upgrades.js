/* upgrades.js - Systeme d'ameliorations des statistiques via les seves (V2) */

window.upgradesManager = {
    types: {
        damage: { name: "Degats", icon: "⚔️", baseCost: 50, growth: 1.4, statStep: 5 },
        aoe: { name: "Zone d'Effet", icon: "⭕", baseCost: 100, growth: 1.8, statStep: 5 },
        critical: { name: "Chances Critiques", icon: "🎯", baseCost: 150, growth: 2.0, statStep: 0.02 },
        speed: { name: "Vitesse d'Attaque", icon: "⚡", baseCost: 120, growth: 1.6, statStep: -20 },
        symbioteAoe: { name: "Zone d'Effet Symbiotes", icon: "🌀", baseCost: 200, growth: 1.7, statStep: 5 },
        symbioteSpeed: { name: "Vitesse des Symbiotes", icon: "🐆", baseCost: 150, growth: 1.6, statStep: 0.5 }
    },

    getSapValue: function(plantIndex) {
        return Math.floor(10 * Math.pow(1.3, plantIndex));
    },

    /**
     * Calcule les points totaux et prepare la liste des seves disponibles
     */
    getAvailableResources: function() {
        let totalPoints = 0;
        const inventaireSeves = window.gameState.inventaireSeves || {};
        const availableSaps = [];

        window.PLANT_DB.forEach((plant, index) => {
            const count = inventaireSeves[plant.sapName] || 0;
            if (count > 0) {
                const valuePerUnit = this.getSapValue(index);
                const totalValue = count * valuePerUnit;
                totalPoints += totalValue;
                availableSaps.push({
                    name: plant.sapName,
                    count: count,
                    valuePerUnit: valuePerUnit,
                    totalValue: totalValue,
                    icon: '🧪'
                });
            }
        });

        return { totalPoints, availableSaps };
    },

    /**
     * S'assure que window.gameState.upgrades contient bien une entree (niveau 0 par defaut)
     * pour chaque type defini dans this.types. Utile quand on ajoute un nouveau type
     * d'amelioration apres que des joueurs aient deja une sauvegarde existante.
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

    initUpgradeMenu: function() {
        const container = document.getElementById('upgrades-container');
        if (!container) return;

        container.innerHTML = '';

        this.ensureDefaults();

        const { totalPoints, availableSaps } = this.getAvailableResources();

        // 1. Affichage du Total de Points
        const headerInfo = document.createElement('div');
        headerInfo.className = 'upgrades-header-info';
        headerInfo.innerHTML = `
            <div class="total-points-display">
                <span class="label">Points de Seve Totaux :</span>
                <span class="value">${totalPoints.toLocaleString()}</span>
            </div>
        `;
        container.appendChild(headerInfo);

        // 2. Affichage des Reserves (Quelles seves j'ai et ce qu'elles valent)
        if (availableSaps.length > 0) {
            const reservesDiv = document.createElement('div');
            reservesDiv.className = 'upgrades-reserves';
            reservesDiv.innerHTML = '<h4>Vos Reserves Utilisables</h4>';
            
            const reservesList = document.createElement('div');
            reservesList.className = 'reserves-list';
            
            availableSaps.forEach(sap => {
                const item = document.createElement('div');
                item.className = 'reserve-item';
                item.innerHTML = `
                    <span class="sap-name">${sap.icon} ${sap.name}</span>
                    <span class="sap-details">x${sap.count} (${sap.valuePerUnit} pts/u)</span>
                    <span class="sap-total">= ${sap.totalValue.toLocaleString()} pts</span>
                `;
                reservesList.appendChild(item);
            });
            reservesDiv.appendChild(reservesList);
            container.appendChild(reservesDiv);
        }

        // 3. Grille des Upgrades
        const grid = document.createElement('div');
        grid.className = 'upgrades-grid';
        
        Object.keys(this.types).forEach(typeId => {
            this.createUpgradeCard(typeId, grid, totalPoints);
        });
        
        container.appendChild(grid);
    },

    createUpgradeCard: function(typeId, container, totalPoints) {
        const upgrade = this.types[typeId];
        const level = window.gameState.upgrades[typeId];
        let cost = Math.floor(upgrade.baseCost * Math.pow(upgrade.growth, level));

        // Rabais permanent de Mutation Génétique + Arbre d'Évolution (uniquement sur les upgrades de Dégâts)
        if (typeId === 'damage') {
            const reduction = window.evolutionManager
                ? window.evolutionManager.getBonusCombine('upgradeCostReduction', 'upgrade_discount')
                : (window.mutationManager && window.mutationManager.getBonusValue ? window.mutationManager.getBonusValue('upgradeCostReduction') : 0);
            cost = Math.floor(cost * (1 - reduction));
        }

        const canAfford = totalPoints >= cost;
        
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
            <div class="upgrade-cost">
                Cout : <span class="cost-value">${cost.toLocaleString()} pts</span>
            </div>
            <button class="btn-upgrade" ${canAfford ? '' : 'disabled'} 
                    onclick="window.upgradesManager.buyUpgrade('${typeId}')">
                ${canAfford ? 'AMELIORER' : 'POINTS INSUFFISANTS'}
            </button>
        `;

        container.appendChild(card);
    },

    buyUpgrade: function(typeId) {
        const upgrade = this.types[typeId];
        const level = window.gameState.upgrades[typeId];
        let cost = Math.floor(upgrade.baseCost * Math.pow(upgrade.growth, level));

        if (typeId === 'damage') {
            const reduction = window.evolutionManager
                ? window.evolutionManager.getBonusCombine('upgradeCostReduction', 'upgrade_discount')
                : (window.mutationManager && window.mutationManager.getBonusValue ? window.mutationManager.getBonusValue('upgradeCostReduction') : 0);
            cost = Math.floor(cost * (1 - reduction));
        }

        const { totalPoints, availableSaps } = this.getAvailableResources();

        if (totalPoints < cost) return;

        // Deduction des stocks
        let remainingCost = cost;
        // On trie pour consommer d'abord les seves les moins cheres (les premieres routes)
        availableSaps.sort((a, b) => a.valuePerUnit - b.valuePerUnit);

        for (let sap of availableSaps) {
            if (remainingCost <= 0) break;

            const sapNeeded = Math.ceil(remainingCost / sap.valuePerUnit);
            const sapToTake = Math.min(sap.count, sapNeeded);
            
            window.gameState.inventaireSeves[sap.name] -= sapToTake;
            remainingCost -= sapToTake * sap.valuePerUnit;
            
            // Nettoyage si stock a zero
            if (window.gameState.inventaireSeves[sap.name] <= 0) {
                delete window.gameState.inventaireSeves[sap.name];
            }
        }

        // Appliquer l'amelioration
        window.gameState.upgrades[typeId]++;
        this.applyStatsToSecateur(typeId);

        // Sauvegarde et Rafraichissement
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

// Styles CSS V2
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

        .upgrades-reserves {
            background: rgba(0,0,0,0.3);
            padding: 10px;
            border-radius: 4px;
            margin-bottom: 20px;
            border-left: 3px solid var(--dim-green);
        }
        .upgrades-reserves h4 { margin: 0 0 10px 0; font-size: 0.8rem; color: var(--neon-green); text-transform: uppercase; }
        .reserves-list { display: flex; flex-direction: column; gap: 5px; max-height: 100px; overflow-y: auto; }
        .reserve-item { 
            display: flex; 
            justify-content: space-between; 
            font-size: 0.75rem; 
            background: rgba(57, 255, 20, 0.05);
            padding: 4px 8px;
            border-radius: 2px;
        }
        .sap-name { color: #fff; }
        .sap-details { color: #888; }
        .sap-total { color: var(--neon-green); font-weight: bold; }

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
        .upgrade-card.cannot-afford { opacity: 0.7; filter: grayscale(0.5); }

        .upgrade-card-top { display: flex; align-items: center; gap: 10px; }
        .upgrade-icon { font-size: 1.5rem; }
        .upgrade-info { display: flex; flex-direction: column; }
        .upgrade-name { font-weight: bold; color: #fff; }
        .upgrade-level { font-size: 0.7rem; color: #888; }

        .upgrade-cost { font-size: 0.8rem; color: var(--text-color); text-align: center; background: rgba(0,0,0,0.25); padding: 5px; border-radius: 3px; border: 1px solid rgba(57, 255, 20, 0.1); }
        .cost-value { color: var(--neon-green); font-weight: bold; }

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
