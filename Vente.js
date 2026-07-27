/* Vente.js - Gestion du Menu de Vente des Plantes (contre Golds) */
/* Meme principe que Extraction.js (X1, X5, X50, X500, Xmax), mais on vend les PLANTES contre des GOLDS */

// Variable globale pour stocker la quantite selectionnee
window.venteMultiplier = 1;

// Fonction d'initialisation appelee par menu.js
window.initVenteMenu = function() {
    const container = document.getElementById('vente-container');
    if (!container) return;

    const backBtn = container.querySelector('.btn-back');
    container.innerHTML = '';
    if (backBtn) container.appendChild(backBtn);

    // Bouton "Tout vendre" toujours visible en haut du menu (independant du multiplicateur choisi)
    const sellAllBtn = document.createElement('button');
    sellAllBtn.className = 'btn-sell-all-menu';
    sellAllBtn.innerText = '💰 TOUT VENDRE (toutes les plantes)';
    sellAllBtn.onclick = () => window.venderToutesLesPlantes();
    container.appendChild(sellAllBtn);

    // 1. Ajouter le selecteur de multiplicateur
    createVenteMultiplierSelector(container);

    const listWrapper = document.createElement('div');
    listWrapper.id = 'vente-list-wrapper';
    container.appendChild(listWrapper);

    // Recuperer les donnees globales
    const inventoryPlants = window.gameState.inventairePlantes || {};
    const plantDB = window.PLANT_DB;

    // On boucle sur TOUTES les plantes de la DB
    plantDB.forEach((plantData) => {
        const plantCount = inventoryPlants[plantData.name] || 0;
        createVenteCard(plantData, plantCount, listWrapper);
    });
};

/**
 * Cree la barre de selection du multiplicateur (meme logique que l'Extraction)
 */
function createVenteMultiplierSelector(container) {
    const selector = document.createElement('div');
    selector.className = 'vente-multiplier-selector';

    const options = [1, 5, 50, 500, 'max'];

    options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = `vente-mult-btn ${window.venteMultiplier === opt ? 'active' : ''}`;
        btn.innerText = opt === 'max' ? 'Xmax' : `X${opt}`;
        btn.onclick = () => {
            window.venteMultiplier = opt;
            window.initVenteMenu(); // Rafraichir pour mettre a jour les boutons
        };
        selector.appendChild(btn);
    });

    container.appendChild(selector);
}

/**
 * Cree une carte de vente style "Craft" (meme structure que l'Extraction, theme vert neon)
 */
function createVenteCard(plantData, plantCount, container) {
    const plantImgHTML = window.creerImgPlanteHTML(plantData.name, 'sell-stock-icon-img');
    const goldIcon = '💰';
    const goldValuePerPlant = plantData.goldValue || 1;

    // Calculer la quantite reelle a vendre
    let countToSell = window.venteMultiplier;
    if (window.venteMultiplier === 'max') {
        countToSell = plantCount;
    }

    // Securite : ne pas depasser le stock
    const finalCount = Math.max(0, Math.min(plantCount, countToSell));
    const totalGoldGain = finalCount * goldValuePerPlant;

    const card = document.createElement('div');
    card.className = 'sell-card';

    const formatNum = (num) => {
        if (num >= 1000000) return (num / 1000000).toFixed(2) + 'm';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
        return num;
    };

    card.innerHTML = `
        <div class="sell-card-header">${plantData.name}</div>
        <div class="sell-card-body">
            <div class="sell-stock-zone">
                <div class="sell-stock-item">
                    <span class="sell-stock-icon">${plantImgHTML}</span>
                    <span class="sell-stock-value">${formatNum(plantCount)}</span>
                </div>
                <div class="sell-stock-item">
                    <span class="sell-stock-icon" style="font-size:0.65rem;">💰/u</span>
                    <span class="sell-stock-value">${goldValuePerPlant}</span>
                </div>
            </div>

            <div class="sell-conversion-zone">
                <div class="sell-conv-input">
                    <span class="sell-conv-icon">${plantImgHTML}</span>
                    <span class="sell-conv-count">${formatNum(finalCount || (window.venteMultiplier === 'max' ? 0 : window.venteMultiplier))}</span>
                </div>
                <div class="sell-conv-arrow">➡️</div>
                <div class="sell-conv-output">
                    <span class="sell-conv-icon">${goldIcon}</span>
                    <span class="sell-conv-count">${formatNum(totalGoldGain || (window.venteMultiplier === 'max' ? 0 : (window.venteMultiplier * goldValuePerPlant)))}</span>
                </div>
            </div>

            <div class="sell-action-zone">
                <button class="btn-sell ${finalCount <= 0 ? 'disabled' : ''}"
                        onclick="${finalCount > 0 ? `window.venderPlante('${plantData.name}', ${finalCount})` : ''}">
                    ${window.venteMultiplier === 'max' ? 'TOUT VENDRE' : 'VENDRE'}
                </button>
            </div>
        </div>
    `;

    container.appendChild(card);
}

