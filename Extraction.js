/* Extraction.js - Gestion du Menu d'Extraction avec Multiplicateur (X1, X5, X50, X500, Xmax) */

// Variable globale pour stocker la quantite selectionnee
window.extractionMultiplier = 1; 

// Fonction d'initialisation appelee par menu.js
window.initExtractionMenu = function() {
    const container = document.getElementById('extraction-container');
    if (!container) return;

    const backBtn = container.querySelector('.btn-back');
    container.innerHTML = '';
    if (backBtn) container.appendChild(backBtn);

    // Bouton "Tout extraire" toujours visible en haut du menu (independant du multiplicateur choisi)
    const extractAllBtn = document.createElement('button');
    extractAllBtn.className = 'btn-extract-all-menu';
    extractAllBtn.innerText = '⛏️ TOUT EXTRAIRE (toutes les plantes)';
    extractAllBtn.onclick = () => window.extraireToutesLesPlantes();
    container.appendChild(extractAllBtn);

    // 1. Ajouter le selecteur de multiplicateur
    createMultiplierSelector(container);

    const listWrapper = document.createElement('div');
    listWrapper.id = 'extraction-list-wrapper';
    container.appendChild(listWrapper);

    // Recuperer les donnees globales
    const inventoryPlants = window.gameState.inventairePlantes || {};
    const inventorySaps = window.gameState.inventaireSeves || {};
    const plantDB = window.PLANT_DB; 

    // On boucle sur TOUTES les plantes de la DB
    plantDB.forEach((plantData) => {
        const plantName = plantData.name;
        const plantCount = inventoryPlants[plantName] || 0;
        createExtractionCard(plantData, plantCount, inventorySaps, listWrapper);
    });
};

/**
 * Cree la barre de selection du multiplicateur
 */
function createMultiplierSelector(container) {
    const selector = document.createElement('div');
    selector.className = 'multiplier-selector';
    
    const options = [1, 5, 50, 500, 'max'];
    
    options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = `mult-btn ${window.extractionMultiplier === opt ? 'active' : ''}`;
        btn.innerText = opt === 'max' ? 'Xmax' : `X${opt}`;
        btn.onclick = () => {
            window.extractionMultiplier = opt;
            window.initExtractionMenu(); // Rafraichir pour mettre a jour les boutons
        };
        selector.appendChild(btn);
    });

    container.appendChild(selector);
}

/**
 * Cree une carte d'extraction style "Craft"
 */
function createExtractionCard(plantData, plantCount, inventorySaps, container) {
    const sapName = plantData.sapName;
    const plantImgHTML = window.creerImgPlanteHTML(plantData.name, 'stock-icon-img');
    const sapIcon = '🧪'; 
    const currentSapCount = inventorySaps[sapName] || 0;
    const sapGainedPerPlant = 10;

    // Calculer la quantite reelle a extraire
    let countToExtract = window.extractionMultiplier;
    if (window.extractionMultiplier === 'max') {
        countToExtract = plantCount;
    }
    
    // Securite : ne pas depasser le stock
    const finalCount = Math.max(0, Math.min(plantCount, countToExtract));
    const totalSapGain = finalCount * sapGainedPerPlant;

    const card = document.createElement('div');
    card.className = 'craft-card';
    
    const formatNum = (num) => {
        if (num >= 1000000) return (num / 1000000).toFixed(2) + 'm';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
        return num;
    };

    card.innerHTML = `
        <div class="craft-card-header">${plantData.name}</div>
        <div class="craft-card-body">
            <div class="craft-stock-zone">
                <div class="stock-item">
                    <span class="stock-icon">${plantImgHTML}</span>
                    <span class="stock-value">${formatNum(plantCount)}</span>
                </div>
                <div class="stock-item">
                    <span class="stock-icon">${sapIcon}</span>
                    <span class="stock-value">${formatNum(currentSapCount)}</span>
                </div>
            </div>

            <div class="craft-conversion-zone">
                <div class="conv-input">
                    <span class="conv-icon">${plantImgHTML}</span>
                    <span class="conv-count">${formatNum(finalCount || (window.extractionMultiplier === 'max' ? 0 : window.extractionMultiplier))}</span>
                </div>
                <div class="conv-arrow">➡️</div>
                <div class="conv-output">
                    <span class="conv-icon">${sapIcon}</span>
                    <span class="conv-count">${formatNum(totalSapGain || (window.extractionMultiplier === 'max' ? 0 : (window.extractionMultiplier * sapGainedPerPlant)))}</span>
                </div>
            </div>

            <div class="craft-action-zone">
                <button class="btn-craft ${finalCount <= 0 ? 'disabled' : ''}" 
                        onclick="${finalCount > 0 ? `window.extractResource('${plantData.name}', ${finalCount})` : ''}">
                    ${window.extractionMultiplier === 'max' ? 'TOUT EXTRAIRE' : 'EXTRAIRE'}
                </button>
            </div>
        </div>
    `;

    container.appendChild(card);
}