/**
 * Logique de vente d'un type de plante
 */
window.venderPlante = function(plantName, countToSell) {
    const inventoryPlants = window.gameState.inventairePlantes;
    const plantDB = window.PLANT_DB;

    const plantData = plantDB.find(p => p.name === plantName);
    if (!plantData || !inventoryPlants[plantName] || inventoryPlants[plantName] < countToSell) return;

    const goldValuePerPlant = plantData.goldValue || 1;
    let goldGained = countToSell * goldValuePerPlant;
    const bonusVente = window.evolutionManager
        ? window.evolutionManager.getBonusCombine('goldSaleMultiplier', 'sale_value')
        : (window.mutationManager && window.mutationManager.getBonusValue ? window.mutationManager.getBonusValue('goldSaleMultiplier') : 0);
    // Bonus temporaire des Capsules (Alchimie Dorée)
    const capsuleGoldMult = window.capsulesManager ? window.capsulesManager.getMultiplier('gold_sale_mult') : 1;
    goldGained = Math.floor(goldGained * (1 + bonusVente) * capsuleGoldMult);

    // 1. Retirer les plantes de l'inventaire
    inventoryPlants[plantName] -= countToSell;
    if (inventoryPlants[plantName] <= 0) delete inventoryPlants[plantName];

    // 2. Ajouter les golds
    if (window.economie) {
        window.economie.ajouterGolds(goldGained);
    }

    // 3. Sauvegarder et rafraichir
    window.sauvegarderProgression();
    window.initVenteMenu();
    if (window.updateHeaderUI) window.updateHeaderUI();
    if (window.updateInventoryUI) window.updateInventoryUI();
};

/**
 * Vend TOUTES les plantes possedees (tous types confondus) en un seul clic.
 * Utilisee par le bouton "Sell All" toujours visible ET par le bouton du menu de vente.
 */
window.venderToutesLesPlantes = function() {
    if (!window.gameState || !window.gameState.inventairePlantes) return;

    const inventoryPlants = window.gameState.inventairePlantes;
    const plantDB = window.PLANT_DB;

    let totalGoldGained = 0;
    let totalPlantsSold = 0;

    Object.keys(inventoryPlants).forEach(plantName => {
        const count = inventoryPlants[plantName];
        if (count > 0) {
            const plantData = plantDB.find(p => p.name === plantName);
            const goldValuePerPlant = plantData ? (plantData.goldValue || 1) : 1;
            totalGoldGained += count * goldValuePerPlant;
            totalPlantsSold += count;
            delete inventoryPlants[plantName];
        }
    });

    const bonusVenteTotal = window.evolutionManager
        ? window.evolutionManager.getBonusCombine('goldSaleMultiplier', 'sale_value')
        : (window.mutationManager && window.mutationManager.getBonusValue ? window.mutationManager.getBonusValue('goldSaleMultiplier') : 0);
    // Bonus temporaire des Capsules (Alchimie Dorée)
    const capsuleGoldMultTotal = window.capsulesManager ? window.capsulesManager.getMultiplier('gold_sale_mult') : 1;
    totalGoldGained = Math.floor(totalGoldGained * (1 + bonusVenteTotal) * capsuleGoldMultTotal);

    if (totalPlantsSold === 0) return;

    if (window.economie) {
        window.economie.ajouterGolds(totalGoldGained);
    }

    window.sauvegarderProgression();
    if (window.updateHeaderUI) window.updateHeaderUI();
    if (window.updateInventoryUI) window.updateInventoryUI();

    // Rafraichir le menu de vente s'il est actuellement ouvert
    const venteContainer = document.getElementById('vente-container');
    if (venteContainer && venteContainer.style.display !== 'none') {
        window.initVenteMenu();
    }
};