/**
 * Logique d'extraction
 */
window.extractResource = function(plantName, countToExtract) {
    const inventoryPlants = window.gameState.inventairePlantes;
    const inventorySaps = window.gameState.inventaireSeves;
    const plantDB = window.PLANT_DB;

    const plantData = plantDB.find(p => p.name === plantName);
    if (!plantData || !inventoryPlants[plantName] || inventoryPlants[plantName] < countToExtract) return;

    const sapName = plantData.sapName;
    const multiplicateur = window.boutiqueManager ? window.boutiqueManager.getSapMultiplier() : 1;
    const evoSapBonus = window.evolutionManager ? window.evolutionManager.getBonus('sap_bonus') : 0;
    const capsuleSapMult = window.capsulesManager ? window.capsulesManager.getMultiplier('sap_mult') : 1;
    const sapParPlante = 10 * multiplicateur * (1 + evoSapBonus) * capsuleSapMult;

    // 1&2. Application des bonus de Mutation Génétique + Arbre d'Évolution (extraction gratuite / sève x3 / sève bonus)
    let sapGained = Math.floor(countToExtract * sapParPlante);
    let plantsToRemove = countToExtract;
    if (window.mutationManager && window.mutationManager.rollExtractionResult) {
        const result = window.mutationManager.rollExtractionResult(countToExtract, sapParPlante);
        sapGained = result.sapGained;
        plantsToRemove = result.plantsConsumed;
    }

    inventoryPlants[plantName] -= plantsToRemove;
    if (inventoryPlants[plantName] <= 0) delete inventoryPlants[plantName];

    inventorySaps[sapName] = (inventorySaps[sapName] || 0) + sapGained;

    // 3. Sauvegarder et rafraichir
    window.sauvegarderProgression();
    window.initExtractionMenu();
    if (window.updateHeaderUI) window.updateHeaderUI();
    if (window.updateInventoryUI) window.updateInventoryUI();
};

/**
 * Extrait TOUTES les plantes possedees (tous types confondus) en un seul clic.
 */