// Styles CSS - meme structure visuelle que l'Extraction, mais avec le theme vert neon du jeu
if (!document.getElementById('vente-styles')) {
    const style = document.createElement('style');
    style.id = 'vente-styles';
    style.textContent = `
        .btn-sell-all-menu {
            display: block;
            width: 100%;
            background: var(--neon-green);
            border: 1px solid #fff;
            border-bottom: 3px solid #1b4d1b;
            color: #000;
            font-weight: bold;
            font-size: 0.85rem;
            padding: 10px;
            border-radius: 5px;
            cursor: pointer;
            margin-bottom: 15px;
            transition: 0.15s;
        }
        .btn-sell-all-menu:hover { filter: brightness(1.1); transform: translateY(-1px); }
        .btn-sell-all-menu:active { transform: translateY(2px); border-bottom-width: 0; }

        .vente-multiplier-selector {
            display: flex;
            justify-content: center;
            gap: 5px;
            margin-bottom: 15px;
            background: rgba(0,0,0,0.3);
            padding: 8px;
            border-radius: 4px;
            border: 1px solid var(--dim-green);
        }

        .vente-mult-btn {
            background: rgba(57, 255, 20, 0.05);
            border: 1px solid var(--dim-green);
            color: var(--text-color);
            padding: 5px 10px;
            cursor: pointer;
            font-size: 0.75rem;
            font-weight: bold;
            border-radius: 2px;
            transition: 0.2s;
            flex: 1;
        }

        .vente-mult-btn:hover { background: rgba(57, 255, 20, 0.2); }
        .vente-mult-btn.active {
            background: var(--neon-green);
            color: #000;
            border-color: #fff;
        }

        #vente-list-wrapper {
            display: flex;
            flex-direction: column;
            gap: 12px;
            padding-bottom: 20px;
        }

        .sell-card {
            background: var(--panel-bg);
            border: 2px solid var(--dim-green);
            border-radius: 4px;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            box-shadow: 0 4px 0 rgba(0,0,0,0.4);
        }

        .sell-card-header {
            background: rgba(57, 255, 20, 0.08);
            color: var(--neon-green);
            font-size: 0.75rem;
            font-weight: bold;
            text-align: center;
            padding: 2px 0;
            border-bottom: 1px solid var(--dim-green);
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .sell-card-body {
            display: flex;
            align-items: center;
            padding: 8px;
            gap: 10px;
        }

        .sell-stock-zone {
            flex: 0 0 80px;
            display: flex;
            flex-direction: column;
            gap: 4px;
            background: rgba(0,0,0,0.3);
            padding: 4px;
            border-radius: 2px;
            border: 1px solid var(--dim-green);
        }

        .sell-stock-item { display: flex; align-items: center; gap: 5px; }
        .sell-stock-icon { font-size: 0.9rem; }
        .sell-stock-icon-img { width: 22px; height: 22px; object-fit: contain; vertical-align: middle; }
        .sell-stock-value { font-size: 0.8rem; color: var(--text-color); font-family: 'Courier New', monospace; }

        .sell-conversion-zone {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            background: rgba(0,0,0,0.25);
            padding: 5px;
            border-radius: 4px;
            border: 1px solid rgba(57, 255, 20, 0.1);
        }

        .sell-conv-input, .sell-conv-output { display: flex; flex-direction: column; align-items: center; }
        .sell-conv-icon { font-size: 1.2rem; }
        .sell-conv-count { font-size: 0.7rem; color: var(--neon-green); margin-top: -2px; }
        .sell-conv-arrow { color: var(--dim-green); font-size: 0.8rem; }

        .sell-action-zone { flex: 0 0 90px; }
        .btn-sell {
            background: #1b4d1b;
            border: none;
            border-bottom: 3px solid #0d2e0d;
            color: #fff;
            width: 100%;
            padding: 8px 0;
            font-weight: bold;
            font-size: 0.7rem;
            cursor: pointer;
            border-radius: 3px;
            transition: all 0.1s;
        }

        .btn-sell:hover:not(.disabled) { background: #2a6e2a; box-shadow: 0 0 10px var(--neon-green); transform: translateY(-1px); }
        .btn-sell:active:not(.disabled) { transform: translateY(2px); border-bottom-width: 0; }
        .btn-sell.disabled { background: #333; border-bottom-color: #222; color: #666; cursor: not-allowed; opacity: 0.6; }
    `;
    document.head.appendChild(style);
}