window.extraireToutesLesPlantes = function() {
    if (!window.gameState || !window.gameState.inventairePlantes || !window.gameState.inventaireSeves) return;

    const inventoryPlants = window.gameState.inventairePlantes;
    const inventorySaps = window.gameState.inventaireSeves;
    const plantDB = window.PLANT_DB;

    let totalPlantsExtracted = 0;
    const multiplicateur = window.boutiqueManager ? window.boutiqueManager.getSapMultiplier() : 1;
    const evoSapBonus = window.evolutionManager ? window.evolutionManager.getBonus('sap_bonus') : 0;
    const capsuleSapMult = window.capsulesManager ? window.capsulesManager.getMultiplier('sap_mult') : 1;
    const sapParPlante = 10 * multiplicateur * (1 + evoSapBonus) * capsuleSapMult;

    Object.keys(inventoryPlants).forEach(plantName => {
        const count = inventoryPlants[plantName];
        if (count > 0) {
            const plantData = plantDB.find(p => p.name === plantName);
            if (!plantData) return;
            const sapName = plantData.sapName;

            let sapGained = Math.floor(count * sapParPlante);
            let plantsConsumed = count;
            if (window.mutationManager && window.mutationManager.rollExtractionResult) {
                const result = window.mutationManager.rollExtractionResult(count, sapParPlante);
                sapGained = result.sapGained;
                plantsConsumed = result.plantsConsumed;
            }

            inventorySaps[sapName] = (inventorySaps[sapName] || 0) + sapGained;
            totalPlantsExtracted += plantsConsumed;

            const remaining = count - plantsConsumed;
            if (remaining > 0) {
                inventoryPlants[plantName] = remaining;
            } else {
                delete inventoryPlants[plantName];
            }
        }
    });

    if (totalPlantsExtracted === 0) return;

    window.sauvegarderProgression();
    window.initExtractionMenu();
    if (window.updateHeaderUI) window.updateHeaderUI();
    if (window.updateInventoryUI) window.updateInventoryUI();
};

// Styles CSS mis a jour
if (!document.getElementById('extraction-styles')) {
    const style = document.createElement('style');
    style.id = 'extraction-styles';
    style.textContent = `
        .btn-extract-all-menu {
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
        .btn-extract-all-menu:hover { filter: brightness(1.1); transform: translateY(-1px); }
        .btn-extract-all-menu:active { transform: translateY(2px); border-bottom-width: 0; }

        .multiplier-selector {
            display: flex;
            justify-content: center;
            gap: 5px;
            margin-bottom: 15px;
            background: rgba(0,0,0,0.3);
            padding: 8px;
            border-radius: 4px;
            border: 1px solid var(--dim-green);
        }

        .mult-btn {
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

        .mult-btn:hover { background: rgba(57, 255, 20, 0.2); }
        .mult-btn.active {
            background: var(--neon-green);
            color: #000;
            border-color: #fff;
        }

        #extraction-list-wrapper {
            display: flex;
            flex-direction: column;
            gap: 12px;
            padding-bottom: 20px;
        }

        .craft-card {
            background: var(--panel-bg);
            border: 2px solid var(--dim-green);
            border-radius: 4px;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            box-shadow: 0 4px 0 rgba(0,0,0,0.4), 0 0 8px rgba(57, 255, 20, 0.08);
        }

        .craft-card-header {
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

        .craft-card-body {
            display: flex;
            align-items: center;
            padding: 8px;
            gap: 10px;
        }

        .craft-stock-zone {
            flex: 0 0 80px;
            display: flex;
            flex-direction: column;
            gap: 4px;
            background: rgba(0,0,0,0.3);
            padding: 4px;
            border-radius: 2px;
            border: 1px solid var(--dim-green);
        }

        .stock-item { display: flex; align-items: center; gap: 5px; }
        .stock-icon { font-size: 0.9rem; }
        .stock-icon-img { width: 22px; height: 22px; object-fit: contain; vertical-align: middle; }
        .stock-value { font-size: 0.8rem; color: var(--text-color); font-family: 'Courier New', monospace; }

        .craft-conversion-zone {
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

        .conv-input, .conv-output { display: flex; flex-direction: column; align-items: center; }
        .conv-icon { font-size: 1.2rem; }
        .conv-count { font-size: 0.7rem; color: var(--neon-green); margin-top: -2px; }
        .conv-arrow { color: var(--dim-green); font-size: 0.8rem; }

        .craft-action-zone { flex: 0 0 90px; }
        .btn-craft {
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

        .btn-craft:hover:not(.disabled) { background: #2a6e2a; box-shadow: 0 0 10px var(--neon-green); transform: translateY(-1px); }
        .btn-craft:active:not(.disabled) { transform: translateY(2px); border-bottom-width: 0; }
        .btn-craft.disabled { background: #333; border-bottom-color: #222; color: #666; cursor: not-allowed; opacity: 0.6; }
    `;
    document.head.appendChild(style);
}
